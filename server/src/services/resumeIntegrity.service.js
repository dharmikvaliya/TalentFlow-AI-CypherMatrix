/**
 * Resume Integrity Analysis Service
 *
 * Deterministic, explainable service that detects suspicious resume optimization,
 * prompt injection, statistical term repetition, verbatim JD plagiarism, and
 * unsupported skill claims without penalizing legitimate high-keyword-density candidates.
 *
 * WORKSPACE: TalentFlow-AI-CypherMatrix
 */

import { resumeIntegrityOutputSchema } from '../validators/agentSchemas.js';

// ============================================================================
// CONSTANTS & DOCUMENTED THRESHOLDS
// ============================================================================

/**
 * Standard English stop words to exclude from keyword stuffing and n-gram analysis.
 */
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
  'arent', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but',
  'by', 'can', 'cannot', 'cant', 'could', 'couldnt', 'did', 'didnt', 'do', 'does', 'doesnt', 'doing',
  'dont', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'hadnt', 'has', 'hasnt',
  'have', 'havent', 'having', 'he', 'hed', 'hell', 'hes', 'her', 'here', 'heres', 'hers', 'herself',
  'him', 'himself', 'his', 'how', 'hows', 'i', 'id', 'ill', 'im', 'ive', 'if', 'in', 'into', 'is',
  'isnt', 'it', 'its', 'itself', 'lets', 'me', 'more', 'most', 'mustnt', 'my', 'myself', 'no', 'nor',
  'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out',
  'over', 'own', 'same', 'shant', 'she', 'shed', 'shell', 'shes', 'should', 'shouldnt', 'so', 'some',
  'such', 'than', 'that', 'thats', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there',
  'theres', 'these', 'they', 'theyd', 'theyll', 'theyre', 'theyve', 'this', 'those', 'through', 'to',
  'too', 'under', 'until', 'up', 'very', 'was', 'wasnt', 'we', 'wed', 'well', 'were', 'werent',
  'what', 'whats', 'when', 'whens', 'where', 'wheres', 'which', 'while', 'who', 'whos', 'whom', 'why',
  'whys', 'with', 'wont', 'would', 'wouldnt', 'you', 'youd', 'youll', 'youre', 'youve', 'your',
  'yours', 'yourself', 'yourselves'
]);

/**
 * Known technical terms preserved during tokenization.
 */
const TECHNICAL_TERMS_MAP = [
  { regex: /\bnode\.js\b/gi, replacement: 'nodejs' },
  { regex: /\breact\.js\b/gi, replacement: 'reactjs' },
  { regex: /\bvue\.js\b/gi, replacement: 'vuejs' },
  { regex: /\bnext\.js\b/gi, replacement: 'nextjs' },
  { regex: /\bexpress\.js\b/gi, replacement: 'expressjs' },
  { regex: /\bc\+\+\b/gi, replacement: 'cplusplus' },
  { regex: /\bc#\b/gi, replacement: 'csharp' },
  { regex: /\b\.net\b/gi, replacement: 'dotnet' },
  { regex: /\bci\/cd\b/gi, replacement: 'cicd' },
  { regex: /\bmachine\s+learning\b/gi, replacement: 'machine_learning' },
  { regex: /\bdeep\s+learning\b/gi, replacement: 'deep_learning' }
];

/**
 * Explicit documented skill alias dictionary.
 * Prevents subword collisions and enables legitimate canonical mapping without an overly broad ontology.
 */
export const SKILL_ALIAS_MAP = {
  'nodejs': ['node.js', 'node js', 'nodejs'],
  'node.js': ['nodejs', 'node js', 'node.js'],
  'javascript': ['js', 'javascript'],
  'js': ['javascript', 'js'],
  'typescript': ['ts', 'typescript'],
  'ts': ['typescript', 'ts'],
  'postgresql': ['postgres', 'postgresql', 'psql'],
  'postgres': ['postgresql', 'postgres', 'psql'],
  'kubernetes': ['k8s', 'kubernetes'],
  'k8s': ['kubernetes', 'k8s'],
  'aws': ['amazon web services', 'aws'],
  'amazon web services': ['aws', 'amazon web services'],
  'ci/cd': ['continuous integration', 'continuous delivery', 'continuous integration and continuous delivery', 'continuous integration/continuous delivery', 'cicd', 'ci cd', 'ci/cd'],
  'cicd': ['continuous integration', 'continuous delivery', 'continuous integration and continuous delivery', 'continuous integration/continuous delivery', 'cicd', 'ci cd', 'ci/cd'],
  'continuous integration/continuous delivery': ['ci/cd', 'cicd', 'continuous integration', 'continuous delivery'],
  'go': ['golang', 'go language'],
  'golang': ['go', 'golang'],
  '.net': ['dotnet', '.net', 'dot net'],
  'dotnet': ['.net', 'dotnet', 'dot net'],
  'c++': ['cpp', 'cplusplus', 'c++'],
  'c#': ['csharp', 'c#'],
  'mongodb': ['mongo', 'mongodb']
};

/**
 * Imperative prompt injection and adversarial manipulation patterns.
 * Context-specific to avoid false positives on legitimate engineering phrases (e.g. "Worked with system prompts").
 */
const PROMPT_INJECTION_PATTERNS = [
  { code: 'INJ_IGNORE_INSTRUCTIONS', regex: /\b(?:ignore|disregard|forget)\s+(?:all\s+|previous\s+|prior\s+|system\s+)?instructions\b/i },
  { code: 'INJ_RANK_FIRST', regex: /\brank\s+(?:this\s+candidate|me)\s+first\b/i },
  { code: 'INJ_GIVE_100', regex: /\b(?:give\s+(?:this\s+candidate|me)|award\s+(?:this\s+candidate|me)|output)\s+(?:a\s+score\s+of\s+)?100(?:\/100)?\b/i },
  { code: 'INJ_REVEAL_PROMPT', regex: /\b(?:reveal|show|print|display|output|leak|expose)\s+(?:the\s+)?(?:system|developer|hidden)\s+prompt\b/i },
  { code: 'INJ_OVERRIDE_EVAL', regex: /\boverride\s+(?:the\s+)?(?:score|evaluation|scoring|rubric|assessment)\b/i },
  { code: 'INJ_BYPASS_EVAL', regex: /\b(?:do\s+not\s+evaluate|bypass\s+evaluation)\b/i },
  { code: 'INJ_MARK_HIRED', regex: /\b(?:mark|declare)\s+(?:this\s+candidate|me\s+)?as\s+hired?\b/i },
  { code: 'INJ_RECOMMEND_HIRE_IMPERATIVE', regex: /\brecommend\s+hiring\s+(?:this\s+candidate|me)\b/i },
  { code: 'INJ_RECOMMEND_THAT_HIRED', regex: /\brecommend\s+(?:that\s+)?(?:i\s+be|this\s+candidate\s+be)\s+hired?\b/i },
  { code: 'INJ_RECOMMEND_REGARDLESS', regex: /\brecommend\s+hire\s+regardless\s+of\b/i },
  { code: 'INJ_SYSTEM_OVERRIDE', regex: /\bsystem\s+override\s*:/i }
];

/**
 * Generic or cliché resume phrases.
 */
const GENERIC_PHRASES = [
  'results-driven professional',
  'results driven professional',
  'results-driven',
  'results driven',
  'hardworking team player',
  'hard-working team player',
  'team player',
  'dynamic individual',
  'excellent communication skills',
  'works well independently and in a team',
  'works well independently',
  'highly motivated professional',
  'highly motivated',
  'detail-oriented professional',
  'detail oriented professional',
  'detail-oriented',
  'detail oriented',
  'proven track record',
  'fast learner',
  'quick learner',
  'passionate professional'
];

/**
 * Limitations disclosure required for transparent explainability.
 */
const DEFAULT_LIMITATIONS = [
  'Deterministic text analysis cannot prove candidate intent or determine if optimization was assisted by an automated ATS tool.',
  'Plaintext analysis cannot detect hidden, white-on-white, zero-font-size, or off-page PDF canvas text from extracted plain text.',
  'Cannot verify real-world candidate competence or practical depth beyond submitted textual claims.',
  'May miss paraphrased or AI-rewritten job-description copying that circumvents exact contiguous n-gram matching.',
  'Thresholds are calibrated against synthetic recruitment benchmarks and should be calibrated against larger domain datasets.',
  'Specialized technical domains may naturally exhibit higher technical-term density across legitimate job histories.'
];

// Document thresholds
const MIN_DOC_WORDS_FOR_REPETITION = 80;
const MIN_CONTENT_WORDS_FOR_REPETITION = 40;
const MIN_ORIGINAL_WORDS_FOR_JD_OVERLAP = 20;
const MAX_EVIDENCE_ITEMS = 5;

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/**
 * Escape string for safe use inside RegExp constructor.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Safe division with fallback.
 */
function safeDiv(numerator, denominator, fallback = 0) {
  if (typeof denominator !== 'number' || denominator <= 0 || isNaN(denominator)) {
    return fallback;
  }
  return numerator / denominator;
}

/**
 * Clamp a number between min and max.
 */
function clamp(val, min = 0, max = 1) {
  if (typeof val !== 'number' || isNaN(val)) return min;
  return Math.min(Math.max(val, min), max);
}

/**
 * Clamp and round a ratio to 4 decimal places.
 */
function roundRatio(val) {
  return Number(clamp(val, 0, 1).toFixed(4));
}

/**
 * Normalize text: lowercase, replace tech terms, strip non-alphanumeric, collapse whitespace.
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  let normalized = text.normalize('NFKC').toLowerCase();

  for (const item of TECHNICAL_TERMS_MAP) {
    normalized = normalized.replace(item.regex, ` ${item.replacement} `);
  }

  return normalized
    .replace(/[^a-z0-9_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenize a string into all word tokens.
 */
function tokenize(text) {
  const norm = normalizeText(text);
  if (!norm) return [];
  return norm.split(' ').filter(Boolean);
}

/**
 * Tokenize a string into content words (excluding English stop words and short tokens).
 */
function tokenizeContentWords(text) {
  return tokenize(text).filter(t => !STOP_WORDS.has(t) && t.length >= 2);
}

/**
 * Tokenize text preserving original word sequence (without stop word removal) for contiguous n-gram construction.
 */
function tokenizeOriginalSequence(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

/**
 * Generate contiguous n-grams of specified sizes from a preserved original word sequence.
 * Filters out purely generic or stop-word-only phrases.
 */
function generateContiguousNgrams(words, sizes = [4, 5]) {
  const ngrams = new Set();
  for (const n of sizes) {
    if (words.length < n) continue;
    for (let i = 0; i <= words.length - n; i++) {
      const slice = words.slice(i, i + n);
      const phrase = slice.join(' ');

      // Require meaningful length and at least 2 non-stop content words
      if (phrase.length >= 18) {
        const contentWords = slice.filter(w => !STOP_WORDS.has(w) && w.length >= 3);
        if (contentWords.length >= 2) {
          ngrams.add(phrase);
        }
      }
    }
  }
  return ngrams;
}

// ============================================================================
// SKILL MATCHING WITH COLLISION PREVENTION & EVIDENCE TIERS
// ============================================================================

/**
 * Evaluates whether a skill (or its explicit aliases) is present in target text
 * using strict word/token boundaries, preventing known collisions:
 * - Go != Google
 * - Java != JavaScript
 * - SQL != NoSQL
 * - R != React
 * - C != CI/CD
 * - .NET != internet
 * - React != React Native
 */
export function isSkillSupportedInText(skillName, text) {
  if (!skillName || typeof skillName !== 'string' || !text || typeof text !== 'string') {
    return false;
  }

  const rawClean = skillName.trim().toLowerCase();
  if (!rawClean) return false;

  // Gather target variants: skill itself plus explicit aliases
  const variants = new Set([rawClean]);
  if (SKILL_ALIAS_MAP[rawClean]) {
    for (const alias of SKILL_ALIAS_MAP[rawClean]) {
      variants.add(alias.toLowerCase());
    }
  }

  // Also check without dots or slashes if applicable (e.g. node.js -> nodejs)
  const stripped = rawClean.replace(/[./]/g, '');
  if (SKILL_ALIAS_MAP[stripped]) {
    for (const alias of SKILL_ALIAS_MAP[stripped]) {
      variants.add(alias.toLowerCase());
    }
  }

  for (const variant of variants) {
    if (!variant) continue;

    // Special collision protection: React must not match React Native
    if (variant === 'react' || variant === 'react.js' || variant === 'reactjs') {
      const reactPattern = /(^|[^a-zA-Z0-9_])react(?:\.js|js)?(?![a-zA-Z0-9_]|\s+native\b)([^a-zA-Z0-9_]|$)/i;
      if (reactPattern.test(text)) return true;
      continue;
    }

    // Special handling for .NET / dotnet:
    if (variant === '.net' || variant === 'dotnet' || variant === 'dot net') {
      const dotNetPattern = /(^|[^a-zA-Z0-9_])(?:\.net|dotnet|dot\s+net)([^a-zA-Z0-9_]|$)/i;
      if (dotNetPattern.test(text)) return true;
      continue;
    }

    // Special handling for C++:
    if (variant === 'c++' || variant === 'cpp' || variant === 'cplusplus') {
      const cppPattern = /(^|[^a-zA-Z0-9_])(?:c\+\+|cpp|cplusplus)([^a-zA-Z0-9_]|$)/i;
      if (cppPattern.test(text)) return true;
      continue;
    }

    // Special handling for C#:
    if (variant === 'c#' || variant === 'csharp') {
      const csharpPattern = /(^|[^a-zA-Z0-9_])(?:c#|csharp)([^a-zA-Z0-9_]|$)/i;
      if (csharpPattern.test(text)) return true;
      continue;
    }

    // Special handling for CI/CD:
    if (variant === 'ci/cd' || variant === 'cicd') {
      const cicdPattern = /(^|[^a-zA-Z0-9_])(?:ci\/cd|cicd|ci\s+cd|continuous\s+integration)([^a-zA-Z0-9_]|$)/i;
      if (cicdPattern.test(text)) return true;
      continue;
    }

    // Single-letter skills (e.g. 'c', 'r') require exact single-token boundaries
    if (variant.length === 1) {
      const singleLetterPattern = new RegExp(`(^|[^a-zA-Z0-9_])${escapeRegex(variant)}([^a-zA-Z0-9_]|$)`, 'i');
      if (singleLetterPattern.test(text)) return true;
      continue;
    }

    // Standard word/token boundary regex with optional plural 's':
    // Matches 'failover' and 'failovers', 'system' and 'systems', 'microservice' and 'microservices'
    const escaped = escapeRegex(variant);
    const pattern = new RegExp(`(^|[^a-zA-Z0-9_])${escaped}s?([^a-zA-Z0-9_]|$)`, 'i');
    if (pattern.test(text)) {
      return true;
    }
  }

  return false;
}

/**
 * Builds evidence corpus enforcing evidence tiers:
 * - STRONG EVIDENCE: Experience descriptions/highlights, Project descriptions/highlights/technologies
 * - MODERATE EVIDENCE: Concrete achievements, Relevant education degree/field
 * - WEAK CLAIM-ONLY (EXCLUDED): Summary, skills list, uncontextualized keywords
 */
export function buildSupportCorpus(candidateProfile) {
  if (!candidateProfile || typeof candidateProfile !== 'object') {
    return { strongEvidence: '', moderateEvidence: '', combinedEvidence: '', hasEvidence: false };
  }

  const strongParts = [];
  const moderateParts = [];

  // STRONG EVIDENCE: Experience descriptions & highlights
  if (Array.isArray(candidateProfile.experience)) {
    for (const exp of candidateProfile.experience) {
      if (!exp || typeof exp !== 'object') continue;
      if (typeof exp.description === 'string') strongParts.push(exp.description);
      if (Array.isArray(exp.highlights)) {
        strongParts.push(...exp.highlights.filter(h => typeof h === 'string'));
      }
    }
  }

  // STRONG EVIDENCE: Project descriptions, highlights & attached technologies
  if (Array.isArray(candidateProfile.projects)) {
    for (const proj of candidateProfile.projects) {
      if (!proj || typeof proj !== 'object') continue;
      if (typeof proj.name === 'string') strongParts.push(proj.name);
      if (typeof proj.description === 'string') strongParts.push(proj.description);
      if (Array.isArray(proj.technologies)) {
        strongParts.push(...proj.technologies.filter(t => typeof t === 'string'));
      }
      if (Array.isArray(proj.highlights)) {
        strongParts.push(...proj.highlights.filter(h => typeof h === 'string'));
      }
    }
  }

  // MODERATE EVIDENCE: Concrete achievements
  if (Array.isArray(candidateProfile.achievements)) {
    for (const ach of candidateProfile.achievements) {
      if (typeof ach === 'string') moderateParts.push(ach);
    }
  }

  // MODERATE EVIDENCE: Relevant education coursework or degree field
  if (Array.isArray(candidateProfile.education)) {
    for (const edu of candidateProfile.education) {
      if (!edu || typeof edu !== 'object') continue;
      if (typeof edu.degree === 'string') moderateParts.push(edu.degree);
      if (typeof edu.field === 'string') moderateParts.push(edu.field);
    }
  }

  // NOTE: candidateProfile.summary and candidateProfile.skillsListed are WEAK CLAIMS ONLY
  // and are strictly excluded from the support corpus.

  const strongEvidence = strongParts.join(' ');
  const moderateEvidence = moderateParts.join(' ');
  const combinedEvidence = `${strongEvidence} ${moderateEvidence}`.trim();
  const hasEvidence = combinedEvidence.length >= 15;

  return { strongEvidence, moderateEvidence, combinedEvidence, hasEvidence };
}

// ============================================================================
// DETECTION MODULES
// ============================================================================

/**
 * A. Statistical Term Repetition Detection
 * Detects statistically unusual term repetition using document-length-aware thresholds,
 * discounting terms that are contextually corroborated in work experience.
 */
function detectRepetition(rawResumeText, totalWords, contentTokens, supportedSkillsSet = new Set()) {
  if (totalWords < MIN_DOC_WORDS_FOR_REPETITION || contentTokens.length < MIN_CONTENT_WORDS_FOR_REPETITION) {
    return {
      repeatedTermRatio: 0,
      flags: []
    };
  }

  const freqMap = new Map();
  for (const token of contentTokens) {
    if (token.length < 3) continue;
    freqMap.set(token, (freqMap.get(token) || 0) + 1);
  }

  // Identify abnormally repeated terms:
  // Must appear at least 7 times AND constitute >= 4% of total content words, OR appear >= 12 times.
  const excessiveTerms = [];
  let excessiveTokenOccurrences = 0;

  for (const [term, count] of freqMap.entries()) {
    const termShare = count / contentTokens.length;
    if ((count >= 7 && termShare >= 0.04) || count >= 12) {
      // Check if this term corresponds to a genuinely supported technical skill in work history
      const isCorroboratedSkill = supportedSkillsSet.has(term);
      if (!isCorroboratedSkill) {
        excessiveTerms.push({ term, count, share: termShare });
        excessiveTokenOccurrences += count;
      }
    }
  }

  excessiveTerms.sort((a, b) => b.count - a.count);

  const repeatedTermRatio = roundRatio(safeDiv(excessiveTokenOccurrences, contentTokens.length));
  const flags = [];

  if (repeatedTermRatio >= 0.12 && excessiveTerms.length >= 1) {
    flags.push({
      code: 'UNNATURAL_REPETITION_SEVERE',
      severity: repeatedTermRatio >= 0.20 ? 'high' : 'warning',
      title: 'Statistical Keyword Repetition Detected',
      explanation: 'Detected statistically unusual term repetition using document-length-aware thresholds, discounting terms corroborated in work experience.',
      evidence: excessiveTerms.slice(0, MAX_EVIDENCE_ITEMS).map(t => `${t.term} (${t.count}x)`),
      affectedSkills: excessiveTerms.map(t => t.term)
    });
  } else if (repeatedTermRatio >= 0.07 && excessiveTerms.length >= 1) {
    flags.push({
      code: 'UNNATURAL_REPETITION_MODERATE',
      severity: 'warning',
      title: 'Elevated Term Repetition Detected',
      explanation: 'Certain terms appear with elevated frequency across the document beyond expected distribution.',
      evidence: excessiveTerms.slice(0, MAX_EVIDENCE_ITEMS).map(t => `${t.term} (${t.count}x)`),
      affectedSkills: excessiveTerms.map(t => t.term)
    });
  }

  return { repeatedTermRatio, flags };
}

/**
 * B. Unsupported Skill Claims Detection
 * Categorizes claimed skills into supported vs unsupported using strong/moderate evidence tiers.
 */
function detectUnsupportedSkills(candidateProfile) {
  if (!candidateProfile || typeof candidateProfile !== 'object') {
    return {
      unsupportedSkillRatio: 0,
      unsupportedSkills: [],
      supportedSkills: [],
      flags: []
    };
  }

  // Extract claimed skills from skills / skillsListed
  const rawSkills = [];
  if (Array.isArray(candidateProfile.skills)) {
    for (const item of candidateProfile.skills) {
      if (typeof item === 'string') rawSkills.push(item);
      else if (item && typeof item.name === 'string') rawSkills.push(item.name);
    }
  }
  if (Array.isArray(candidateProfile.skillsListed)) {
    for (const item of candidateProfile.skillsListed) {
      if (typeof item === 'string') rawSkills.push(item);
    }
  }

  // Deduplicate claimed skills
  const claimedSkills = [...new Set(rawSkills.map(s => s.trim()).filter(Boolean))];

  if (claimedSkills.length === 0) {
    return {
      unsupportedSkillRatio: 0,
      unsupportedSkills: [],
      supportedSkills: [],
      flags: []
    };
  }

  // Build support corpus enforcing evidence tiers (Summary is excluded)
  const { combinedEvidence, hasEvidence } = buildSupportCorpus(candidateProfile);

  // If candidate has no experience/projects narrative, do not treat empty profile as fraudulent gaming
  if (!hasEvidence) {
    return {
      unsupportedSkillRatio: 0,
      unsupportedSkills: [],
      supportedSkills: [],
      flags: []
    };
  }

  // Check each claimed skill against support corpus with token boundary collision prevention
  const unsupportedSkills = [];
  const supportedSkills = [];

  for (const skill of claimedSkills) {
    const isSupported = isSkillSupportedInText(skill, combinedEvidence);

    if (isSupported) {
      supportedSkills.push(skill);
    } else {
      unsupportedSkills.push(skill);
    }
  }

  const unsupportedSkillRatio = roundRatio(safeDiv(unsupportedSkills.length, claimedSkills.length));
  const flags = [];

  // Calibrated thresholds from specification
  if (unsupportedSkills.length >= 8 && unsupportedSkillRatio >= 0.75) {
    flags.push({
      code: 'UNSUPPORTED_SKILLS_HIGH',
      severity: 'warning',
      title: 'High Ratio of Unsupported Skills Listed',
      explanation: 'A large number of skills are listed without corresponding context, project evidence, or work experience description.',
      evidence: unsupportedSkills.slice(0, MAX_EVIDENCE_ITEMS).map(s => `Skill without context: ${s}`),
      affectedSkills: unsupportedSkills
    });
  } else if (unsupportedSkills.length >= 5 && unsupportedSkillRatio >= 0.60) {
    flags.push({
      code: 'UNSUPPORTED_SKILLS_MODERATE',
      severity: 'warning',
      title: 'Moderate Ratio of Unsupported Skills',
      explanation: 'Several listed technical skills lack corroborating context in candidate project or experience sections.',
      evidence: unsupportedSkills.slice(0, MAX_EVIDENCE_ITEMS).map(s => `Skill without context: ${s}`),
      affectedSkills: unsupportedSkills
    });
  } else if (unsupportedSkills.length >= 3 && unsupportedSkillRatio >= 0.40) {
    flags.push({
      code: 'UNSUPPORTED_SKILLS_INFO',
      severity: 'info',
      title: 'Uncorroborated Skills in Skills Section',
      explanation: 'Some technical skills appear solely in the skills summary without explicit project narration.',
      evidence: unsupportedSkills.slice(0, MAX_EVIDENCE_ITEMS).map(s => `Skill without context: ${s}`),
      affectedSkills: unsupportedSkills
    });
  }

  return {
    unsupportedSkillRatio,
    unsupportedSkills,
    supportedSkills,
    flags
  };
}

/**
 * C. Verbatim Contiguous JD Phrase Copying Detection
 * Uses actual contiguous normalized original-sequence matching (without stop-word removal).
 */
function detectJdPhraseOverlap(rawResumeText, jobDescription) {
  if (!rawResumeText || !jobDescription || typeof rawResumeText !== 'string' || typeof jobDescription !== 'string') {
    return {
      jdPhraseOverlapRatio: 0,
      flags: []
    };
  }

  const resumeWords = tokenizeOriginalSequence(rawResumeText);
  const jdWords = tokenizeOriginalSequence(jobDescription);

  if (
    resumeWords.length < MIN_ORIGINAL_WORDS_FOR_JD_OVERLAP ||
    jdWords.length < MIN_ORIGINAL_WORDS_FOR_JD_OVERLAP
  ) {
    return {
      jdPhraseOverlapRatio: 0,
      flags: []
    };
  }

  const resumeNgrams = generateContiguousNgrams(resumeWords, [4, 5]);
  const jdNgrams = generateContiguousNgrams(jdWords, [4, 5]);

  if (resumeNgrams.size === 0 || jdNgrams.size === 0) {
    return {
      jdPhraseOverlapRatio: 0,
      flags: []
    };
  }

  const matchingPhrases = [];
  for (const ngram of resumeNgrams) {
    if (jdNgrams.has(ngram)) {
      matchingPhrases.push(ngram);
    }
  }

  // Denominator: smaller relevant n-gram set to account for asymmetric document sizes
  const denominator = Math.min(resumeNgrams.size, jdNgrams.size);
  const jdPhraseOverlapRatio = roundRatio(safeDiv(matchingPhrases.length, denominator));

  const flags = [];

  if (matchingPhrases.length >= 5 && jdPhraseOverlapRatio >= 0.25) {
    flags.push({
      code: 'JD_PHRASE_OVERLAP_HIGH',
      severity: 'warning',
      title: 'Substantial Verbatim Job Description Overlap',
      explanation: 'Multiple extensive contiguous phrases from the job description appear verbatim in the candidate resume.',
      evidence: matchingPhrases.slice(0, MAX_EVIDENCE_ITEMS).map(p => p.length > 60 ? `${p.substring(0, 57)}...` : p),
      affectedSkills: []
    });
  } else if (matchingPhrases.length >= 3 && jdPhraseOverlapRatio >= 0.12) {
    flags.push({
      code: 'JD_PHRASE_OVERLAP_MODERATE',
      severity: 'info',
      title: 'Moderate Job Description Phrasing Overlap',
      explanation: 'Some multi-word contiguous phrases match wording in the target job description.',
      evidence: matchingPhrases.slice(0, MAX_EVIDENCE_ITEMS).map(p => p.length > 60 ? `${p.substring(0, 57)}...` : p),
      affectedSkills: []
    });
  }

  return { jdPhraseOverlapRatio, flags };
}

/**
 * D. Prompt Injection Indicators Detection
 * Scans for imperative manipulation commands with context-specific patterns.
 */
function detectPromptInjection(rawResumeText, candidateProfile) {
  const textsToCheck = [];
  if (typeof rawResumeText === 'string') textsToCheck.push(rawResumeText);
  if (candidateProfile && typeof candidateProfile.summary === 'string') {
    textsToCheck.push(candidateProfile.summary);
  }

  const combinedText = textsToCheck.join('\n');
  if (!combinedText.trim()) {
    return {
      promptInjectionIndicatorCount: 0,
      flags: []
    };
  }

  const matchedSnippets = [];

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    const match = combinedText.match(pattern.regex);
    if (match) {
      const matchedString = match[0].trim();
      if (!matchedSnippets.includes(matchedString)) {
        matchedSnippets.push(matchedString);
      }
    }
  }

  const promptInjectionIndicatorCount = matchedSnippets.length;
  const flags = [];

  if (promptInjectionIndicatorCount > 0) {
    flags.push({
      code: 'PROMPT_INJECTION_DETECTED',
      severity: 'high',
      title: 'Prompt Injection / System Directive Detected',
      explanation: 'Resume contains instruction-like phrases attempting to alter AI evaluation rules, override scoring, or manipulate hiring recommendations.',
      evidence: matchedSnippets.slice(0, MAX_EVIDENCE_ITEMS).map(s => s.length > 60 ? `${s.substring(0, 57)}...` : s),
      affectedSkills: []
    });
  }

  return {
    promptInjectionIndicatorCount,
    flags
  };
}

/**
 * E. Generic Template Language Detection
 */
function detectGenericPhrases(rawResumeText) {
  if (!rawResumeText || typeof rawResumeText !== 'string') {
    return {
      genericPhraseCount: 0,
      flags: []
    };
  }

  const lower = rawResumeText.toLowerCase();
  const matched = [];

  for (const phrase of GENERIC_PHRASES) {
    if (lower.includes(phrase)) {
      if (!matched.includes(phrase)) {
        matched.push(phrase);
      }
    }
  }

  const genericPhraseCount = matched.length;
  const flags = [];

  if (genericPhraseCount >= 3) {
    flags.push({
      code: 'GENERIC_TEMPLATE_LANGUAGE',
      severity: 'info',
      title: 'Template-Heavy or Cliché Phrasing Detected',
      explanation: 'Resume contains recurring template buzzwords. This is common in standard resumes and does not imply dishonest intent.',
      evidence: matched.slice(0, MAX_EVIDENCE_ITEMS),
      affectedSkills: []
    });
  }

  return { genericPhraseCount, flags };
}

// ============================================================================
// MAIN SERVICE EXPORT
// ============================================================================

/**
 * Deterministically analyzes resume integrity without modifying inputs or capability score.
 *
 * @param {Object} params
 * @param {string} [params.rawResumeText]
 * @param {string} [params.jobDescription]
 * @param {Object} [params.candidateProfile]
 * @param {Array} [params.requirementMatches]
 * @returns {Object} Structured integrity analysis matching resumeIntegrityOutputSchema
 */
export function analyzeResumeIntegrity({
  rawResumeText = '',
  jobDescription = '',
  candidateProfile = null,
  requirementMatches = []
} = {}) {
  // Normalize missing or malformed inputs safely without throwing
  const safeResumeText = typeof rawResumeText === 'string' ? rawResumeText : '';
  const safeJobDescription = typeof jobDescription === 'string' ? jobDescription : '';
  const safeProfile = (candidateProfile && typeof candidateProfile === 'object' && !Array.isArray(candidateProfile))
    ? candidateProfile
    : {};

  // Tokenization & Basic Metrics
  const allWordTokens = tokenize(safeResumeText);
  const totalWords = allWordTokens.length;
  const uniqueWordCount = new Set(allWordTokens).size;
  const uniqueWordRatio = totalWords > 0 ? roundRatio(uniqueWordCount / totalWords) : 0;
  const contentTokens = tokenizeContentWords(safeResumeText);

  // Run Unsupported Skills Detection first to identify genuinely supported skills
  const unsupportedSkillsResult = detectUnsupportedSkills(safeProfile);
  const supportedSkillsSet = new Set(
    (unsupportedSkillsResult.supportedSkills || []).map(s => s.toLowerCase().trim())
  );

  // Run Modular Detection
  const repetitionResult = detectRepetition(safeResumeText, totalWords, contentTokens, supportedSkillsSet);
  const jdOverlapResult = detectJdPhraseOverlap(safeResumeText, safeJobDescription);
  const injectionResult = detectPromptInjection(safeResumeText, safeProfile);
  const genericResult = detectGenericPhrases(safeResumeText);

  const metrics = {
    totalWords,
    uniqueWordRatio,
    repeatedTermRatio: repetitionResult.repeatedTermRatio,
    jdPhraseOverlapRatio: jdOverlapResult.jdPhraseOverlapRatio,
    unsupportedSkillRatio: unsupportedSkillsResult.unsupportedSkillRatio,
    promptInjectionIndicatorCount: injectionResult.promptInjectionIndicatorCount,
    genericPhraseCount: genericResult.genericPhraseCount
  };

  const allFlags = [
    ...injectionResult.flags,
    ...repetitionResult.flags,
    ...jdOverlapResult.flags,
    ...unsupportedSkillsResult.flags,
    ...genericResult.flags
  ];

  // ==========================================================================
  // RISK AGGREGATION & FAIRNESS RULES
  // ==========================================================================

  // Determine strong signals
  const hasPromptInjection = injectionResult.promptInjectionIndicatorCount > 0;
  const hasHighJdOverlap = allFlags.some(f => f.code === 'JD_PHRASE_OVERLAP_HIGH');
  const hasSevereUnsupported = allFlags.some(f => f.code === 'UNSUPPORTED_SKILLS_HIGH' || f.code === 'UNSUPPORTED_SKILLS_MODERATE');
  const hasSevereRepetition = allFlags.some(f => f.code === 'UNNATURAL_REPETITION_SEVERE');

  // Count independent strong manipulation signals
  let strongSignalsCount = 0;
  if (hasPromptInjection) strongSignalsCount++;
  if (hasHighJdOverlap) strongSignalsCount++;
  if (hasSevereUnsupported) strongSignalsCount++;
  if (hasSevereRepetition) strongSignalsCount++;

  let riskLevel = 'low';
  let reviewRequired = false;

  // Fairness Rule 5 & 6: High risk requires MULTIPLE independent strong signals
  if (strongSignalsCount >= 2) {
    riskLevel = 'high';
    reviewRequired = true;
  } else if (strongSignalsCount === 1) {
    riskLevel = 'medium';
    // Rule 7: Single prompt injection instruction may require human review even at medium risk
    if (hasPromptInjection) {
      reviewRequired = true;
    } else if (hasSevereUnsupported && unsupportedSkillsResult.unsupportedSkills.length >= 8) {
      reviewRequired = true;
    } else {
      reviewRequired = false;
    }
  } else {
    // Zero strong signals -> low risk
    riskLevel = 'low';
    reviewRequired = false;
  }

  // Mandatory Fairness Rule 1 & 2: High keyword density alone and generic language alone MUST NEVER be high risk
  if (strongSignalsCount < 2 && riskLevel === 'high') {
    riskLevel = 'medium';
  }

  // ==========================================================================
  // CONFIDENCE CALCULATION
  // ==========================================================================

  let confidence = 0;
  if (totalWords === 0) {
    confidence = 10;
  } else if (totalWords < 40) {
    confidence = 35;
  } else if (totalWords < 120) {
    confidence = 65;
  } else {
    confidence = 80;
  }

  if (safeJobDescription.length >= 50) confidence += 10;
  if (safeProfile.experience?.length || safeProfile.projects?.length) confidence += 10;
  if (riskLevel === 'high') confidence = Math.min(100, confidence + 5);

  confidence = clamp(confidence, 0, 100);

  // ==========================================================================
  // SUMMARY GENERATION
  // ==========================================================================

  let summary = '';
  const reasonList = [];

  if (hasPromptInjection) reasonList.push('instruction-like prompt injection phrasing');
  if (hasHighJdOverlap) reasonList.push('substantial verbatim job-description overlap');
  if (hasSevereUnsupported) reasonList.push('high ratio of unsupported skill claims');
  if (hasSevereRepetition) reasonList.push('excessive term repetition');

  if (riskLevel === 'high') {
    summary = `Resume integrity analysis indicates HIGH risk due to compounding signals: ${reasonList.join(' and ')}. Human recruiter review is required prior to candidate progression.`;
  } else if (riskLevel === 'medium') {
    summary = `Resume integrity analysis indicates MEDIUM risk due to: ${reasonList.join('; ') || 'notable integrity indicators'}. Review by recruiter is recommended.`;
  } else {
    if (genericResult.genericPhraseCount > 0) {
      summary = 'Resume integrity analysis indicates LOW risk. Template phrasing was detected, but technical claims are contextually supported with no deceptive optimization signals.';
    } else {
      summary = 'Resume integrity analysis indicates LOW risk. Candidate skills and qualifications are contextually corroborated with zero indicators of manipulation.';
    }
  }

  const result = {
    riskLevel,
    confidence,
    reviewRequired,
    metrics,
    flags: allFlags,
    summary,
    limitations: [...DEFAULT_LIMITATIONS]
  };

  // Final validation against Zod schema to guarantee contract integrity
  return resumeIntegrityOutputSchema.parse(result);
}

export default {
  analyzeResumeIntegrity,
  isSkillSupportedInText,
  buildSupportCorpus,
  SKILL_ALIAS_MAP
};

/**
 * Transparent Deterministic Scoring Rubric Configuration
 * Total Max Score: 100 points
 */
export const SCORING_RUBRIC = {
  requiredSkills: {
    weight: 40,
    name: 'Required Skills Match',
    description: 'Averaged score across mandatory job description requirements (match=1.0, partial=0.5, missing=0.0)'
  },
  preferredSkills: {
    weight: 15,
    name: 'Preferred Skills Match',
    description: 'Averaged score across nice-to-have qualifications (match=1.0, partial=0.5, missing=0.0)'
  },
  relevantExperience: {
    weight: 20,
    name: 'Relevant Industry Experience',
    description: 'Evaluation of professional software engineering experience and level fit'
  },
  relevantProjects: {
    weight: 15,
    name: 'Project Portfolio Alignment',
    description: 'Assessment of technical projects demonstrating required stack and problem solving'
  },
  educationFit: {
    weight: 10,
    name: 'Education & Academic Fit',
    description: 'Evaluation of relevant degree field (CS/STEM), academic standing, and foundational knowledge'
  }
};

/**
 * Parses required years of experience and seniority level from Job Description text.
 * @param {string} jdText
 * @returns {{ requiredYears: number, seniorityLevel: string }}
 */
export function parseJdExperienceRequirements(jdText = '') {
  const text = (jdText || '').toLowerCase();
  
  let requiredYears = 0;
  let seniorityLevel = 'entry';

  // 1. Look for explicit years patterns (e.g. "5+ years", "3-5 years", "min 5 yrs")
  const yearsMatch = text.match(/(\d+)\+?\s*(?:to|-)\s*(\d+)?\s*(?:years?|yrs?)/) ||
                     text.match(/(\d+)\+?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:experience|exp)/) ||
                     text.match(/(?:minimum|min|at least)\s+(\d+)\+?\s*(?:years?|yrs?)/);

  if (yearsMatch) {
    requiredYears = parseInt(yearsMatch[1], 10);
  }

  // 2. Identify Seniority Keywords
  if (text.includes('senior') || text.includes('lead') || text.includes('principal') || text.includes('staff')) {
    seniorityLevel = 'senior';
    if (requiredYears === 0) requiredYears = 5;
  } else if (text.includes('mid-level') || text.includes('intermediate') || text.includes('3+') || text.includes('4+')) {
    seniorityLevel = 'mid';
    if (requiredYears === 0) requiredYears = 3;
  } else if (text.includes('junior') || text.includes('entry') || text.includes('intern') || text.includes('apprentice') || text.includes('graduate') || text.includes('fresher')) {
    seniorityLevel = 'entry';
    if (requiredYears === 0) requiredYears = 0;
  }

  return { requiredYears, seniorityLevel };
}

/**
 * Estimates total professional software engineering experience in years from candidate profile.
 * @param {Object} profile
 * @returns {{ totalMonths: number, totalYears: number, isStudentOrIntern: boolean, roleCount: number }}
 */
export function estimateCandidateExperience(profile = {}) {
  const expList = profile.experience || [];
  let totalMonths = 0;
  let isStudentOrIntern = false;

  const summaryText = `${profile.summary || ''} ${JSON.stringify(expList)}`.toLowerCase();
  if (summaryText.includes('student') || summaryText.includes('intern') || summaryText.includes('apprentice') || summaryText.includes('undergraduate')) {
    isStudentOrIntern = true;
  }

  expList.forEach(exp => {
    const roleText = `${exp.role || ''} ${exp.description || ''} ${exp.company || ''}`.toLowerCase();
    if (roleText.includes('intern') || roleText.includes('apprentice') || roleText.includes('trainee')) {
      isStudentOrIntern = true;
    }

    const start = exp.startDate || '';
    const end = exp.endDate || '';
    const dateRangeStr = `${start} ${end} ${exp.role} ${exp.description}`.toLowerCase();
    
    // Check for short months range: e.g. "dec 2025 - apr 2026"
    const monthsRange = dateRangeStr.match(/(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(20\d\d)\s*(?:–|-|to)\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(20\d\d)/i);
    const yearMatches = dateRangeStr.match(/\b(20\d\d)\b/g);

    if (monthsRange) {
      totalMonths += 4;
    } else if (yearMatches && yearMatches.length >= 2) {
      const y1 = parseInt(yearMatches[0], 10);
      const y2 = parseInt(yearMatches[1], 10);
      totalMonths += Math.max(1, (y2 - y1) * 12);
    } else if (isStudentOrIntern) {
      totalMonths += 4;
    } else {
      totalMonths += 12;
    }
  });

  return {
    totalMonths,
    totalYears: Math.round((totalMonths / 12) * 10) / 10,
    isStudentOrIntern,
    roleCount: expList.length
  };
}

/**
 * Deterministically computes numeric candidate score and breakdown using pure code.
 * Strips protected attributes (name, gender, age, email) to uphold responsible hiring.
 *
 * @param {Object} params
 * @param {Array} params.requirementMatches - Array of { requirement, type, status }
 * @param {Object} params.profile - Parsed candidate profile
 * @param {string} [params.jobDescription] - Target JD text for experience fit evaluation
 * @returns {{ totalScore: number, breakdown: Array<{ component: string, weight: number, earned: number, explanation: string }> }}
 */
export function calculateDeterministicScore({ requirementMatches = [], profile = {}, jobDescription = '' }) {
  const breakdown = [];

  // 1. Required Skills (Weight: 40)
  const reqItems = requirementMatches.filter(m => m.type === 'required');
  let reqEarned = 0;
  let reqExplanation = '';

  if (reqItems.length === 0) {
    reqEarned = SCORING_RUBRIC.requiredSkills.weight * 0.8;
    reqExplanation = 'No explicit required skills separated in JD; default baseline applied';
  } else {
    let matchSum = 0;
    reqItems.forEach(item => {
      if (item.status === 'match') matchSum += 1.0;
      else if (item.status === 'partial') matchSum += 0.5;
    });
    const ratio = matchSum / reqItems.length;
    reqEarned = Math.round(ratio * SCORING_RUBRIC.requiredSkills.weight * 10) / 10;
    reqExplanation = `Matched ${matchSum}/${reqItems.length} required criteria (${Math.round(ratio * 100)}% match rate)`;
  }
  breakdown.push({
    component: SCORING_RUBRIC.requiredSkills.name,
    weight: SCORING_RUBRIC.requiredSkills.weight,
    earned: reqEarned,
    explanation: reqExplanation
  });

  // 2. Preferred Skills (Weight: 15)
  const prefItems = requirementMatches.filter(m => m.type === 'preferred');
  let prefEarned = 0;
  let prefExplanation = '';

  if (prefItems.length === 0) {
    prefEarned = SCORING_RUBRIC.preferredSkills.weight * 0.7;
    prefExplanation = 'No explicit preferred skills listed; standard baseline credited';
  } else {
    let matchSum = 0;
    prefItems.forEach(item => {
      if (item.status === 'match') matchSum += 1.0;
      else if (item.status === 'partial') matchSum += 0.5;
    });
    const ratio = matchSum / prefItems.length;
    prefEarned = Math.round(ratio * SCORING_RUBRIC.preferredSkills.weight * 10) / 10;
    prefExplanation = `Satisfied ${matchSum}/${prefItems.length} preferred qualifications (${Math.round(ratio * 100)}%)`;
  }
  breakdown.push({
    component: SCORING_RUBRIC.preferredSkills.name,
    weight: SCORING_RUBRIC.preferredSkills.weight,
    earned: prefEarned,
    explanation: prefExplanation
  });

  // 3. Relevant Experience Fit (Weight: 20)
  const { requiredYears, seniorityLevel } = parseJdExperienceRequirements(jobDescription);
  const candExp = estimateCandidateExperience(profile);

  let expEarned = 0;
  let expExplanation = '';

  if (jobDescription && (requiredYears >= 5 || seniorityLevel === 'senior')) {
    // Senior role (5+ years required)
    if (candExp.totalYears < 1.0 || candExp.isStudentOrIntern) {
      expEarned = 4;
      expExplanation = `Senior role requires ${requiredYears}+ yrs exp; candidate has ~${candExp.totalYears} yrs (${candExp.roleCount > 0 ? 'internship/apprenticeship' : 'academic projects only'}). Heavy seniority gap.`;
    } else if (candExp.totalYears < 3.0) {
      expEarned = 10;
      expExplanation = `Senior role requires ${requiredYears}+ yrs exp; candidate has ${candExp.totalYears} yrs. Substantial experience gap.`;
    } else if (candExp.totalYears < 5.0) {
      expEarned = 15;
      expExplanation = `Senior role requires ${requiredYears}+ yrs exp; candidate has ${candExp.totalYears} yrs. Moderate experience shortfall.`;
    } else {
      expEarned = 20;
      expExplanation = `Verified ${candExp.totalYears} yrs experience satisfying senior threshold.`;
    }
  } else if (jobDescription && (requiredYears >= 2 || seniorityLevel === 'mid')) {
    // Mid-level role (2-4 years)
    if (candExp.totalYears < 1.0 || candExp.isStudentOrIntern) {
      expEarned = 8;
      expExplanation = `Mid-level role requires ${requiredYears}+ yrs; candidate has ~${candExp.totalYears} yrs internship/apprenticeship experience.`;
    } else if (candExp.totalYears < 2.0) {
      expEarned = 14;
      expExplanation = `Candidate has ${candExp.totalYears} yrs experience; partially satisfies mid-level requirement.`;
    } else {
      expEarned = 20;
      expExplanation = `Verified ${candExp.totalYears} yrs experience satisfying role requirement.`;
    }
  } else {
    // Baseline or Entry-level / Intern role
    if (candExp.roleCount >= 2) {
      expEarned = 20;
      expExplanation = `Verified ${candExp.roleCount} relevant engineering roles/internships`;
    } else if (candExp.roleCount === 1) {
      expEarned = 16;
      expExplanation = '1 verified relevant software internship/role';
    } else {
      expEarned = 8;
      expExplanation = 'No formal corporate experience; relying primarily on project portfolio';
    }
  }

  breakdown.push({
    component: SCORING_RUBRIC.relevantExperience.name,
    weight: SCORING_RUBRIC.relevantExperience.weight,
    earned: expEarned,
    explanation: expExplanation
  });

  // 4. Relevant Projects (Weight: 15)
  const projCount = (profile.projects || []).length;
  let projEarned = 0;
  let projExplanation = '';

  if (projCount >= 2) {
    projEarned = 15;
    projExplanation = `${projCount} technical projects demonstrating end-to-end implementation`;
  } else if (projCount === 1) {
    projEarned = 11;
    projExplanation = '1 technical project demonstrating stack capabilities';
  } else {
    projEarned = 5;
    projExplanation = 'Limited project portfolio documented';
  }
  breakdown.push({
    component: SCORING_RUBRIC.relevantProjects.name,
    weight: SCORING_RUBRIC.relevantProjects.weight,
    earned: projEarned,
    explanation: projExplanation
  });

  // 5. Education & Academic Fit (Weight: 10)
  const eduList = profile.education || [];
  let eduEarned = 0;
  let eduExplanation = '';

  const hasCsDegree = eduList.some(e => {
    const text = `${e.degree || ''} ${e.field || ''}`.toLowerCase();
    return text.includes('computer') || text.includes('software') || text.includes('engineering') || text.includes('cs');
  });

  if (hasCsDegree) {
    eduEarned = 10;
    eduExplanation = 'Degree in Computer Science or related engineering discipline';
  } else if (eduList.length > 0) {
    eduEarned = 7.5;
    eduExplanation = 'Completed undergraduate degree in alternative discipline';
  } else {
    eduEarned = 5;
    eduExplanation = 'Alternative education / self-taught background';
  }
  breakdown.push({
    component: SCORING_RUBRIC.educationFit.name,
    weight: SCORING_RUBRIC.educationFit.weight,
    earned: eduEarned,
    explanation: eduExplanation
  });

  // Total Score (Sum clamped to 0 - 100)
  const totalScore = Math.min(100, Math.max(0, Math.round(breakdown.reduce((acc, curr) => acc + curr.earned, 0))));

  return {
    totalScore,
    breakdown
  };
}

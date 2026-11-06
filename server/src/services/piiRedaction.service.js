/**
 * Deterministic Candidate PII Minimization Service
 *
 * Sanitizes candidate contact details before transmitting prompt text to
 * external LLM providers, while strictly preserving technical skills,
 * professional experiences, projects, and educational credentials.
 */

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

// International, North American, and standard phone number patterns with extensions
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}(?:\s*(?:ext|x|ext\.)\s*\d{1,5})?/g;

// Standard street address patterns (e.g. "742 Evergreen Terrace", "123 Main St", "456 Market Ave, Suite 200")
const ADDRESS_REGEX = /\b\d{1,5}\s+[A-Za-z0-9.\s]+?\s+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Lane|Ln|Way|Court|Ct|Plaza|Plz|Terrace|Place|Pl|Suite|Ste|Apt|Unit)\b(?:[,\s]+[A-Za-z\s]+[,\s]+[A-Z]{2}\s+\d{5}(?:-\d{4})?)?/gi;

/**
 * Redacts direct candidate personal identification information from unstructured text.
 *
 * @param {string} text - Raw input text containing resume or candidate details
 * @param {Object} [options={}]
 * @param {string} [options.candidateName] - Specific candidate name to redact if known
 * @param {boolean} [options.redactEmail=true] - Redact email addresses
 * @param {boolean} [options.redactPhone=true] - Redact phone numbers
 * @param {boolean} [options.redactAddress=true] - Redact street addresses
 * @returns {string} Sanitized text with placeholders
 */
export function redactCandidatePII(text, options = {}) {
  if (typeof text !== 'string') return text;
  if (!text.trim()) return text;

  const {
    candidateName = null,
    redactEmail = true,
    redactPhone = true,
    redactAddress = true
  } = options;

  let sanitized = text;

  // 1. Redact Candidate Name if provided
  if (candidateName && typeof candidateName === 'string' && candidateName.trim().length >= 3) {
    const escapedName = candidateName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameRegex = new RegExp(`\\b${escapedName}\\b`, 'gi');
    sanitized = sanitized.replace(nameRegex, '[NAME_REDACTED]');
  }

  // 2. Redact Email Addresses
  if (redactEmail) {
    sanitized = sanitized.replace(EMAIL_REGEX, '[EMAIL_REDACTED]');
  }

  // 3. Redact Phone Numbers (excluding common year numbers like 2020-2024)
  if (redactPhone) {
    sanitized = sanitized.replace(PHONE_REGEX, (match) => {
      // Avoid redacting year ranges e.g. "2020 - 2024" or short dates
      if (/^\d{4}\s*-\s*\d{4}$/.test(match.trim())) return match;
      if (match.trim().length < 8) return match;
      return '[PHONE_REDACTED]';
    });
  }

  // 4. Redact Street Addresses
  if (redactAddress) {
    sanitized = sanitized.replace(ADDRESS_REGEX, '[ADDRESS_REDACTED]');
  }

  return sanitized;
}

// Questions the applicant should answer or confirm themselves. Matching is by
// substring, so ordinary questions ("disagreed", "race condition") also match;
// a match only adds a note, and the applicant decides what to paste.
const CONSENT_QUESTION =
  /agree|certify|consent|acknowledg|confirm|declar|authori[sz]e\b|i have read|terms|privacy|signature|attest/i;
const APPLICANT_ONLY_QUESTION =
  /gender|sexual orientation|\brace\b|ethnic|hispanic|latin[oax]|veteran|disabilit|religio|marital|nationality|date of birth|\bdob\b|\bnric\b|sponsor|\bvisa\b|citizen|authori[sz]ed to work|work authori[sz]ation|eligible to work|work permit|right to work|salary|compensation|\bpay\b|\bctc\b|signature/i;

/** Why the applicant should check this answer themselves, or "". */
export function questionFlag(question: string): string {
  if (CONSENT_QUESTION.test(question)) return "Read and confirm this yourself";
  if (APPLICANT_ONLY_QUESTION.test(question)) return "Answer this yourself";
  return "";
}

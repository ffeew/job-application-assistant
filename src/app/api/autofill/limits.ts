// The extension trims every page to these limits before sending it, so a real
// form never fails validation. They also bound the prompt: 100 fields of 15
// short options stay well inside the model's context with the profile added.
// Kept apart from the schemas so the page script can use them without Zod.
export const AUTOFILL_MAX_FIELDS = 100;
export const AUTOFILL_LABEL_MAX = 200;
export const AUTOFILL_GROUP_LABEL_MAX = 80;
export const AUTOFILL_MAX_OPTIONS = 15;
export const AUTOFILL_OPTION_MAX = 80;
export const AUTOFILL_PAGE_TEXT_MAX = 4_000;

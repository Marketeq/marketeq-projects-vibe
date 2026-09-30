/**
 * The canonical security-question catalogue.
 *
 * Owned here rather than in the two React components that render it. Before
 * this existed the same six prompts were declared twice on the frontend —
 * once in Settings > Account Recovery where the answers are set, once in
 * /forgot-password where they are checked — and nothing kept the two lists in
 * step. Editing one copy would have silently locked every account that had
 * answered the edited question out of its own recovery path.
 *
 * `id` is the stored key and is permanent. The prompt is display text and may
 * be reworded; the id must not change, because an id change is indistinguishable
 * from the user having answered a different question.
 */
export type SecurityQuestion = {
  id: string;
  prompt: string;
};

export const SECURITY_QUESTION_CATALOG: readonly SecurityQuestion[] = [
  { id: 'first-pet', prompt: 'What is the name of your first pet?' },
  { id: 'first-school', prompt: 'What was the name of your first school?' },
  { id: 'birth-city', prompt: 'What city were you born in?' },
  { id: 'mothers-maiden-name', prompt: "What is your mother's maiden name?" },
  { id: 'first-car', prompt: 'What was the make of your first car?' },
  { id: 'favourite-book', prompt: 'What is your favourite book?' },
];

export const SECURITY_QUESTION_IDS = new Set(
  SECURITY_QUESTION_CATALOG.map((question) => question.id),
);

/**
 * How many answers an account must hold before security questions count as a
 * usable recovery factor, and how many the recovery form asks for. Both screens
 * collect two, which is what the Figma draws.
 */
export const REQUIRED_SECURITY_ANSWERS = 2;

/**
 * Case, surrounding whitespace and runs of internal whitespace are all
 * insignificant — "  St. Mary's   School " and "st. mary's school" are the same
 * answer, and someone recovering an account a year later will not reproduce
 * their original capitalisation. Applied identically on set and on verify;
 * changing it on one side alone invalidates every stored answer.
 */
export const normalizeSecurityAnswer = (answer: string): string =>
  answer.trim().replace(/\s+/g, ' ').toLowerCase();

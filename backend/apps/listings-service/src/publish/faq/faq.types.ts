/**
 * Shared types for the FAQ suggestion adapter seam.
 *
 * A suggestion is a question/answer pair. Matches the `faqs` jsonb
 * column shape on the consolidated project table and the frontend
 * FAQ editor.
 */
export interface FaqSuggestion {
  question: string;
  answer: string;
}

export interface FaqScopePhase {
  phaseName: string;
  tasks: string[];
}

/**
 * Minimum listing shape the adapter needs to generate relevant FAQs.
 */
export interface FaqContext {
  title?: string | null;
  listingType?: string | null;
  categories?: string[] | null;
  skills?: string[] | null;
  tags?: string[] | null;
  durationMonths?: number | null;
  shortDescription?: string | null;
  fullDescription?: string | null;
  scope?: FaqScopePhase[];
}

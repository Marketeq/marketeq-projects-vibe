import { FaqContext, FaqSuggestion } from './faq.types';

/**
 * FaqAdapter — abstract seam for generating FAQ suggestions from a
 * listing's content using an LLM, with a deterministic fallback.
 *
 * Mirrors the DeliverablesAdapter pattern.
 */
export abstract class FaqAdapter {
  abstract suggestFaqs(context: FaqContext): Promise<FaqSuggestion[]>;
  abstract suggestAnswer(context: FaqContext, question: string): Promise<string>;
  abstract suggestQuestions(context: FaqContext): Promise<string[]>;
}

export const FAQ_ADAPTER = Symbol('FAQ_ADAPTER');

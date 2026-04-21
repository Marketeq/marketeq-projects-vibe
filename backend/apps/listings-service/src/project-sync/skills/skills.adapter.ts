import { SkillExtractionInput } from './skills.types';

/**
 * SkillsAdapter — abstract seam for spec §14.11 `SuggestedSkills`
 * (`AI.extract_keywords(description + category + tags)`) and §03's
 * "AI Skill Mapping Utility" (task → skill map).
 *
 * Same shape as `DeliverablesAdapter` in the neighbouring folder and
 * `SuggestionsAdapter` in category-service: one abstract class, a DI
 * token, and one or more implementations. The bound implementation
 * (`SkillsAdapterHuggingFace`) calls a real model with a heuristic
 * fallback; `SkillsAdapterHeuristic` is the no-model safety net.
 */
export abstract class SkillsAdapter {
  abstract extractSkills(input: SkillExtractionInput): Promise<string[]>;
}

export const SKILLS_ADAPTER = Symbol('SKILLS_ADAPTER');

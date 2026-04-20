/**
 * Input the `SkillsAdapter` uses to extract a skill list. Matches the
 * formula spec §14.11:
 *   SuggestedSkills = AI.extract_keywords(project.description + category + tags)
 *
 * `description` may be empty for drafts — adapters must handle that
 * gracefully (return `tags` / `category` as a sensible fallback).
 */
export interface SkillExtractionInput {
  description: string;
  category?: string | null;
  tags?: string[];
  // Task titles are the ground-truth signal for the "task → skill
  // map" utility called out in spec §03 L22 / L50 / L158. Passed in
  // alongside description so the same adapter call covers both
  // §14.11 SuggestedSkills AND the task → skill mapping.
  scopeTaskTitles?: string[];
}

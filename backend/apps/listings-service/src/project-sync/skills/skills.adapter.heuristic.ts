import { Injectable } from '@nestjs/common';
import { SkillsAdapter } from './skills.adapter';
import { SkillExtractionInput } from './skills.types';

/**
 * Heuristic skills adapter — no external calls.
 *
 * Falls back on editorially-authored signals that are already
 * skill-shaped: the project's `tags` plus its `category`. When both
 * are absent we word-scan `description` + task titles and surface
 * title-cased multi-character nouns as a weak fallback so the field
 * is never empty.
 *
 * Used as:
 *   • the default when `HUGGINGFACE_API_KEY` is absent (dev, CI)
 *   • the injected fallback inside `SkillsAdapterHuggingFace`
 */
@Injectable()
export class SkillsAdapterHeuristic extends SkillsAdapter {
  async extractSkills(input: SkillExtractionInput): Promise<string[]> {
    const seen = new Set<string>();
    const out: string[] = [];
    const push = (raw: unknown) => {
      const s = typeof raw === 'string' ? raw.trim() : '';
      if (!s) return;
      const key = s.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(s);
    };

    for (const t of input.tags ?? []) push(t);
    if (input.category) push(input.category);
    for (const title of input.scopeTaskTitles ?? []) push(title);

    // Final fallback — surface capitalized phrases from the
    // description so the field never goes empty for prose-only
    // projects. Purely shape-based; anything more structured is the
    // HF adapter's job.
    if (out.length === 0 && input.description) {
      const matches = input.description.match(/\b[A-Z][A-Za-z0-9+.\-]{2,}\b/g) ?? [];
      for (const m of matches.slice(0, 10)) push(m);
    }

    return out.slice(0, 10);
  }
}

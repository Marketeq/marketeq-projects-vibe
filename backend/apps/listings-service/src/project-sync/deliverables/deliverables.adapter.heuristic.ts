import { Injectable } from '@nestjs/common';
import { DeliverablesAdapter } from './deliverables.adapter';
import { DeliverableGroup, ProjectContext, ScopePhaseInput } from './deliverables.types';

/**
 * Heuristic adapter — fallback when LLM is unavailable.
 *
 * Converts task titles into tangible client deliverables — the artifact
 * the client receives, not the activity the team performs.
 *
 * Strategy:
 *   1. Match known activity verbs/patterns and replace with artifact nouns
 *   2. Extract the subject (what's being worked on) and pair with an
 *      artifact suffix that makes sense for the domain
 *   3. Always produce exactly 6 items per phase (2 rows × 3 columns)
 *
 * Format: Title Case, no special characters, 2-4 words.
 */
@Injectable()
export class DeliverablesAdapterHeuristic extends DeliverablesAdapter {
  /**
   * Ordered patterns: first match wins.
   * Each maps a verb/keyword in the task title to a tangible artifact suffix.
   */
  private static readonly ARTIFACT_RULES: Array<{
    pattern: RegExp;
    suffix: string;
  }> = [
    { pattern: /\b(design|architect)\b/i, suffix: 'Blueprint' },
    { pattern: /\b(test|testing|qa|coverage)\b/i, suffix: 'Report' },
    { pattern: /\b(deploy|launch|release|provision)\b/i, suffix: 'Package' },
    { pattern: /\b(setup|config|install)\b/i, suffix: 'Configuration' },
    { pattern: /\b(document|handoff|write)\b/i, suffix: 'Documentation' },
    { pattern: /\b(develop|implement|build|creat)\b/i, suffix: 'Module' },
    { pattern: /\b(migrat)\b/i, suffix: 'Migration Script' },
    { pattern: /\b(monitor|log|observ)\b/i, suffix: 'Dashboard' },
    { pattern: /\b(review|audit|assess|evaluat)\b/i, suffix: 'Report' },
    { pattern: /\b(gather|research|analys|discover)\b/i, suffix: 'Analysis' },
    { pattern: /\b(integrat)\b/i, suffix: 'Integration Layer' },
    { pattern: /\b(secur|vulnerab|encrypt)\b/i, suffix: 'Audit Report' },
  ];

  /** Fallback suffixes when no rule matches */
  private static readonly FALLBACK_SUFFIXES = [
    'Deliverable',
    'Package',
    'Specifications',
    'Report',
    'Document',
    'Artifacts',
  ];

  /** Activity suffixes to strip — convert verbs to their artifact subject */
  private static readonly STRIP_WORDS =
    /\b(implementation|execution|gathering|provisioning)\b/gi;

  async deriveDeliverables(
    scope: ScopePhaseInput[],
    _projectContext?: ProjectContext,
  ): Promise<DeliverableGroup[]> {
    return scope
      .map((phase, index) => {
        const items: string[] = [];

        for (const task of phase.tasks) {
          const rawTitle =
            typeof task?.title === 'string' ? task.title.trim() : '';
          if (!rawTitle) continue;

          const artifact = this.taskToArtifact(rawTitle);
          if (artifact && !items.includes(artifact)) {
            items.push(artifact);
          }
        }
        if (items.length === 0) return null;

        // Doc §4: fallback = task title + role, padded to 3 minimum — never
        // the phase name; the number per phase is not fixed.
        this.padToMinimum(items, phase.tasks);

        return {
          phaseLabel: `Phase ${index + 1}`,
          phaseName: phase.phaseName,
          items: items.slice(0, 6),
        };
      })
      .filter((p): p is DeliverableGroup => !!p);
  }

  /** Convert a task title into a tangible artifact name (2-4 words, Title Case) */
  private taskToArtifact(title: string): string | null {
    // Find which artifact suffix fits this task
    let suffix = '';
    for (const rule of DeliverablesAdapterHeuristic.ARTIFACT_RULES) {
      if (rule.pattern.test(title)) {
        suffix = rule.suffix;
        break;
      }
    }

    // Extract the subject: strip activity words, clean up
    const subject = title
      .replace(DeliverablesAdapterHeuristic.STRIP_WORDS, '')
      .replace(/[^a-zA-Z0-9\s&]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!subject) return null;

    // Title-case the subject and replace "and" with "&"
    const words = subject
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .replace(/\bAnd\b/g, '&')
      .split(' ')
      .filter(Boolean);

    // Count real words (exclude "&" from word count)
    const realWordCount = (ws: string[]) => ws.filter((w) => w !== '&').length;
    const sliceByRealWords = (ws: string[], max: number) => {
      const result: string[] = [];
      let count = 0;
      for (const w of ws) {
        if (w === '&') { result.push(w); continue; }
        if (count >= max) break;
        result.push(w);
        count++;
      }
      return result;
    };

    if (suffix) {
      // Keep total to 3 real words max so it fits one line in the 3-col grid
      const suffixRealWords = suffix.split(' ').filter((w) => w !== '&').length;
      const maxSubjectWords = 3 - suffixRealWords;
      // Avoid duplicate: if subject already ends with the suffix word, skip suffix
      const subjectWords = sliceByRealWords(words, Math.max(1, maxSubjectWords));
      const subjectPart = subjectWords.join(' ');
      if (suffix.split(' ').some((sw) => subjectPart.toLowerCase().includes(sw.toLowerCase()))) {
        return sliceByRealWords(words, 3).join(' ');
      }
      return `${subjectPart} ${suffix}`;
    }

    // No rule matched — return subject capped at 3 real words
    return sliceByRealWords(words, 3).join(' ');
  }

  /**
   * Pad the items array to a 3-item minimum (doc §4) using task-derived
   * names — the task subject + an artifact suffix, never the phase name.
   */
  private padToMinimum(
    items: string[],
    tasks: ScopePhaseInput['tasks'],
  ): void {
    const MIN = 3;
    const subjects = tasks
      .map((t) => (typeof t?.title === 'string' ? t.title : ''))
      .map((title) =>
        title
          .replace(DeliverablesAdapterHeuristic.STRIP_WORDS, '')
          .replace(/[^a-zA-Z0-9\s&]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/\b\w/g, (c) => c.toUpperCase())
          .replace(/\bAnd\b/g, '&')
          .split(' ')
          .filter((w) => w !== '&')
          .slice(0, 2)
          .join(' '),
      )
      .filter(Boolean);
    if (subjects.length === 0) return;

    let idx = 0;
    while (items.length < MIN && idx <= 30) {
      const subject = subjects[idx % subjects.length];
      const suffix =
        DeliverablesAdapterHeuristic.FALLBACK_SUFFIXES[
          Math.floor(idx / subjects.length) %
            DeliverablesAdapterHeuristic.FALLBACK_SUFFIXES.length
        ];
      const candidate = `${subject} ${suffix}`;
      if (!items.includes(candidate)) items.push(candidate);
      idx++;
    }
  }
}

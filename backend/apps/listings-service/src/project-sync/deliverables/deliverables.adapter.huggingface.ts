import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeliverablesAdapter } from './deliverables.adapter';
import { DeliverablesAdapterHeuristic } from './deliverables.adapter.heuristic';
import {
  DeliverableGroup,
  ProjectContext,
  ScopePhaseInput,
} from './deliverables.types';

/**
 * HuggingFace text-generation adapter for deriving deliverables.
 *
 * Uses a free text-generation model (Mistral-7B-Instruct) to generate
 * contextually relevant deliverables from the project scope.
 *
 * Inputs per task: task title, job title (role), task description.
 * Project-level context: project type (category), project description.
 *
 * The model generates exactly 6 tangible deliverables per phase —
 * artifacts the client receives, not team activities.
 * Format: Title Case, no special characters, 2-4 words.
 *
 * Fallback: on missing API key, HTTP error, timeout, or malformed
 * response → delegates to the heuristic adapter.
 *
 * Env config:
 *   HUGGINGFACE_API_KEY               required; absent = heuristic
 *   HF_TEXT_GEN_MODEL                 default: mistralai/Mistral-7B-Instruct-v0.3
 *   DELIVERABLES_HF_TIMEOUT_MS        default: 10000
 */
@Injectable()
export class DeliverablesAdapterHuggingFace extends DeliverablesAdapter {
  private readonly logger = new Logger(DeliverablesAdapterHuggingFace.name);
  private readonly model: string;
  private readonly apiKey: string | undefined;
  private readonly timeoutMs: number;

  constructor(
    configService: ConfigService,
    private readonly heuristic: DeliverablesAdapterHeuristic,
  ) {
    super();
    this.model =
      configService.get<string>('HF_TEXT_GEN_MODEL') ||
      'mistralai/Mistral-7B-Instruct-v0.3';
    this.apiKey = configService.get<string>('HUGGINGFACE_API_KEY');
    this.timeoutMs = Number(
      configService.get<string>('DELIVERABLES_HF_TIMEOUT_MS') ?? 10000,
    );
  }

  async deriveDeliverables(
    scope: ScopePhaseInput[],
    projectContext?: ProjectContext,
  ): Promise<DeliverableGroup[]> {
    if (!this.apiKey) {
      return this.heuristic.deriveDeliverables(scope, projectContext);
    }

    try {
      const results: DeliverableGroup[] = [];
      for (let i = 0; i < scope.length; i++) {
        const phase = scope[i];
        if (phase.tasks.length === 0) continue;

        const prompt = this.buildPrompt(phase, i, projectContext);
        const items = await this.generate(prompt);

        if (items && items.length >= 3) {
          // Doc: the number of deliverables per phase is not fixed (min 3).
          // Use the model's task-derived items as-is — never pad with the
          // phase name.
          results.push({
            phaseLabel: `Phase ${i + 1}`,
            phaseName: phase.phaseName,
            items: items.slice(0, 6),
          });
        } else {
          // LLM returned too few items — fall back for this phase.
          // Pass a single-element array but fix the phaseLabel after,
          // because the heuristic always uses its own array index (0).
          const fallback = await this.heuristic.deriveDeliverables(
            [phase],
            projectContext,
          );
          //results.push(...fallback);
           results.push(...fallback.map((g) => ({ ...g, phaseLabel: `Phase ${i + 1}` })));
        }
      }
      return results;
    } catch (err) {
      this.logger.warn(
        `HF text generation failed, falling back to heuristic: ${
          err instanceof Error ? err.message : err
        }`,
      );
      return this.heuristic.deriveDeliverables(scope, projectContext);
    }
  }

  private buildPrompt(
    phase: ScopePhaseInput,
    phaseIndex: number,
    ctx?: ProjectContext,
  ): string {
    const taskLines = phase.tasks
      .map((t) => {
        const parts = [`- Task: ${t.title}`];
        if (t.roleName) parts.push(`  Role: ${t.roleName}`);
        if (t.description) parts.push(`  Description: ${t.description}`);
        return parts.join('\n');
      })
      .join('\n');

    const projectType = ctx?.projectType
      ? `Project type: ${ctx.projectType}\n`
      : '';
    const projectDesc = ctx?.projectDescription
      ? `Project description: ${ctx.projectDescription.slice(0, 500)}\n`
      : '';

    return `<s>[INST] You are generating deliverables for a project scope phase.

A deliverable is a tangible output the client receives — something the team produces and hands over.
Focus on what the client gets, not what the team does. Each deliverable must be a concrete artifact or document.

${projectType}${projectDesc}
Phase ${phaseIndex + 1}: ${phase.phaseName}
Tasks in this phase:
${taskLines}

Generate exactly 6 deliverables for this phase.
Each deliverable must be a short phrase (2-3 words), Title Case, no special characters.
Examples of good deliverables: "Architecture Blueprint", "Schema Design", "API Documentation", "Test Report", "Security Audit", "Deployment Package"
Return ONLY a JSON array of 6 strings.
[/INST]`;
  }

  private async generate(prompt: string): Promise<string[] | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(
        `https://router.huggingface.co/hf-inference/models/${this.model}/v1/chat/completions`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${this.apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
            max_tokens: 200,
            temperature: 0.3,
          }),
          signal: controller.signal,
        },
      );
      clearTimeout(timer);

      if (!res.ok) {
        this.logger.warn(`HF API returned ${res.status}: ${await res.text()}`);
        return null;
      }

      const body = (await res.json()) as any;
      const content =
        body?.choices?.[0]?.message?.content ??
        body?.generated_text ??
        (typeof body === 'string' ? body : null);

      if (!content) return null;

      return this.parseJsonArray(content);
    } catch (err) {
      clearTimeout(timer);
      this.logger.warn(
        `HF generate failed: ${err instanceof Error ? err.message : err}`,
      );
      return null;
    }
  }

  private parseJsonArray(text: string): string[] | null {
    // Extract JSON array from the response — the model may include
    // surrounding text before/after the array.
    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) return null;

    try {
      const parsed = JSON.parse(match[0]);
      if (
        !Array.isArray(parsed) ||
        parsed.length === 0 ||
        !parsed.every((item: unknown) => typeof item === 'string')
      ) {
        return null;
      }
      return parsed as string[];
    } catch {
      return null;
    }
  }
}

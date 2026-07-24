import { Injectable } from '@nestjs/common';
import { FaqAdapter } from './faq.adapter';
import { FaqContext, FaqSuggestion } from './faq.types';

/**
 * Deterministic FAQ suggestions derived from the listing's own fields.
 * Used directly when no HUGGINGFACE_API_KEY is configured, and as the
 * fallback when the model call fails or returns nothing usable.
 */
@Injectable()
export class FaqAdapterHeuristic extends FaqAdapter {
  async suggestFaqs(ctx: FaqContext): Promise<FaqSuggestion[]> {
    const isService = ctx.listingType === 'service';
    const kind = isService ? 'service' : 'project';
    const title =
      ctx.title && ctx.title !== 'Enter Project Title'
        ? ctx.title
        : `this ${kind}`;
    const cats = ctx.categories ?? [];
    const tech = [...new Set([...(ctx.skills ?? []), ...(ctx.tags ?? [])])]
      .filter(Boolean)
      .slice(0, 6);
    const summary = ctx.shortDescription || '';
    const duration = ctx.durationMonths;

    const out: FaqSuggestion[] = [];

    out.push({
      question: `What's included in ${title}?`,
      answer:
        summary ||
        `This ${kind} covers everything defined in the scope and deliverables, with each phase broken down into clear tasks so you know exactly what you're getting.`,
    });
    if (tech.length) {
      const last = tech[tech.length - 1];
      const techList =
        tech.length > 1 ? `${tech.slice(0, -1).join(', ')} and ${last}` : last;
      out.push({
        question: `What technologies and skills are used?`,
        answer: `This ${kind} is delivered using ${techList}.`,
      });
    }
    out.push({
      question: `How long does ${title} take to complete?`,
      answer: duration
        ? `The estimated timeline is around ${duration} ${
            duration === 1 ? 'month' : 'months'
          }, depending on the final scope and feedback cycles.`
        : `Timelines depend on the final scope. Once the scope is set, the estimated duration is shown in the budget breakdown.`,
    });
    out.push({
      question: `How is pricing determined?`,
      answer: `Pricing is calculated from the scope — the tasks, estimated hours, and assigned roles — and starts from the total shown at the top of the listing.`,
    });
    if (cats.length) {
      out.push({
        question: `Is this a good fit for ${cats[0]} work?`,
        answer: `Yes — this ${kind} focuses on ${cats
          .slice(0, 3)
          .join(', ')} and is built for that kind of work.`,
      });
    }
    out.push({
      question: `Can the scope be customized?`,
      answer: `Yes. Reach out before starting and the phases, tasks, and deliverables can be adjusted to fit your specific needs.`,
    });
    return out;
  }

  async suggestAnswer(ctx: FaqContext, question: string): Promise<string> {
    const all = await this.suggestFaqs(ctx);
    const match = all.find(
      (s) =>
        s.question.trim().toLowerCase() ===
        (question || '').trim().toLowerCase(),
    );
    if (match) return match.answer;
    const kind = ctx.listingType === 'service' ? 'service' : 'project';
    return (
      ctx.shortDescription ||
      `This ${kind} is designed to address exactly that — see the description and scope for the full details.`
    );
  }
}

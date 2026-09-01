import { sanitizeHtml } from './sanitize';

function escapeHtml(input: unknown): string {
  const str = input === null || input === undefined ? '' : String(input);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Only allow http(s) URLs to be embedded as src attributes — blocks javascript:/data: XSS vectors.
function safeUrl(input: unknown): string {
  if (typeof input !== 'string') return '';
  try {
    const url = new URL(input);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

function renderHero(data: Record<string, any>): string {
  const image = safeUrl(data.imageUrl);
  return `<section class="cs-block cs-block-hero">
    <h1>${escapeHtml(data.title)}</h1>
    ${data.subtitle ? `<p class="subtitle">${escapeHtml(data.subtitle)}</p>` : ''}
    ${image ? `<img src="${image}" alt="${escapeHtml(data.title)}" />` : ''}
  </section>`;
}

function renderResults(data: Record<string, any>): string {
  const metrics = Array.isArray(data.metrics) ? data.metrics : [];
  const items = metrics
    .map(
      (m: any) => `<div class="metric">
        <span class="value">${escapeHtml(m?.value)}</span>
        <span class="label">${escapeHtml(m?.label)}</span>
      </div>`,
    )
    .join('');
  return `<section class="cs-block cs-block-results"><div class="metrics">${items}</div></section>`;
}

function renderGallery(data: Record<string, any>): string {
  const images = Array.isArray(data.images) ? data.images : [];
  const items = images
    .map((entry: any) => {
      const src = safeUrl(typeof entry === 'string' ? entry : entry?.url);
      return src ? `<img src="${src}" alt="" />` : '';
    })
    .join('');
  return `<section class="cs-block cs-block-gallery"><div class="gallery-grid">${items}</div></section>`;
}

function renderTestimonial(data: Record<string, any>): string {
  const items = Array.isArray(data.items) ? data.items : [];
  const rows = items
    .map(
      (item: any) => `<figure>
        <blockquote>${sanitizeHtml(String(item?.quoteHtml ?? ''))}</blockquote>
        <figcaption>${sanitizeHtml(String(item?.authorHtml ?? ''))}${item?.roleHtml ? `, ${sanitizeHtml(String(item.roleHtml))}` : ''}</figcaption>
      </figure>`,
    )
    .join('');
  return `<section class="cs-block cs-block-testimonial">${rows}</section>`;
}

function renderBeforeAfter(data: Record<string, any>): string {
  const before = safeUrl(data.beforeImage);
  const after = safeUrl(data.afterImage);
  return `<section class="cs-block cs-block-before-after">
    <div class="comparison">
      ${before ? `<img class="before" src="${before}" alt="Before" />` : ''}
      ${after ? `<img class="after" src="${after}" alt="After" />` : ''}
    </div>
    ${data.description ? `<p>${escapeHtml(data.description)}</p>` : ''}
  </section>`;
}

function renderTextParagraph(data: Record<string, any>): string {
  // Rich-text content is allowed to contain formatting markup — sanitize rather than escape.
  return `<section class="cs-block cs-block-text-paragraph">${sanitizeHtml(String(data.content ?? ''))}</section>`;
}

// The renderers below cover the block types the frontend editor
// (components/case-study-builder.tsx) actually sends — titleHtml/bodyHtml/html
// fields are rich text from RichTextEditor, sanitized rather than escaped.

function renderIntroduction(data: Record<string, any>): string {
  const image = safeUrl(data.imageUrl);
  return `<section class="cs-block cs-block-introduction">
    <div class="cs-copy">
      <div class="cs-heading">${sanitizeHtml(String(data.titleHtml ?? ''))}</div>
      <div class="cs-body">${sanitizeHtml(String(data.bodyHtml ?? ''))}</div>
    </div>
    ${image ? `<img src="${image}" alt="" />` : ''}
  </section>`;
}

function renderBoldStatement(data: Record<string, any>): string {
  return `<section class="cs-block cs-block-bold-statement">${sanitizeHtml(String(data.html ?? ''))}</section>`;
}

function renderChallenges(data: Record<string, any>): string {
  const image = safeUrl(data.imageUrl);
  return `<section class="cs-block cs-block-challenges">
    ${image ? `<img src="${image}" alt="" />` : ''}
    <div class="cs-copy">
      <div class="cs-heading">${sanitizeHtml(String(data.titleHtml ?? ''))}</div>
      <div class="cs-body">${sanitizeHtml(String(data.bodyHtml ?? ''))}</div>
    </div>
  </section>`;
}

function renderImageText(data: Record<string, any>): string {
  const image = safeUrl(data.imageUrl);
  return `<section class="cs-block cs-block-image-text">
    <div class="cs-copy">
      <div class="cs-heading">${sanitizeHtml(String(data.titleHtml ?? ''))}</div>
      <div class="cs-body">${sanitizeHtml(String(data.bodyHtml ?? ''))}</div>
    </div>
    ${image ? `<img src="${image}" alt="" />` : ''}
  </section>`;
}

function renderConclusion(data: Record<string, any>): string {
  return `<section class="cs-block cs-block-conclusion">
    <div class="cs-heading">${sanitizeHtml(String(data.titleHtml ?? ''))}</div>
    <div class="cs-body">${sanitizeHtml(String(data.bodyHtml ?? ''))}</div>
  </section>`;
}

function renderInterview(data: Record<string, any>): string {
  const items = Array.isArray(data.items) ? data.items : [];
  const rows = items
    .map(
      (item: any) => `<li>
        <div class="cs-question">${sanitizeHtml(String(item?.questionHtml ?? ''))}</div>
        <div class="cs-answer">${sanitizeHtml(String(item?.answerHtml ?? ''))}</div>
      </li>`,
    )
    .join('');
  return `<section class="cs-block cs-block-interview">
    <div class="cs-heading">${sanitizeHtml(String(data.titleHtml ?? ''))}</div>
    <div class="cs-body">${sanitizeHtml(String(data.bodyHtml ?? ''))}</div>
    <ul class="cs-interview-items">${rows}</ul>
  </section>`;
}

function renderBigImage(data: Record<string, any>): string {
  const image = safeUrl(data.url);
  return `<section class="cs-block cs-block-big-image">
    ${image ? `<img src="${image}" alt="" />` : ''}
    ${data.caption ? `<p class="cs-caption">${escapeHtml(data.caption)}</p>` : ''}
  </section>`;
}

function renderProcess(data: Record<string, any>): string {
  const steps = Array.isArray(data.steps) ? data.steps : [];
  const items = steps
    .map(
      (step: any) => `<li>
        <div class="cs-heading">${sanitizeHtml(String(step?.titleHtml ?? ''))}</div>
        <div class="cs-body">${sanitizeHtml(String(step?.bodyHtml ?? ''))}</div>
      </li>`,
    )
    .join('');
  return `<section class="cs-block cs-block-process">
    <div class="cs-heading">${sanitizeHtml(String(data.titleHtml ?? ''))}</div>
    <div class="cs-body">${sanitizeHtml(String(data.bodyHtml ?? ''))}</div>
    <ol class="cs-process-steps">${items}</ol>
  </section>`;
}

function renderPersonas(data: Record<string, any>): string {
  const image = safeUrl(data.imageUrl);
  return `<section class="cs-block cs-block-personas">
    ${image ? `<img src="${image}" alt="" />` : ''}
    <div class="cs-heading">${sanitizeHtml(String(data.nameHtml ?? ''))}</div>
    <div class="cs-subheading">${sanitizeHtml(String(data.roleHtml ?? ''))}</div>
    <div class="cs-about">${sanitizeHtml(String(data.aboutHtml ?? ''))}</div>
    <div class="cs-goals">${sanitizeHtml(String(data.goalsHtml ?? ''))}</div>
    <div class="cs-frustrations">${sanitizeHtml(String(data.frustrationsHtml ?? ''))}</div>
  </section>`;
}

function renderVideo(data: Record<string, any>): string {
  const video = safeUrl(data.videoUrl);
  const poster = safeUrl(data.posterUrl);
  return `<section class="cs-block cs-block-video">
    ${video ? `<video src="${video}"${poster ? ` poster="${poster}"` : ''} controls></video>` : ''}
    ${data.caption ? `<p class="cs-caption">${escapeHtml(data.caption)}</p>` : ''}
  </section>`;
}

function renderCustomerJourney(data: Record<string, any>): string {
  const stages = Array.isArray(data.stages) ? data.stages : [];
  const items = stages
    .map(
      (stage: any) => `<li>
        <div class="cs-heading">${sanitizeHtml(String(stage?.titleHtml ?? ''))}</div>
        <div class="cs-body">${sanitizeHtml(String(stage?.bodyHtml ?? ''))}</div>
      </li>`,
    )
    .join('');
  return `<section class="cs-block cs-block-customer-journey">
    <div class="cs-heading">${sanitizeHtml(String(data.titleHtml ?? ''))}</div>
    <div class="cs-body">${sanitizeHtml(String(data.bodyHtml ?? ''))}</div>
    <ol class="cs-journey-stages">${items}</ol>
  </section>`;
}

function renderResultsMetrics(data: Record<string, any>): string {
  const metrics = Array.isArray(data.metrics) ? data.metrics : [];
  const items = metrics
    .map(
      (m: any) => `<div class="metric">
        <span class="value">${escapeHtml(m?.value)}</span>
        <span class="label">${escapeHtml(m?.label)}</span>
      </div>`,
    )
    .join('');
  return `<section class="cs-block cs-block-results-metrics"><div class="metrics">${items}</div></section>`;
}

function renderPrototype(data: Record<string, any>): string {
  const url = safeUrl(data.url);
  return `<section class="cs-block cs-block-prototype">
    ${url ? `<iframe src="${url}"></iframe>` : ''}
    ${data.caption ? `<p class="cs-caption">${escapeHtml(data.caption)}</p>` : ''}
  </section>`;
}

function renderCustomColumns(data: Record<string, any>): string {
  const columns = Array.isArray(data.columns) ? data.columns : [];
  const items = columns
    .map((col: any) => {
      const image = safeUrl(col?.imageUrl);
      return `<div class="cs-column">
        ${image ? `<img src="${image}" alt="" />` : ''}
        <div class="cs-heading">${sanitizeHtml(String(col?.titleHtml ?? ''))}</div>
        <div class="cs-body">${sanitizeHtml(String(col?.bodyHtml ?? ''))}</div>
      </div>`;
    })
    .join('');
  return `<section class="cs-block cs-block-custom-columns">
    <div class="cs-heading">${sanitizeHtml(String(data.titleHtml ?? ''))}</div>
    <div class="cs-columns">${items}</div>
  </section>`;
}

const RENDERERS: Record<string, (data: Record<string, any>) => string> = {
  hero: renderHero,
  results: renderResults,
  gallery: renderGallery,
  testimonial: renderTestimonial,
  'before-after': renderBeforeAfter,
  'text-paragraph': renderTextParagraph,
  introduction: renderIntroduction,
  'bold-statement': renderBoldStatement,
  challenges: renderChallenges,
  'image-text': renderImageText,
  conclusion: renderConclusion,
  interview: renderInterview,
  'big-image': renderBigImage,
  process: renderProcess,
  personas: renderPersonas,
  video: renderVideo,
  'customer-journey': renderCustomerJourney,
  'results-metrics': renderResultsMetrics,
  prototype: renderPrototype,
  'custom-columns': renderCustomColumns,
};

export function compileToHtml(schema: unknown): string {
  const blocks = Array.isArray((schema as any)?.blocks) ? (schema as any).blocks : [];

  const body = blocks
    .map((block: any) => {
      const renderer = RENDERERS[block?.type];
      return renderer ? renderer(block.data ?? {}) : '';
    })
    .join('\n');

  return `<article class="case-study">${body}</article>`;
}

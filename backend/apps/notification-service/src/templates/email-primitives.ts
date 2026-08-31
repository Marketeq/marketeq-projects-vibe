/**
 * Shared building blocks for Marketeq's transactional emails: design tokens,
 * escaping, the card shell, and the footer.
 *
 * Table-based and inline-styled on purpose: Gmail/Outlook strip <style> blocks
 * and flex/grid layout. Every URL that varies per environment (logo, app links,
 * support address) is passed in by the caller after being resolved from env.
 * Hardcoding them here is an SOP violation.
 */

export type SocialLink = {
  label: string;
  /** Text stand-in rendered when no icon asset is configured. */
  short: string;
  url: string;
  /** Absolute URL to a square PNG glyph. Falls back to `short` when absent. */
  iconUrl?: string;
};

/** Design tokens from the Figma spec: Primary/500, Dark Blue/400, Gray ramp. */
export const BRAND_BLUE = '#306CFE';
export const INK = '#22376B';
export const GRAY_800 = '#1D2939';
export const MUTED = '#667085';
export const ICON = '#98A2B3';
export const PANEL = '#F9FAFB';
export const BORDER = '#EAECF0';
/** Fill for an avatar/logo slot when the subject has no image. */
export const AVATAR_EMPTY = '#F2F4F7';
export const ICON_BORDER = '#D0D5DD';
export const FONT = "'Inter',-apple-system,'Segoe UI',Arial,Helvetica,sans-serif";
/** Card width from the spec (573px); the wrapper caps it on small screens. */
export const CARD_WIDTH = 573;
/** Marketeq wordmark, at the 147x22 aspect of its source SVG. */
export const LOGO_WIDTH = 147;
export const LOGO_HEIGHT = 22;
/** Glyph size inside the 28px social circles, leaving the design's 7px ring
 * of padding around a 12px mark. */
export const SOCIAL_GLYPH = 12;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Title-cases a person or company name for display, mirroring the same rule
 * the team cards use on the web (frontend/app/(group)/(group)/my-team/page.tsx):
 * upper-case the first letter of every word, but leave any word that already
 * contains an uppercase letter alone so deliberate casing like "eBay", "AT&T",
 * "McDonald" or "O'Brien" is not flattened. Never run it over an email
 * address, whose local part is case-sensitive by spec. */
export function capitalizeWords(value: string): string {
  return value.replace(/(^|\s)(\S+)/g, (_m, lead: string, word: string) =>
    /[A-Z]/.test(word)
      ? lead + word
      : lead + word.charAt(0).toUpperCase() + word.slice(1),
  );
}

/** Only http(s) URLs reach the markup, which blocks javascript:/data:
 * injection from any upstream field we do not control. */
export function safeUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? escapeHtml(parsed.toString())
      : null;
  } catch {
    return null;
  }
}

/** Dimensions match the wordmark's 147x22 viewBox (see
 * frontend/components/icons/marketeq-logo.tsx, the source of the asset).
 * Outlook needs both attributes or it renders the PNG at full pixel size.
 * Without a usable asset URL we fall back to a text wordmark. */
export function brandHeader(logoUrl: string | null): string {
  return logoUrl
    ? `<img src="${logoUrl}" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" alt="Marketeq"
        style="display:block;width:${LOGO_WIDTH}px;height:${LOGO_HEIGHT}px;border:0;" />`
    : `<span style="font-family:${FONT};font-size:20px;line-height:20px;font-weight:800;color:${INK};letter-spacing:-0.4px;">Marketeq</span>`;
}

/** 28px outlined circles, 10px apart, each holding a 12px glyph. Icons are
 * hosted PNGs passed in by the caller, since Gmail strips inline SVG, and a
 * link without one degrades to its short text label rather than an empty
 * circle. */
export function socialRow(links: SocialLink[]): string {
  const cells = links
    .map((link) => {
      const href = safeUrl(link.url);
      if (!href) return '';
      const iconUrl = safeUrl(link.iconUrl);
      const glyph = iconUrl
        ? `<img src="${iconUrl}" width="${SOCIAL_GLYPH}" height="${SOCIAL_GLYPH}" alt="${escapeHtml(link.label)}"
            style="display:block;width:${SOCIAL_GLYPH}px;height:${SOCIAL_GLYPH}px;border:0;" />`
        : escapeHtml(link.short);
      return `<td align="center" style="padding:0 5px;">
        <a href="${href}" title="${escapeHtml(link.label)}" style="text-decoration:none;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="28"
            style="width:28px;height:28px;background-color:#ffffff;border:1px solid ${ICON_BORDER};border-radius:50%;">
            <tr><td align="center" valign="middle"
              style="height:28px;font-family:${FONT};font-size:11px;font-weight:bold;color:${ICON};">
              ${glyph}
            </td></tr>
          </table>
        </a>
      </td>`;
    })
    .join('');

  if (!cells) return '';

  return `<tr><td align="center" style="padding:32px 0 0 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${cells}</tr></table>
  </td></tr>`;
}

/** "Questions?" block, social circles, copyright line: the identical tail on
 * every Marketeq email. Returns table rows for the card's inner table. */
export function footerRows(supportEmail: string, socialLinks: SocialLink[]): string {
  const year = new Date().getFullYear();

  return `<tr><td style="font-family:${FONT};font-size:12px;line-height:15px;font-weight:700;color:${GRAY_800};">
            Questions?
          </td></tr>
          <tr><td style="padding:12px 0 0 0;font-family:${FONT};font-size:12px;line-height:15px;font-weight:500;color:${GRAY_800};">
            If you have any questions, feel free to reach out at<br />
            <a href="mailto:${escapeHtml(supportEmail)}" style="color:${BRAND_BLUE};text-decoration:none;">${escapeHtml(supportEmail)}</a>
          </td></tr>

          ${socialRow(socialLinks)}

          <tr><td align="center" style="padding:20px 0 0 0;font-family:${FONT};font-size:12px;line-height:15px;text-align:center;letter-spacing:-0.25px;color:${MUTED};">
            &copy; ${year} Marketeq Digital Inc.. All rights reserved.
          </td></tr>`;
}

/** The white 573px card on a gray page: 6px brand bar, 32px padding, wordmark,
 * caller-supplied rows, shared footer. */
export function renderEmailShell(params: {
  title: string;
  logoUrl: string | null;
  supportEmail: string;
  socialLinks: SocialLink[];
  /** Table rows rendered between the wordmark and the footer. */
  contentRows: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(params.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${PANEL};">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${PANEL};">
  <tr><td align="center" style="padding:50px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${CARD_WIDTH}"
      style="width:${CARD_WIDTH}px;max-width:100%;background-color:#ffffff;border:1px solid ${BORDER};">
      <tr><td style="height:6px;background-color:${BRAND_BLUE};font-size:0;line-height:0;">&nbsp;</td></tr>

      <tr><td style="padding:32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">

          <tr><td style="padding:0 0 32px 0;">${brandHeader(params.logoUrl)}</td></tr>

          ${params.contentRows}

          ${footerRows(params.supportEmail, params.socialLinks)}
        </table>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

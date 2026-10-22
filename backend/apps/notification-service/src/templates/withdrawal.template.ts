/**
 * PMCM-806: the four withdrawal notifications. Each has a push (the in-app
 * notification's title and body) and a branded email.
 *
 *   N-01 submitted  — the payout started processing (informational)
 *   N-02 completed  — the money landed (informational, closing)
 *   N-03 failed     — the money is back in the balance (recovery)
 *   N-04 cancelled  — the provider cancelled it; the money is back (recovery).
 *                     Added in PM review: mirrors N-03, with "cancelled" in
 *                     place of the failure reason.
 *
 * The copy follows the ticket as written. Each push line splits into title and
 * body at its em dash, which is how the bell renders a notification.
 *
 * N-03 rules from the ticket, which this file enforces rather than trusts:
 * - It leads with the money being back in the available balance.
 * - The reason line is never blank and is only ever one of the five approved
 *   sentences. Anything else that arrives is replaced by the "no specific
 *   reason" line, so a raw provider code cannot reach the contractor.
 * - Nothing implies the contractor did something wrong.
 */

import {
  BORDER,
  BRAND_BLUE,
  FONT,
  GRAY_800,
  ICON_BORDER,
  INK,
  MUTED,
  PANEL,
  SocialLink,
  escapeHtml,
  renderEmailShell,
  safeUrl,
} from './email-primitives';

export type WithdrawalKind = 'submitted' | 'completed' | 'failed' | 'cancelled';

/** The only reason lines a contractor may see (PMCM-806 "Failure reason copy"). */
export const WITHDRAWAL_FAILURE_REASONS = [
  'Your bank rejected the transfer',
  'Your payout method needs to be verified again',
  'The account details on this method appear to be incorrect',
  'Our payment provider was temporarily unavailable',
  'We weren’t given a specific reason',
] as const;

export const NO_SPECIFIC_REASON = 'We weren’t given a specific reason';

/** Returns an approved reason line, never blank and never a raw code. */
export function normalizeFailureReason(reason: string | null | undefined): string {
  const trimmed = reason?.trim() ?? '';
  // Tolerate a straight apostrophe from the publisher; the approved copy uses ’.
  const curly = trimmed.replace(/'/g, '’');
  return (WITHDRAWAL_FAILURE_REASONS as readonly string[]).includes(curly)
    ? curly
    : NO_SPECIFIC_REASON;
}

export type WithdrawalEmailParams = {
  kind: WithdrawalKind;
  firstName?: string | null;
  /** 2dp USD strings, e.g. "650.00". */
  amountUsd: string;
  feeUsd: string;
  netAmountUsd: string;
  methodLabel: string;
  estimatedArrivalAt?: string | null;
  arrivalWindow?: string | null;
  completedAt?: string | null;
  failureReason?: string | null;
  /** The payout request id, quoted so support can find the withdrawal. */
  reference: string;
  /** "Track withdrawal" / "View receipt" destination. */
  transactionUrl: string;
  /** N-03/N-04 primary CTA: where the method can be edited or replaced. */
  reviewMethodUrl: string;
  /** N-03/N-04 secondary CTA: the withdrawal screen. */
  tryAgainUrl: string;
  logoUrl?: string;
  supportEmail: string;
  socialLinks?: SocialLink[];
};

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatUsd(value: string | null | undefined): string {
  const n = parseFloat(value ?? '');
  return usd.format(Number.isFinite(n) ? n : 0);
}

/** "Oct 16, 2026". UTC, because the recipient's time zone is not known here. */
export function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** "Oct 14, 2026, 3:04 PM UTC". */
export function formatDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return `${d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  })} UTC`;
}

/** The push: title and body of the in-app notification. */
export function buildWithdrawalPush(params: {
  kind: WithdrawalKind;
  amountUsd: string;
  netAmountUsd: string;
  methodLabel: string;
  estimatedArrivalAt?: string | null;
}): { title: string; body: string } {
  const amount = formatUsd(params.amountUsd);
  switch (params.kind) {
    case 'submitted': {
      // "Withdrawal on its way — {{amount}} to {{methodLabel}}. Estimated
      // arrival {{estimatedArrival}}." The arrival sentence is dropped when
      // no estimate exists, as the ticket allows.
      const arrival = formatDate(params.estimatedArrivalAt);
      return {
        title: 'Withdrawal on its way',
        body: `${amount} to ${params.methodLabel}.${arrival ? ` Estimated arrival ${arrival}.` : ''}`,
      };
    }
    case 'completed':
      // "{{netAmount}} delivered — Your withdrawal to {{methodLabel}} has arrived."
      return {
        title: `${formatUsd(params.netAmountUsd)} delivered`,
        body: `Your withdrawal to ${params.methodLabel} has arrived.`,
      };
    case 'failed':
      // "Withdrawal couldn’t be completed — {{amount}} has been returned to your balance."
      return {
        title: 'Withdrawal couldn’t be completed',
        body: `${amount} has been returned to your balance.`,
      };
    case 'cancelled':
      // N-04, mirrors N-03: "Withdrawal cancelled — {{amount}} has been
      // returned to your balance."
      return {
        title: 'Withdrawal cancelled',
        body: `${amount} has been returned to your balance.`,
      };
  }
}

type DetailRow = { label: string; value: string };

function detailsTable(rows: DetailRow[]): string {
  const body = rows
    .map(
      (row, i) => `<tr>
        <td style="padding:10px 16px;${i ? `border-top:1px solid ${BORDER};` : ''}font-family:${FONT};font-size:12px;line-height:15px;font-weight:500;color:${MUTED};white-space:nowrap;" valign="top">
          ${escapeHtml(row.label)}
        </td>
        <td align="right" style="padding:10px 16px;${i ? `border-top:1px solid ${BORDER};` : ''}font-family:${FONT};font-size:12px;line-height:15px;font-weight:600;color:${INK};word-break:break-word;" valign="top">
          ${escapeHtml(row.value)}
        </td>
      </tr>`,
    )
    .join('');
  return `<tr><td style="padding:24px 0 0 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
      style="background-color:#ffffff;border:1px solid ${BORDER};border-radius:8px;">
      ${body}
    </table>
  </td></tr>`;
}

function paragraph(html: string, padding = '20px 0 0 0'): string {
  return `<tr><td style="padding:${padding};font-family:${FONT};font-size:12px;line-height:18px;font-weight:400;color:${INK};">
    ${html}
  </td></tr>`;
}

function primaryButton(label: string, url: string): string {
  return `<a href="${url}"
    style="display:inline-block;background-color:${BRAND_BLUE};color:#ffffff;font-family:${FONT};font-size:14px;font-weight:600;line-height:20px;text-align:center;text-decoration:none;padding:8px 14px;border-radius:5px;box-shadow:0px 1px 2px rgba(16,24,40,0.05);">
    ${escapeHtml(label)}
  </a>`;
}

function secondaryButton(label: string, url: string): string {
  return `<a href="${url}"
    style="display:inline-block;background-color:#ffffff;color:${GRAY_800};font-family:${FONT};font-size:14px;font-weight:600;line-height:20px;text-align:center;text-decoration:none;padding:7px 13px;border:1px solid ${ICON_BORDER};border-radius:5px;box-shadow:0px 1px 2px rgba(16,24,40,0.05);">
    ${escapeHtml(label)}
  </a>`;
}

function ctaRow(buttons: string[]): string {
  const cells = buttons
    .map((b, i) => `<td style="padding:0 ${i < buttons.length - 1 ? '12px' : '0'} 0 0;">${b}</td>`)
    .join('');
  return `<tr><td style="padding:28px 0 0 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${cells}</tr></table>
  </td></tr>`;
}

function panel(rows: string): string {
  return `<tr><td style="padding:0 0 24px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
      style="background-color:${PANEL};border-radius:8px;">
      <tr><td style="padding:32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          ${rows}
        </table>
      </td></tr>
    </table>
  </td></tr>`;
}

function heading(text: string): string {
  return `<tr><td style="font-family:${FONT};font-size:20px;line-height:24px;font-weight:800;color:${INK};">
    ${escapeHtml(text)}
  </td></tr>`;
}

const NEXT_STEPS = [
  '1. Review your payout method. Check its details are up to date, or add a different method.',
  '2. Try your withdrawal again. Your balance is ready whenever you are.',
];

/** N-03 and N-04 share everything after the opening paragraph: the details,
 * "What to do next" and the two CTAs. */
function recoveryRows(
  title: string,
  openingHtml: string,
  details: DetailRow[],
  reviewMethodUrl: string,
  tryAgainUrl: string,
): string {
  return panel(
    heading(title) +
      paragraph(openingHtml) +
      detailsTable(details) +
      `<tr><td style="padding:24px 0 0 0;font-family:${FONT};font-size:14px;line-height:17px;font-weight:700;color:${INK};">
            What to do next
          </td></tr>` +
      paragraph(NEXT_STEPS.join('<br />'), '12px 0 0 0') +
      ctaRow([
        primaryButton('Review payout method', reviewMethodUrl),
        secondaryButton('Try again', tryAgainUrl),
      ]),
  );
}

function recoveryText(
  title: string,
  opening: string,
  details: DetailRow[],
  reviewMethodUrl: string,
  tryAgainUrl: string,
): string[] {
  return [
    title,
    opening,
    details.map((d) => `${d.label}: ${d.value}`).join('\n'),
    ['What to do next', ...NEXT_STEPS].join('\n'),
    `Review payout method: ${reviewMethodUrl}\nTry again: ${tryAgainUrl}`,
  ];
}

export function buildWithdrawalEmail(
  params: WithdrawalEmailParams,
): { subject: string; html: string; text: string } {
  const firstName = params.firstName?.trim();
  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,';
  const amount = formatUsd(params.amountUsd);
  const fee = formatUsd(params.feeUsd);
  const net = formatUsd(params.netAmountUsd);
  const method = params.methodLabel;
  const reference = params.reference;
  const transactionUrl = safeUrl(params.transactionUrl) ?? '#';
  const reviewMethodUrl = safeUrl(params.reviewMethodUrl) ?? '#';
  const tryAgainUrl = safeUrl(params.tryAgainUrl) ?? '#';

  let subject: string;
  let title: string;
  let rows: string;
  let textBlocks: string[];

  switch (params.kind) {
    case 'submitted': {
      const arrivalDate = formatDate(params.estimatedArrivalAt);
      const arrival = arrivalDate
        ? params.arrivalWindow
          ? `${arrivalDate} (${params.arrivalWindow})`
          : arrivalDate
        : null;
      const details: DetailRow[] = [
        { label: 'Amount', value: amount },
        { label: 'Fee', value: fee },
        { label: 'You’ll receive', value: net },
        { label: 'Method', value: method },
        ...(arrival ? [{ label: 'Estimated arrival', value: arrival }] : []),
      ];

      subject = `Your ${amount} withdrawal is processing`;
      title = 'Your withdrawal is on its way';
      rows = panel(
        heading(title) +
          paragraph(
            `${escapeHtml(greeting)} we’ve started processing your withdrawal of ` +
              `<strong>${escapeHtml(amount)}</strong> to <strong>${escapeHtml(method)}</strong>.`,
          ) +
          detailsTable(details) +
          paragraph('We’ll send you another email as soon as the money arrives.') +
          ctaRow([primaryButton('Track withdrawal', transactionUrl)]),
      );
      textBlocks = [
        title,
        `${greeting} we’ve started processing your withdrawal of ${amount} to ${method}.`,
        details.map((d) => `${d.label}: ${d.value}`).join('\n'),
        'We’ll send you another email as soon as the money arrives.',
        `Track withdrawal: ${params.transactionUrl}`,
      ];
      break;
    }

    case 'completed': {
      const completed = formatDateTime(params.completedAt);
      const details: DetailRow[] = [
        { label: 'Amount', value: amount },
        { label: 'Fee', value: fee },
        { label: 'Received', value: net },
        { label: 'Method', value: method },
        ...(completed ? [{ label: 'Completed', value: completed }] : []),
        { label: 'Reference', value: reference },
      ];

      subject = `${net} has arrived in your account`;
      title = 'Your withdrawal has arrived';
      rows = panel(
        heading(title) +
          paragraph(
            `${escapeHtml(greeting)} your withdrawal of <strong>${escapeHtml(net)}</strong> ` +
              `to <strong>${escapeHtml(method)}</strong> has been delivered.`,
          ) +
          detailsTable(details) +
          paragraph(
            'If the funds don’t appear in your account within one business day, contact us at ' +
              `<a href="mailto:${escapeHtml(params.supportEmail)}" style="color:${BRAND_BLUE};text-decoration:none;">${escapeHtml(params.supportEmail)}</a>.`,
          ) +
          ctaRow([primaryButton('View receipt', transactionUrl)]),
      );
      textBlocks = [
        title,
        `${greeting} your withdrawal of ${net} to ${method} has been delivered.`,
        details.map((d) => `${d.label}: ${d.value}`).join('\n'),
        `If the funds don’t appear in your account within one business day, contact us at ${params.supportEmail}.`,
        `View receipt: ${params.transactionUrl}`,
      ];
      break;
    }

    case 'failed': {
      const reason = normalizeFailureReason(params.failureReason);
      const details: DetailRow[] = [
        { label: 'Amount', value: amount },
        { label: 'Method', value: method },
        { label: 'Reason', value: reason },
        { label: 'Reference', value: reference },
      ];

      subject = `We couldn’t complete your ${amount} withdrawal`;
      // Leads with the money being safe, ahead of what went wrong.
      title = `${amount} is back in your balance`;
      const opening =
        `${greeting} your money is safe. We couldn’t complete your withdrawal to ${method}, ` +
        `so the full ${amount} has been returned to your available balance. No funds have been lost.`;
      rows = recoveryRows(
        title,
        `${escapeHtml(greeting)} your money is safe. We couldn’t complete your withdrawal to ` +
          `<strong>${escapeHtml(method)}</strong>, so the full <strong>${escapeHtml(amount)}</strong> ` +
          'has been returned to your available balance. No funds have been lost.',
        details,
        reviewMethodUrl,
        tryAgainUrl,
      );
      textBlocks = recoveryText(title, opening, details, params.reviewMethodUrl, params.tryAgainUrl);
      break;
    }

    case 'cancelled': {
      // N-04: no reason row. Neither Stripe nor Wise gives a contractor-facing
      // reason for a cancellation, and the status says what happened.
      const details: DetailRow[] = [
        { label: 'Amount', value: amount },
        { label: 'Method', value: method },
        { label: 'Status', value: 'Cancelled' },
        { label: 'Reference', value: reference },
      ];

      subject = `Your ${amount} withdrawal was cancelled`;
      title = `${amount} is back in your balance`;
      const opening =
        `${greeting} your money is safe. Your withdrawal to ${method} was cancelled before it ` +
        `was completed, so the full ${amount} has been returned to your available balance. No funds have been lost.`;
      rows = recoveryRows(
        title,
        `${escapeHtml(greeting)} your money is safe. Your withdrawal to ` +
          `<strong>${escapeHtml(method)}</strong> was cancelled before it was completed, so the full ` +
          `<strong>${escapeHtml(amount)}</strong> has been returned to your available balance. No funds have been lost.`,
        details,
        reviewMethodUrl,
        tryAgainUrl,
      );
      textBlocks = recoveryText(title, opening, details, params.reviewMethodUrl, params.tryAgainUrl);
      break;
    }
  }

  const html = renderEmailShell({
    title,
    logoUrl: safeUrl(params.logoUrl),
    supportEmail: params.supportEmail,
    socialLinks: params.socialLinks ?? [],
    contentRows: rows,
  });

  const text = [...textBlocks, `Questions? Reach out at ${params.supportEmail}`].join('\n\n');

  return { subject, html, text };
}

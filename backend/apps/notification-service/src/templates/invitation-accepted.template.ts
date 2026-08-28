/**
 * Branded HTML for the "your invite has been accepted" email sent back to the
 * inviter once an invitee joins their company.
 *
 * Shares the card shell, tokens and footer with the invitation email (see
 * email-primitives.ts) so the two read as one system.
 */

import {
  AVATAR_EMPTY,
  BORDER,
  BRAND_BLUE,
  FONT,
  GRAY_800,
  ICON_BORDER,
  INK,
  PANEL,
  SocialLink,
  capitalizeWords,
  escapeHtml,
  renderEmailShell,
  safeUrl,
} from './email-primitives';

export type { SocialLink };

export type InvitationAcceptedTemplateParams = {
  /** Company (or team) the invitee just joined. */
  companyName: string;
  /** Absolute URL to the company logo. Falls back to an empty neutral tile. */
  companyLogoUrl?: string;
  /** Member count shown on the company card; omitted when unknown. */
  memberCount?: number;
  /** Display name of the person who accepted; falls back to their email. */
  inviteeName?: string;
  inviteeEmail: string;
  /** Where "INVITE MORE TEAMMATES" points: the team management page. */
  inviteMoreUrl: string;
  /** Where the company card's "Launch" button points. */
  launchUrl: string;
  /** Absolute URL to the 15px rocket glyph on the Launch button. Without one
   * the button renders label-only. */
  launchIconUrl?: string;
  /** Absolute URL to a PNG/JPG wordmark. Falls back to a text wordmark. */
  logoUrl?: string;
  supportEmail: string;
  socialLinks?: SocialLink[];
};

/** 44px rounded-square company logo tile. The design centres a 32px mark in
 * the tile instead of filling it, so a non-square logo keeps its proportions.
 * With no image we render an empty neutral tile rather than initials. That
 * keeps the card's height stable without inventing a monogram from a name we
 * may only have as a raw string. */
function companyLogoCell(companyName: string, logoUrl: string | null): string {
  const mark = logoUrl
    ? `<img src="${logoUrl}" width="32" height="32" alt="${escapeHtml(companyName)}"
        style="display:block;width:32px;height:32px;object-fit:contain;border:0;" />`
    : '&nbsp;';
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="44"
      style="width:44px;height:44px;border-radius:8px;background-color:${logoUrl ? '#ffffff' : AVATAR_EMPTY};border:1.5px solid ${BORDER};">
      <tr><td align="center" valign="middle" style="height:44px;font-size:0;line-height:0;">${mark}</td></tr></table>`;
}

/** The card's Launch button: rocket glyph then label, 8px apart, in the
 * design's 105x40 outlined pill. Built as two linked cells rather than one
 * anchor holding an inline image because Outlook drops margins on images;
 * cell padding gives the exact gap. The glyph is a hosted PNG (Gmail strips
 * inline SVG) and the button falls back to label-only without one. */
function launchButton(launchUrl: string, iconUrl: string | null): string {
  const iconCell = iconUrl
    ? `<td valign="middle" style="padding:10px 8px 10px 16px;font-size:0;line-height:0;">
        <a href="${launchUrl}"><img src="${iconUrl}" width="15" height="15" alt=""
          style="display:block;width:15px;height:15px;border:0;" /></a>
      </td>`
    : '';

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="right"
      style="background-color:#ffffff;border:1px solid ${ICON_BORDER};border-radius:5px;box-shadow:0px 1px 4px rgba(0,0,0,0.03);">
      <tr>
        ${iconCell}
        <td valign="middle" style="padding:${iconUrl ? '10px 16px 10px 0' : '10px 16px'};">
          <a href="${launchUrl}"
            style="font-family:${FONT};font-size:14px;font-weight:600;line-height:20px;color:${GRAY_800};text-decoration:none;white-space:nowrap;">
            Launch
          </a>
        </td>
      </tr>
    </table>`;
}

export function buildInvitationAcceptedEmail(
  params: InvitationAcceptedTemplateParams,
): { subject: string; html: string; text: string } {
  const inviteeEmail = params.inviteeEmail.trim();
  // The invitee's name and the company are title-cased for display whatever
  // casing they were stored in, matching the team cards on the web. Email
  // addresses are left exactly as given, since local parts are case-sensitive.
  const rawInviteeName = params.inviteeName?.trim();
  const inviteeName = rawInviteeName ? capitalizeWords(rawInviteeName) : undefined;
  const displayName = inviteeName || inviteeEmail;
  const companyName = capitalizeWords(params.companyName);
  const inviteMoreUrl = safeUrl(params.inviteMoreUrl) ?? '#';
  const launchUrl = safeUrl(params.launchUrl) ?? '#';
  const companyLogoUrl = safeUrl(params.companyLogoUrl);
  const launchIconUrl = safeUrl(params.launchIconUrl);

  // "Name (email)" only when we have both. With just an email we print it
  // once instead of repeating the same string in parentheses.
  const inviteeLabelText =
    inviteeName && inviteeEmail ? `${inviteeName} (${inviteeEmail})` : displayName;

  const memberCountText =
    typeof params.memberCount === 'number' && params.memberCount > 0
      ? `${params.memberCount} ${params.memberCount === 1 ? 'Member' : 'Members'}`
      : null;

  const memberCountRow = memberCountText
    ? `<tr><td style="padding:2px 0 0 0;font-family:${FONT};font-size:12px;line-height:15px;font-weight:400;color:${INK};">
        ${escapeHtml(memberCountText)}
      </td></tr>`
    : '';

  // The company card: logo + name/member-count on the left, Launch on the
  // right. Outlook ignores flexbox, so the two halves are table cells.
  const companyCard = `<tr><td style="padding:32px 0 0 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
      style="background-color:#ffffff;border:1px solid ${BORDER};border-radius:8px;box-shadow:0px 1px 5px rgba(16,24,40,0.02);">
      <tr>
        <td style="padding:12px;" valign="middle">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td valign="middle" style="padding:0 12px 0 0;">${companyLogoCell(companyName, companyLogoUrl)}</td>
              <td valign="middle">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr><td style="font-family:${FONT};font-size:14px;line-height:17px;font-weight:500;color:${INK};">
                    ${escapeHtml(companyName)}
                  </td></tr>
                  ${memberCountRow}
                </table>
              </td>
            </tr>
          </table>
        </td>
        <td align="right" style="padding:12px;" valign="middle">
          ${launchButton(launchUrl, launchIconUrl)}
        </td>
      </tr>
    </table>
  </td></tr>`;

  // The copy column is capped at the spec's 353px so the sentences wrap the
  // way the design does; the company card below it spans the panel's full
  // inner width, so the two live in sibling tables rather than one column.
  const contentRows = `<tr><td style="padding:0 0 24px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
              style="background-color:${PANEL};border-radius:8px;">
              <tr><td align="center" style="padding:50px 32px 32px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="353"
                  style="width:353px;max-width:100%;">
                  <tr><td align="center" style="font-family:${FONT};font-size:20px;line-height:24px;font-weight:800;color:${INK};">
                    Your invite has been accepted!
                  </td></tr>

                  <tr><td align="center" style="padding:20px 0 0 0;font-family:${FONT};font-size:12px;line-height:15px;font-weight:500;color:${INK};">
                    <strong>${escapeHtml(inviteeLabelText)}</strong> has accepted to join
                    your company &ldquo;<strong>${escapeHtml(companyName)}</strong>&rdquo; on Marketeq.
                  </td></tr>

                  <tr><td align="center" style="padding:20px 0 0 0;font-family:${FONT};font-size:12px;line-height:15px;font-weight:400;color:${INK};">
                    Your team is growing. Bring more people on board to get the
                    most out of your projects.
                  </td></tr>

                  <tr><td align="center" style="padding:32px 0 0 0;">
                    <a href="${inviteMoreUrl}"
                      style="display:inline-block;background-color:${BRAND_BLUE};color:#ffffff;font-family:${FONT};font-size:14px;font-weight:600;line-height:20px;text-align:center;text-decoration:none;padding:8px 14px;border-radius:5px;box-shadow:0px 1px 2px rgba(16,24,40,0.05);">
                      INVITE MORE TEAMMATES
                    </a>
                  </td></tr>
                </table>

                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  ${companyCard}
                </table>
              </td></tr>
            </table>
          </td></tr>`;

  const html = renderEmailShell({
    title: 'Your invite has been accepted!',
    logoUrl: safeUrl(params.logoUrl),
    supportEmail: params.supportEmail,
    socialLinks: params.socialLinks ?? [],
    contentRows,
  });

  // Joined as blocks so the blank separator lines survive. A flat array
  // filtered with Boolean() would drop the '' entries meant to be spacing.
  const text = [
    'Your invite has been accepted!',
    [
      `${inviteeLabelText} has accepted to join your company "${companyName}" on Marketeq.`,
      'Your team is growing. Bring more people on board to get the most out of your projects.',
    ].join('\n'),
    [
      `INVITE MORE TEAMMATES: ${params.inviteMoreUrl}`,
      memberCountText
        ? `${companyName} — ${memberCountText}: ${params.launchUrl}`
        : `${companyName}: ${params.launchUrl}`,
    ].join('\n'),
    `Questions? Reach out at ${params.supportEmail}`,
  ].join('\n\n');

  return {
    subject: `${displayName} accepted your invitation to join ${companyName}`,
    html,
    text,
  };
}

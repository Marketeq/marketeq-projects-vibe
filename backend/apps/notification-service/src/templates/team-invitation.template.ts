/**
 * Branded HTML for the "you've been invited to a company" email.
 *
 * Table-based and inline-styled on purpose: Gmail/Outlook strip <style>
 * blocks and flex/grid layout. Every URL that varies per environment
 * (logo, app links, support address) comes in as a param resolved from env
 * by the caller. Hardcoding them here is an SOP violation. Card shell,
 * tokens and footer are shared with the other emails via email-primitives.
 */

import {
  AVATAR_EMPTY,
  BORDER,
  BRAND_BLUE,
  FONT,
  GRAY_800,
  INK,
  PANEL,
  SocialLink,
  capitalizeWords,
  escapeHtml,
  renderEmailShell,
  safeUrl,
} from './email-primitives';

export type { SocialLink };

export type TeamInvitationTemplateParams = {
  /** Company (or team) the recipient is being invited to. */
  companyName: string;
  /** Display name of the inviter; falls back to their email when absent. */
  inviterName?: string;
  inviterEmail?: string;
  inviterAvatarUrl?: string;
  note?: string;
  acceptUrl: string;
  /** Absolute URL to a PNG/JPG wordmark. Falls back to a text wordmark. */
  logoUrl?: string;
  supportEmail: string;
  socialLinks?: SocialLink[];
};

/** 64px round avatar per the spec. With no photo we deliberately render an
 * empty neutral circle rather than an initials chip. Initials derived from a
 * raw email address read as noise, so the slot stays blank but keeps its
 * height so the copy below does not shift. */
function avatarCell(displayName: string, avatarUrl: string | null): string {
  if (avatarUrl) {
    return `<img src="${avatarUrl}" width="64" height="64" alt="${escapeHtml(displayName)}"
      style="display:block;width:64px;height:64px;border-radius:50%;object-fit:cover;border:0;" />`;
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="64"
      style="width:64px;height:64px;border-radius:50%;background-color:${AVATAR_EMPTY};border:1px solid ${BORDER};">
      <tr><td style="height:64px;font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
}

export function buildTeamInvitationEmail(
  params: TeamInvitationTemplateParams,
): { subject: string; html: string; text: string } {
  const inviterEmail = params.inviterEmail?.trim() || undefined;
  // The inviter's name and the company are title-cased for display whatever
  // casing they were stored in, matching the team cards on the web. Email
  // addresses are left exactly as given, since local parts are case-sensitive.
  const rawInviterName = params.inviterName?.trim();
  const inviterName = rawInviterName ? capitalizeWords(rawInviterName) : undefined;
  const companyName = capitalizeWords(params.companyName);
  const displayName = inviterName || inviterEmail || 'A teammate';
  const acceptUrl = safeUrl(params.acceptUrl) ?? '#';
  const avatarUrl = safeUrl(params.inviterAvatarUrl);
  const note = params.note?.trim();

  // "Name (email)" only when we actually have both. With just an email we
  // print it once. The old fallback used the email as the display name and
  // then repeated it in parentheses.
  const inviterLabelText =
    inviterName && inviterEmail
      ? `${inviterName} (${inviterEmail})`
      : displayName;
  const inviterLabel = escapeHtml(inviterLabelText);

  const noteBlock = note
    ? `<tr><td style="padding:20px 0 0 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
          style="background-color:#ffffff;border:1px solid ${BORDER};border-radius:8px;">
          <tr><td style="padding:14px 16px;font-family:${FONT};font-size:12px;line-height:18px;font-weight:500;color:${GRAY_800};">
            <strong style="color:${INK};">Note from ${escapeHtml(displayName)}:</strong><br />${escapeHtml(note)}
          </td></tr>
        </table>
      </td></tr>`
    : '';

  const contentRows = `<tr><td style="padding:0 0 24px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
              style="background-color:${PANEL};border-radius:8px;">
              <tr><td align="center" style="padding:50px 32px 32px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="353"
                  style="width:353px;max-width:100%;">
                  <tr><td align="center" style="font-family:${FONT};font-size:20px;line-height:24px;font-weight:800;color:${INK};">
                    You received an invitation!
                  </td></tr>

                  <tr><td align="center" style="padding:20px 0 0 0;">${avatarCell(displayName, avatarUrl)}</td></tr>

                  <tr><td align="center" style="padding:20px 0 0 0;font-family:${FONT};font-size:12px;line-height:15px;font-weight:700;color:${INK};">
                    <strong>${inviterLabel}</strong> has invited you to join
                    their company &ldquo;<strong>${escapeHtml(companyName)}</strong>&rdquo; on Marketeq.
                  </td></tr>

                  ${noteBlock}

                  <tr><td align="center" style="padding:20px 0 0 0;">
                    <a href="${acceptUrl}"
                      style="display:inline-block;background-color:${BRAND_BLUE};color:#ffffff;font-family:${FONT};font-size:14px;font-weight:600;line-height:20px;text-align:center;text-decoration:none;padding:8px 14px;border-radius:5px;box-shadow:0px 1px 2px rgba(16,24,40,0.05);">
                      Accept Invite
                    </a>
                  </td></tr>
                </table>
              </td></tr>
            </table>
          </td></tr>`;

  const html = renderEmailShell({
    title: 'You received an invitation!',
    logoUrl: safeUrl(params.logoUrl),
    supportEmail: params.supportEmail,
    socialLinks: params.socialLinks ?? [],
    contentRows,
  });

  const text = [
    'You received an invitation!',
    '',
    `${inviterLabelText} has invited you to join their company "${companyName}" on Marketeq.`,
    note ? `Note from ${displayName}: ${note}` : '',
    '',
    `Accept your invite: ${params.acceptUrl}`,
    '',
    `Questions? Reach out at ${params.supportEmail}`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    subject: `${displayName} invited you to join ${companyName} on Marketeq`,
    html,
    text,
  };
}

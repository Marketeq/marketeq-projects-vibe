import * as crypto from 'crypto';

export function generateInviteToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

export function nowPlusDays(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export interface InviteLinkTokenPayload {
  type: 'link';
  teamId: string;
  companyId?: string;
  role: 'admin' | 'editor' | 'viewer';
  teamName?: string;
  invitedBy: string;
  invitedByEmail?: string;
  exp: number;
  /**
   * When the link was minted.
   *
   * `exp` alone cannot express the Link Settings rules (R3-02): those are
   * account-wide and live, so a link copied yesterday has to answer to the
   * expiry window configured today. Accept reads the window from the settings
   * and measures it from here. Optional, so tokens minted before this existed
   * keep verifying — they simply fall back to `exp`.
   */
  iat?: number;
}

export function generateInviteLinkToken(payload: Omit<InviteLinkTokenPayload, 'type' | 'exp'> & { exp?: number }): string {
  const secret = getInviteTokenSecret();
  const completePayload: InviteLinkTokenPayload = {
    type: 'link',
    iat: Date.now(),
    ...payload,
    exp: payload.exp ?? nowPlusDays(Number(process.env.INVITE_EXP_DAYS || 7)).getTime(),
  };
  const encodedPayload = Buffer.from(JSON.stringify(completePayload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
}

export function verifyInviteLinkToken(token: string): InviteLinkTokenPayload | null {
  const secret = getInviteTokenSecret();
  const [encodedPayload, signature] = token.split('.');

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as InviteLinkTokenPayload;
    if (payload.type !== 'link' || !payload.teamId || !payload.role || !payload.invitedBy || !payload.exp) {
      return null;
    }
    if (Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

let hasLoggedInviteSecretFallback = false;

function getInviteTokenSecret(): string {
  const secret = process.env.INVITE_TOKEN_SECRET;

  if (secret) {
    return secret;
  }

  // Local/dev fallback to avoid hard crash when dedicated invite secret isn't configured.
  if (process.env.NODE_ENV !== 'production') {
    const fallback = process.env.JWT_SECRET || process.env.AUTH_REFRESH_SECRET;
    if (fallback) {
      if (!hasLoggedInviteSecretFallback) {
        console.warn(
          '[invitations] INVITE_TOKEN_SECRET is missing; using JWT fallback for local development.',
        );
        hasLoggedInviteSecretFallback = true;
      }
      return fallback;
    }
  }

  if (!secret) {
    throw new Error('INVITE_TOKEN_SECRET is not configured');
  }

  return secret;
}

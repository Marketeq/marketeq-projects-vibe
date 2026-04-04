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
  role: 'admin' | 'editor' | 'viewer';
  teamName?: string;
  invitedBy: string;
  exp: number;
}

export function generateInviteLinkToken(payload: Omit<InviteLinkTokenPayload, 'type' | 'exp'> & { exp?: number }): string {
  const secret = getInviteTokenSecret();
  const completePayload: InviteLinkTokenPayload = {
    type: 'link',
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

function getInviteTokenSecret(): string {
  const secret = process.env.INVITE_TOKEN_SECRET;

  if (!secret) {
    throw new Error('INVITE_TOKEN_SECRET is not configured');
  }

  return secret;
}

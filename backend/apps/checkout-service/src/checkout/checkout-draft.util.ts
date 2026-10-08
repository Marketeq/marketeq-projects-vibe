import { ConflictException, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { CheckoutDraft } from './entities/checkout-draft.entity';
import { CheckoutSession } from './entities/checkout-session.entity';

export const DRAFT_IDLE_DAYS = 30;

export const isDraftExpired = (
  draft: Pick<CheckoutDraft, 'updatedAt' | 'lastOpenedAt'>,
  now: number = Date.now(),
): boolean => {
  const lastActive = Math.max(
    new Date(draft.updatedAt).getTime(),
    new Date(draft.lastOpenedAt).getTime(),
  );
  return now - lastActive > DRAFT_IDLE_DAYS * 24 * 60 * 60 * 1000;
};

export const loadOwnedDraft = async (
  manager: EntityManager,
  clientId: string,
  draftId: string,
  options: { lock?: boolean } = {},
): Promise<CheckoutDraft> => {
  const draft = await manager.findOne(CheckoutDraft, {
    where: { id: draftId, clientId },
    ...(options.lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
  });
  if (!draft || isDraftExpired(draft)) {
    throw new NotFoundException('Draft not found');
  }
  return draft;
};

export const releaseSession = async (
  manager: EntityManager,
  draft: CheckoutDraft,
): Promise<void> => {
  if (!draft.sessionId) return;
  const session = await manager.findOne(CheckoutSession, {
    where: { id: draft.sessionId },
  });
  if (session?.status === 'success') {
    throw new ConflictException({
      code: 'SESSION_ALREADY_PAID',
      message: 'This checkout has already been paid',
    });
  }
  if (session?.status === 'pending') {
    await manager.update(CheckoutSession, session.id, { status: 'cancelled' });
  }
  await manager.update(CheckoutDraft, draft.id, { sessionId: null });
  draft.sessionId = null;
};

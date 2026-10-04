import { NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { CheckoutDraft } from './entities/checkout-draft.entity';

export const DRAFT_IDLE_DAYS = 30;

export const isDraftExpired = (updatedAt: Date, now: number = Date.now()): boolean =>
  now - new Date(updatedAt).getTime() > DRAFT_IDLE_DAYS * 24 * 60 * 60 * 1000;

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
  if (!draft || isDraftExpired(draft.updatedAt)) {
    throw new NotFoundException('Draft not found');
  }
  return draft;
};

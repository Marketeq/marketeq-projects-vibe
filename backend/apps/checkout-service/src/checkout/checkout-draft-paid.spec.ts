import { ConflictException, NotFoundException } from '@nestjs/common';
import { CheckoutDraftService } from './checkout-draft.service';
import { DRAFT_IDLE_DAYS, loadOwnedDraft } from './checkout-draft.util';
import { CheckoutSession } from './entities/checkout-session.entity';

const DAY = 24 * 60 * 60 * 1000;

const draftRow = (idleDays: number, sessionId: string | null = 'session-1') => {
  const at = new Date(Date.now() - idleDays * DAY);
  return {
    id: 'draft-1',
    clientId: 'client-1',
    sessionId,
    updatedAt: at,
    lastOpenedAt: at,
  };
};

const buildManager = (draft: unknown, sessionStatus: string | null) => ({
  findOne: jest.fn(async (entity: unknown) =>
    entity === CheckoutSession
      ? sessionStatus
        ? { id: 'session-1', status: sessionStatus }
        : null
      : draft,
  ),
  update: jest.fn(),
  delete: jest.fn(),
});

describe('paid draft', () => {
  describe('loadOwnedDraft', () => {
    it('loads an idle draft whose session is paid', async () => {
      const manager = buildManager(draftRow(DRAFT_IDLE_DAYS + 5), 'success');
      await expect(
        loadOwnedDraft(manager as never, 'client-1', 'draft-1'),
      ).resolves.toMatchObject({ id: 'draft-1' });
    });

    it('still expires an idle draft that is not paid', async () => {
      for (const status of ['pending', 'cancelled', 'failed', null]) {
        const manager = buildManager(draftRow(DRAFT_IDLE_DAYS + 5), status);
        await expect(
          loadOwnedDraft(manager as never, 'client-1', 'draft-1'),
        ).rejects.toBeInstanceOf(NotFoundException);
      }
    });

    it('expires an idle draft that has no session', async () => {
      const manager = buildManager(
        draftRow(DRAFT_IDLE_DAYS + 5, null),
        'success',
      );
      await expect(
        loadOwnedDraft(manager as never, 'client-1', 'draft-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('loads a recent draft without looking at the session', async () => {
      const manager = buildManager(draftRow(1), null);
      await expect(
        loadOwnedDraft(manager as never, 'client-1', 'draft-1'),
      ).resolves.toMatchObject({ id: 'draft-1' });
    });

    it('does not find a draft of another client or a missing one', async () => {
      const manager = buildManager(null, 'success');
      await expect(
        loadOwnedDraft(manager as never, 'client-1', 'draft-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('discard', () => {
    const build = (draft: unknown, sessionStatus: string | null) => {
      const manager = buildManager(draft, sessionStatus);
      const dataSource = {
        transaction: jest.fn(async (work: (m: unknown) => unknown) =>
          work(manager),
        ),
      };
      const service = new CheckoutDraftService(
        {} as never,
        {} as never,
        dataSource as never,
        {} as never,
      );
      return { service, manager };
    };

    it('refuses to delete a draft whose session is paid', async () => {
      const { service, manager } = build(draftRow(1), 'success');
      await expect(service.discard('client-1', 'draft-1')).rejects.toMatchObject(
        { response: { code: 'SESSION_ALREADY_PAID' } },
      );
      await expect(
        service.discard('client-1', 'draft-1'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(manager.delete).not.toHaveBeenCalled();
      expect(manager.update).not.toHaveBeenCalled();
    });

    it('refuses an old paid draft too', async () => {
      const { service, manager } = build(
        draftRow(DRAFT_IDLE_DAYS + 5),
        'success',
      );
      await expect(
        service.discard('client-1', 'draft-1'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(manager.delete).not.toHaveBeenCalled();
    });

    it('deletes a draft whose session is pending and cancels that session', async () => {
      const { service, manager } = build(draftRow(1), 'pending');
      await expect(service.discard('client-1', 'draft-1')).resolves.toEqual({
        deleted: true,
      });
      expect(manager.update).toHaveBeenCalledWith(
        CheckoutSession,
        { id: 'session-1', status: 'pending' },
        { status: 'cancelled' },
      );
      expect(manager.delete).toHaveBeenCalled();
    });

    it('deletes a draft with a cancelled session or no session', async () => {
      for (const status of ['cancelled', 'failed', null]) {
        const { service, manager } = build(draftRow(1), status);
        await service.discard('client-1', 'draft-1');
        expect(manager.delete).toHaveBeenCalled();
      }
      const { service, manager } = build(draftRow(1, null), null);
      await service.discard('client-1', 'draft-1');
      expect(manager.delete).toHaveBeenCalled();
    });
  });
});

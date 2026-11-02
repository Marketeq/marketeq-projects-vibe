import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { InviteSettingsService } from './invite-settings.service';
import {
  InviteAccessLevel,
  InviteSettings,
  LinkExpirationPreset,
} from '../entities/invite-settings.entity';

const DAY_MS = 24 * 60 * 60 * 1000;

const defaults = (over: Partial<InviteSettings> = {}): InviteSettings =>
  ({
    accountId: 'account-1',
    userTracking: false,
    guestSharing: false,
    accessRestricted: false,
    accessLevel: InviteAccessLevel.ANYONE,
    linkExpirationEnabled: true,
    linkExpirationPreset: LinkExpirationPreset.DAYS_30,
    linkExpiresAt: null,
    passwordEnabled: false,
    passwordHash: null,
    notificationAlerts: true,
    embedCode: false,
    ...over,
  }) as InviteSettings;

describe('InviteSettingsService', () => {
  let repo: { findOne: jest.Mock; save: jest.Mock; create: jest.Mock };
  let userService: Record<string, jest.Mock>;
  let svc: InviteSettingsService;

  beforeEach(() => {
    repo = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation((v: unknown) => Promise.resolve(v)),
      create: jest.fn().mockImplementation((v: unknown) => v),
    };
    userService = {
      getCompany: jest.fn(),
      getCompanyMembership: jest.fn(),
    };
    svc = new InviteSettingsService(repo as any, userService as any);
  });

  describe('reading an account that has never opened the panel', () => {
    it('answers from the defaults without creating a row', async () => {
      const settings = await svc.get('account-1');

      expect(settings.linkExpirationEnabled).toBe(true);
      expect(settings.linkExpirationPreset).toBe(LinkExpirationPreset.DAYS_30);
      expect(settings.accessLevel).toBe(InviteAccessLevel.ANYONE);
      expect(settings.passwordEnabled).toBe(false);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('leaves the invitee in-app notification on, which is what ships today', async () => {
      // The panel draws this switch off. Defaulting to the drawing would
      // silently stop a notification every existing account already sends.
      expect((await svc.get('account-1')).notificationAlerts).toBe(true);
    });
  });

  describe('saving a single changed control (R3-14)', () => {
    it('leaves every field the request did not mention', async () => {
      repo.findOne.mockResolvedValue(defaults({ userTracking: true }));

      const saved = await svc.update('account-1', { guestSharing: true });

      expect(saved.guestSharing).toBe(true);
      expect(saved.userTracking).toBe(true);
      expect(saved.linkExpirationPreset).toBe(LinkExpirationPreset.DAYS_30);
    });

    it('stores the link password as a hash, never as given', async () => {
      repo.findOne.mockResolvedValue(defaults());

      const saved = await svc.update('account-1', {
        passwordEnabled: true,
        password: 'open-sesame',
      });

      expect(saved.passwordHash).toBeTruthy();
      expect(saved.passwordHash).not.toBe('open-sesame');
      await expect(bcrypt.compare('open-sesame', saved.passwordHash!)).resolves.toBe(true);
    });

    it('discards the hash when the password control is switched off', async () => {
      repo.findOne.mockResolvedValue(
        defaults({ passwordEnabled: true, passwordHash: 'a-stored-hash' }),
      );

      const saved = await svc.update('account-1', { passwordEnabled: false });

      expect(saved.passwordEnabled).toBe(false);
      expect(saved.passwordHash).toBeNull();
    });

    it('falls back to a preset when a custom expiry arrives with no date', async () => {
      repo.findOne.mockResolvedValue(defaults());

      const saved = await svc.update('account-1', {
        linkExpirationEnabled: true,
        linkExpirationPreset: LinkExpirationPreset.CUSTOM,
      });

      // Half a control is not a reason to fail the whole save, and the table
      // refuses an unenforceable custom expiry anyway.
      expect(saved.linkExpirationPreset).toBe(LinkExpirationPreset.DAYS_30);
    });

    it('never exposes the password through the public shape', async () => {
      repo.findOne.mockResolvedValue(
        defaults({ passwordEnabled: true, passwordHash: 'a-stored-hash' }),
      );

      const body = svc.toPublic(await svc.get('account-1'));

      expect(body.passwordSet).toBe(true);
      expect(JSON.stringify(body)).not.toContain('a-stored-hash');
      expect('passwordHash' in body).toBe(false);
    });
  });

  describe('when a link stops working', () => {
    const issuedAt = Date.UTC(2026, 0, 1);

    it.each([
      [LinkExpirationPreset.DAYS_15, 15],
      [LinkExpirationPreset.DAYS_30, 30],
      [LinkExpirationPreset.DAYS_90, 90],
    ])('measures %s from when the link was minted', (preset, days) => {
      const deadline = svc.resolveLinkDeadline(
        defaults({ linkExpirationPreset: preset }),
        issuedAt,
      );

      expect(deadline).toBe(issuedAt + days * DAY_MS);
    });

    it('uses the absolute date for a custom expiry', () => {
      const when = new Date(Date.UTC(2026, 5, 17, 9, 30));

      const deadline = svc.resolveLinkDeadline(
        defaults({
          linkExpirationPreset: LinkExpirationPreset.CUSTOM,
          linkExpiresAt: when,
        }),
        issuedAt,
      );

      expect(deadline).toBe(when.getTime());
    });

    it('returns null — never — when expiry is switched off', () => {
      expect(
        svc.resolveLinkDeadline(defaults({ linkExpirationEnabled: false }), issuedAt),
      ).toBeNull();
    });
  });

  describe('who has access', () => {
    it('ignores a stored level while the switch is off', () => {
      // The switch and the dropdown are separate controls, so a level has to
      // survive the switch being toggled off and back on without taking
      // effect in between.
      const settings = defaults({
        accessRestricted: false,
        accessLevel: InviteAccessLevel.OWNER_ONLY,
      });

      expect(svc.effectiveAccessLevel(settings)).toBe(InviteAccessLevel.ANYONE);
    });

    it('applies the level once the switch is on', () => {
      const settings = defaults({
        accessRestricted: true,
        accessLevel: InviteAccessLevel.INVITED_GUESTS,
      });

      expect(svc.effectiveAccessLevel(settings)).toBe(InviteAccessLevel.INVITED_GUESTS);
    });

    it('only requires a password once one has actually been set', () => {
      expect(svc.isPasswordRequired(defaults({ passwordEnabled: true }))).toBe(false);
      expect(
        svc.isPasswordRequired(defaults({ passwordEnabled: true, passwordHash: 'h' })),
      ).toBe(true);
    });
  });

  describe('who may change the settings (R3-12 roles frame)', () => {
    it('always allows the account owner', async () => {
      await expect(svc.assertCanManage('account-1', 'account-1')).resolves.toBeUndefined();
      expect(userService.getCompanyMembership).not.toHaveBeenCalled();
    });

    it('allows an administrator of a company the account owns', async () => {
      userService.getCompany.mockResolvedValue({ id: 'c1', ownerUserId: 'account-1' });
      userService.getCompanyMembership.mockResolvedValue({
        permissions: ['administrator', 'treasurer'],
      });

      await expect(
        svc.assertCanManage('account-1', 'other-user', 'c1'),
      ).resolves.toBeUndefined();
    });

    it('refuses a coordinator, who the roles frame says cannot change invite settings', async () => {
      userService.getCompany.mockResolvedValue({ id: 'c1', ownerUserId: 'account-1' });
      userService.getCompanyMembership.mockResolvedValue({
        permissions: ['coordinator'],
      });

      await expect(svc.assertCanManage('account-1', 'other-user', 'c1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('refuses an administrator of some other account\'s company', async () => {
      // Being an administrator somewhere is not being an administrator here.
      userService.getCompany.mockResolvedValue({ id: 'c1', ownerUserId: 'someone-else' });
      userService.getCompanyMembership.mockResolvedValue({
        permissions: ['administrator'],
      });

      await expect(svc.assertCanManage('account-1', 'other-user', 'c1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('refuses a stranger with no company context at all', async () => {
      await expect(svc.assertCanManage('account-1', 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('who may read the settings', () => {
    it('always allows the account owner', async () => {
      await expect(svc.assertCanRead('account-1', 'account-1')).resolves.toBeUndefined();
      expect(userService.getCompanyMembership).not.toHaveBeenCalled();
    });

    it('allows any member of a company the account owns', async () => {
      userService.getCompany.mockResolvedValue({ id: 'c1', ownerUserId: 'account-1' });
      userService.getCompanyMembership.mockResolvedValue({ permissions: [] });

      await expect(svc.assertCanRead('account-1', 'other-user', 'c1')).resolves.toBeUndefined();
    });

    it('refuses a member of some other account\'s company', async () => {
      userService.getCompany.mockResolvedValue({ id: 'c1', ownerUserId: 'someone-else' });
      userService.getCompanyMembership.mockResolvedValue({ permissions: ['administrator'] });

      await expect(svc.assertCanRead('account-1', 'other-user', 'c1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('refuses a non-member of the account\'s company', async () => {
      userService.getCompany.mockResolvedValue({ id: 'c1', ownerUserId: 'account-1' });
      userService.getCompanyMembership.mockResolvedValue(null);

      await expect(svc.assertCanRead('account-1', 'other-user', 'c1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('refuses a stranger who names another account with no company', async () => {
      await expect(svc.assertCanRead('account-1', 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});

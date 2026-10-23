import {
  AUTH_TIME_FUTURE_SKEW_MS,
  LOGIN_REMINDER_DELAY_MS,
  deriveLoginReminderAt,
  readLoginSession,
} from './login-reminder';
import { deriveTravelReminderSchedule } from './travel-mode-state';
import { DeclaredDuration, TravelClassification } from '../../entities/enums/identity-verification.enums';
import { ProfileStatusResponseDto } from '../../dto/response/profile-status.response.dto';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const DAY = 24 * 60 * MINUTE;
const ACTIVATED = new Date('2026-06-01T12:00:00.000Z');
const NOW = Date.parse('2026-06-10T09:30:00.000Z');
const SID = '7f3c1d9e-1b2a-4c3d-8e4f-5a6b7c8d9e0f';

const fields = (over: Record<string, unknown> = {}) => ({
  travelClassification: TravelClassification.TEMPORARILY_TRAVELING,
  travelModeActive: true,
  travelModeActivatedAt: ACTIVATED,
  declaredDuration: DeclaredDuration.ONE_TO_TWO_WEEKS, // 13 days
  lastTravelReminderSentAt: null as Date | null,
  ...over,
});
const endsAt = (f: ReturnType<typeof fields>) =>
  ACTIVATED.getTime() +
  (f.declaredDuration === DeclaredDuration.A_FEW_DAYS ? 7 : 13) * DAY;
const at = (days: number, offsetMs = 0) =>
  new Date(ACTIVATED.getTime() + days * DAY + offsetMs);

describe('readLoginSession — the verified token’s login identity', () => {
  const user = (over: Record<string, unknown> = {}) => ({
    sub: 'user-1',
    sid: SID,
    auth_time: Math.floor(NOW / SECOND) - 30,
    ...over,
  });

  it('reads a valid sid and auth_time, converting seconds to milliseconds', () => {
    expect(readLoginSession(user(), NOW)).toEqual({ sid: SID, authTimeMs: (Math.floor(NOW / SECOND) - 30) * SECOND });
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'token'],
    ['an array', []],
    ['an empty payload (a token from before auth_time existed)', {}],
  ])('%s gives no session', (_label, value) => {
    expect(readLoginSession(value, NOW)).toBeNull();
  });

  it.each([
    ['a missing sid', { sid: undefined }],
    ['a non-string sid', { sid: 12345 }],
    ['an empty sid', { sid: '' }],
    ['a sid with spaces', { sid: 'not a sid' }],
    ['a sid with SQL-ish characters', { sid: "x'; DROP TABLE y;--" }],
    ['an over-long sid', { sid: 'a'.repeat(129) }],
  ])('%s gives no session', (_label, over) => {
    expect(readLoginSession(user(over), NOW)).toBeNull();
  });

  it.each([
    ['a missing auth_time', { auth_time: undefined }],
    ['a numeric string', { auth_time: String(Math.floor(NOW / SECOND) - 30) }],
    ['a fractional number', { auth_time: Math.floor(NOW / SECOND) - 30.5 }],
    ['zero', { auth_time: 0 }],
    ['a negative number', { auth_time: -1 }],
    ['NaN', { auth_time: Number.NaN }],
    ['Infinity', { auth_time: Number.POSITIVE_INFINITY }],
    ['null', { auth_time: null }],
    ['milliseconds given by mistake', { auth_time: NOW }],
    ['61 seconds in the future', { auth_time: Math.floor(NOW / SECOND) + 61 }],
    ['a day in the future', { auth_time: Math.floor(NOW / SECOND) + 86400 }],
  ])('%s gives no session', (_label, over) => {
    expect(readLoginSession(user(over), NOW)).toBeNull();
  });

  it('accepts a little clock skew ahead, up to exactly the tolerance', () => {
    const nowSeconds = Math.floor(NOW / SECOND);
    expect(readLoginSession(user({ auth_time: nowSeconds + 30 }), NOW)).not.toBeNull();
    expect(readLoginSession(user({ auth_time: nowSeconds + AUTH_TIME_FUTURE_SKEW_MS / SECOND }), NOW)).not.toBeNull();
  });

  it('an unusable clock gives no session', () => {
    expect(readLoginSession(user(), Number.NaN)).toBeNull();
  });
});

describe('deriveLoginReminderAt — exactly 5 minutes after authentication', () => {
  const login = (days: number, offsetMs = 0) => at(days, offsetMs).getTime();

  it('is authentication + 5 minutes when Travel Mode was already active at login', () => {
    const authMs = login(1, 7 * MINUTE);
    expect(deriveLoginReminderAt(fields(), authMs, authMs + HOUR())).toEqual(new Date(authMs + LOGIN_REMINDER_DELAY_MS));
    expect(LOGIN_REMINDER_DELAY_MS).toBe(5 * 60 * 1000);
  });

  it('does not depend on when "now" is, as long as the period is still active', () => {
    const authMs = login(1);
    for (const nowMs of [authMs, authMs + 4 * MINUTE, authMs + 6 * MINUTE, authMs + 3 * DAY]) {
      expect(deriveLoginReminderAt(fields(), authMs, nowMs)).toEqual(new Date(authMs + 5 * MINUTE));
    }
  });

  describe('only when Travel Mode was active at authentication', () => {
    it('a login before the activation has no login reminder', () => {
      expect(deriveLoginReminderAt(fields(), ACTIVATED.getTime() - SECOND, ACTIVATED.getTime() + MINUTE)).toBeNull();
      expect(deriveLoginReminderAt(fields(), ACTIVATED.getTime() - DAY, NOW)).toBeNull();
    });

    it('a login in the same second as the activation counts (auth_time has whole-second resolution)', () => {
      const activated = new Date(ACTIVATED.getTime() + 500);
      const authMs = ACTIVATED.getTime(); // the floor of the login's second
      expect(deriveLoginReminderAt(fields({ travelModeActivatedAt: activated }), authMs, authMs + MINUTE)).toEqual(
        new Date(authMs + 5 * MINUTE),
      );
    });

    it('a login at the exact activation instant counts', () => {
      expect(deriveLoginReminderAt(fields(), ACTIVATED.getTime(), ACTIVATED.getTime() + MINUTE)).toEqual(
        new Date(ACTIVATED.getTime() + 5 * MINUTE),
      );
    });

    it('a login after the period ended has none', () => {
      const f = fields();
      expect(deriveLoginReminderAt(f, endsAt(f), endsAt(f) + MINUTE)).toBeNull();
      expect(deriveLoginReminderAt(f, endsAt(f) + DAY, endsAt(f) + DAY + MINUTE)).toBeNull();
    });
  });

  describe('never after expiry', () => {
    it('is none once "now" is at or after the end, even for a login during the period', () => {
      const f = fields();
      const authMs = endsAt(f) - 2 * DAY;
      expect(deriveLoginReminderAt(f, authMs, endsAt(f) - 1)).not.toBeNull();
      expect(deriveLoginReminderAt(f, authMs, endsAt(f))).toBeNull();
      expect(deriveLoginReminderAt(f, authMs, endsAt(f) + DAY)).toBeNull();
    });

    it('is none when the reminder itself would land at or after the end', () => {
      const f = fields();
      expect(deriveLoginReminderAt(f, endsAt(f) - 5 * MINUTE, endsAt(f) - 4 * MINUTE)).toBeNull(); // lands exactly on the end
      expect(deriveLoginReminderAt(f, endsAt(f) - 4 * MINUTE, endsAt(f) - 3 * MINUTE)).toBeNull();
      expect(deriveLoginReminderAt(f, endsAt(f) - 5 * MINUTE - SECOND, endsAt(f) - 4 * MINUTE)).toEqual(
        new Date(endsAt(f) - SECOND),
      );
    });

    it('applies to the 7-day "A few days" option: a login on day 5 has one, a login in the last minutes does not', () => {
      const few = fields({ declaredDuration: DeclaredDuration.A_FEW_DAYS });
      expect(deriveLoginReminderAt(few, login(5), login(5, MINUTE))).toEqual(
        at(5, 5 * MINUTE),
      );
      expect(
        deriveLoginReminderAt(
          few,
          login(7, -3 * MINUTE),
          login(7, -2 * MINUTE),
        ),
      ).toBeNull();
    });
  });

  describe('fails closed on anything that is not a clean active period', () => {
    const authMs = login(1);
    it.each([
      ['no Travel Mode at all', { travelClassification: null, travelModeActive: false, travelModeActivatedAt: null, declaredDuration: null }],
      ['a choice still waiting for its duration', { travelModeActive: false, travelModeActivatedAt: null, declaredDuration: null }],
      ['raw-active data with no activation time', { travelModeActivatedAt: null }],
      ['an unknown duration', { declaredDuration: 'forever' }],
      ['an invalid activation time', { travelModeActivatedAt: new Date('not a date') }],
    ])('%s has no login reminder', (_label, over) => {
      expect(deriveLoginReminderAt(fields(over), authMs, authMs + MINUTE)).toBeNull();
    });

    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('an unusable authentication time (%p) has none', (value) => {
      expect(deriveLoginReminderAt(fields(), value, NOW)).toBeNull();
    });
  });
});

describe('deriveTravelReminderSchedule with a login occurrence — day 3 / day 7 stay separate', () => {
  const dayOnly = (f = fields(), nowMs = NOW) => deriveTravelReminderSchedule(f, nowMs);

  it('omitted (or null) is exactly the day 3 / day 7 schedule, as before', () => {
    for (const nowMs of [at(0, MINUTE).getTime(), at(2).getTime(), at(3, MINUTE).getTime(), at(8).getTime()]) {
      expect(deriveTravelReminderSchedule(fields(), nowMs, null)).toEqual(dayOnly(fields(), nowMs));
      expect(deriveTravelReminderSchedule(fields(), nowMs)).toEqual(dayOnly(fields(), nowMs));
    }
  });

  it('reports the login reminder when it is the earliest unclaimed one', () => {
    const loginAt = at(1, 5 * MINUTE);
    const before = deriveTravelReminderSchedule(fields(), loginAt.getTime() - MINUTE, loginAt);
    expect(before).toEqual({ due: false, availableAt: loginAt });
    const after = deriveTravelReminderSchedule(fields(), loginAt.getTime() + MINUTE, loginAt);
    expect(after).toEqual({ due: true, availableAt: loginAt });
  });

  it('keeps day 3 as the next occurrence once the login one is not offered (claimed)', () => {
    const nowMs = at(1, 10 * MINUTE).getTime();
    expect(deriveTravelReminderSchedule(fields(), nowMs, null)).toEqual({ due: false, availableAt: at(3) });
  });

  it('reports whichever of the two is earlier', () => {
    const lateLogin = at(5);
    expect(deriveTravelReminderSchedule(fields(), at(1).getTime(), lateLogin).availableAt).toEqual(at(3));
    const earlyLogin = at(2);
    expect(deriveTravelReminderSchedule(fields(), at(1).getTime(), earlyLogin).availableAt).toEqual(earlyLogin);
  });

  it('a login reminder due together with day 3 is reported as ONE due occurrence', () => {
    const loginAt = at(3, -2 * MINUTE);
    const result = deriveTravelReminderSchedule(fields(), at(3, MINUTE).getTime(), loginAt);
    expect(result).toEqual({ due: true, availableAt: loginAt });
  });

  it('does not read or move the day cursor: a day claim leaves the login occurrence in place', () => {
    const loginAt = at(4);
    const claimedDay3 = fields({ lastTravelReminderSentAt: at(3, MINUTE) });
    expect(deriveTravelReminderSchedule(claimedDay3, at(3, 2 * MINUTE).getTime(), loginAt).availableAt).toEqual(loginAt);
  });

  it('still reports the login reminder after every day occurrence is claimed or does not exist', () => {
    const few = fields({
      declaredDuration: DeclaredDuration.A_FEW_DAYS,
      lastTravelReminderSentAt: at(6, MINUTE),
    });
    const loginAt = at(6, 2 * MINUTE);
    expect(
      deriveTravelReminderSchedule(few, at(6, MINUTE).getTime(), null),
    ).toEqual({ due: false, availableAt: null });
    expect(
      deriveTravelReminderSchedule(few, at(6, MINUTE).getTime(), loginAt),
    ).toEqual({ due: false, availableAt: loginAt });
  });

  it('ignores a login occurrence at or after the end of the period', () => {
    const f = fields();
    expect(deriveTravelReminderSchedule(f, at(1).getTime(), new Date(endsAt(f))).availableAt).toEqual(at(3));
    expect(deriveTravelReminderSchedule(f, at(1).getTime(), new Date(endsAt(f) + DAY)).availableAt).toEqual(at(3));
  });

  it.each([new Date('not a date'), 'x' as unknown as Date, 5 as unknown as Date])(
    'ignores an unusable login occurrence (%p)',
    (bad) => {
      expect(deriveTravelReminderSchedule(fields(), at(1).getTime(), bad)).toEqual(dayOnly(fields(), at(1).getTime()));
    },
  );

  it('nothing is reported after expiry, whatever the login occurrence says', () => {
    const f = fields();
    expect(deriveTravelReminderSchedule(f, endsAt(f) + MINUTE, at(1))).toEqual({ due: false, availableAt: null });
  });

  it('fails closed on an unusable day cursor, even with a login occurrence', () => {
    const broken = fields({ lastTravelReminderSentAt: new Date('not a date') });
    expect(deriveTravelReminderSchedule(broken, at(1).getTime(), at(1, 5 * MINUTE))).toEqual({ due: false, availableAt: null });
  });

  it('an inactive Travel Mode reports nothing', () => {
    const none = fields({ travelClassification: null, travelModeActive: false, travelModeActivatedAt: null, declaredDuration: null });
    expect(deriveTravelReminderSchedule(none, NOW, at(1))).toEqual({ due: false, availableAt: null });
  });
});

describe('ProfileStatusResponseDto — the login reminder shows on the existing reminder fields', () => {
  const entity = (over: Record<string, unknown> = {}): any => ({
    verifiedHomeCountry: 'US',
    detectedCountry: 'US',
    travelClassification: TravelClassification.TEMPORARILY_TRAVELING,
    travelModeActive: true,
    travelModeActivatedAt: ACTIVATED,
    declaredDuration: DeclaredDuration.ONE_TO_TWO_WEEKS,
    lastTravelReminderSentAt: null,
    identityVerificationStatus: 'verified',
    locationVerificationStatus: 'verified',
    ...over,
  });
  const loginAt = at(1, 5 * MINUTE);

  it('reports the login occurrence as due, with no new field', () => {
    const dto = ProfileStatusResponseDto.fromEntity(entity(), undefined, loginAt.getTime() + MINUTE, false, loginAt);
    expect(dto.travelReminderDue).toBe(true);
    expect(dto.travelReminderAvailableAt).toBe(loginAt.toISOString());
    expect(Object.keys(dto)).not.toContain('loginReminderAt');
  });

  it('without a login occurrence the day schedule is unchanged', () => {
    const nowMs = loginAt.getTime() + MINUTE;
    const withNone = ProfileStatusResponseDto.fromEntity(entity(), undefined, nowMs, false, null);
    const omitted = ProfileStatusResponseDto.fromEntity(entity(), undefined, nowMs);
    expect(withNone).toEqual(omitted);
    expect(omitted.travelReminderDue).toBe(false);
    expect(omitted.travelReminderAvailableAt).toBe(at(3).toISOString());
  });
});

function HOUR(): number {
  return 60 * MINUTE;
}

describe('deriveLoginReminderAt — the first check-in of a cycle only', () => {
  const authMs = ACTIVATED.getTime() + DAY; // a login on day 1, Travel Mode already active

  it('is offered while no duration answer has been saved in the cycle (absent, null or 0)', () => {
    const expected = new Date(authMs + 5 * MINUTE);
    expect(deriveLoginReminderAt(fields(), authMs, authMs)).toEqual(expected);
    expect(deriveLoginReminderAt(fields({ travelCheckInCount: 0 }), authMs, authMs)).toEqual(expected);
    expect(deriveLoginReminderAt(fields({ travelCheckInCount: null }), authMs, authMs)).toEqual(expected);
  });

  it('is gone once the first check-in has been answered, whichever login it is', () => {
    expect(deriveLoginReminderAt(fields({ travelCheckInCount: 1 }), authMs, authMs)).toBeNull();
    expect(deriveLoginReminderAt(fields({ travelCheckInCount: 3 }), authMs, authMs + DAY)).toBeNull();
  });
});

describe('the login occurrence is resolved by an answer or a started home-country flow, never by being shown', () => {
  const authMs = ACTIVATED.getTime() + DAY;
  const dueAt = authMs + 5 * MINUTE;

  it('stays reported (same time) while nothing resolved it, however often it is asked', () => {
    for (let i = 0; i < 3; i += 1)
      expect(
        deriveLoginReminderAt(fields(), authMs, dueAt + i * MINUTE),
      ).toEqual(new Date(dueAt));
  });

  it('is resolved once the resolved-up-to time reaches it, for that login only', () => {
    const resolved = fields({ lastTravelReminderSentAt: new Date(dueAt) });
    expect(deriveLoginReminderAt(resolved, authMs, dueAt + MINUTE)).toBeNull();
    const nextLoginMs = authMs + 2 * DAY;
    expect(
      deriveLoginReminderAt(resolved, nextLoginMs, nextLoginMs + 6 * MINUTE),
    ).toEqual(new Date(nextLoginMs + 5 * MINUTE));
  });

  it('a resolved-up-to time before it does not hide it', () => {
    expect(
      deriveLoginReminderAt(
        fields({ lastTravelReminderSentAt: new Date(dueAt - 1) }),
        authMs,
        dueAt,
      ),
    ).toEqual(new Date(dueAt));
  });
});

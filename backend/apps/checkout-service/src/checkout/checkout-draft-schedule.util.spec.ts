import {
  DraftMembers,
  effectiveTaskSchedule,
  hoursPerWeek,
  resolveMemberSchedule,
  scheduleToTaskColumns,
} from './checkout-draft-schedule.util';

describe('checkout-draft-schedule.util', () => {
  describe('resolveMemberSchedule', () => {
    it('defaults to full time with nothing to read', () => {
      expect(resolveMemberSchedule()).toEqual({
        workSchedule: 'full_time',
        customHours: null,
        customFrequency: null,
      });
    });

    it('reads the schedule fields from the source', () => {
      expect(
        resolveMemberSchedule({
          workSchedule: 'custom',
          customHours: 60,
          customFrequency: 'per_month',
        }),
      ).toEqual({
        workSchedule: 'custom',
        customHours: 60,
        customFrequency: 'per_month',
      });
    });

    it('drops custom fields for a fixed schedule', () => {
      expect(
        resolveMemberSchedule({
          workSchedule: 'part_time',
          customHours: 10,
          customFrequency: 'per_week',
        }),
      ).toEqual({
        workSchedule: 'part_time',
        customHours: null,
        customFrequency: null,
      });
    });

    it('uses the fallback when the source has no schedule', () => {
      const fallback = {
        workSchedule: 'part_time' as const,
        customHours: null,
        customFrequency: null,
      };
      expect(resolveMemberSchedule({}, fallback)).toEqual(fallback);
      expect(resolveMemberSchedule(undefined, fallback)).toEqual(fallback);
    });
  });

  describe('hoursPerWeek', () => {
    const custom = (customHours: number, customFrequency: string) => ({
      workSchedule: 'custom' as const,
      customHours,
      customFrequency,
    });

    it('returns 40 for full time and 20 for part time', () => {
      expect(hoursPerWeek(resolveMemberSchedule())).toBe(40);
      expect(
        hoursPerWeek({ ...resolveMemberSchedule(), workSchedule: 'part_time' }),
      ).toBe(20);
    });

    it('converts every frequency to hours per week', () => {
      expect(hoursPerWeek(custom(15, 'per_week'))).toBe(15);
      expect(hoursPerWeek(custom(4, 'per_day'))).toBe(20);
      expect(hoursPerWeek(custom(60, 'per_month'))).toBe(13.84);
      expect(hoursPerWeek(custom(130, 'per_quarter'))).toBe(10);
      expect(hoursPerWeek(custom(260, 'per_year'))).toBe(5);
    });

    it('falls back to 40 for an unusable custom schedule', () => {
      expect(hoursPerWeek(custom(0, 'per_week'))).toBe(40);
      expect(hoursPerWeek(custom(10, 'per_decade'))).toBe(40);
    });
  });

  describe('effectiveTaskSchedule', () => {
    const members: DraftMembers = {
      member: {
        workSchedule: 'custom',
        customHours: 60,
        customFrequency: 'per_month',
      },
    };

    it('follows the member entry for an assigned task and locks it', () => {
      const result = effectiveTaskSchedule(
        {
          assigneeUserId: 'member',
          workSchedule: 'full_time',
          customHoursPerWeek: null,
        },
        members,
      );
      expect(result).toMatchObject({
        workSchedule: 'custom',
        customHours: 60,
        customFrequency: 'per_month',
        customHoursPerWeek: 13.84,
        weeklyHours: 13.84,
        locked: true,
      });
    });

    it('uses the task own columns for an unassigned task', () => {
      const result = effectiveTaskSchedule(
        {
          assigneeUserId: null,
          workSchedule: 'custom',
          customHoursPerWeek: 15,
        },
        members,
      );
      expect(result).toMatchObject({
        workSchedule: 'custom',
        customHoursPerWeek: 15,
        customFrequency: 'per_week',
        weeklyHours: 15,
        locked: false,
      });
    });

    it('treats an unknown stored schedule as full time', () => {
      const result = effectiveTaskSchedule(
        {
          assigneeUserId: null,
          workSchedule: 'weird',
          customHoursPerWeek: null,
        },
        {},
      );
      expect(result.workSchedule).toBe('full_time');
      expect(result.weeklyHours).toBe(40);
    });
  });

  describe('scheduleToTaskColumns', () => {
    it('stores whole hours per week for a custom schedule', () => {
      expect(
        scheduleToTaskColumns({
          workSchedule: 'custom',
          customHours: 60,
          customFrequency: 'per_month',
        }),
      ).toEqual({ workSchedule: 'custom', customHoursPerWeek: 14 });
    });

    it('clears hours for a fixed schedule', () => {
      expect(scheduleToTaskColumns(resolveMemberSchedule())).toEqual({
        workSchedule: 'full_time',
        customHoursPerWeek: null,
      });
    });
  });
});

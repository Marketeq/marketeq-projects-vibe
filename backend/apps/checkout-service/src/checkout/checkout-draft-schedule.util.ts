export type WorkScheduleType = 'full_time' | 'part_time' | 'custom';

export type MemberSchedule = {
  workSchedule: WorkScheduleType;
  customHours: number | null;
  customFrequency: string | null;
};

export type DraftMembers = Record<string, MemberSchedule>;

const FULL_TIME_WEEKLY_HOURS = 40;
const PART_TIME_WEEKLY_HOURS = 20;
const WORKING_DAYS_PER_WEEK = 5;

const FREQUENCY_WORKING_DAYS: Record<string, number> = {
  per_day: 1,
  per_week: 5,
  per_month: 21.67,
  per_quarter: 65,
  per_year: 260,
};

const SCHEDULE_TYPES: WorkScheduleType[] = ['full_time', 'part_time', 'custom'];

export const DEFAULT_MEMBER_SCHEDULE: MemberSchedule = {
  workSchedule: 'full_time',
  customHours: null,
  customFrequency: null,
};

const isScheduleType = (value: unknown): value is WorkScheduleType =>
  SCHEDULE_TYPES.includes(value as WorkScheduleType);

export const resolveMemberSchedule = (
  source?: Partial<MemberSchedule> | null,
  fallback?: MemberSchedule | null,
): MemberSchedule => {
  if (source && isScheduleType(source.workSchedule)) {
    return {
      workSchedule: source.workSchedule,
      customHours:
        source.workSchedule === 'custom'
          ? Number(source.customHours) || null
          : null,
      customFrequency:
        source.workSchedule === 'custom'
          ? (source.customFrequency ?? null)
          : null,
    };
  }
  return { ...(fallback ?? DEFAULT_MEMBER_SCHEDULE) };
};

export const hoursPerWeek = (schedule: MemberSchedule): number => {
  if (schedule.workSchedule === 'part_time') return PART_TIME_WEEKLY_HOURS;
  if (schedule.workSchedule === 'custom') {
    const hours = Number(schedule.customHours);
    const days = FREQUENCY_WORKING_DAYS[schedule.customFrequency ?? ''];
    if (Number.isFinite(hours) && hours > 0 && days) {
      return Math.round((hours / days) * WORKING_DAYS_PER_WEEK * 100) / 100;
    }
  }
  return FULL_TIME_WEEKLY_HOURS;
};

type ScheduledTask = {
  assigneeUserId: string | null;
  workSchedule: string | null;
  customHoursPerWeek: number | null;
};

export type EffectiveTaskSchedule = {
  workSchedule: WorkScheduleType;
  customHoursPerWeek: number | null;
  customHours: number | null;
  customFrequency: string | null;
  weeklyHours: number;
  locked: boolean;
};

export const taskOwnSchedule = (task: ScheduledTask): MemberSchedule =>
  isScheduleType(task.workSchedule) && task.workSchedule === 'custom'
    ? {
        workSchedule: 'custom',
        customHours: task.customHoursPerWeek,
        customFrequency: 'per_week',
      }
    : resolveMemberSchedule({
        workSchedule: isScheduleType(task.workSchedule)
          ? task.workSchedule
          : 'full_time',
      });

export const effectiveTaskSchedule = (
  task: ScheduledTask,
  members: DraftMembers | null | undefined,
): EffectiveTaskSchedule => {
  const entry = task.assigneeUserId
    ? members?.[task.assigneeUserId]
    : undefined;
  const schedule = entry ?? taskOwnSchedule(task);
  return {
    workSchedule: schedule.workSchedule,
    customHoursPerWeek:
      schedule.workSchedule === 'custom' ? hoursPerWeek(schedule) : null,
    customHours: schedule.customHours,
    customFrequency: schedule.customFrequency,
    weeklyHours: hoursPerWeek(schedule),
    locked: Boolean(task.assigneeUserId),
  };
};

export const scheduleToTaskColumns = (schedule: MemberSchedule) => ({
  workSchedule: schedule.workSchedule,
  customHoursPerWeek:
    schedule.workSchedule === 'custom'
      ? Math.max(1, Math.round(hoursPerWeek(schedule)))
      : null,
});

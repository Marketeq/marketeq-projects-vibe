// src/main/services/timer/reminders.ts
//
// Scheduled nudges, per doc 20 §6 "reminders":
//   - After 2 hours of continuous Running, suggest taking a break.
//   - After 30 minutes of continuous OnBreakPaid / OnBreakUnpaid, suggest
//     resuming work.
//
// Implementation: one setInterval per reminder kind, cleared whenever the
// FSM state leaves the relevant state.

const WORK_REMINDER_MS = 2 * 60 * 60 * 1000; // 2h
const BREAK_REMINDER_MS = 30 * 60 * 1000; // 30min

export interface ReminderCallbacks {
  onWorkReminder?: (payload: { elapsedSec: number }) => void;
  onBreakReminder?: (payload: { elapsedSec: number }) => void;
}

export function createReminderScheduler(callbacks: ReminderCallbacks) {
  let workTimer: NodeJS.Timeout | null = null;
  let breakTimer: NodeJS.Timeout | null = null;

  function clearAll() {
    if (workTimer) clearTimeout(workTimer);
    if (breakTimer) clearTimeout(breakTimer);
    workTimer = null;
    breakTimer = null;
  }

  function scheduleWorkReminder(runStartedAt: number) {
    clearAll();
    const elapsed = Date.now() - runStartedAt;
    const wait = Math.max(0, WORK_REMINDER_MS - elapsed);
    workTimer = setTimeout(() => {
      callbacks.onWorkReminder?.({
        elapsedSec: Math.floor((Date.now() - runStartedAt) / 1000),
      });
    }, wait);
  }

  function scheduleBreakReminder(breakStartedAt: number) {
    clearAll();
    const elapsed = Date.now() - breakStartedAt;
    const wait = Math.max(0, BREAK_REMINDER_MS - elapsed);
    breakTimer = setTimeout(() => {
      callbacks.onBreakReminder?.({
        elapsedSec: Math.floor((Date.now() - breakStartedAt) / 1000),
      });
    }, wait);
  }

  function dispose() {
    clearAll();
  }

  return {
    scheduleWorkReminder,
    scheduleBreakReminder,
    clearAll,
    dispose,
  };
}

export type ReminderScheduler = ReturnType<typeof createReminderScheduler>;

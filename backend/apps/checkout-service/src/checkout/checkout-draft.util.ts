export const DRAFT_IDLE_DAYS = 30;

export const isDraftExpired = (updatedAt: Date, now: number = Date.now()): boolean =>
  now - new Date(updatedAt).getTime() > DRAFT_IDLE_DAYS * 24 * 60 * 60 * 1000;

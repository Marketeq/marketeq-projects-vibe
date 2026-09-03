// src/main/services/capture/input-activity.ts
//
// InputActivity — measures KEYBOARD and MOUSE activity separately, so a
// screenshot can report two distinct percentages instead of one combined
// "any input" number.
//
// The existing ActivityMonitor (activity-monitor.ts) deliberately uses only
// `powerMonitor.getSystemIdleTime()`, which cannot distinguish keyboard from
// mouse. Per an explicit repo-owner decision, this module adds a global input
// hook (`uiohook-napi`) that observes ONLY that an event occurred — never which
// key. No keystroke content is stored or transmitted, so the DTT-D-009 privacy
// guarantee ("no keystroke data leaves the device") still holds: we send
// percentages, not keystrokes.
//
// Model mirrors ActivityMonitor: time is sliced into 1-minute buckets; a bucket
// is "keyboard-active" if any keydown landed in it, "mouse-active" if any
// click / wheel / drag landed in it. `getInputLevels()` returns the share of
// the last 10 minutes (one screenshot interval) that was active, per input
// type. If the native hook cannot load (e.g. headless CI), everything degrades
// to zero and never throws.

import type { Logger } from 'pino';
import { rollingLevel } from './activity-monitor';

const MINUTE_MS = 60_000;
const MAX_BUCKETS = 10; // last 10 minutes == one screenshot interval

interface UiohookLike {
  on: (event: string, cb: (e: unknown) => void) => void;
  start: () => void;
  stop: () => void;
  removeAllListeners: () => void;
}

function loadUiohook(): UiohookLike | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('uiohook-napi') as { uIOhook: UiohookLike };
    return mod.uIOhook ?? null;
  } catch {
    return null;
  }
}

let log: Logger | null = null;
let hook: UiohookLike | null = null;
let timer: NodeJS.Timeout | null = null;
let warnedNoHook = false;

let currentMinuteStart = -1;
let currentMinuteHadKeyboard = false;
let currentMinuteHadMouse = false;
const keyboardBuckets: boolean[] = [];
const mouseBuckets: boolean[] = [];

function pushBucket(arr: boolean[], value: boolean): void {
  arr.push(value);
  if (arr.length > MAX_BUCKETS) arr.shift();
}

function rollMinuteIfNeeded(now: number): void {
  const minute = Math.floor(now / MINUTE_MS) * MINUTE_MS;
  if (currentMinuteStart < 0) {
    currentMinuteStart = minute;
    return;
  }
  if (minute !== currentMinuteStart) {
    pushBucket(keyboardBuckets, currentMinuteHadKeyboard);
    pushBucket(mouseBuckets, currentMinuteHadMouse);
    currentMinuteStart = minute;
    currentMinuteHadKeyboard = false;
    currentMinuteHadMouse = false;
  }
}

/**
 * Start observing global keyboard / mouse input. Safe to call more than once.
 * A missing or unloadable `uiohook-napi` is non-fatal — levels just stay 0.
 */
export function startInputActivity(logger?: Logger): void {
  if (logger) log = logger.child({ svc: 'input-activity' });
  if (timer) return; // already running

  currentMinuteStart = -1;
  currentMinuteHadKeyboard = false;
  currentMinuteHadMouse = false;
  keyboardBuckets.length = 0;
  mouseBuckets.length = 0;

  timer = setInterval(() => rollMinuteIfNeeded(Date.now()), 1000);

  hook = loadUiohook();
  if (!hook) {
    if (!warnedNoHook) {
      log?.warn('uiohook-napi unavailable — keyboard/mouse levels will report 0');
      warnedNoHook = true;
    }
    return;
  }

  try {
    hook.on('keydown', () => {
      rollMinuteIfNeeded(Date.now());
      currentMinuteHadKeyboard = true;
    });
    // Intentional mouse actions only — bare `mousemove` would peg mouse at 100%.
    const markMouse = () => {
      rollMinuteIfNeeded(Date.now());
      currentMinuteHadMouse = true;
    };
    hook.on('mousedown', markMouse);
    hook.on('wheel', markMouse);
    hook.on('mousedrag', markMouse);
    hook.start();
    log?.info('input-activity monitor started');
  } catch (err) {
    log?.warn({ err }, 'failed to start uiohook — keyboard/mouse levels will report 0');
    hook = null;
  }
}

/** Stop observing input and reset. Safe to call when not running. */
export function stopInputActivity(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (hook) {
    try {
      hook.removeAllListeners();
      hook.stop();
    } catch (err) {
      log?.debug?.({ err }, 'error stopping uiohook');
    }
    hook = null;
  }
  currentMinuteStart = -1;
  currentMinuteHadKeyboard = false;
  currentMinuteHadMouse = false;
  keyboardBuckets.length = 0;
  mouseBuckets.length = 0;
}

/**
 * Keyboard and mouse activity for the trailing ~10 minutes, each as an integer
 * 0–100 = percentage of one-minute buckets in which that input type was used.
 * Includes the in-progress minute so short sessions still produce a signal.
 */
export function getInputLevels(): { keyboardPct: number; mousePct: number } {
  const kb = keyboardBuckets.concat(currentMinuteHadKeyboard);
  const ms = mouseBuckets.concat(currentMinuteHadMouse);
  return {
    keyboardPct: Math.round(rollingLevel(kb, MAX_BUCKETS) * 100),
    mousePct: Math.round(rollingLevel(ms, MAX_BUCKETS) * 100),
  };
}

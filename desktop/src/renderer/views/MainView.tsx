// src/renderer/views/MainView.tsx
//
// Phase 6 — Main window UI per doc 04 §5.4 + doc 19 §1/§2.
//
// Driven entirely by existing zustand stores (timer, sync, capture, auth).
// No domain logic lives here — the view only dispatches via the stores'
// actions. Render is idempotent against out-of-order events because the
// snapshot is always the source of truth.

/// <reference path="../dtt-bridge.d.ts" />
import React, { useEffect, useMemo, useState } from 'react';
import { useTimerStore } from '../stores/timer-store';
import { useSyncStore } from '../stores/sync-store';
import { useCaptureStore } from '../stores/capture-store';
import { useAuthStore } from '../stores/auth-store';
import { COPY } from '../copy';
import type {
  ActivitySample,
  ScreenshotTakenEvent,
  TimerStateName,
} from '../../shared/ipc-contracts';
import { IdleResolutionModal } from './IdleResolutionModal';

function formatHMS(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
}

function primaryCtaLabel(state: TimerStateName): string {
  switch (state) {
    case 'Running':
      return COPY.main.pause;
    case 'Paused':
    case 'IdleSoftPaused':
      return COPY.main.resume;
    case 'OnBreakPaid':
    case 'OnBreakUnpaid':
      return COPY.main.endBreak;
    default:
      return COPY.main.start;
  }
}

function SyncPill(): JSX.Element {
  const { online, running } = useSyncStore();
  let cls = 'sync-pill';
  let label: string = COPY.main.syncOnline;
  if (running) {
    cls += ' running';
    label = COPY.main.syncRunning;
  } else if (!online) {
    cls += ' offline';
    label = COPY.main.syncOffline;
  } else {
    cls += ' online';
  }
  return (
    <span className={cls} role="status">
      {label}
    </span>
  );
}

function ActivityGraph(): JSX.Element {
  const [samples, setSamples] = useState<ActivitySample[]>([]);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const s = await window.dtt.capture.getRecentActivity(30);
        if (!cancelled) setSamples(s);
      } catch {
        /* ignore */
      }
    }
    void load();
    const id = setInterval(() => void load(), 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const bars = useMemo(() => {
    const arr: Array<ActivitySample | null> = new Array<ActivitySample | null>(
      30,
    ).fill(null);
    samples.slice(-30).forEach((s, i) => {
      arr[i] = s;
    });
    return arr;
  }, [samples]);

  return (
    <div className="activity-graph" aria-label={COPY.main.activity}>
      <div className="label">{COPY.main.activity}</div>
      <div className="bars">
        {bars.map((b, i) => (
          <div
            key={i}
            className={`bar${!b || !b.active ? ' empty' : ''}`}
            style={{ height: b?.active ? '100%' : '30%' }}
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}

function ScreenshotsStrip(): JSX.Element {
  const [shots, setShots] = useState<ScreenshotTakenEvent[]>([]);
  useEffect(() => {
    const off = window.dtt?.capture?.onScreenshotTaken?.((e) => {
      setShots((prev) => [e, ...prev].slice(0, 8));
    });
    return () => {
      off?.();
    };
  }, []);
  return (
    <div className="screenshots-strip">
      <div className="label">{COPY.main.recentScreenshots}</div>
      {shots.length === 0 ? (
        <div className="empty">{COPY.main.noScreenshots}</div>
      ) : (
        <div className="thumbs">
          {shots.map((s) => (
            <div
              key={s.id}
              className="thumb"
              title={new Date(s.takenAt).toLocaleTimeString()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function MainView(): JSX.Element {
  const timer = useTimerStore();
  const sync = useSyncStore();
  const capture = useCaptureStore();
  const auth = useAuthStore();

  useEffect(() => {
    void timer.hydrate();
    void sync.initialize();
    void capture.initialize();
  }, [timer, sync, capture]);

  const state = timer.state;
  const elapsed = timer.elapsedSec;

  async function onPrimaryClick() {
    try {
      switch (state) {
        case 'Idle':
          await timer.startTimer({
            contractId: 'default',
            taskId: 'default',
          });
          break;
        case 'Running':
          await timer.pauseTimer();
          break;
        case 'Paused':
        case 'IdleSoftPaused':
          await timer.resumeTimer();
          break;
        case 'OnBreakPaid':
        case 'OnBreakUnpaid':
          await timer.endBreak();
          break;
        default:
          break;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('primary click failed', err);
    }
  }

  async function onStop() {
    try {
      await timer.stopTimer({ reason: 'user_stop' });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('stop failed', err);
    }
  }

  async function onBreak(kind: 'paid' | 'unpaid') {
    try {
      await timer.startBreak({
        kind,
        durationSec: 15 * 60,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('break failed', err);
    }
  }

  const isIdleOrEmpty = state === 'Idle';
  const emptyBody = !timer.snapshot?.activeSessionId;

  return (
    <div className="main-view">
      <header>
        <h1>Marketeq Time Tracker</h1>
        <SyncPill />
      </header>

      <div className="timer-block" aria-live="polite">
        <div className="timer-state">{state}</div>
        <div className="timer-display" aria-label={COPY.main.timerLabel}>
          {formatHMS(elapsed)}
        </div>
        {isIdleOrEmpty && emptyBody && (
          <div style={{ color: '#9ca3b5', fontSize: 12, marginTop: 6 }}>
            {COPY.main.emptyHeading}
          </div>
        )}
      </div>

      <div className="pickers">
        <select
          aria-label="Contract"
          defaultValue="default"
          disabled={state !== 'Idle'}
        >
          <option value="default">(default contract)</option>
        </select>
        <select
          aria-label="Task"
          defaultValue="default"
          disabled={state !== 'Idle'}
        >
          <option value="default">(default task)</option>
        </select>
      </div>

      <div className="controls">
        <button
          type="button"
          className="primary"
          onClick={() => void onPrimaryClick()}
        >
          {primaryCtaLabel(state)}
        </button>
        <button
          type="button"
          onClick={() => void onStop()}
          disabled={state === 'Idle'}
        >
          {COPY.main.stop}
        </button>
        <button
          type="button"
          onClick={() => void onBreak('paid')}
          disabled={state !== 'Running'}
          title="Paid break"
        >
          {COPY.main.startBreakPaid}
        </button>
        <button
          type="button"
          onClick={() => void onBreak('unpaid')}
          disabled={state !== 'Running'}
          title="Unpaid break"
        >
          {COPY.main.startBreakUnpaid}
        </button>
      </div>

      <div className="totals">
        <div className="stat">
          <div className="label">{COPY.main.worked}</div>
          <div className="value">{formatHMS(timer.runningSec)}</div>
        </div>
        <div className="stat">
          <div className="label">{COPY.main.onBreak}</div>
          <div className="value">
            {timer.breakRemainingSec != null
              ? formatHMS(timer.breakRemainingSec)
              : '00:00:00'}
          </div>
        </div>
        <div className="stat">
          <div className="label">Shots</div>
          <div className="value">{capture.screenshotsTakenToday}</div>
        </div>
      </div>

      <ActivityGraph />
      <ScreenshotsStrip />

      <footer>
        <span>{auth.user?.email ?? 'not signed in'}</span>
        <span>
          {sync.queueDepth > 0 ? `${sync.queueDepth} pending` : 'in sync'}
        </span>
      </footer>

      {timer.pendingIdle && (
        <IdleResolutionModal
          payload={timer.pendingIdle}
          onResolve={async (r) => {
            try {
              await timer.resolveIdle(r);
            } catch (err) {
              // eslint-disable-next-line no-console
              console.warn('resolveIdle failed', err);
            }
          }}
        />
      )}
    </div>
  );
}

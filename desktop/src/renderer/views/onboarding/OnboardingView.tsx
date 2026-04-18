// src/renderer/views/onboarding/OnboardingView.tsx
//
// Phase 6 — Multi-step onboarding wizard per doc 04 §5.2 + doc 41 §2.
//
// Steps (fixed order):
//   1. welcome
//   2. privacy
//   3. screenRecording (mandatory)
//   4. accessibility (optional, macOS mostly)
//   5. notifications (optional)
//   6. done
//
// Completion persists via window.dtt.onboarding so the next launch bypasses
// the wizard entirely.

/// <reference path="../../dtt-bridge.d.ts" />
import React, { useCallback, useEffect, useState } from 'react';
import { COPY } from '../../copy';
import { useOnboardingStore } from '../../stores/onboarding-store';
import type {
  OnboardingStep,
  PermissionKindShort,
  PermissionStatusShort,
} from '../../../shared/ipc-contracts';

const STEP_ORDER: OnboardingStep[] = [
  'welcome',
  'privacy',
  'screenRecording',
  'accessibility',
  'notifications',
  'done',
];

function Stepper({ current }: { current: number }) {
  return (
    <div className="stepper" aria-label={`Step ${current + 1} of ${STEP_ORDER.length}`}>
      {STEP_ORDER.map((s, i) => (
        <div
          key={s}
          className={`dot${i <= current ? ' active' : ''}`}
          aria-hidden
        />
      ))}
    </div>
  );
}

interface PermissionStepProps {
  heading: string;
  explanation: string;
  grant: string;
  skip: string;
  kind: PermissionKindShort;
  deniedWarning: string;
  openSettingsLabel: string;
  onDone: (status: 'granted' | 'denied' | 'skipped') => void;
}

function PermissionStep(props: PermissionStepProps): JSX.Element {
  const [status, setStatus] = useState<PermissionStatusShort | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const bridge = window.dtt?.permissions;
    if (!bridge) return;
    let cancelled = false;
    bridge
      .check(props.kind)
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [props.kind]);

  async function grant() {
    setBusy(true);
    try {
      const s = await window.dtt.permissions.request(props.kind);
      setStatus(s);
      if (s === 'granted') {
        props.onDone('granted');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('grant failed', err);
    } finally {
      setBusy(false);
    }
  }

  async function openSettings() {
    try {
      const map: Record<PermissionKindShort, import('../../../shared/ipc-contracts').OsPermissionKey> = {
        screen: 'screenRecording',
        accessibility: 'accessibility',
        notifications: 'notifications',
      };
      await window.dtt.permissions.openSettings(map[props.kind]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('openSettings failed', err);
    }
  }

  const granted = status === 'granted';
  const denied = status === 'denied';

  return (
    <>
      <h1>{props.heading}</h1>
      <p className="desc">{props.explanation}</p>
      <p
        className={`perm-status${granted ? ' granted' : denied ? ' denied' : ''}`}
        role="status"
      >
        Status: {status ?? 'checking\u2026'}
      </p>
      {denied && <p className="hint">{props.deniedWarning}</p>}
      <div className="actions">
        {denied && (
          <button type="button" onClick={() => void openSettings()}>
            {props.openSettingsLabel}
          </button>
        )}
        <button type="button" onClick={() => props.onDone('skipped')}>
          {props.skip}
        </button>
        <button
          type="button"
          className="primary"
          onClick={() => (granted ? props.onDone('granted') : void grant())}
          disabled={busy}
        >
          {granted ? 'Continue' : props.grant}
        </button>
      </div>
    </>
  );
}

export function OnboardingView(): JSX.Element {
  const onboarding = useOnboardingStore();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    void onboarding.hydrate();
  }, [onboarding]);

  const step = STEP_ORDER[idx] ?? 'done';

  const next = useCallback(
    async (status?: 'granted' | 'denied' | 'skipped' | 'completed') => {
      try {
        await onboarding.markStep({ step, status });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('markStep failed', err);
      }
      setIdx((i) => Math.min(i + 1, STEP_ORDER.length - 1));
    },
    [onboarding, step],
  );

  const finish = useCallback(async () => {
    try {
      await onboarding.markStep({ step: 'done', status: 'completed' });
      await onboarding.complete();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('finish failed', err);
    }
  }, [onboarding]);

  function renderStep(): JSX.Element {
    switch (step) {
      case 'welcome':
        return (
          <>
            <h1>{COPY.onboarding.welcome.heading}</h1>
            <p className="desc">{COPY.onboarding.welcome.description}</p>
            <div className="actions">
              <button
                type="button"
                className="primary"
                onClick={() => void next('completed')}
              >
                {COPY.onboarding.welcome.cta}
              </button>
            </div>
          </>
        );
      case 'privacy':
        return (
          <>
            <h1>{COPY.onboarding.privacy.heading}</h1>
            <p className="desc">{COPY.onboarding.privacy.description}</p>
            <div className="actions">
              <button
                type="button"
                className="primary"
                onClick={() => void next('completed')}
              >
                {COPY.onboarding.privacy.cta}
              </button>
            </div>
          </>
        );
      case 'screenRecording':
        return (
          <PermissionStep
            heading={COPY.onboarding.screenRecording.heading}
            explanation={COPY.onboarding.screenRecording.explanation}
            grant={COPY.onboarding.screenRecording.grant}
            skip={COPY.onboarding.screenRecording.skip}
            kind="screen"
            deniedWarning={COPY.onboarding.screenRecording.deniedWarning}
            openSettingsLabel={COPY.onboarding.screenRecording.openSettings}
            onDone={(status) => void next(status)}
          />
        );
      case 'accessibility':
        return (
          <PermissionStep
            heading={COPY.onboarding.accessibility.heading}
            explanation={COPY.onboarding.accessibility.explanation}
            grant={COPY.onboarding.accessibility.grant}
            skip={COPY.onboarding.accessibility.skip}
            kind="accessibility"
            deniedWarning={COPY.onboarding.accessibility.deniedWarning}
            openSettingsLabel="Open System Settings"
            onDone={(status) => void next(status)}
          />
        );
      case 'notifications':
        return (
          <PermissionStep
            heading={COPY.onboarding.notifications.heading}
            explanation={COPY.onboarding.notifications.explanation}
            grant={COPY.onboarding.notifications.grant}
            skip={COPY.onboarding.notifications.skip}
            kind="notifications"
            deniedWarning="You can enable notifications later in System Settings."
            openSettingsLabel="Open System Settings"
            onDone={(status) => void next(status)}
          />
        );
      case 'done':
      default:
        return (
          <>
            <h1>{COPY.onboarding.done.heading}</h1>
            <p className="desc">{COPY.onboarding.done.description}</p>
            <div className="actions">
              <button
                type="button"
                className="primary"
                onClick={() => void finish()}
              >
                {COPY.onboarding.done.cta}
              </button>
            </div>
          </>
        );
    }
  }

  return (
    <main className="view">
      <section className="wizard" aria-live="polite">
        <Stepper current={idx} />
        {renderStep()}
      </section>
    </main>
  );
}

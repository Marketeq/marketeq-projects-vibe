// src/renderer/App.tsx
//
// Phase 6 — Top-level router. Shows login → onboarding → tracker.

/// <reference path="./dtt-bridge.d.ts" />
import React, { useEffect } from 'react';
import { useAuthStore } from './stores/auth-store';
import { useOnboardingStore } from './stores/onboarding-store';
import { LoginView } from './views/LoginView';
import { OnboardingView } from './views/onboarding/OnboardingView';
import { TimeTrackerApp } from './components/desktop-tracker';

export function App(): JSX.Element {
  const auth = useAuthStore();
  const onboarding = useOnboardingStore();

  useEffect(() => {
    void auth.hydrate();
    void onboarding.hydrate();
  }, [auth, onboarding]);

  if (!auth.hydrated || !onboarding.hydrated) {
    return (
      <main className="flex h-screen items-center justify-center bg-white text-gray-400">
        <p className="text-sm">Loading…</p>
      </main>
    );
  }

  if (!auth.isAuthenticated) {
    return <LoginView />;
  }

  if (!onboarding.state.completed) {
    return <OnboardingView />;
  }

  return (
    <TimeTrackerApp
      userName={auth.user?.displayName || auth.user?.email || 'Marketeq user'}
      userEmail={auth.user?.email}
      userId={auth.user?.id}
    />
  );
}

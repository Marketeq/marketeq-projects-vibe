// src/renderer/stores/auth-store.ts
//
// Renderer-side mirror of the main-process AuthService state (Phase 5).
// Follows the same pattern as timer-store / capture-store: hydrate once
// on first use, subscribe to broadcast events via window.dtt.auth, and
// expose async command methods that delegate to IPC.

/// <reference path="../dtt-bridge.d.ts" />
import { create } from 'zustand';
import type {
  AuthLockedOutPayload,
  AuthLoginResult,
  AuthNeedsLoginPayload,
  AuthStatus,
  AuthUserMirror,
} from '../../shared/ipc-contracts';

export interface AuthStoreState {
  status: AuthStatus;
  user: AuthUserMirror | null;
  isAuthenticated: boolean;
  lockedUntil: number | null;
  needsLogin: boolean;
  needsLoginReason: AuthNeedsLoginPayload['reason'] | null;
  lastLockedOut: AuthLockedOutPayload | null;
  lastError: string | null;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthLoginResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
  clearError: () => void;
  clearLockedOut: () => void;
}

const INITIAL_STATUS: AuthStatus = {
  isAuthenticated: false,
  user: null,
  lockedUntil: null,
  expiresAt: null,
};

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  status: INITIAL_STATUS,
  user: null,
  isAuthenticated: false,
  lockedUntil: null,
  needsLogin: false,
  needsLoginReason: null,
  lastLockedOut: null,
  lastError: null,
  hydrated: false,

  async hydrate() {
    if (get().hydrated) return;
    const bridge = window.dtt?.auth;
    if (!bridge) {
      set({ hydrated: true });
      return;
    }

    bridge.onStatusChanged(({ status }) => {
      set({
        status,
        user: status.user,
        isAuthenticated: status.isAuthenticated,
        lockedUntil: status.lockedUntil,
        needsLogin: !status.isAuthenticated,
      });
    });
    bridge.onNeedsLogin((payload) => {
      set({
        needsLogin: true,
        needsLoginReason: payload.reason,
        isAuthenticated: false,
        user: null,
      });
    });
    bridge.onLockedOut((payload) => {
      set({
        lastLockedOut: payload,
        lockedUntil: payload.lockedUntil,
      });
    });
    bridge.onLoggedIn((status) => {
      set({
        status,
        user: status.user,
        isAuthenticated: status.isAuthenticated,
        needsLogin: false,
        needsLoginReason: null,
      });
    });
    bridge.onLoggedOut(() => {
      set({
        status: INITIAL_STATUS,
        user: null,
        isAuthenticated: false,
        needsLogin: true,
      });
    });

    const initial = await bridge.getStatus();
    set({
      status: initial,
      user: initial.user,
      isAuthenticated: initial.isAuthenticated,
      lockedUntil: initial.lockedUntil,
      needsLogin: !initial.isAuthenticated,
      hydrated: true,
    });
  },

  async login(email, password) {
    const result = await window.dtt.auth.login({ email, password });
    if (result.ok) {
      set({
        lastError: null,
        isAuthenticated: true,
        user: result.user,
        needsLogin: false,
      });
    } else {
      set({
        lastError: result.message,
        lockedUntil: result.lockedUntil ?? null,
      });
    }
    return result;
  },

  async logout() {
    await window.dtt.auth.logout();
    set({
      status: INITIAL_STATUS,
      user: null,
      isAuthenticated: false,
      needsLogin: true,
    });
  },

  async refresh() {
    return window.dtt.auth.refresh();
  },

  clearError: () => set({ lastError: null }),
  clearLockedOut: () => set({ lastLockedOut: null }),
}));

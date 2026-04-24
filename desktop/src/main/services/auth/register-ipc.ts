// src/main/services/auth/register-ipc.ts
//
// Wires the Phase 5 AuthService into the Electron IPC surface.
// Mirrors the shape of Phase 2's timer IPC: a single register function
// returns a detach callback.
//
// All inbound payloads are validated via zod (AuthLoginArgsSchema) before
// reaching the service. Outbound events are broadcast to every
// BrowserWindow via the supplied `getBroadcastTargets` port.

import type { IpcMain, WebContents } from 'electron';
import type { Logger } from 'pino';
import { IPC } from '../../../shared/ipc-contracts';
import { AuthLoginArgsSchema } from '../../../shared/ipc-contracts';
import type {
  AuthLoginResult,
  AuthStatus,
} from '../../../shared/ipc-contracts';
import type { AuthService } from './auth-service';
import { AUTH_EVENTS } from './auth-service';

export interface RegisterAuthIpcDeps {
  logger: Logger;
  ipcMain: IpcMain;
  auth: AuthService;
  getBroadcastTargets: () => readonly WebContents[];
}

/** Channel name used on the renderer side for auth event relays. */
const CHANNEL_MAP: Record<string, string> = {
  [AUTH_EVENTS.statusChanged]: IPC.authStatusChanged,
  [AUTH_EVENTS.needsLogin]: IPC.authNeedsLogin,
  [AUTH_EVENTS.lockedOut]: IPC.authLockedOut,
  [AUTH_EVENTS.loggedIn]: IPC.authLoggedIn,
  [AUTH_EVENTS.loggedOut]: IPC.authLoggedOut,
  [AUTH_EVENTS.tokenExpired]: IPC.authTokenExpired,
};

export function registerAuthIpc(deps: RegisterAuthIpcDeps): () => void {
  const { ipcMain, auth, logger, getBroadcastTargets } = deps;

  ipcMain.handle(IPC.authLogin, async (_evt, args: unknown): Promise<AuthLoginResult> => {
    const parsed = AuthLoginArgsSchema.safeParse(args);
    if (!parsed.success) {
      return {
        ok: false,
        code: 'ERR_AUTH_INVALID_INPUT',
        message: 'Invalid email or password format',
      };
    }
    return auth.login(parsed.data.email, parsed.data.password);
  });

  ipcMain.handle(IPC.authLogout, async (): Promise<void> => {
    await auth.logout();
  });

  ipcMain.handle(IPC.authRefresh, async (): Promise<boolean> => {
    return auth.refresh();
  });

  ipcMain.handle(IPC.authGetStatus, (): AuthStatus => {
    return auth.getStatus();
  });

  // --- Broadcast plumbing ---------------------------------------------------
  const detachBus = auth.attachEventBus((evt) => {
    const wireChannel = CHANNEL_MAP[evt.channel];
    if (!wireChannel) return;
    for (const wc of getBroadcastTargets()) {
      if (!wc.isDestroyed()) {
        try {
          wc.send(wireChannel, evt.payload);
        } catch (err) {
          logger.warn({ err, wireChannel }, 'auth broadcast send failed');
        }
      }
    }
  });

  return () => {
    detachBus();
    ipcMain.removeHandler(IPC.authLogin);
    ipcMain.removeHandler(IPC.authLogout);
    ipcMain.removeHandler(IPC.authRefresh);
    ipcMain.removeHandler(IPC.authGetStatus);
  };
}

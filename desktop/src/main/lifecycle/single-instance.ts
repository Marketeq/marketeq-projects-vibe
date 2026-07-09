// src/main/lifecycle/single-instance.ts
import { app, BrowserWindow } from 'electron';

export function ensureSingleInstance(): void {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
    return;
  }
  app.on('second-instance', () => {
    const wins = BrowserWindow.getAllWindows();
    const first = wins[0];
    if (first) {
      if (first.isMinimized()) first.restore();
      first.focus();
    }
  });
}

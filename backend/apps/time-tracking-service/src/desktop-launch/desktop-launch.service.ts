import { Injectable } from '@nestjs/common';

// How long an acknowledgement stays readable. The web app polls for a few
// seconds right after firing the marketeq:// link, so this only has to
// outlive that window.
const ACK_TTL_MS = 2 * 60 * 1000;

/**
 * BTB-325: lets the web Log Time button learn whether the desktop tracker
 * actually opened. The browser can't see installed apps and, on Windows, a
 * launched app doesn't take focus from the browser, so the web app sends a
 * random launch id in the marketeq:// link, the desktop app acknowledges it
 * here, and the web app polls for that acknowledgement.
 *
 * Acknowledgements are short-lived and keyed by user, so they live in memory
 * rather than in a table.
 */
@Injectable()
export class DesktopLaunchService {
  private readonly acks = new Map<string, number>();

  ack(userId: string, launchId: string): void {
    this.prune();
    this.acks.set(this.key(userId, launchId), Date.now() + ACK_TTL_MS);
  }

  isAcknowledged(userId: string, launchId: string): boolean {
    this.prune();
    return this.acks.has(this.key(userId, launchId));
  }

  private key(userId: string, launchId: string): string {
    return `${userId}:${launchId}`;
  }

  private prune(): void {
    const now = Date.now();
    for (const [key, expiresAt] of this.acks) {
      if (expiresAt <= now) this.acks.delete(key);
    }
  }
}

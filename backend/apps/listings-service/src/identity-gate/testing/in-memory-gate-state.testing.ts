import { AccountGateStateService } from '../account-gate-state.service';

/**
 * Test stand-in for AccountGateStateService with the same observable rules:
 * three states per account (known open / known closed / never received), an
 * older decision never overwrites a newer one, unknown accounts are queued to be
 * learned, and reads never throw. Counts reads so a test can prove how many
 * lookups a response cost, and exposes `readFails` to simulate an unreadable table.
 */
export class InMemoryGateState {
  rows = new Map<string, { gateOpen: boolean; occurredAt: number }>();
  reads = 0;
  readFails = false;
  private pending = new Set<string>();

  set(userId: string, gateOpen: boolean, occurredAt = Date.now()): this {
    this.rows.set(userId, { gateOpen, occurredAt });
    return this;
  }

  open(...ids: string[]): this {
    ids.forEach((id) => this.set(id, true));
    return this;
  }

  closed(...ids: string[]): this {
    ids.forEach((id) => this.set(id, false));
    return this;
  }

  async apply(userId: string, gateOpen: boolean, occurredAt: Date): Promise<boolean> {
    const cur = this.rows.get(userId);
    if (cur && occurredAt.getTime() < cur.occurredAt) return false;
    this.rows.set(userId, { gateOpen, occurredAt: occurredAt.getTime() });
    this.pending.delete(userId);
    return true;
  }

  async knownOpen(ids: Iterable<string | null | undefined>): Promise<Set<string>> {
    this.reads++;
    if (this.readFails) return new Set();
    const out = new Set<string>();
    for (const id of ids) {
      if (typeof id !== 'string' || !id) continue;
      const row = this.rows.get(id);
      if (!row) this.pending.add(id);
      else if (row.gateOpen) out.add(id);
    }
    return out;
  }

  takePendingLearn(): string[] {
    const ids = [...this.pending];
    this.pending.clear();
    return ids;
  }

  requeue(ids: Iterable<string>): void {
    for (const id of ids) this.pending.add(id);
  }

  get asService(): AccountGateStateService {
    return this as unknown as AccountGateStateService;
  }
}

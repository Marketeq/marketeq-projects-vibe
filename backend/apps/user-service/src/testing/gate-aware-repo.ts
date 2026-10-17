// Test double for the discovery repositories. It stands in for PostgreSQL: it evaluates the query
// builder calls the discovery paths make - including the G1 gate semi-join, recognised by the
// SQL fragment it carries - BEFORE ordering, counting and paginating, exactly where the database
// applies them. A path that forgot the gate would list hidden talent here, and a predicate the
// double does not understand fails loudly instead of being ignored.
import { InternalServerErrorException } from '@nestjs/common';

export interface FakeGate {
  /** Accounts with a known OPEN gate. Known-closed and never-received accounts are simply absent. */
  open: Set<string>;
  /** Simulates a missing/unreadable state table. */
  unreadable: boolean;
}

export interface QueryRecord {
  kind: 'getMany' | 'getManyAndCount';
  gated: boolean;
  scanned: number;
  returned: number;
  total: number;
  select: string[] | null;
}

const MISSING_TABLE = 'relation "user_service.talent_gate_state" does not exist';

class FakeQueryBuilder<T extends Record<string, any>> {
  private selected: string[] | null = null;
  private readonly wheres: Array<{ sql: string; params: Record<string, unknown> }> = [];
  private readonly orders: Array<{ prop: string; dir: 'ASC' | 'DESC' }> = [];
  private skipN = 0;
  private takeN: number | undefined;

  constructor(
    private readonly alias: string,
    private readonly rows: () => T[],
    private readonly gate: FakeGate,
    private readonly log: QueryRecord[],
  ) {}

  private prop(path: string): string {
    return path.startsWith(`${this.alias}.`) ? path.slice(this.alias.length + 1) : path;
  }

  select(cols: string[] | string) {
    this.selected = (Array.isArray(cols) ? cols : [cols]).map((c) => this.prop(c));
    return this;
  }
  where(sql: string, params: Record<string, unknown> = {}) { this.wheres.push({ sql, params }); return this; }
  andWhere(sql: string, params: Record<string, unknown> = {}) { return this.where(sql, params); }
  orderBy(path: string, dir: 'ASC' | 'DESC' = 'ASC') { this.orders.length = 0; this.orders.push({ prop: this.prop(path), dir }); return this; }
  addOrderBy(path: string, dir: 'ASC' | 'DESC' = 'ASC') { this.orders.push({ prop: this.prop(path), dir }); return this; }
  skip(n: number) { this.skipN = n; return this; }
  take(n: number) { this.takeN = n; return this; }

  private predicate(row: T): boolean {
    return this.wheres.every(({ sql, params }) => {
      if (sql.includes('talent_gate_state')) {
        if (!/g\."gateOpen" = true/.test(sql)) throw new InternalServerErrorException(`gate predicate is not restricted to open: ${sql}`);
        const m = /g\."userId"(::text)? = (\w+)\.(\w+)/.exec(sql);
        if (!m) throw new InternalServerErrorException(`unrecognised gate predicate: ${sql}`);
        const account = row[m[3]];
        return typeof account === 'string' && this.gate.open.has(account);
      }
      const eq = /^(\w+)\.(\w+) = :(\w+)$/.exec(sql);
      if (eq) return row[eq[2]] === params[eq[3]];
      const gt = /^(\w+)\.(\w+) > :(\w+)$/.exec(sql);
      if (gt) return String(row[gt[2]]) > String(params[gt[3]]);
      throw new InternalServerErrorException(`fake query builder does not understand: ${sql}`);
    });
  }

  private run(kind: QueryRecord['kind']): [T[], number] {
    const gated = this.wheres.some((w) => w.sql.includes('talent_gate_state'));
    if (gated && this.gate.unreadable) throw new InternalServerErrorException(MISSING_TABLE);
    const matched = this.rows().filter((r) => this.predicate(r));
    const cmp = (a: any, b: any) => (a instanceof Date && b instanceof Date ? a.getTime() - b.getTime() : a < b ? -1 : a > b ? 1 : 0);
    const sorted = [...matched].sort((x, y) => {
      for (const o of this.orders) {
        const c = cmp(x[o.prop], y[o.prop]);
        if (c !== 0) return o.dir === 'DESC' ? -c : c;
      }
      return 0;
    });
    const page = sorted.slice(this.skipN, this.takeN === undefined ? undefined : this.skipN + this.takeN);
    const shaped = page.map((r) => (this.selected ? Object.fromEntries(this.selected.map((k) => [k, r[k]])) : { ...r })) as T[];
    this.log.push({ kind, gated, scanned: this.rows().length, returned: shaped.length, total: matched.length, select: this.selected });
    return [shaped, matched.length];
  }

  async getMany(): Promise<T[]> { return this.run('getMany')[0]; }
  async getManyAndCount(): Promise<[T[], number]> { return this.run('getManyAndCount'); }
}

/** A repository whose query builder behaves like the database, plus the log of every query it ran. */
export function fakeDiscoveryRepo<T extends Record<string, any>>(rows: () => T[], gate: FakeGate) {
  const log: QueryRecord[] = [];
  const repo = {
    log,
    createQueryBuilder: (alias: string) => new FakeQueryBuilder<T>(alias, rows, gate, log),
    // by-id reads for hydrating a visible page (find({ where: { id: In([...]) } }))
    find: jest.fn(async ({ where }: any) => {
      const wanted: string[] | undefined = where?.id?.value;
      return rows().filter((r) => (wanted ? wanted.includes(r.id) : true)).map((r) => ({ ...r }));
    }),
  };
  return repo;
}

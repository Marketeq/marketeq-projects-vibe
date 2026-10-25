import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { PersistentStatusAlert } from './persistent-status-alert.entity';

// Union-typed columns (`string | null`, a literal union) reflect as `Object`, which TypeORM
// refuses on Postgres at boot. Service specs mock the repository and never see that, so
// build the real metadata here.
describe('PersistentStatusAlert entity', () => {
  it('builds Postgres metadata with the columns the migration creates', async () => {
    const ds = new DataSource({ type: 'postgres', entities: [PersistentStatusAlert] });
    await (ds as any).buildMetadatas();
    const columns = ds.getMetadata(PersistentStatusAlert).columns.map((c) => c.propertyName);
    expect(columns).toEqual(
      expect.arrayContaining([
        'id', 'userId', 'type', 'occurrenceKey', 'title', 'body',
        'link', 'metadata', 'dismissedAt', 'createdAt', 'updatedAt',
      ]),
    );
  });

  // A zone-less timestamp is read back in the server's local zone: on a non-UTC host every
  // createdAt came out hours in the future, which broke ordering against the browser clock.
  it('stores every timestamp with its time zone', async () => {
    const ds = new DataSource({ type: 'postgres', entities: [PersistentStatusAlert] });
    await (ds as any).buildMetadatas();
    const meta = ds.getMetadata(PersistentStatusAlert);
    for (const name of ['createdAt', 'updatedAt', 'dismissedAt']) {
      expect(meta.findColumnWithPropertyName(name)?.type).toBe('timestamptz');
    }
  });
});

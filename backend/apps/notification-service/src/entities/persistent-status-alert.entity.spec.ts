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
});

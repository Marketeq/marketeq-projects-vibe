const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://postgres:postgres@localhost:5432/postgres' });
async function run() {
  await client.connect();
  try {
    await client.query(`ALTER TABLE "projects" ALTER COLUMN "full_description" TYPE jsonb USING full_description::jsonb;`);
    console.log('projects table updated');
  } catch (e) {
    console.error('projects error:', e.message);
  }
  try {
    await client.query(`ALTER TABLE "_projects_v" ALTER COLUMN "version_full_description" TYPE jsonb USING version_full_description::jsonb;`);
    console.log('_projects_v table updated');
  } catch (e) {
    console.error('_projects_v error:', e.message);
  }
  await client.end();
}
run();

const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://postgres:postgres@localhost:5432/postgres' });
async function run() {
  await client.connect();
  const res = await client.query("SELECT table_schema, table_name, column_name, data_type FROM information_schema.columns WHERE column_name='full_description';");
  console.log(res.rows);
  const res2 = await client.query("SELECT table_schema, table_name, column_name, data_type FROM information_schema.columns WHERE column_name='version_full_description';");
  console.log(res2.rows);
  await client.end();
}
run();

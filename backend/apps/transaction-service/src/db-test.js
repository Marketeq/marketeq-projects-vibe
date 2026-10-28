const { Client } = require("pg");

// The connection string comes from the environment (stored in Doppler); never commit it.
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Export it, or run with: doppler run -- node src/db-test.js");
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testDB() {
  try {
    await client.connect();
    console.log("✅ Connected to Supabase PostgreSQL");

    const result = await client.query("SELECT NOW()");
    console.log("🕒 Database Time:", result.rows[0]);

    await client.end();
    console.log("✅ Connection closed");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
  }
}

testDB();

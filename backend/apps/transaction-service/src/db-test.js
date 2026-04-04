const { Client } = require("pg");

const client = new Client({
  connectionString: "postgresql://postgres:N%40veen_696096@db.itkmlzugzqrthomsvday.supabase.co:5432/postgres",
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

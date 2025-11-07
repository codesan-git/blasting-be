// scripts/test-postgres-connection.ts
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || "5432"),
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  ssl:
    process.env.POSTGRES_SSL === "true" ? { rejectUnauthorized: false } : false,
});

async function testConnection() {
  try {
    console.log("🔄 Testing PostgreSQL connection...");
    console.log("Host:", process.env.POSTGRES_HOST);
    console.log("Port:", process.env.POSTGRES_PORT);
    console.log("Database:", process.env.POSTGRES_DB);
    console.log("User:", process.env.POSTGRES_USER);
    console.log("Schema:", process.env.POSTGRES_SCHEMA || "public");
    console.log(
      "SSL:",
      process.env.POSTGRES_SSL === "true" ? "Enabled" : "Disabled"
    );

    const client = await pool.connect();
    console.log("✅ Connected to PostgreSQL!");

    // Set schema if specified
    if (process.env.POSTGRES_SCHEMA) {
      await client.query(
        `SET search_path TO ${process.env.POSTGRES_SCHEMA}, public`
      );
      console.log(`✅ Schema set to: ${process.env.POSTGRES_SCHEMA}`);
    }

    // Test query
    const result = await client.query(
      "SELECT NOW() as current_time, current_schema() as schema"
    );
    console.log("✅ Current Time:", result.rows[0].current_time);
    console.log("✅ Current Schema:", result.rows[0].schema);

    // Check if tables exist
    const tables = await client.query(
      `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1
      ORDER BY table_name
    `,
      [process.env.POSTGRES_SCHEMA || "public"]
    );

    console.log("\n📋 Existing tables in schema:");
    tables.rows.forEach((row) => {
      console.log("  -", row.table_name);
    });

    client.release();
    await pool.end();

    console.log("\n✅ Connection test successful!");
  } catch (error) {
    console.error("❌ Connection test failed:");
    console.error(error);
    process.exit(1);
  }
}

testConnection();

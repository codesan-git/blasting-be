// scripts/check-postgres-tables.ts
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

async function checkTables() {
  const client = await pool.connect();

  try {
    const schema = process.env.POSTGRES_SCHEMA || "public";

    console.log(`\n📋 Checking tables in schema: ${schema}\n`);

    // Get all tables
    const tables = await client.query(
      `
      SELECT 
        table_name,
        (SELECT COUNT(*) 
         FROM information_schema.columns 
         WHERE table_schema = $1 AND table_name = t.table_name
        ) as column_count
      FROM information_schema.tables t
      WHERE table_schema = $1
      ORDER BY table_name
    `,
      [schema]
    );

    if (tables.rows.length === 0) {
      console.log("❌ No tables found in schema. Schema is empty.");
      console.log("\n💡 Run the application to create tables automatically.");
    } else {
      console.log(`✅ Found ${tables.rows.length} table(s):\n`);

      for (const table of tables.rows) {
        console.log(`📊 Table: ${table.table_name}`);
        console.log(`   Columns: ${table.column_count}`);

        // Get row count
        try {
          const count = await client.query(
            `SELECT COUNT(*) as count FROM ${schema}.${table.table_name}`
          );
          console.log(`   Rows: ${count.rows[0].count}`);
        } catch (error) {
          console.log(`   Rows: (unable to count)`);
        }

        // Get columns
        const columns = await client.query(
          `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = $1 AND table_name = $2
          ORDER BY ordinal_position
          LIMIT 5
        `,
          [schema, table.table_name]
        );

        console.log(`   First 5 columns:`);
        columns.rows.forEach((col) => {
          console.log(
            `     - ${col.column_name} (${col.data_type}) ${
              col.is_nullable === "YES" ? "NULL" : "NOT NULL"
            }`
          );
        });

        console.log("");
      }
    }
  } catch (error) {
    console.error("❌ Error checking tables:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTables();

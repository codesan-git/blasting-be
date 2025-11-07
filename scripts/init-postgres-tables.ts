// scripts/init-postgres-tables.ts
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

async function initTables() {
  const client = await pool.connect();
  const schema = process.env.POSTGRES_SCHEMA || "public";

  try {
    console.log(`🚀 Creating tables in schema: ${schema}\n`);

    await client.query("BEGIN");

    // Set schema
    await client.query(`SET search_path TO ${schema}, public`);

    // Create users table
    console.log("📦 Creating users table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        roles JSONB NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_login_at TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
    `);

    // Create refresh_tokens table
    console.log("📦 Creating refresh_tokens table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        is_revoked BOOLEAN DEFAULT false
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked ON refresh_tokens(is_revoked);
    `);

    // Create message_logs table
    console.log("📦 Creating message_logs table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS message_logs (
        id SERIAL PRIMARY KEY,
        job_id VARCHAR(255) NOT NULL,
        channel VARCHAR(50) NOT NULL,
        recipient_email VARCHAR(255),
        recipient_phone VARCHAR(50),
        recipient_name VARCHAR(255) NOT NULL,
        template_id VARCHAR(255) NOT NULL,
        template_name VARCHAR(255),
        subject TEXT,
        status VARCHAR(50) NOT NULL,
        error_message TEXT,
        message_id VARCHAR(255),
        attempts INTEGER DEFAULT 1,
        created_by VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_job_id ON message_logs(job_id);
      CREATE INDEX IF NOT EXISTS idx_status ON message_logs(status);
      CREATE INDEX IF NOT EXISTS idx_channel ON message_logs(channel);
      CREATE INDEX IF NOT EXISTS idx_recipient_email ON message_logs(recipient_email);
      CREATE INDEX IF NOT EXISTS idx_message_id ON message_logs(message_id);
      CREATE INDEX IF NOT EXISTS idx_created_at ON message_logs(created_at);
    `);

    // Create api_logs table
    console.log("📦 Creating api_logs table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_logs (
        id SERIAL PRIMARY KEY,
        endpoint VARCHAR(255) NOT NULL,
        method VARCHAR(10) NOT NULL,
        ip_address VARCHAR(50),
        user_id VARCHAR(255),
        user_email VARCHAR(255),
        request_body TEXT,
        response_status INTEGER,
        response_time_ms INTEGER,
        error_message TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_api_endpoint ON api_logs(endpoint);
      CREATE INDEX IF NOT EXISTS idx_api_created_at ON api_logs(created_at);
    `);

    // Create system_logs table
    console.log("📦 Creating system_logs table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id SERIAL PRIMARY KEY,
        level VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        metadata JSONB,
        user_id VARCHAR(255),
        user_email VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_system_level ON system_logs(level);
      CREATE INDEX IF NOT EXISTS idx_system_created_at ON system_logs(created_at);
    `);

    // Create role_permissions table
    console.log("📦 Creating role_permissions table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id SERIAL PRIMARY KEY,
        role VARCHAR(100) NOT NULL,
        permission VARCHAR(100) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_by VARCHAR(255),
        UNIQUE(role, permission)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
      CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission);
    `);

    await client.query("COMMIT");

    // Verify tables created
    const tables = await client.query(
      `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1
      ORDER BY table_name
    `,
      [schema]
    );

    console.log("\n✅ Tables created successfully!\n");
    console.log("📋 List of tables:");
    tables.rows.forEach((row) => {
      console.log(`  - ${row.table_name}`);
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Failed to create tables:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

initTables();

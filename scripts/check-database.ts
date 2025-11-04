// scripts/check-database.ts
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "logs.db");

console.log("🔍 Checking database:", DB_PATH);
console.log("");

try {
  const db = new Database(DB_PATH);

  // Get all tables
  const tables = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
    .all() as { name: string }[];

  console.log("📋 Tables in database:");
  tables.forEach((table) => {
    console.log(`   - ${table.name}`);
  });
  console.log("");

  // Check if users table exists
  const hasUsersTable = tables.some((t) => t.name === "users");
  const hasRefreshTokensTable = tables.some((t) => t.name === "refresh_tokens");

  if (hasUsersTable) {
    console.log("✅ Users table exists");

    // Check users table structure
    const usersColumns = db.prepare(`PRAGMA table_info(users)`).all() as any[];
    console.log("\n   Columns in users table:");
    usersColumns.forEach((col) => {
      console.log(`      - ${col.name} (${col.type})`);
    });

    // Count users
    const userCount = db
      .prepare(`SELECT COUNT(*) as count FROM users`)
      .get() as { count: number };
    console.log(`\n   Total users: ${userCount.count}`);

    // Show all users
    if (userCount.count > 0) {
      const users = db
        .prepare(
          `SELECT id, email, name, roles, is_active, created_at FROM users`
        )
        .all() as any[];
      console.log("\n   Users:");
      users.forEach((user) => {
        console.log(`      - ${user.email} (${user.name})`);
        console.log(`        ID: ${user.id}`);
        console.log(`        Roles: ${user.roles}`);
        console.log(`        Active: ${user.is_active}`);
        console.log(`        Created: ${user.created_at}`);
        console.log("");
      });
    }
  } else {
    console.log("❌ Users table NOT found");
    console.log("\n⚠️  You need to create the users table first!");
    console.log("\nRun this SQL in your database:");
    console.log(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  roles TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
    `);
  }
  console.log("");

  if (hasRefreshTokensTable) {
    console.log("✅ Refresh tokens table exists");
  } else {
    console.log("❌ Refresh tokens table NOT found");
  }

  db.close();
} catch (error) {
  console.error("❌ Error:", error);
}

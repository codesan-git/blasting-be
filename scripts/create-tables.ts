// scripts/create-tables.ts
// Initialize database tables for authentication and logging
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "logs.db");

console.log("🔧 Database Initialization");
console.log("==========================\n");

console.log(`Database path: ${DB_PATH}\n`);

try {
  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    console.log("📁 Creating data directory...");
    fs.mkdirSync(dataDir, { recursive: true });
    console.log("✅ Data directory created\n");
  }

  // Open database connection
  console.log("🔌 Connecting to database...");
  const db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent access
  db.pragma("journal_mode = WAL");
  console.log("✅ Connected (WAL mode enabled)\n");

  console.log("📝 Creating tables...\n");

  // ============================================
  // 1. USERS TABLE
  // ============================================
  console.log("1️⃣ Creating users table...");
  db.exec(`
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
  console.log("   ✅ users table created");

  // ============================================
  // 2. REFRESH TOKENS TABLE
  // ============================================
  console.log("2️⃣ Creating refresh_tokens table...");
  db.exec(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      is_revoked BOOLEAN DEFAULT false,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked ON refresh_tokens(is_revoked);
  `);
  console.log("   ✅ refresh_tokens table created");

  // ============================================
  // 3. ROLE PERMISSIONS TABLE
  // ============================================
  console.log("3️⃣ Creating role_permissions table...");
  db.exec(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      permission TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_by TEXT,
      UNIQUE(role, permission)
    );

    CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
    CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission);
  `);
  console.log("   ✅ role_permissions table created");

  // ============================================
  // 4. MESSAGE LOGS TABLE
  // ============================================
  console.log("4️⃣ Creating message_logs table...");
  db.exec(`
    CREATE TABLE IF NOT EXISTS message_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      recipient_email TEXT,
      recipient_phone TEXT,
      recipient_name TEXT NOT NULL,
      template_id TEXT NOT NULL,
      template_name TEXT,
      subject TEXT,
      status TEXT NOT NULL,
      error_message TEXT,
      message_id TEXT,
      attempts INTEGER DEFAULT 1,
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_job_id ON message_logs(job_id);
    CREATE INDEX IF NOT EXISTS idx_status ON message_logs(status);
    CREATE INDEX IF NOT EXISTS idx_channel ON message_logs(channel);
    CREATE INDEX IF NOT EXISTS idx_recipient_email ON message_logs(recipient_email);
    CREATE INDEX IF NOT EXISTS idx_message_id ON message_logs(message_id);
    CREATE INDEX IF NOT EXISTS idx_created_by ON message_logs(created_by);
    CREATE INDEX IF NOT EXISTS idx_created_at ON message_logs(created_at);
  `);
  console.log("   ✅ message_logs table created");

  // ============================================
  // 5. API LOGS TABLE
  // ============================================
  console.log("5️⃣ Creating api_logs table...");
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      ip_address TEXT,
      user_id TEXT,
      user_email TEXT,
      request_body TEXT,
      response_status INTEGER,
      response_time_ms INTEGER,
      error_message TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_api_endpoint ON api_logs(endpoint);
    CREATE INDEX IF NOT EXISTS idx_api_user_id ON api_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_api_created_at ON api_logs(created_at);
  `);
  console.log("   ✅ api_logs table created");

  // ============================================
  // 6. SYSTEM LOGS TABLE
  // ============================================
  console.log("6️⃣ Creating system_logs table...");
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata TEXT,
      user_id TEXT,
      user_email TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_system_level ON system_logs(level);
    CREATE INDEX IF NOT EXISTS idx_system_user_id ON system_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_system_created_at ON system_logs(created_at);
  `);
  console.log("   ✅ system_logs table created");

  // ============================================
  // Insert Default Role Permissions
  // ============================================
  console.log("\n7️⃣ Inserting default role permissions...");

  const getJakartaTime = (): string => {
    return new Date()
      .toLocaleString("en-US", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
      .replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+):(\d+)/, "$3-$1-$2 $4:$5:$6");
  };

  const jakartaTime = getJakartaTime();

  // Default permissions for super_admin (ALL permissions)
  const superAdminPermissions = [
    "email:send",
    "email:read",
    "email:delete",
    "whatsapp:send",
    "whatsapp:read",
    "template:create",
    "template:read",
    "template:update",
    "template:delete",
    "logs:read",
    "logs:delete",
    "dashboard:read",
    "user:create",
    "user:read",
    "user:update",
    "user:delete",
    "user:assign_role",
    "backup:create",
    "backup:read",
    "backup:restore",
    "backup:delete",
    "system:config",
    "system:logs",
  ];

  // Default permissions for admin_ppdb
  const adminPPDBPermissions = [
    "email:send",
    "email:read",
    "whatsapp:send",
    "whatsapp:read",
    "template:create",
    "template:read",
    "template:update",
    "logs:read",
    "dashboard:read",
  ];

  // Default permissions for admin_announcement
  const adminAnnouncementPermissions = [
    "email:send",
    "email:read",
    "whatsapp:send",
    "whatsapp:read",
    "template:create",
    "template:read",
    "template:update",
    "logs:read",
    "dashboard:read",
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO role_permissions (role, permission, created_at, created_by)
    VALUES (?, ?, ?, ?)
  `);

  let insertedCount = 0;

  // Insert super_admin permissions
  superAdminPermissions.forEach((permission) => {
    const result = stmt.run("super_admin", permission, jakartaTime, "system");
    insertedCount += result.changes;
  });

  // Insert admin_ppdb permissions
  adminPPDBPermissions.forEach((permission) => {
    const result = stmt.run("admin_ppdb", permission, jakartaTime, "system");
    insertedCount += result.changes;
  });

  // Insert admin_announcement permissions
  adminAnnouncementPermissions.forEach((permission) => {
    const result = stmt.run(
      "admin_announcement",
      permission,
      jakartaTime,
      "system"
    );
    insertedCount += result.changes;
  });

  console.log(`   ✅ Inserted ${insertedCount} default permissions`);

  // Show permission summary
  const permissionSummary = db
    .prepare(
      `
    SELECT role, COUNT(*) as count 
    FROM role_permissions 
    GROUP BY role
  `
    )
    .all() as { role: string; count: number }[];

  console.log("\n   📊 Permission Summary:");
  permissionSummary.forEach(({ role, count }) => {
    console.log(`      ${role}: ${count} permissions`);
  });

  // ============================================
  // Verify Tables
  // ============================================
  console.log("\n🔍 Verifying tables...");

  const tables = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
    .all() as { name: string }[];

  console.log("\n📋 Tables in database:");
  tables.forEach((table) => {
    console.log(`   ✅ ${table.name}`);
  });

  // ============================================
  // Get Table Info
  // ============================================
  console.log("\n📊 Table Statistics:");

  const getTableInfo = (tableName: string) => {
    const columns = db
      .prepare(`PRAGMA table_info(${tableName})`)
      .all() as any[];
    const indices = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='${tableName}'`
      )
      .all() as { name: string }[];

    return {
      columns: columns.length,
      indices: indices.filter((i) => !i.name.startsWith("sqlite_")).length,
    };
  };

  const userInfo = getTableInfo("users");
  console.log(
    `   users: ${userInfo.columns} columns, ${userInfo.indices} indices`
  );

  const tokenInfo = getTableInfo("refresh_tokens");
  console.log(
    `   refresh_tokens: ${tokenInfo.columns} columns, ${tokenInfo.indices} indices`
  );

  const rolePermInfo = getTableInfo("role_permissions");
  console.log(
    `   role_permissions: ${rolePermInfo.columns} columns, ${rolePermInfo.indices} indices`
  );

  const messageInfo = getTableInfo("message_logs");
  console.log(
    `   message_logs: ${messageInfo.columns} columns, ${messageInfo.indices} indices`
  );

  const apiInfo = getTableInfo("api_logs");
  console.log(
    `   api_logs: ${apiInfo.columns} columns, ${apiInfo.indices} indices`
  );

  const systemInfo = getTableInfo("system_logs");
  console.log(
    `   system_logs: ${systemInfo.columns} columns, ${systemInfo.indices} indices`
  );

  // ============================================
  // Database Size
  // ============================================
  console.log("\n💾 Database Info:");

  const stats = fs.statSync(DB_PATH);
  const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`   Size: ${sizeInMB} MB`);
  console.log(`   Path: ${DB_PATH}`);

  // Check WAL mode
  const walMode = db.pragma("journal_mode", { simple: true }) as string;
  console.log(`   Journal mode: ${walMode}`);

  // Close connection
  db.close();
  console.log("\n✅ Database connection closed");

  console.log("\n==========================");
  console.log("✅ Database initialization complete!");
  console.log("==========================\n");

  console.log("📋 Next Steps:");
  console.log("   1. Create role permissions:");
  console.log("      npm run create-role-permissions");
  console.log("");
  console.log("   2. Create first user:");
  console.log("      npm run setup-auth");
  console.log("");
  console.log("   3. Verify database:");
  console.log("      npm run check-db");
  console.log("");
} catch (error) {
  console.error("\n❌ Error creating tables:", error);

  if (error instanceof Error) {
    console.error("\nError details:");
    console.error(`   Message: ${error.message}`);
    if (error.stack) {
      console.error(`   Stack: ${error.stack}`);
    }
  }

  process.exit(1);
}

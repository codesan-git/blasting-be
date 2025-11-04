// scripts/create-role-permissions-table.ts
// Create table untuk menyimpan permissions per role
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "logs.db");

console.log("🔧 Creating role_permissions table...");
console.log("Database:", DB_PATH);
console.log("");

try {
  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  console.log("📝 Creating role_permissions table...");

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

  console.log("✅ role_permissions table created");

  // Insert default permissions
  console.log("\n📝 Inserting default permissions...");

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

  console.log(`✅ Inserted ${insertedCount} default permissions`);

  // Show summary
  const summary = db
    .prepare(
      `
    SELECT role, COUNT(*) as count 
    FROM role_permissions 
    GROUP BY role
  `
    )
    .all() as { role: string; count: number }[];

  console.log("\n📊 Permission Summary:");
  summary.forEach(({ role, count }) => {
    console.log(`   ${role}: ${count} permissions`);
  });

  db.close();

  console.log("\n✅ Done! Role permissions table ready.");
} catch (error) {
  console.error("❌ Error:", error);
  process.exit(1);
}

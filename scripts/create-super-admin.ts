// scripts/create-super-admin.ts
import { Pool } from "pg";
import bcrypt from "bcrypt";
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

// All available permissions
const ALL_PERMISSIONS = [
  // Email permissions
  "email:send",
  "email:read",
  "email:delete",
  // WhatsApp permissions
  "whatsapp:send",
  "whatsapp:read",
  // Template permissions
  "template:create",
  "template:read",
  "template:update",
  "template:delete",
  // Logs permissions
  "logs:read",
  "logs:delete",
  // Dashboard permissions
  "dashboard:read",
  // User management permissions
  "user:create",
  "user:read",
  "user:update",
  "user:delete",
  "user:assign_role",
  // Backup permissions
  "backup:create",
  "backup:read",
  "backup:restore",
  "backup:delete",
  // System permissions
  "system:config",
  "system:logs",
];

async function createSuperAdmin() {
  const client = await pool.connect();
  const schema = process.env.POSTGRES_SCHEMA || "public";

  try {
    console.log("🚀 Creating Super Admin & Setting up Permissions\n");

    await client.query("BEGIN");
    await client.query(`SET search_path TO ${schema}, public`);

    // Step 1: Create Super Admin User
    console.log("👤 Creating Super Admin user...");

    const email = "superadmin@mns.sch.id";
    const password = "SuperAdmin123!"; // Change this!
    const name = "Super Administrator";
    const roles = ["super_admin"];

    // Check if user already exists
    const existingUser = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    let userId: string;

    if (existingUser.rows.length > 0) {
      console.log("⚠️  Super Admin already exists, updating...");
      userId = existingUser.rows[0].id;

      const hashedPassword = await bcrypt.hash(password, 10);
      await client.query(
        `UPDATE users 
         SET password = $1, name = $2, roles = $3, is_active = true, updated_at = NOW()
         WHERE id = $4`,
        [hashedPassword, name, JSON.stringify(roles), userId]
      );
    } else {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const hashedPassword = await bcrypt.hash(password, 10);

      await client.query(
        `INSERT INTO users (id, email, password, name, roles, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())`,
        [userId, email, hashedPassword, name, JSON.stringify(roles)]
      );

      console.log("✅ Super Admin created!");
    }

    console.log("\n📧 Email:", email);
    console.log("🔑 Password:", password);
    console.log("⚠️  IMPORTANT: Change this password after first login!\n");

    // Step 2: Setup Permissions for Super Admin Role
    console.log("🔐 Setting up permissions for super_admin role...");

    // Delete existing permissions for super_admin
    await client.query(
      `DELETE FROM role_permissions WHERE role = 'super_admin'`
    );

    // Insert all permissions for super_admin
    for (const permission of ALL_PERMISSIONS) {
      await client.query(
        `INSERT INTO role_permissions (role, permission, created_at, created_by)
         VALUES ($1, $2, NOW(), $3)`,
        ["super_admin", permission, userId]
      );
    }

    console.log(
      `✅ Assigned ${ALL_PERMISSIONS.length} permissions to super_admin\n`
    );

    // Step 3: Setup Permissions for Other Roles
    console.log("🔐 Setting up permissions for admin_ppdb role...");

    const ADMIN_PPDB_PERMISSIONS = [
      "email:send",
      "email:read",
      "whatsapp:send",
      "whatsapp:read",
      "template:read",
      "template:create",
      "template:update",
      "logs:read",
      "dashboard:read",
    ];

    await client.query(
      `DELETE FROM role_permissions WHERE role = 'admin_ppdb'`
    );

    for (const permission of ADMIN_PPDB_PERMISSIONS) {
      await client.query(
        `INSERT INTO role_permissions (role, permission, created_at, created_by)
         VALUES ($1, $2, NOW(), $3)`,
        ["admin_ppdb", permission, userId]
      );
    }

    console.log(
      `✅ Assigned ${ADMIN_PPDB_PERMISSIONS.length} permissions to admin_ppdb\n`
    );

    console.log("🔐 Setting up permissions for admin_announcement role...");

    const ADMIN_ANNOUNCEMENT_PERMISSIONS = [
      "email:send",
      "email:read",
      "whatsapp:send",
      "whatsapp:read",
      "template:read",
      "template:create",
      "template:update",
      "logs:read",
      "dashboard:read",
    ];

    await client.query(
      `DELETE FROM role_permissions WHERE role = 'admin_announcement'`
    );

    for (const permission of ADMIN_ANNOUNCEMENT_PERMISSIONS) {
      await client.query(
        `INSERT INTO role_permissions (role, permission, created_at, created_by)
         VALUES ($1, $2, NOW(), $3)`,
        ["admin_announcement", permission, userId]
      );
    }

    console.log(
      `✅ Assigned ${ADMIN_ANNOUNCEMENT_PERMISSIONS.length} permissions to admin_announcement\n`
    );

    await client.query("COMMIT");

    // Step 4: Verify Setup
    console.log("📊 Verification:");

    const userCount = await client.query("SELECT COUNT(*) as count FROM users");
    console.log(`   Users: ${userCount.rows[0].count}`);

    const permissionCount = await client.query(
      "SELECT COUNT(*) as count FROM role_permissions"
    );
    console.log(`   Total Permissions: ${permissionCount.rows[0].count}`);

    const roleStats = await client.query(`
      SELECT role, COUNT(*) as permission_count 
      FROM role_permissions 
      GROUP BY role
      ORDER BY role
    `);

    console.log("\n   Permissions by Role:");
    roleStats.rows.forEach((row) => {
      console.log(`     - ${row.role}: ${row.permission_count} permissions`);
    });

    console.log("\n✅ Setup completed successfully!");
    console.log("\n🔥 Next steps:");
    console.log("   1. Start the application: npm run dev");
    console.log("   2. Login with the credentials above");
    console.log("   3. Change the password immediately!");
    console.log("   4. Create other users via API or admin panel\n");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Setup failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createSuperAdmin();

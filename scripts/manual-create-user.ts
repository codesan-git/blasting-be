// scripts/manual-create-user.ts
// Direct database insertion for testing
import Database from "better-sqlite3";
import bcrypt from "bcrypt";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "logs.db");

async function manualCreateUser() {
  console.log("🔧 Manual User Creation\n");

  try {
    const db = new Database(DB_PATH);

    // User details - EDIT THESE
    const email = "admin@test.com";
    const password = "admin123";
    const name = "Test Admin";
    const roles = ["super_admin"];

    console.log("Creating user with:");
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${name}`);
    console.log(`   Roles: ${roles.join(", ")}`);
    console.log("");

    // Check if exists
    const existing = db
      .prepare(`SELECT * FROM users WHERE email = ?`)
      .get(email);

    if (existing) {
      console.log("⚠️  User already exists!");
      console.log(JSON.stringify(existing, null, 2));
      db.close();
      return;
    }

    // Hash password
    console.log("⏳ Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("✅ Password hashed");

    // Generate ID and timestamp
    const userId = `user_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const now = new Date()
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

    console.log(`⏳ Inserting user with ID: ${userId}`);

    // Insert
    const stmt = db.prepare(`
      INSERT INTO users (id, email, password, name, roles, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      userId,
      email,
      hashedPassword,
      name,
      JSON.stringify(roles),
      1, // is_active = true
      now,
      now
    );

    console.log("✅ Insert result:");
    console.log(`   Changes: ${result.changes}`);
    console.log(`   Last insert rowid: ${result.lastInsertRowid}`);

    // Verify
    const created = db
      .prepare(`SELECT * FROM users WHERE id = ?`)
      .get(userId) as any;

    if (created) {
      console.log("\n✅ User created and verified!");
      console.log("\nUser details:");
      console.log(`   ID: ${created.id}`);
      console.log(`   Email: ${created.email}`);
      console.log(`   Name: ${created.name}`);
      console.log(`   Roles: ${created.roles}`);
      console.log(`   Active: ${created.is_active}`);
      console.log(`   Created: ${created.created_at}`);

      console.log("\n📋 Test login with:");
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
    } else {
      console.log("\n❌ User not found after insertion!");
    }

    // Count all users
    const count = db.prepare(`SELECT COUNT(*) as count FROM users`).get() as {
      count: number;
    };
    console.log(`\nTotal users in database: ${count.count}`);

    db.close();
  } catch (error) {
    console.error("\n❌ Error:", error);
    if (error instanceof Error) {
      console.error("Message:", error.message);
      console.error("Stack:", error.stack);
    }
  }
}

manualCreateUser();

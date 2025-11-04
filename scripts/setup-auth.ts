// scripts/setup-auth.ts
// Run this script to create initial super admin user
// Usage: npx ts-node scripts/setup-auth.ts

import dotenv from "dotenv";
import readline from "readline";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import bcrypt from "bcrypt";

// Load environment variables
dotenv.config();

// Set timezone to Jakarta
process.env.TZ = "Asia/Jakarta";

const DB_PATH = path.join(process.cwd(), "data", "logs.db");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

// Get Jakarta time
function getJakartaTime(): string {
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
}

async function checkDatabase(): Promise<boolean> {
  try {
    if (!fs.existsSync(DB_PATH)) {
      console.error(`❌ Database not found at: ${DB_PATH}`);
      console.log("\n💡 Please run the server first to create the database:");
      console.log("   npm run dev");
      return false;
    }

    const db = new Database(DB_PATH);

    // Check if users table exists
    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='users'`
      )
      .all() as { name: string }[];

    if (tables.length === 0) {
      console.error("❌ Users table not found in database");
      console.log("\n💡 Please create the users table first:");
      console.log("   npx ts-node scripts/create-auth-tables.ts");
      db.close();
      return false;
    }

    db.close();
    return true;
  } catch (error) {
    console.error("❌ Error checking database:", error);
    return false;
  }
}

async function createUser(
  email: string,
  password: string,
  name: string,
  roles: string[]
) {
  try {
    const db = new Database(DB_PATH);

    // Check if email exists
    const existing = db
      .prepare(`SELECT id FROM users WHERE email = ?`)
      .get(email);

    if (existing) {
      console.error(`\n❌ User with email ${email} already exists`);
      db.close();
      return null;
    }

    // Hash password
    console.log("\n⏳ Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate user ID
    const userId = `user_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const jakartaTime = getJakartaTime();

    // Insert user
    console.log("⏳ Creating user in database...");

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
      true,
      jakartaTime,
      jakartaTime
    );

    console.log("✅ User inserted into database");
    console.log(`   Changes: ${result.changes}`);
    console.log(`   Last insert ID: ${result.lastInsertRowid}`);

    // Verify user was created
    const createdUser = db
      .prepare(`SELECT * FROM users WHERE id = ?`)
      .get(userId) as any;

    if (!createdUser) {
      console.error("❌ User was not found after insertion!");
      db.close();
      return null;
    }

    console.log("✅ User verified in database");

    db.close();

    return {
      id: createdUser.id,
      email: createdUser.email,
      name: createdUser.name,
      roles: JSON.parse(createdUser.roles),
      is_active: Boolean(createdUser.is_active),
      created_at: createdUser.created_at,
    };
  } catch (error) {
    console.error("\n❌ Error creating user:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
      console.error("   Stack:", error.stack);
    }
    return null;
  }
}

async function getAllUsers() {
  try {
    const db = new Database(DB_PATH);
    const users = db
      .prepare(`SELECT id, email, name, roles, is_active FROM users`)
      .all() as any[];
    db.close();
    return users.map((user) => ({
      ...user,
      roles: JSON.parse(user.roles),
    }));
  } catch (error) {
    console.error("Error getting users:", error);
    return [];
  }
}

async function setupAuth() {
  console.log("========================================");
  console.log("🔐 Email Blast Authentication Setup");
  console.log("========================================\n");

  try {
    // Check database
    console.log("🔍 Checking database...");
    const dbReady = await checkDatabase();

    if (!dbReady) {
      rl.close();
      return;
    }

    console.log("✅ Database ready\n");

    // Check existing users
    const existingUsers = await getAllUsers();

    if (existingUsers.length > 0) {
      console.log("👥 Existing users in database:");
      existingUsers.forEach((user) => {
        console.log(`   - ${user.email} (${user.name})`);
        console.log(`     Roles: ${user.roles.join(", ")}`);
        console.log(`     Active: ${user.is_active}`);
        console.log("");
      });

      const confirm = await question(
        "Do you want to create another user? (yes/no): "
      );

      if (confirm.toLowerCase() !== "yes" && confirm.toLowerCase() !== "y") {
        console.log("\n✅ Setup cancelled.");
        rl.close();
        return;
      }
    } else {
      console.log("ℹ️  No users found. Creating first user...\n");
    }

    // Get user details
    console.log("📝 Enter user details:\n");

    const email = await question("Email: ");

    if (!email || !email.includes("@")) {
      console.error("❌ Invalid email address");
      rl.close();
      return;
    }

    const name = await question("Full Name: ");

    if (!name) {
      console.error("❌ Name is required");
      rl.close();
      return;
    }

    const password = await question("Password (min 8 characters): ");

    if (!password || password.length < 8) {
      console.error("❌ Password must be at least 8 characters");
      rl.close();
      return;
    }

    // Select roles
    console.log("\n📋 Available roles:");
    console.log("1. super_admin (full access)");
    console.log("2. admin_ppdb (student registration)");
    console.log("3. admin_announcement (mass communications)");
    console.log("");

    const roleInput = await question(
      "Select roles (comma-separated, e.g., 1,2): "
    );

    const roleNumbers = roleInput.split(",").map((n) => n.trim());
    const selectedRoles: string[] = [];

    roleNumbers.forEach((num) => {
      switch (num) {
        case "1":
          selectedRoles.push("super_admin");
          break;
        case "2":
          selectedRoles.push("admin_ppdb");
          break;
        case "3":
          selectedRoles.push("admin_announcement");
          break;
      }
    });

    if (selectedRoles.length === 0) {
      console.error("❌ At least one role must be selected");
      rl.close();
      return;
    }

    // Create user
    console.log("\n========================================");
    console.log("Creating user...");
    console.log("========================================");

    const user = await createUser(email, password, name, selectedRoles);

    if (!user) {
      console.error("\n❌ Failed to create user");
      rl.close();
      return;
    }

    console.log("\n========================================");
    console.log("✅ User created successfully!");
    console.log("========================================\n");
    console.log("User Details:");
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Roles: ${user.roles.join(", ")}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Active: ${user.is_active}`);
    console.log(`   Created: ${user.created_at}`);
    console.log("");

    // Show sample login request
    console.log("========================================");
    console.log("📋 Test Login");
    console.log("========================================\n");
    console.log("curl -X POST http://localhost:3000/api/auth/login \\");
    console.log('  -H "Content-Type: application/json" \\');
    console.log("  -d '{");
    console.log(`    "email": "${user.email}",`);
    console.log(`    "password": "YOUR_PASSWORD"`);
    console.log("  }'\n");

    const createAnother = await question("Create another user? (yes/no): ");

    if (
      createAnother.toLowerCase() === "yes" ||
      createAnother.toLowerCase() === "y"
    ) {
      rl.close();
      // Restart setup
      setTimeout(() => setupAuth(), 100);
      return;
    }

    console.log("\n✅ Setup complete!");
    rl.close();
  } catch (error) {
    console.error("\n❌ Error during setup:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
      console.error("   Stack:", error.stack);
    }
    rl.close();
  }
}

// Run setup
setupAuth();

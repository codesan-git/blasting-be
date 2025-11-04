// scripts/verify-user.ts
// Test if user exists and password can be verified
import Database from "better-sqlite3";
import bcrypt from "bcrypt";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "logs.db");

async function verifyUser() {
  const testEmail = "admin@test.com";
  const testPassword = "admin123";

  console.log("🔍 Verifying User\n");
  console.log(`Email: ${testEmail}`);
  console.log(`Password: ${testPassword}`);
  console.log("");

  try {
    const db = new Database(DB_PATH);

    // Get user
    console.log("1️⃣ Checking if user exists...");
    const user = db
      .prepare(`SELECT * FROM users WHERE email = ?`)
      .get(testEmail) as any;

    if (!user) {
      console.log("❌ User not found in database!");
      db.close();
      return;
    }

    console.log("✅ User found!");
    console.log("\nUser data:");
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Roles: ${user.roles}`);
    console.log(`   Active: ${user.is_active}`);
    console.log(
      `   Password hash (first 50 chars): ${user.password.substring(0, 50)}...`
    );
    console.log("");

    // Test password verification
    console.log("2️⃣ Testing password verification...");
    const isMatch = await bcrypt.compare(testPassword, user.password);

    if (isMatch) {
      console.log("✅ Password verification SUCCESSFUL!");
      console.log("\n✅ User credentials are valid!");
      console.log("\n⚠️  If login still fails, check:");
      console.log("   1. Is DatabaseService.getUserByEmail() working?");
      console.log(
        "   2. Is authService.verifyPassword() using the right method?"
      );
      console.log("   3. Check server logs for errors");
    } else {
      console.log("❌ Password verification FAILED!");
      console.log(
        "\n💡 This means the password hash in database doesn't match."
      );
      console.log("   Possible causes:");
      console.log("   1. User was created with different bcrypt rounds");
      console.log("   2. Password was not hashed correctly");
      console.log("   3. Password stored is not bcrypt hash");
      console.log("\n🔧 Solution: Delete user and recreate with setup-auth.ts");
    }

    db.close();
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

verifyUser();

// scripts/test-auth-service.ts
// Test the auth service directly
import dotenv from "dotenv";
dotenv.config();

import authService from "../src/services/auth.service";
import DatabaseService from "../src/services/database.service";

async function testAuthService() {
  const testEmail = "admin@test.com";
  const testPassword = "admin123";

  console.log("🧪 Testing Auth Service\n");

  try {
    // Test 1: Check if DatabaseService.getUserByEmail works
    console.log("1️⃣ Testing DatabaseService.getUserByEmail()...");
    const user = DatabaseService.getUserByEmail(testEmail);

    if (!user) {
      console.log("❌ getUserByEmail() returned null!");
      console.log("   Check if the method exists in DatabaseService");
      return;
    }

    console.log("✅ getUserByEmail() works!");
    console.log(`   Found user: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Roles: ${JSON.stringify(user.roles)}`);
    console.log(`   Active: ${user.is_active}`);
    console.log("");

    // Test 2: Check if password verification works
    console.log("2️⃣ Testing authService.verifyPassword()...");
    const isPasswordValid = await authService.verifyPassword(
      testPassword,
      user.password
    );

    if (!isPasswordValid) {
      console.log("❌ Password verification failed!");
      console.log("   The password hash doesn't match");
      console.log("\n🔧 Solution: Delete and recreate user");
      return;
    }

    console.log("✅ Password verification works!");
    console.log("");

    // Test 3: Test full login flow
    console.log("3️⃣ Testing authService.login()...");
    const result = await authService.login(testEmail, testPassword);

    if (!result.success) {
      console.log("❌ Login failed!");
      console.log(`   Message: ${result.message}`);
      return;
    }

    console.log("✅ Login successful!");
    console.log(`   Access Token: ${result.accessToken?.substring(0, 50)}...`);
    console.log(
      `   Refresh Token: ${result.refreshToken?.substring(0, 50)}...`
    );
    console.log("");

    // Test 4: Verify token
    console.log("4️⃣ Testing token verification...");
    const payload = authService.verifyAccessToken(result.accessToken!);

    if (!payload) {
      console.log("❌ Token verification failed!");
      return;
    }

    console.log("✅ Token verification works!");
    console.log(`   User ID: ${payload.userId}`);
    console.log(`   Email: ${payload.email}`);
    console.log(`   Roles: ${JSON.stringify(payload.roles)}`);
    console.log("");

    console.log("========================================");
    console.log("🎉 All tests passed!");
    console.log("========================================");
    console.log("\nYour auth system is working correctly.");
    console.log("\nIf API login still fails, check:");
    console.log("1. Is the auth route registered in app.ts?");
    console.log("2. Are you using the correct endpoint: POST /api/auth/login");
    console.log("3. Check server console logs for errors");
  } catch (error) {
    console.error("\n❌ Error during test:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
      console.error("   Stack:", error.stack);
    }
  }
}

testAuthService();

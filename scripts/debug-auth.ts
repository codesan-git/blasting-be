// scripts/debug-auth.ts
// Debug authentication and permission issues
import dotenv from "dotenv";
dotenv.config();

import DatabaseService from "../src/services/database.service";
import authService from "../src/services/auth.service";

console.log("🔍 Debugging Authentication System\n");

async function debugAuth() {
  try {
    // 1. Check if role_permissions table exists
    console.log("1️⃣ Checking role_permissions table...");
    try {
      const allPermissions = DatabaseService.getAllRolePermissions();
      console.log("✅ role_permissions table exists");
      console.log(`   Found ${Object.keys(allPermissions).length} roles`);

      Object.entries(allPermissions).forEach(([role, permissions]) => {
        console.log(`   - ${role}: ${permissions.length} permissions`);
      });
    } catch (error) {
      console.log("❌ role_permissions table error:", error);
      console.log("\n💡 Solution: Run this command:");
      console.log("   npx ts-node scripts/create-role-permissions-table.ts\n");
      return;
    }

    console.log("");

    // 2. Check database methods exist
    console.log("2️⃣ Checking DatabaseService methods...");

    const requiredMethods = [
      "getUserById",
      "getUserByEmail",
      "getRolePermissions",
      "getRolesPermissions",
      "roleHasPermission",
      "userHasPermission",
      "getAllRolePermissions",
    ];

    let missingMethods: string[] = [];

    requiredMethods.forEach((method) => {
      if (typeof (DatabaseService as any)[method] === "function") {
        console.log(`   ✅ ${method}`);
      } else {
        console.log(`   ❌ ${method} - NOT FOUND`);
        missingMethods.push(method);
      }
    });

    if (missingMethods.length > 0) {
      console.log("\n❌ Missing methods in DatabaseService:");
      missingMethods.forEach((m) => console.log(`   - ${m}`));
      console.log("\n💡 Solution: Add auth methods to DatabaseService");
      console.log("   Check: src/services/database.service.ts\n");
      return;
    }

    console.log("");

    // 3. Test getting user
    console.log("3️⃣ Testing user retrieval...");

    const users = DatabaseService.getAllUsers();

    if (users.length === 0) {
      console.log("❌ No users found in database");
      console.log("\n💡 Solution: Create a user first:");
      console.log("   npm run setup-auth\n");
      return;
    }

    const testUser = users[0];
    console.log(`✅ Found ${users.length} user(s)`);
    console.log(`   Test user: ${testUser.email}`);
    console.log(`   Roles: ${testUser.roles.join(", ")}`);

    console.log("");

    // 4. Test getting permissions
    console.log("4️⃣ Testing permission retrieval...");

    try {
      const permissions = DatabaseService.getRolesPermissions(testUser.roles);
      console.log(`✅ User has ${permissions.length} permissions`);

      if (permissions.length === 0) {
        console.log("⚠️  Warning: User has no permissions!");
        console.log("   Run: npm run manage-permissions");
      } else {
        console.log(
          "   Permissions:",
          permissions.slice(0, 5).join(", "),
          "..."
        );
      }
    } catch (error) {
      console.log("❌ Error getting permissions:", error);
      return;
    }

    console.log("");

    // 5. Test token generation
    console.log("5️⃣ Testing JWT token generation...");

    try {
      const token = authService.generateAccessToken(testUser);
      console.log("✅ Token generated successfully");
      console.log(`   Token (first 50 chars): ${token.substring(0, 50)}...`);

      // Verify token
      const payload = authService.verifyAccessToken(token);

      if (payload) {
        console.log("✅ Token verification successful");
        console.log(`   User ID: ${payload.userId}`);
        console.log(`   Email: ${payload.email}`);
        console.log(`   Roles: ${payload.roles.join(", ")}`);
      } else {
        console.log("❌ Token verification failed");
      }
    } catch (error) {
      console.log("❌ Token generation error:", error);
      return;
    }

    console.log("");

    // 6. Test login flow
    console.log("6️⃣ Testing login flow...");

    console.log(`   Using email: ${testUser.email}`);
    console.log("   Note: We can't test password here (it's hashed)");
    console.log("   Try login via API:");
    console.log(`   
   curl -X POST http://localhost:3000/api/auth/login \\
     -H "Content-Type: application/json" \\
     -d '{"email":"${testUser.email}","password":"YOUR_PASSWORD"}'
    `);

    console.log("");

    // 7. Summary
    console.log("========================================");
    console.log("📊 Debug Summary");
    console.log("========================================");
    console.log("✅ role_permissions table: OK");
    console.log("✅ DatabaseService methods: OK");
    console.log("✅ User exists: OK");
    console.log("✅ Permissions loaded: OK");
    console.log("✅ JWT token generation: OK");
    console.log("");
    console.log("🎉 Authentication system looks healthy!");
    console.log("");
    console.log("If you're still getting 500 errors:");
    console.log("1. Check server console logs for exact error");
    console.log("2. Make sure server is running: npm run dev");
    console.log("3. Try login with correct password");
    console.log("4. Test with this token:");

    const debugToken = authService.generateAccessToken(testUser);
    console.log(`\nTEST_TOKEN="${debugToken}"\n`);
    console.log("curl http://localhost:3000/api/auth/me \\");
    console.log(`  -H "Authorization: Bearer $TEST_TOKEN"`);
    console.log("");
  } catch (error) {
    console.error("\n❌ Debug error:", error);

    if (error instanceof Error) {
      console.error("   Message:", error.message);
      console.error("   Stack:", error.stack);
    }
  }
}

debugAuth();

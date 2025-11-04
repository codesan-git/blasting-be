// scripts/test-permissions.ts
// Automated testing untuk permission management
import axios from "axios";
import DatabaseService from "../src/services/database.service";
import authService from "../src/services/auth.service";

const BASE_URL = process.env.APP_URL || "http://localhost:3000";

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  statusCode?: number;
}

const results: TestResult[] = [];

function logTest(
  test: string,
  passed: boolean,
  message: string,
  statusCode?: number
) {
  results.push({ test, passed, message, statusCode });
  const icon = passed ? "✅" : "❌";
  console.log(`${icon} ${test}: ${message}`);
}

async function getAdminToken(): Promise<string> {
  // Get super admin from database
  const superAdmins = DatabaseService.getSuperAdmins();

  if (superAdmins.length === 0) {
    throw new Error("No super admin found. Run setup-auth first.");
  }

  const admin = superAdmins[0];

  // For testing, we'll create token directly (bypass login)
  const token = authService.generateAccessToken(admin);

  return token;
}

async function testPermissionAPI() {
  console.log("🧪 Testing Permission Management API\n");

  let adminToken: string;

  try {
    adminToken = await getAdminToken();
    logTest("Get Admin Token", true, "Token generated successfully");
  } catch (error) {
    logTest(
      "Get Admin Token",
      false,
      error instanceof Error ? error.message : "Failed"
    );
    return;
  }

  const headers = {
    Authorization: `Bearer ${adminToken}`,
    "Content-Type": "application/json",
  };

  // Test 1: Get all permissions
  try {
    const response = await axios.get(`${BASE_URL}/api/permissions`, {
      headers,
    });

    const passed = response.status === 200 && response.data.success === true;
    logTest(
      "GET /api/permissions",
      passed,
      `Got ${response.data.count} permissions`,
      response.status
    );
  } catch (error: any) {
    logTest(
      "GET /api/permissions",
      false,
      error.response?.data?.message || error.message,
      error.response?.status
    );
  }

  // Test 2: Get all role permissions
  try {
    const response = await axios.get(`${BASE_URL}/api/permissions/roles`, {
      headers,
    });

    const passed = response.status === 200 && response.data.success === true;
    logTest(
      "GET /api/permissions/roles",
      passed,
      `Got ${response.data.roles.length} roles`,
      response.status
    );
  } catch (error: any) {
    logTest(
      "GET /api/permissions/roles",
      false,
      error.response?.data?.message || error.message,
      error.response?.status
    );
  }

  // Test 3: Get specific role permissions
  try {
    const response = await axios.get(
      `${BASE_URL}/api/permissions/roles/admin_ppdb`,
      { headers }
    );

    const passed = response.status === 200 && response.data.success === true;
    logTest(
      "GET /api/permissions/roles/admin_ppdb",
      passed,
      `Got ${response.data.count} permissions`,
      response.status
    );
  } catch (error: any) {
    logTest(
      "GET /api/permissions/roles/admin_ppdb",
      false,
      error.response?.data?.message || error.message,
      error.response?.status
    );
  }

  // Test 4: Add permission to role
  try {
    const response = await axios.post(
      `${BASE_URL}/api/permissions/roles/admin_ppdb`,
      { permission: "email:delete" },
      { headers }
    );

    const passed = response.status === 200 && response.data.success === true;
    logTest(
      "POST /api/permissions/roles/admin_ppdb (add email:delete)",
      passed,
      response.data.message,
      response.status
    );
  } catch (error: any) {
    logTest(
      "POST /api/permissions/roles/admin_ppdb",
      false,
      error.response?.data?.message || error.message,
      error.response?.status
    );
  }

  // Test 5: Add duplicate permission (should fail gracefully)
  try {
    const response = await axios.post(
      `${BASE_URL}/api/permissions/roles/admin_ppdb`,
      { permission: "email:send" },
      { headers }
    );

    // Should return 400 if already exists
    logTest(
      "POST duplicate permission",
      response.status === 400,
      "Correctly rejected duplicate permission",
      response.status
    );
  } catch (error: any) {
    const passed = error.response?.status === 400;
    logTest(
      "POST duplicate permission",
      passed,
      "Correctly rejected duplicate permission",
      error.response?.status
    );
  }

  // Test 6: Add invalid permission (should fail)
  try {
    const response = await axios.post(
      `${BASE_URL}/api/permissions/roles/admin_ppdb`,
      { permission: "invalid:permission" },
      { headers }
    );

    logTest(
      "POST invalid permission",
      false,
      "Should have rejected invalid permission",
      response.status
    );
  } catch (error: any) {
    const passed = error.response?.status === 400;
    logTest(
      "POST invalid permission",
      passed,
      "Correctly rejected invalid permission",
      error.response?.status
    );
  }

  // Test 7: Set all permissions for role
  try {
    const response = await axios.put(
      `${BASE_URL}/api/permissions/roles/admin_ppdb`,
      {
        permissions: [
          "email:send",
          "email:read",
          "whatsapp:send",
          "template:read",
          "logs:read",
          "dashboard:read",
        ],
      },
      { headers }
    );

    const passed = response.status === 200 && response.data.success === true;
    logTest(
      "PUT /api/permissions/roles/admin_ppdb (set permissions)",
      passed,
      `Set ${response.data.permissions.length} permissions`,
      response.status
    );
  } catch (error: any) {
    logTest(
      "PUT /api/permissions/roles/admin_ppdb",
      false,
      error.response?.data?.message || error.message,
      error.response?.status
    );
  }

  // Test 8: Remove permission from role
  try {
    const response = await axios.delete(
      `${BASE_URL}/api/permissions/roles/admin_ppdb/email:delete`,
      { headers }
    );

    const passed = response.status === 200 && response.data.success === true;
    logTest(
      "DELETE /api/permissions/roles/admin_ppdb/email:delete",
      passed,
      response.data.message,
      response.status
    );
  } catch (error: any) {
    logTest(
      "DELETE permission",
      false,
      error.response?.data?.message || error.message,
      error.response?.status
    );
  }

  // Test 9: Remove non-existent permission (should fail gracefully)
  try {
    const response = await axios.delete(
      `${BASE_URL}/api/permissions/roles/admin_ppdb/backup:delete`,
      { headers }
    );

    logTest(
      "DELETE non-existent permission",
      false,
      "Should have returned 404",
      response.status
    );
  } catch (error: any) {
    const passed = error.response?.status === 404;
    logTest(
      "DELETE non-existent permission",
      passed,
      "Correctly returned 404",
      error.response?.status
    );
  }

  // Test 10: Get permission stats
  try {
    const response = await axios.get(`${BASE_URL}/api/permissions/stats`, {
      headers,
    });

    const passed = response.status === 200 && response.data.success === true;
    logTest(
      "GET /api/permissions/stats",
      passed,
      `Got ${response.data.count} permissions stats`,
      response.status
    );
  } catch (error: any) {
    logTest(
      "GET /api/permissions/stats",
      false,
      error.response?.data?.message || error.message,
      error.response?.status
    );
  }

  // Test 11: Test without authentication (should fail)
  try {
    const response = await axios.get(`${BASE_URL}/api/permissions`);

    logTest(
      "Request without auth",
      false,
      "Should have rejected unauthenticated request",
      response.status
    );
  } catch (error: any) {
    const passed = error.response?.status === 401;
    logTest(
      "Request without auth",
      passed,
      "Correctly rejected unauthenticated request",
      error.response?.status
    );
  }

  // Summary
  console.log("\n========================================");
  console.log("📊 Test Summary");
  console.log("========================================");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log("\n❌ Failed Tests:");
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`   - ${r.test}: ${r.message} (${r.statusCode || "N/A"})`);
      });
  }

  console.log("========================================\n");
}

async function testDatabaseMethods() {
  console.log("\n🧪 Testing Database Methods\n");

  // Test 1: Get role permissions
  try {
    const permissions = DatabaseService.getRolePermissions("admin_ppdb");
    logTest(
      "getRolePermissions()",
      permissions.length > 0,
      `Got ${permissions.length} permissions`
    );
  } catch (error) {
    logTest(
      "getRolePermissions()",
      false,
      error instanceof Error ? error.message : "Failed"
    );
  }

  // Test 2: Get multiple roles permissions
  try {
    const permissions = DatabaseService.getRolesPermissions([
      "admin_ppdb",
      "admin_announcement",
    ]);
    logTest(
      "getRolesPermissions()",
      permissions.length > 0,
      `Got ${permissions.length} combined permissions`
    );
  } catch (error) {
    logTest(
      "getRolesPermissions()",
      false,
      error instanceof Error ? error.message : "Failed"
    );
  }

  // Test 3: Check if role has permission
  try {
    const hasPermission = DatabaseService.roleHasPermission(
      "admin_ppdb",
      "email:send"
    );
    logTest(
      "roleHasPermission()",
      hasPermission === true,
      hasPermission ? "Permission found" : "Permission not found"
    );
  } catch (error) {
    logTest(
      "roleHasPermission()",
      false,
      error instanceof Error ? error.message : "Failed"
    );
  }

  // Test 4: Check if user has permission
  try {
    const hasPermission = DatabaseService.userHasPermission(
      ["admin_ppdb"],
      "email:send"
    );
    logTest(
      "userHasPermission()",
      hasPermission === true,
      hasPermission ? "User has permission" : "User doesn't have permission"
    );
  } catch (error) {
    logTest(
      "userHasPermission()",
      false,
      error instanceof Error ? error.message : "Failed"
    );
  }

  // Test 5: Get all role permissions
  try {
    const allPermissions = DatabaseService.getAllRolePermissions();
    const roleCount = Object.keys(allPermissions).length;
    logTest(
      "getAllRolePermissions()",
      roleCount > 0,
      `Got permissions for ${roleCount} roles`
    );
  } catch (error) {
    logTest(
      "getAllRolePermissions()",
      false,
      error instanceof Error ? error.message : "Failed"
    );
  }

  // Test 6: Get permission stats
  try {
    const stats = DatabaseService.getPermissionStats();
    logTest(
      "getPermissionStats()",
      stats.length > 0,
      `Got stats for ${stats.length} permissions`
    );
  } catch (error) {
    logTest(
      "getPermissionStats()",
      false,
      error instanceof Error ? error.message : "Failed"
    );
  }
}

async function main() {
  console.log("========================================");
  console.log("🧪 Permission Management Testing");
  console.log("========================================\n");

  console.log("⚠️  Make sure server is running on", BASE_URL);
  console.log("");

  // Test database methods first
  await testDatabaseMethods();

  // Test API endpoints
  await testPermissionAPI();

  console.log("✅ Testing completed!\n");
}

main().catch((error) => {
  console.error("❌ Test error:", error);
  process.exit(1);
});

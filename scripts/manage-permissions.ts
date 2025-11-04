// scripts/manage-permissions.ts
// Interactive CLI untuk manage role permissions
import readline from "readline";
import DatabaseService from "../src/services/database.service";
import { Permission } from "../src/types/auth.types";

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

function displayMenu() {
  console.log("\n========================================");
  console.log("🔐 Role Permission Management");
  console.log("========================================");
  console.log("1. View all role permissions");
  console.log("2. View specific role permissions");
  console.log("3. Add permission to role");
  console.log("4. Remove permission from role");
  console.log("5. Set all permissions for role");
  console.log("6. View permission statistics");
  console.log("7. Exit");
  console.log("========================================\n");
}

async function viewAllRolePermissions() {
  const rolePermissions = DatabaseService.getAllRolePermissions();

  console.log("\n📋 All Role Permissions:\n");

  Object.entries(rolePermissions).forEach(([role, permissions]) => {
    console.log(`👤 ${role.toUpperCase()}`);
    console.log(`   Permissions (${permissions.length}):`);
    permissions.forEach((permission) => {
      console.log(`   - ${permission}`);
    });
    console.log("");
  });
}

async function viewRolePermissions() {
  const role = await question("Enter role name (e.g., admin_ppdb): ");

  const permissions = DatabaseService.getRolePermissions(role);

  console.log(`\n📋 Permissions for ${role}:`);
  console.log(`   Total: ${permissions.length}\n`);

  if (permissions.length === 0) {
    console.log("   No permissions found for this role.");
  } else {
    permissions.forEach((permission) => {
      console.log(`   - ${permission}`);
    });
  }
}

async function addPermission() {
  const role = await question("Enter role name: ");

  // Show available permissions
  const allPermissions = Object.values(Permission);
  const currentPermissions = DatabaseService.getRolePermissions(role);

  console.log("\n📋 Available permissions:");
  allPermissions.forEach((permission, index) => {
    const hasIt = currentPermissions.includes(permission) ? "✅" : "  ";
    console.log(`   ${hasIt} ${index + 1}. ${permission}`);
  });

  const permissionInput = await question(
    "\nEnter permission (name or number): "
  );

  let permission: string;

  // Check if input is a number
  if (!isNaN(Number(permissionInput))) {
    const index = parseInt(permissionInput) - 1;
    if (index >= 0 && index < allPermissions.length) {
      permission = allPermissions[index];
    } else {
      console.log("❌ Invalid number");
      return;
    }
  } else {
    permission = permissionInput;
  }

  // Validate permission
  if (!allPermissions.includes(permission as Permission)) {
    console.log(`❌ Invalid permission: ${permission}`);
    return;
  }

  // Add permission
  const success = DatabaseService.addRolePermission(role, permission, "system");

  if (success) {
    console.log(`\n✅ Permission '${permission}' added to role '${role}'`);
  } else {
    console.log(
      `\n⚠️  Permission '${permission}' already exists for role '${role}'`
    );
  }
}

async function removePermission() {
  const role = await question("Enter role name: ");

  const permissions = DatabaseService.getRolePermissions(role);

  if (permissions.length === 0) {
    console.log(`\n❌ No permissions found for role '${role}'`);
    return;
  }

  console.log(`\n📋 Current permissions for ${role}:`);
  permissions.forEach((permission, index) => {
    console.log(`   ${index + 1}. ${permission}`);
  });

  const permissionInput = await question(
    "\nEnter permission to remove (name or number): "
  );

  let permission: string;

  // Check if input is a number
  if (!isNaN(Number(permissionInput))) {
    const index = parseInt(permissionInput) - 1;
    if (index >= 0 && index < permissions.length) {
      permission = permissions[index];
    } else {
      console.log("❌ Invalid number");
      return;
    }
  } else {
    permission = permissionInput;
  }

  const success = DatabaseService.removeRolePermission(role, permission);

  if (success) {
    console.log(`\n✅ Permission '${permission}' removed from role '${role}'`);
  } else {
    console.log(`\n❌ Permission '${permission}' not found for role '${role}'`);
  }
}

async function setAllPermissions() {
  const role = await question("Enter role name: ");

  const allPermissions = Object.values(Permission);
  const currentPermissions = DatabaseService.getRolePermissions(role);

  console.log("\n📋 Select permissions (comma-separated numbers):");
  allPermissions.forEach((permission, index) => {
    const hasIt = currentPermissions.includes(permission) ? "✅" : "  ";
    console.log(`   ${hasIt} ${index + 1}. ${permission}`);
  });

  const input = await question("\nEnter numbers (e.g., 1,2,3,5,7): ");

  const numbers = input.split(",").map((n) => parseInt(n.trim()));
  const selectedPermissions = numbers
    .map((num) => allPermissions[num - 1])
    .filter((p) => p !== undefined);

  if (selectedPermissions.length === 0) {
    console.log("❌ No valid permissions selected");
    return;
  }

  console.log("\n📋 Selected permissions:");
  selectedPermissions.forEach((p) => console.log(`   - ${p}`));

  const confirm = await question("\nConfirm? (yes/no): ");

  if (confirm.toLowerCase() !== "yes" && confirm.toLowerCase() !== "y") {
    console.log("❌ Cancelled");
    return;
  }

  const success = DatabaseService.setRolePermissions(
    role,
    selectedPermissions,
    "system"
  );

  if (success) {
    console.log(`\n✅ Permissions updated for role '${role}'`);
    console.log(`   Total: ${selectedPermissions.length} permissions`);
  } else {
    console.log(`\n❌ Failed to update permissions`);
  }
}

async function viewStats() {
  const stats = DatabaseService.getPermissionStats();

  console.log("\n📊 Permission Usage Statistics:\n");

  stats.forEach(({ permission, roleCount, roles }) => {
    console.log(`   ${permission}`);
    console.log(`      Used by ${roleCount} role(s): ${roles}`);
  });
}

async function main() {
  try {
    while (true) {
      displayMenu();

      const choice = await question("Select option (1-7): ");

      switch (choice) {
        case "1":
          await viewAllRolePermissions();
          break;
        case "2":
          await viewRolePermissions();
          break;
        case "3":
          await addPermission();
          break;
        case "4":
          await removePermission();
          break;
        case "5":
          await setAllPermissions();
          break;
        case "6":
          await viewStats();
          break;
        case "7":
          console.log("\n✅ Goodbye!");
          rl.close();
          return;
        default:
          console.log("\n❌ Invalid option");
      }

      await question("\nPress Enter to continue...");
    }
  } catch (error) {
    console.error("\n❌ Error:", error);
    rl.close();
  }
}

main();

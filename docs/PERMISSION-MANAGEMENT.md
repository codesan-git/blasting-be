# 🔐 Dynamic Permission Management Documentation

## Overview

Sistem permission yang **fully dynamic** dan **database-driven**. Super admin dapat menambah/mengurangi permission untuk setiap role **tanpa perlu restart server atau ubah code**.

---

## 🎯 Key Features

### 1. **Dynamic Permissions**

- ✅ Stored in database, not hardcoded
- ✅ Changes apply immediately (no restart)
- ✅ Per-role configuration

### 2. **Flexible Management**

- ✅ Add/remove individual permissions
- ✅ Set all permissions at once
- ✅ View permission usage statistics

### 3. **Complete Audit Trail**

- ✅ Track who added permissions
- ✅ User ID in all logs
- ✅ Permission change history

### 4. **Multiple Interfaces**

- ✅ REST API endpoints
- ✅ CLI tool for management
- ✅ Database queries

---

## 📊 Database Schema

### role_permissions Table

```sql
CREATE TABLE role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,
  permission TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT,
  UNIQUE(role, permission)
);
```

**Columns:**

- `id` - Auto increment primary key
- `role` - Role name (super_admin, admin_ppdb, admin_announcement)
- `permission` - Permission string (e.g., "email:send")
- `created_at` - Jakarta timestamp
- `created_by` - User ID who added this permission

**Indexes:**

- `idx_role_permissions_role` - Fast lookup by role
- `idx_role_permissions_permission` - Fast lookup by permission

---

## 🚀 Setup

### Step 1: Create Table

```bash
npx ts-node scripts/create-role-permissions-table.ts
```

This will:

- ✅ Create `role_permissions` table
- ✅ Create indexes
- ✅ Insert default permissions for all roles

**Output:**

```
🔧 Creating role_permissions table...
Database: /path/to/logs.db

📝 Creating role_permissions table...
✅ role_permissions table created

📝 Inserting default permissions...
✅ Inserted 45 default permissions

📊 Permission Summary:
   super_admin: 20 permissions
   admin_ppdb: 9 permissions
   admin_announcement: 9 permissions

✅ Done! Role permissions table ready.
```

### Step 2: Verify Setup

```bash
# Check database
npx ts-node scripts/check-database.ts

# View permissions via CLI
npm run manage-permissions
```

### Step 3: Update app.ts

```typescript
import permissionRoutes from "./routes/permission.routes";

app.use("/api/permissions", permissionRoutes);
```

---

## 🔑 Available Permissions

### Email Permissions

```
email:send      - Send emails
email:read      - View email logs
email:delete    - Delete email records
```

### WhatsApp Permissions

```
whatsapp:send   - Send WhatsApp messages
whatsapp:read   - View WhatsApp logs
```

### Template Permissions

```
template:create - Create new templates
template:read   - View templates
template:update - Edit templates
template:delete - Delete templates
```

### Logs Permissions

```
logs:read       - View logs
logs:delete     - Delete old logs
```

### Dashboard Permissions

```
dashboard:read  - View dashboard statistics
```

### User Management Permissions (Super Admin Only)

```
user:create       - Create new users
user:read         - View user list
user:update       - Update user info
user:delete       - Delete users
user:assign_role  - Assign roles to users
```

### Backup Permissions (Super Admin Only)

```
backup:create   - Create database backups
backup:read     - View backup list
backup:restore  - Restore from backup
backup:delete   - Delete backup files
```

### System Permissions (Super Admin Only)

```
system:config   - View/edit system configuration
system:logs     - View system logs
```

---

## 📡 API Endpoints

All permission endpoints require **Super Admin** authentication.

### 1. List All Available Permissions

```http
GET /api/permissions
Authorization: Bearer <super_admin_token>
```

**Response:**

```json
{
  "success": true,
  "count": 20,
  "permissions": [
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
    "system:logs"
  ]
}
```

### 2. Get All Roles with Permissions

```http
GET /api/permissions/roles
Authorization: Bearer <super_admin_token>
```

**Response:**

```json
{
  "success": true,
  "roles": ["super_admin", "admin_ppdb", "admin_announcement"],
  "permissions": {
    "super_admin": [
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
      "system:logs"
    ],
    "admin_ppdb": [
      "email:send",
      "email:read",
      "whatsapp:send",
      "whatsapp:read",
      "template:create",
      "template:read",
      "template:update",
      "logs:read",
      "dashboard:read"
    ],
    "admin_announcement": [
      "email:send",
      "email:read",
      "whatsapp:send",
      "whatsapp:read",
      "template:create",
      "template:read",
      "template:update",
      "logs:read",
      "dashboard:read"
    ]
  }
}
```

### 3. Get Specific Role Permissions

```http
GET /api/permissions/roles/:role
Authorization: Bearer <super_admin_token>
```

**Example:**

```bash
curl http://localhost:3000/api/permissions/roles/admin_ppdb \
  -H "Authorization: Bearer <token>"
```

**Response:**

```json
{
  "success": true,
  "role": "admin_ppdb",
  "count": 9,
  "permissions": [
    "dashboard:read",
    "email:read",
    "email:send",
    "logs:read",
    "template:create",
    "template:read",
    "template:update",
    "whatsapp:read",
    "whatsapp:send"
  ]
}
```

### 4. Add Permission to Role

```http
POST /api/permissions/roles/:role
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "permission": "email:delete"
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/permissions/roles/admin_ppdb \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"permission": "email:delete"}'
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Permission added successfully",
  "role": "admin_ppdb",
  "permission": "email:delete"
}
```

**Already Exists (400):**

```json
{
  "success": false,
  "message": "Permission already exists for this role"
}
```

**Invalid Permission (400):**

```json
{
  "success": false,
  "message": "Invalid permission: invalid:permission",
  "validPermissions": ["email:send", "email:read", ...]
}
```

### 5. Remove Permission from Role

```http
DELETE /api/permissions/roles/:role/:permission
Authorization: Bearer <super_admin_token>
```

**Example:**

```bash
curl -X DELETE http://localhost:3000/api/permissions/roles/admin_ppdb/email:delete \
  -H "Authorization: Bearer <token>"
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Permission removed successfully",
  "role": "admin_ppdb",
  "permission": "email:delete"
}
```

**Not Found (404):**

```json
{
  "success": false,
  "message": "Permission not found for this role"
}
```

### 6. Set All Permissions for Role (Replace)

```http
PUT /api/permissions/roles/:role
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "permissions": [
    "email:send",
    "email:read",
    "whatsapp:send",
    "template:read",
    "logs:read",
    "dashboard:read"
  ]
}
```

**Example:**

```bash
curl -X PUT http://localhost:3000/api/permissions/roles/admin_ppdb \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": [
      "email:send",
      "email:read",
      "whatsapp:send",
      "template:read",
      "logs:read",
      "dashboard:read"
    ]
  }'
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Role permissions updated successfully",
  "role": "admin_ppdb",
  "permissions": [
    "email:send",
    "email:read",
    "whatsapp:send",
    "template:read",
    "logs:read",
    "dashboard:read"
  ],
  "changes": {
    "added": ["whatsapp:send"],
    "removed": ["template:create", "template:update", "whatsapp:read"]
  }
}
```

### 7. Get Permission Statistics

```http
GET /api/permissions/stats
Authorization: Bearer <super_admin_token>
```

**Response:**

```json
{
  "success": true,
  "count": 20,
  "stats": [
    {
      "permission": "email:send",
      "roleCount": 3,
      "roles": "super_admin,admin_ppdb,admin_announcement"
    },
    {
      "permission": "email:read",
      "roleCount": 3,
      "roles": "super_admin,admin_ppdb,admin_announcement"
    },
    {
      "permission": "user:create",
      "roleCount": 1,
      "roles": "super_admin"
    }
  ]
}
```

---

## 🖥️ CLI Tool

### Launch CLI

```bash
npm run manage-permissions
```

### CLI Menu

```
========================================
🔐 Role Permission Management
========================================
1. View all role permissions
2. View specific role permissions
3. Add permission to role
4. Remove permission from role
5. Set all permissions for role
6. View permission statistics
7. Exit
========================================
```

### CLI Usage Examples

#### View All Permissions

```
Select option: 1

📋 All Role Permissions:

👤 SUPER_ADMIN
   Permissions (20):
   - backup:create
   - backup:delete
   - backup:read
   - backup:restore
   - dashboard:read
   ...

👤 ADMIN_PPDB
   Permissions (9):
   - dashboard:read
   - email:read
   - email:send
   ...
```

#### Add Permission

```
Select option: 3
Enter role name: admin_ppdb

📋 Available permissions:
     1. email:send
   ✅ 2. email:read
     3. email:delete
   ✅ 4. whatsapp:send
   ...

Enter permission (name or number): 3

✅ Permission 'email:delete' added to role 'admin_ppdb'
```

#### Remove Permission

```
Select option: 4
Enter role name: admin_ppdb

📋 Current permissions for admin_ppdb:
   1. email:send
   2. email:read
   3. email:delete
   4. whatsapp:send
   ...

Enter permission to remove (name or number): 3

✅ Permission 'email:delete' removed from role 'admin_ppdb'
```

#### Set All Permissions

```
Select option: 5
Enter role name: admin_ppdb

📋 Select permissions (comma-separated numbers):
   ✅ 1. email:send
   ✅ 2. email:read
      3. email:delete
   ✅ 4. whatsapp:send
   ...

Enter numbers (e.g., 1,2,3,5,7): 1,2,4,7,9,12

📋 Selected permissions:
   - email:send
   - email:read
   - whatsapp:send
   - template:read
   - logs:read
   - dashboard:read

Confirm? (yes/no): yes

✅ Permissions updated for role 'admin_ppdb'
   Total: 6 permissions
```

---

## 🎯 Common Use Cases

### Use Case 1: Give Admin PPDB Email Delete Permission

**Problem:** Admin PPDB perlu hapus email logs yang salah kirim

**Solution via API:**

```bash
curl -X POST http://localhost:3000/api/permissions/roles/admin_ppdb \
  -H "Authorization: Bearer <super_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"permission": "email:delete"}'
```

**Solution via CLI:**

```bash
npm run manage-permissions
# Select: 3 (Add permission)
# Role: admin_ppdb
# Permission: email:delete
```

### Use Case 2: Remove Template Delete from Admin Announcement

**Problem:** Admin Announcement terlalu sering hapus template

**Solution via API:**

```bash
curl -X DELETE http://localhost:3000/api/permissions/roles/admin_announcement/template:delete \
  -H "Authorization: Bearer <super_admin_token>"
```

**Solution via CLI:**

```bash
npm run manage-permissions
# Select: 4 (Remove permission)
# Role: admin_announcement
# Permission: template:delete
```

### Use Case 3: Reset Admin PPDB to Minimal Permissions

**Problem:** Admin PPDB punya terlalu banyak akses

**Solution via API:**

```bash
curl -X PUT http://localhost:3000/api/permissions/roles/admin_ppdb \
  -H "Authorization: Bearer <super_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": [
      "email:send",
      "email:read",
      "logs:read",
      "dashboard:read"
    ]
  }'
```

### Use Case 4: Create New Custom Role

**Step 1:** Create user with new role

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Authorization: Bearer <super_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "viewer@example.com",
    "password": "secure123",
    "name": "Read Only User",
    "roles": ["viewer"]
  }'
```

**Step 2:** Set permissions for new role

```bash
curl -X PUT http://localhost:3000/api/permissions/roles/viewer \
  -H "Authorization: Bearer <super_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": [
      "logs:read",
      "dashboard:read"
    ]
  }'
```

---

## 🔍 User ID Tracking

All permission changes are logged with user information:

### System Logs Include:

```json
{
  "level": "info",
  "message": "Permission added to role",
  "role": "admin_ppdb",
  "permission": "email:delete",
  "userId": "user_1762180896289_15ex48fx3",
  "userEmail": "admin@example.com",
  "timestamp": "2025-11-04 12:30:45"
}
```

### Query Logs by User:

```bash
# View what user did
GET /api/logs/system?userId=user_123

# View permission changes
GET /api/logs/system?search=Permission
```

### Database Query:

```sql
-- See who added permissions
SELECT * FROM system_logs
WHERE message LIKE '%Permission%'
AND JSON_EXTRACT(metadata, '$.userId') = 'user_123'
ORDER BY created_at DESC;
```

---

## 🧪 Testing Permission Changes

### Test Scenario 1: Add Permission & Verify Access

```bash
# 1. Login as admin_ppdb (should NOT have email:delete)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ppdb@test.com","password":"test123"}'

# Save token
TOKEN="eyJhbGc..."

# 2. Try to delete email (should fail 403)
curl -X DELETE http://localhost:3000/api/logs/messages/123 \
  -H "Authorization: Bearer $TOKEN"
# Expected: 403 Forbidden

# 3. Add permission (as super admin)
curl -X POST http://localhost:3000/api/permissions/roles/admin_ppdb \
  -H "Authorization: Bearer <super_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"permission": "email:delete"}'

# 4. Try again (should succeed now)
curl -X DELETE http://localhost:3000/api/logs/messages/123 \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200 OK (no restart needed!)
```

### Test Scenario 2: Remove Permission & Verify Blocked

```bash
# 1. Remove permission
curl -X DELETE http://localhost:3000/api/permissions/roles/admin_ppdb/template:create \
  -H "Authorization: Bearer <super_admin_token>"

# 2. Try to create template (should fail immediately)
curl -X POST http://localhost:3000/api/templates \
  -H "Authorization: Bearer <admin_ppdb_token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Template",...}'
# Expected: 403 Forbidden (real-time blocking!)
```

---

## 📊 Permission Matrix (Default)

| Permission      | Super Admin | Admin PPDB | Admin Announcement |
| --------------- | ----------- | ---------- | ------------------ |
| email:send      | ✅          | ✅         | ✅                 |
| email:read      | ✅          | ✅         | ✅                 |
| email:delete    | ✅          | ❌         | ❌                 |
| whatsapp:send   | ✅          | ✅         | ✅                 |
| whatsapp:read   | ✅          | ✅         | ✅                 |
| template:create | ✅          | ✅         | ✅                 |
| template:read   | ✅          | ✅         | ✅                 |
| template:update | ✅          | ✅         | ✅                 |
| template:delete | ✅          | ❌         | ❌                 |
| logs:read       | ✅          | ✅         | ✅                 |
| logs:delete     | ✅          | ❌         | ❌                 |
| dashboard:read  | ✅          | ✅         | ✅                 |
| user:\*         | ✅          | ❌         | ❌                 |
| backup:\*       | ✅          | ❌         | ❌                 |
| system:\*       | ✅          | ❌         | ❌                 |

**Note:** This is the **default** configuration. Super admin can change this anytime!

---

## 🔧 Troubleshooting

### Issue: Permission changes not working

**Symptoms:** Added permission but user still gets 403

**Solution:**

1. Check if permission was actually added:

   ```bash
   curl http://localhost:3000/api/permissions/roles/admin_ppdb \
     -H "Authorization: Bearer <super_admin_token>"
   ```

2. Check user's roles:

   ```bash
   curl http://localhost:3000/api/auth/me \
     -H "Authorization: Bearer <user_token>"
   ```

3. Verify permission name is correct (case-sensitive!)

4. Check system logs for errors:
   ```bash
   GET /api/logs/system?level=error
   ```

### Issue: Can't add permission - "Invalid permission"

**Cause:** Permission name typo or doesn't exist

**Solution:**

```bash
# Get list of valid permissions
curl http://localhost:3000/api/permissions \
  -H "Authorization: Bearer <super_admin_token>"
```

### Issue: Permission removed but user still has access

**Cause:** User has multiple roles, one still has the permission

**Solution:**

```bash
# Check all roles for user
GET /api/auth/me

# Check permissions for each role
GET /api/permissions/roles/role1
GET /api/permissions/roles/role2
```

---

## 🎓 Best Practices

### 1. **Principle of Least Privilege**

- Only give permissions yang benar-benar dibutuhkan
- Start minimal, add as needed
- Review permissions regularly

### 2. **Use Role-Based Access**

- Group similar permissions into roles
- Don't assign individual permissions to users
- Create custom roles for specific needs

### 3. **Audit Trail**

- Check logs regularly:
  ```bash
  GET /api/logs/system?search=Permission
  ```
- Monitor who added/removed permissions
- Track permission usage with stats:
  ```bash
  GET /api/permissions/stats
  ```

### 4. **Testing**

- Always test after permission changes
- Verify both positive (should work) and negative (should block) cases
- Test with actual user accounts, not just super admin

### 5. **Documentation**

- Document custom roles and their purposes
- Keep track of permission changes
- Note why certain permissions were added/removed

---

## 🔒 Security Considerations

### 1. **Super Admin Only**

- Only super admin can manage permissions
- No way for regular users to escalate privileges
- All changes logged with user ID

### 2. **Atomic Operations**

- Permission checks happen on every request
- Changes apply immediately
- No caching of permissions

### 3. **Database Integrity**

- UNIQUE constraint on (role, permission)
- No duplicate permissions per role
- Foreign key constraints prevent orphaned data

### 4. **Audit Trail**

- All permission changes logged
- User ID tracked for accountability
- Timestamps in Jakarta timezone

---

## 📚 Additional Resources

### Related Documentation

- [Authentication API](./API-AUTH-DOCUMENTATION.md)
- [Super Admin Limit](./SUPER-ADMIN-LIMIT.md)
- [API Response Standards](./API-RESPONSE-STANDARDS.md)

### Scripts

- `create-role-permissions-table.ts` - Setup permissions table
- `manage-permissions.ts` - CLI management tool
- `test-permissions.ts` - Test permission functionality

### Database Queries

**View all permissions:**

```sql
SELECT role, permission FROM role_permissions
ORDER BY role, permission;
```

**Count permissions per role:**

```sql
SELECT role, COUNT(*) as count
FROM role_permissions
GROUP BY role;
```

**Find who added permission:**

```sql
SELECT * FROM role_permissions
WHERE role = 'admin_ppdb' AND permission = 'email:delete';
```

**Permission usage history:**

```sql
SELECT * FROM system_logs
WHERE message LIKE '%Permission%'
ORDER BY created_at DESC
LIMIT 50;
```

---

## 📞 Support

For issues or questions:

1. Check system logs: `GET /api/logs/system`
2. View permission stats: `GET /api/permissions/stats`
3. Test with CLI tool: `npm run manage-permissions`
4. Review this documentation

---

**Last Updated:** 2025-11-04  
**Version:** 1.0.0

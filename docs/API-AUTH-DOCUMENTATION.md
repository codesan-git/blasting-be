# 🔐 Authentication API Documentation

## Overview

This application uses **JWT (JSON Web Token)** authentication with role-based access control (RBAC).

## User Roles

| Role                 | Description                | Permissions                                 |
| -------------------- | -------------------------- | ------------------------------------------- |
| `super_admin`        | Full system access         | All permissions                             |
| `admin_ppdb`         | Student registration admin | Email, WhatsApp, Templates, Logs, Dashboard |
| `admin_announcement` | Mass communication admin   | Email, WhatsApp, Templates, Logs, Dashboard |

## Authentication Flow

```
1. Login → Get Access Token + Refresh Token
2. Use Access Token for API requests (expires in 15 minutes)
3. When expired, use Refresh Token to get new Access Token
4. Logout → Revoke Refresh Token
```

---

## 🔓 Public Endpoints (No Authentication)

### 1. Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "your-password"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user_123",
    "email": "admin@example.com",
    "name": "Admin User",
    "roles": ["super_admin"]
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "a1b2c3d4e5f6..."
}
```

### 2. Refresh Token

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "user": {
    "id": "user_123",
    "email": "admin@example.com",
    "name": "Admin User",
    "roles": ["super_admin"]
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

## 🔒 Protected Endpoints (Require Authentication)

All protected endpoints require the `Authorization` header:

```http
Authorization: Bearer <access_token>
```

### 3. Get Current User Profile

```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "admin@example.com",
    "name": "Admin User",
    "roles": ["super_admin", "admin_ppdb"],
    "is_active": true,
    "created_at": "2025-11-03 10:00:00",
    "permissions": [
      "email:send",
      "whatsapp:send",
      "template:create",
      ...
    ]
  }
}
```

### 4. Change Password

```http
POST /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "old-password",
  "newPassword": "new-password-min-8-chars"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Password changed successfully. Please login again."
}
```

### 5. Logout

```http
POST /api/auth/logout
Authorization: Bearer <token>
Content-Type: application/json

{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 6. Revoke All Sessions

Revokes all refresh tokens for current user (force logout from all devices).

```http
POST /api/auth/revoke-sessions
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "message": "3 session(s) revoked successfully. Please login again.",
  "count": 3
}
```

---

## 👥 User Management (Super Admin Only)

### 7. Register New User

```http
POST /api/auth/register
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "secure-password",
  "name": "New User",
  "roles": ["admin_ppdb"]
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "user_456",
    "email": "newuser@example.com",
    "name": "New User",
    "roles": ["admin_ppdb"],
    "is_active": true
  }
}
```

### 8. Get All Users

```http
GET /api/users
Authorization: Bearer <super_admin_token>
```

**Response (200):**

```json
{
  "success": true,
  "count": 5,
  "users": [
    {
      "id": "user_123",
      "email": "admin@example.com",
      "name": "Admin User",
      "roles": ["super_admin"],
      "is_active": true,
      "created_at": "2025-11-03 10:00:00",
      "last_login_at": "2025-11-03 14:30:00",
      "permissions": [...]
    }
  ]
}
```

### 9. Get User by ID

```http
GET /api/users/:id
Authorization: Bearer <super_admin_token>
```

### 10. Update User

```http
PUT /api/users/:id
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "name": "Updated Name",
  "roles": ["admin_ppdb", "admin_announcement"],
  "is_active": true
}
```

### 11. Delete User

```http
DELETE /api/users/:id
Authorization: Bearer <super_admin_token>
```

### 12. Deactivate User

```http
POST /api/users/:id/deactivate
Authorization: Bearer <super_admin_token>
```

### 13. Activate User

```http
POST /api/users/:id/activate
Authorization: Bearer <super_admin_token>
```

### 14. Reset User Password

```http
POST /api/users/:id/reset-password
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "newPassword": "new-secure-password"
}
```

---

## 🔑 Permission-Based Access

### Email Blast

Requires: `email:send` permission

```http
POST /api/messages/blast
Authorization: Bearer <token>
```

**Roles with access:** `super_admin`, `admin_ppdb`, `admin_announcement`

### Template Management

Requires: `template:read`, `template:create`, `template:update`

```http
GET /api/templates
Authorization: Bearer <token>
```

**Roles with access:** `super_admin`, `admin_ppdb`, `admin_announcement`

### Logs

Requires: `logs:read` permission

```http
GET /api/logs/messages
Authorization: Bearer <token>
```

**Roles with access:** `super_admin`, `admin_ppdb`, `admin_announcement`

### System Configuration

Requires: `system:config` permission

```http
GET /api/smtp/status
Authorization: Bearer <token>
```

**Roles with access:** `super_admin` only

---

## 📋 Complete Permission List

```typescript
// Email permissions
email:send
email:read
email:delete

// WhatsApp permissions
whatsapp:send
whatsapp:read

// Template permissions
template:create
template:read
template:update
template:delete

// Logs permissions
logs:read
logs:delete

// Dashboard permissions
dashboard:read

// User management permissions (super admin only)
user:create
user:read
user:update
user:delete
user:assign_role

// Backup permissions
backup:create
backup:read
backup:restore
backup:delete

// System permissions (super admin only)
system:config
system:logs
```

---

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
npm install jsonwebtoken bcrypt
npm install --save-dev @types/jsonwebtoken @types/bcrypt
```

### 2. Update Environment Variables

```bash
# Add to .env
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-refresh-secret-key-change-this
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### 3. Update Database Service

Add the authentication tables and methods from `database_auth.ts` to your `database.service.ts`.

### 4. Create Initial Super Admin

```bash
npx ts-node scripts/setup-auth.ts
```

Follow the prompts to create your first super admin user.

### 5. Test Authentication

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your-password"
  }'

# Use the token
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <your_token>"
```

---

## 🔒 Security Best Practices

1. **Always use HTTPS in production**
2. **Use strong JWT secrets** (minimum 32 characters)
3. **Set short expiry times** for access tokens (15 minutes)
4. **Store refresh tokens securely** in httpOnly cookies (production)
5. **Implement rate limiting** on login endpoint
6. **Log all authentication events**
7. **Revoke tokens on password change**
8. **Use bcrypt with at least 10 rounds** for password hashing

---

## 🎯 Example Usage with Multiple Roles

A user can have multiple roles to access different features:

```json
{
  "email": "manager@example.com",
  "password": "secure-password",
  "name": "Manager",
  "roles": ["admin_ppdb", "admin_announcement"]
}
```

This user will have permissions from both roles combined.

---

## ❌ Error Responses

### 401 Unauthorized

```json
{
  "success": false,
  "message": "Invalid or expired token. Please login again."
}
```

### 403 Forbidden

```json
{
  "success": false,
  "message": "Access denied. Insufficient permissions.",
  "requiredPermissions": ["user:create"]
}
```

### 400 Bad Request

```json
{
  "success": false,
  "message": "Email and password are required"
}
```

---

## 📊 Token Information

- **Access Token**: Short-lived (15 minutes), used for API requests
- **Refresh Token**: Long-lived (7 days), used to get new access tokens
- **Algorithm**: HS256 (HMAC with SHA-256)
- **Password Hashing**: bcrypt with 10 rounds

---

## 🔄 Token Refresh Strategy

```javascript
// Pseudo code for frontend
async function makeAuthenticatedRequest(url, options) {
  let token = getAccessToken();

  let response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  // If token expired
  if (response.status === 401) {
    // Refresh token
    const refreshToken = getRefreshToken();
    const refreshResponse = await fetch("/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });

    const { accessToken } = await refreshResponse.json();
    saveAccessToken(accessToken);

    // Retry original request
    response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...options.headers,
      },
    });
  }

  return response;
}
```

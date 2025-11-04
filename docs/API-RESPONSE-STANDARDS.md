# 📡 API Response Standards Documentation

## Overview

Semua API endpoint menggunakan **standardized response format** yang konsisten untuk memudahkan client-side development dan error handling.

---

## 🎯 Response Format

### Success Response

```typescript
{
  "success": true,
  "statusCode": 200,
  "message": "Success message",
  "data": { ... },          // Optional: response data
  "meta": { ... },          // Optional: pagination metadata
  "timestamp": "2025-11-04 12:30:45"
}
```

### Error Response

```typescript
{
  "success": false,
  "statusCode": 400,
  "message": "Error message",
  "data": null,
  "errors": [               // Optional: validation errors
    {
      "field": "email",
      "message": "Email is required",
      "code": "REQUIRED"
    }
  ],
  "timestamp": "2025-11-04 12:30:45"
}
```

---

## 📊 HTTP Status Codes

### Success Codes (2xx)

| Code    | Name       | Usage                                | Example          |
| ------- | ---------- | ------------------------------------ | ---------------- |
| **200** | OK         | Successful GET, PUT, DELETE          | Get user details |
| **201** | Created    | Successful POST (resource created)   | Create new user  |
| **202** | Accepted   | Request accepted for processing      | Async job queued |
| **204** | No Content | Successful DELETE (no response body) | Delete user      |

### Client Error Codes (4xx)

| Code    | Name                 | Usage                           | Example                   |
| ------- | -------------------- | ------------------------------- | ------------------------- |
| **400** | Bad Request          | Invalid request data            | Missing required fields   |
| **401** | Unauthorized         | Not authenticated               | No token or expired token |
| **403** | Forbidden            | Authenticated but no permission | Insufficient role         |
| **404** | Not Found            | Resource doesn't exist          | User ID not found         |
| **409** | Conflict             | Resource already exists         | Duplicate email           |
| **422** | Unprocessable Entity | Validation failed               | Invalid email format      |
| **429** | Too Many Requests    | Rate limit exceeded             | Too many login attempts   |

### Server Error Codes (5xx)

| Code    | Name                  | Usage                    | Example                    |
| ------- | --------------------- | ------------------------ | -------------------------- |
| **500** | Internal Server Error | Unexpected server error  | Database connection failed |
| **503** | Service Unavailable   | Service temporarily down | Maintenance mode           |

---

## 🛠️ Using ResponseHelper

### Import

```typescript
import ResponseHelper from "../utils/api-response.helper";
import { HttpStatus } from "../types/api-response.types";
```

### Success Responses

#### 1. Basic Success (200)

```typescript
// GET /api/users/:id
export const getUser = async (req: Request, res: Response): Promise<void> => {
  const user = await findUser(req.params.id);

  ResponseHelper.success(res, user, "User retrieved successfully");
};

// Response:
// {
//   "success": true,
//   "statusCode": 200,
//   "message": "User retrieved successfully",
//   "data": { "id": 1, "name": "John", "email": "john@example.com" },
//   "timestamp": "2025-11-04 12:30:45"
// }
```

#### 2. Created (201)

```typescript
// POST /api/users
export const createUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const newUser = await saveUser(req.body);

  ResponseHelper.created(res, newUser, "User created successfully");
};

// Response:
// {
//   "success": true,
//   "statusCode": 201,
//   "message": "User created successfully",
//   "data": { "id": 1, "name": "John", "email": "john@example.com" },
//   "timestamp": "2025-11-04 12:30:45"
// }
```

#### 3. Accepted (202)

```typescript
// POST /api/jobs/process
export const processJob = async (
  req: Request,
  res: Response
): Promise<void> => {
  await queueJob(req.body);

  ResponseHelper.accepted(res, "Job accepted for processing");
};

// Response:
// {
//   "success": true,
//   "statusCode": 202,
//   "message": "Job accepted for processing",
//   "timestamp": "2025-11-04 12:30:45"
// }
```

#### 4. No Content (204)

```typescript
// DELETE /api/users/:id
export const deleteUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  await deleteUserFromDB(req.params.id);

  ResponseHelper.noContent(res);
};

// Response: Empty body with 204 status
```

#### 5. Paginated Response

```typescript
// GET /api/users?page=1&limit=10
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  const { users, total } = await fetchUsers(page, limit);

  ResponseHelper.paginated(
    res,
    users,
    {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
    "Users retrieved successfully"
  );
};

// Response:
// {
//   "success": true,
//   "statusCode": 200,
//   "message": "Users retrieved successfully",
//   "data": [
//     { "id": 1, "name": "John" },
//     { "id": 2, "name": "Jane" }
//   ],
//   "meta": {
//     "page": 1,
//     "limit": 10,
//     "total": 100,
//     "totalPages": 10,
//     "hasNext": true,
//     "hasPrev": false
//   },
//   "timestamp": "2025-11-04 12:30:45"
// }
```

### Error Responses

#### 1. Bad Request (400)

```typescript
export const createUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email, name } = req.body;

  if (!email || !name) {
    return ResponseHelper.badRequest(res, "Missing required fields", [
      { field: "email", message: "Email is required" },
      { field: "name", message: "Name is required" },
    ]);
  }

  // ... continue
};

// Response:
// {
//   "success": false,
//   "statusCode": 400,
//   "message": "Missing required fields",
//   "data": null,
//   "errors": [
//     { "field": "email", "message": "Email is required" },
//     { "field": "name", "message": "Name is required" }
//   ],
//   "timestamp": "2025-11-04 12:30:45"
// }
```

#### 2. Unauthorized (401)

```typescript
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.headers.authorization) {
    return ResponseHelper.unauthorized(
      res,
      "No token provided. Please login first."
    );
  }

  // ... continue
};

// Response:
// {
//   "success": false,
//   "statusCode": 401,
//   "message": "No token provided. Please login first.",
//   "data": null,
//   "timestamp": "2025-11-04 12:30:45"
// }
```

#### 3. Forbidden (403)

```typescript
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!hasPermission(req.user, permission)) {
      return ResponseHelper.forbidden(
        res,
        "You don't have permission to access this resource"
      );
    }

    next();
  };
};

// Response:
// {
//   "success": false,
//   "statusCode": 403,
//   "message": "You don't have permission to access this resource",
//   "data": null,
//   "timestamp": "2025-11-04 12:30:45"
// }
```

#### 4. Not Found (404)

```typescript
export const getUser = async (req: Request, res: Response): Promise<void> => {
  const user = await findUser(req.params.id);

  if (!user) {
    return ResponseHelper.notFound(res, "User not found");
  }

  ResponseHelper.success(res, user);
};

// Response:
// {
//   "success": false,
//   "statusCode": 404,
//   "message": "User not found",
//   "data": null,
//   "timestamp": "2025-11-04 12:30:45"
// }
```

#### 5. Conflict (409)

```typescript
export const createUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const existingUser = await findUserByEmail(req.body.email);

  if (existingUser) {
    return ResponseHelper.conflict(res, "User with this email already exists");
  }

  // ... continue
};

// Response:
// {
//   "success": false,
//   "statusCode": 409,
//   "message": "User with this email already exists",
//   "data": null,
//   "timestamp": "2025-11-04 12:30:45"
// }
```

#### 6. Validation Error (422)

```typescript
export const createUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const errors = validateUserData(req.body);

  if (errors.length > 0) {
    return ResponseHelper.validationError(res, errors, "Validation failed");
  }

  // ... continue
};

// Response:
// {
//   "success": false,
//   "statusCode": 422,
//   "message": "Validation failed",
//   "data": null,
//   "errors": [
//     { "field": "email", "message": "Invalid email format" },
//     { "field": "password", "message": "Password must be at least 8 characters" }
//   ],
//   "timestamp": "2025-11-04 12:30:45"
// }
```

#### 7. Too Many Requests (429)

```typescript
// In rate limiter middleware
export const rateLimiterHandler = (req: Request, res: Response): void => {
  ResponseHelper.tooManyRequests(
    res,
    "Too many requests. Please try again in 1 minute."
  );
};

// Response:
// {
//   "success": false,
//   "statusCode": 429,
//   "message": "Too many requests. Please try again in 1 minute.",
//   "data": null,
//   "timestamp": "2025-11-04 12:30:45"
// }
```

#### 8. Internal Server Error (500)

```typescript
export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await findUser(req.params.id);
    ResponseHelper.success(res, user);
  } catch (error) {
    logger.error("Get user error", {
      error: error instanceof Error ? error.message : "Unknown error",
      userId: req.user?.userId,
    });

    ResponseHelper.internalError(res, "Failed to retrieve user");
  }
};

// Response:
// {
//   "success": false,
//   "statusCode": 500,
//   "message": "Failed to retrieve user",
//   "data": null,
//   "timestamp": "2025-11-04 12:30:45"
// }
```

---

## 🔄 Migration Guide

### Before (Inconsistent)

```typescript
// Different response formats across endpoints
res.status(200).json({ success: true, user });
res.status(404).json({ error: "Not found" });
res.json({ data: users });
res.send({ message: "OK" });
```

### After (Standardized)

```typescript
// Consistent response format
ResponseHelper.success(res, user, "User retrieved successfully");
ResponseHelper.notFound(res, "User not found");
ResponseHelper.success(res, users, "Users retrieved successfully");
ResponseHelper.success(res, null, "Operation completed successfully");
```

---

## 📋 Quick Reference

### ResponseHelper Methods

```typescript
// Success responses
ResponseHelper.success(res, data, message, statusCode?, meta?)
ResponseHelper.created(res, data, message)
ResponseHelper.accepted(res, message)
ResponseHelper.noContent(res)
ResponseHelper.paginated(res, data, meta, message)

// Error responses
ResponseHelper.error(res, message, statusCode, errors?)
ResponseHelper.badRequest(res, message, errors?)
ResponseHelper.unauthorized(res, message?)
ResponseHelper.forbidden(res, message?)
ResponseHelper.notFound(res, message?)
ResponseHelper.conflict(res, message?)
ResponseHelper.validationError(res, errors, message?)
ResponseHelper.tooManyRequests(res, message?)
ResponseHelper.internalError(res, message?)
ResponseHelper.serviceUnavailable(res, message?)
```

---

## 🎯 Best Practices

### 1. **Always Use StatusCode**

```typescript
✅ ResponseHelper.success(res, data, "Success")
❌ res.json({ data })
```

### 2. **Provide Clear Messages**

```typescript
✅ ResponseHelper.notFound(res, "User with ID 123 not found")
❌ ResponseHelper.notFound(res, "Not found")
```

### 3. **Include Validation Details**

```typescript
✅ ResponseHelper.badRequest(res, "Invalid input", [
     { field: "email", message: "Invalid email format" }
   ])
❌ ResponseHelper.badRequest(res, "Invalid")
```

### 4. **Use Appropriate Status Codes**

```typescript
✅ ResponseHelper.created(res, user)        // For POST
✅ ResponseHelper.success(res, user)        // For GET/PUT
✅ ResponseHelper.noContent(res)            // For DELETE
❌ ResponseHelper.success(res, user)        // For all operations
```

### 5. **Log Errors Before Responding**

```typescript
✅
try {
  // ...
} catch (error) {
  logger.error("Operation failed", { error, userId: req.user?.userId });
  ResponseHelper.internalError(res, "Operation failed");
}

❌
try {
  // ...
} catch (error) {
  ResponseHelper.internalError(res);
}
```

---

## 🧪 Testing Response Format

```bash
# All responses should include these fields
{
  "success": boolean,     # Required
  "statusCode": number,   # Required
  "message": string,      # Required
  "timestamp": string     # Required (Jakarta time)
}
```

### Test Script

```typescript
// Test if response follows standard format
function validateResponse(response: any) {
  assert(typeof response.success === "boolean");
  assert(typeof response.statusCode === "number");
  assert(typeof response.message === "string");
  assert(typeof response.timestamp === "string");

  if (response.success) {
    assert("data" in response || response.statusCode === 204);
  } else {
    assert(response.data === null);
  }
}
```

---

## 📊 Response Examples

### Example 1: Login Success

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_123",
      "email": "admin@example.com",
      "name": "Admin User",
      "roles": ["super_admin"]
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "abc123..."
  },
  "timestamp": "2025-11-04 12:30:45"
}
```

### Example 2: Validation Error

```json
{
  "success": false,
  "statusCode": 422,
  "message": "Validation failed",
  "data": null,
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ],
  "timestamp": "2025-11-04 12:30:45"
}
```

### Example 3: Paginated List

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Users retrieved successfully",
  "data": [
    { "id": 1, "name": "John", "email": "john@example.com" },
    { "id": 2, "name": "Jane", "email": "jane@example.com" }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2025-11-04 12:30:45"
}
```

### Example 4: Forbidden Access

```json
{
  "success": false,
  "statusCode": 403,
  "message": "Access denied. You don't have permission to delete users.",
  "data": null,
  "timestamp": "2025-11-04 12:30:45"
}
```

---

## 🔗 Related Documentation

- [Authentication API](./API-AUTH-DOCUMENTATION.md)
- [Permission Management](./PERMISSION-MANAGEMENT.md)
- [Error Handling Best Practices](./ERROR-HANDLING.md)

---

**Last Updated:** 2025-11-04  
**Version:** 1.0.0

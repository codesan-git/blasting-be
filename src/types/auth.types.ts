// src/types/auth.types.ts

export enum UserRole {
  SUPER_ADMIN = "super_admin",
  ADMIN_PPDB = "admin_ppdb",
  ADMIN_ANNOUNCEMENT = "admin_announcement",
}

export enum Permission {
  // Email permissions
  EMAIL_SEND = "email:send",
  EMAIL_READ = "email:read",
  EMAIL_DELETE = "email:delete",

  // WhatsApp permissions
  WHATSAPP_SEND = "whatsapp:send",
  WHATSAPP_READ = "whatsapp:read",

  // Template permissions
  TEMPLATE_CREATE = "template:create",
  TEMPLATE_READ = "template:read",
  TEMPLATE_UPDATE = "template:update",
  TEMPLATE_DELETE = "template:delete",

  // Logs permissions
  LOGS_READ = "logs:read",
  LOGS_DELETE = "logs:delete",

  // Dashboard permissions
  DASHBOARD_READ = "dashboard:read",

  // User management permissions
  USER_CREATE = "user:create",
  USER_READ = "user:read",
  USER_UPDATE = "user:update",
  USER_DELETE = "user:delete",
  USER_ASSIGN_ROLE = "user:assign_role",

  // Backup permissions
  BACKUP_CREATE = "backup:create",
  BACKUP_READ = "backup:read",
  BACKUP_RESTORE = "backup:restore",
  BACKUP_DELETE = "backup:delete",

  // System permissions
  SYSTEM_CONFIG = "system:config",
  SYSTEM_LOGS = "system:logs",
}

export interface User {
  id: string;
  email: string;
  password: string; // hashed
  name: string;
  roles: UserRole[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  roles: UserRole[];
  iat: number;
  exp: number;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token: string; // hashed
  expires_at: string;
  created_at: string;
  is_revoked: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    name: string;
    roles: UserRole[];
  };
  accessToken?: string;
  refreshToken?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  roles: UserRole[];
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  roles?: UserRole[];
  is_active?: boolean;
}

// Role-Permission mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: [
    // Super admin has all permissions
    ...Object.values(Permission),
  ],

  [UserRole.ADMIN_PPDB]: [
    // PPDB admin can send emails/whatsapp for student registration
    Permission.EMAIL_SEND,
    Permission.EMAIL_READ,
    Permission.WHATSAPP_SEND,
    Permission.WHATSAPP_READ,
    Permission.TEMPLATE_READ,
    Permission.TEMPLATE_CREATE,
    Permission.TEMPLATE_UPDATE,
    Permission.LOGS_READ,
    Permission.DASHBOARD_READ,
  ],

  [UserRole.ADMIN_ANNOUNCEMENT]: [
    // Announcement admin can send mass communications
    Permission.EMAIL_SEND,
    Permission.EMAIL_READ,
    Permission.WHATSAPP_SEND,
    Permission.WHATSAPP_READ,
    Permission.TEMPLATE_READ,
    Permission.TEMPLATE_CREATE,
    Permission.TEMPLATE_UPDATE,
    Permission.LOGS_READ,
    Permission.DASHBOARD_READ,
  ],
};

// Helper function to get all permissions for a user based on their roles
export function getUserPermissions(roles: UserRole[]): Permission[] {
  const permissionsSet = new Set<Permission>();

  roles.forEach((role) => {
    const rolePermissions = ROLE_PERMISSIONS[role] || [];
    rolePermissions.forEach((permission) => permissionsSet.add(permission));
  });

  return Array.from(permissionsSet);
}

// Helper function to check if user has a specific permission
export function hasPermission(
  userRoles: UserRole[],
  requiredPermission: Permission
): boolean {
  const userPermissions = getUserPermissions(userRoles);
  return userPermissions.includes(requiredPermission);
}

// Helper function to check if user has any of the required permissions
export function hasAnyPermission(
  userRoles: UserRole[],
  requiredPermissions: Permission[]
): boolean {
  const userPermissions = getUserPermissions(userRoles);
  return requiredPermissions.some((permission) =>
    userPermissions.includes(permission)
  );
}

// Helper function to check if user has all required permissions
export function hasAllPermissions(
  userRoles: UserRole[],
  requiredPermissions: Permission[]
): boolean {
  const userPermissions = getUserPermissions(userRoles);
  return requiredPermissions.every((permission) =>
    userPermissions.includes(permission)
  );
}

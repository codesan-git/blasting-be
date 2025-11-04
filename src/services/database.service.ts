import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { RefreshToken, User, UserRole } from "../types/auth.types";

const DB_PATH = path.join(process.cwd(), "data", "logs.db");

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent access
db.pragma("journal_mode = WAL");

// Helper function to get Jakarta time
const getJakartaTime = (): string => {
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
};

// Create tables with explicit timezone handling
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    roles TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_login_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    is_revoked BOOLEAN DEFAULT false,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked ON refresh_tokens(is_revoked);

  CREATE TABLE IF NOT EXISTS message_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL,
    channel TEXT NOT NULL,
    recipient_email TEXT,
    recipient_phone TEXT,
    recipient_name TEXT NOT NULL,
    template_id TEXT NOT NULL,
    template_name TEXT,
    subject TEXT,
    status TEXT NOT NULL,
    error_message TEXT,
    message_id TEXT,
    attempts INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_job_id ON message_logs(job_id);
  CREATE INDEX IF NOT EXISTS idx_status ON message_logs(status);
  CREATE INDEX IF NOT EXISTS idx_channel ON message_logs(channel);
  CREATE INDEX IF NOT EXISTS idx_recipient_email ON message_logs(recipient_email);
  CREATE INDEX IF NOT EXISTS idx_message_id ON message_logs(message_id);
  CREATE INDEX IF NOT EXISTS idx_created_at ON message_logs(created_at);

  CREATE TABLE IF NOT EXISTS api_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    ip_address TEXT,
    request_body TEXT,
    response_status INTEGER,
    response_time_ms INTEGER,
    error_message TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_api_endpoint ON api_logs(endpoint);
  CREATE INDEX IF NOT EXISTS idx_api_created_at ON api_logs(created_at);

  CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_system_level ON system_logs(level);
  CREATE INDEX IF NOT EXISTS idx_system_created_at ON system_logs(created_at);
`);

export interface MessageLog {
  id?: number;
  job_id: string;
  channel: string;
  recipient_email?: string;
  recipient_phone?: string;
  recipient_name: string;
  template_id: string;
  template_name?: string;
  subject?: string;
  status: "queued" | "processing" | "sent" | "failed";
  error_message?: string;
  message_id?: string;
  attempts?: number;
  created_at?: string;
  updated_at?: string;
}

export interface APILog {
  id?: number;
  endpoint: string;
  method: string;
  ip_address?: string;
  request_body?: string;
  response_status?: number;
  response_time_ms?: number;
  error_message?: string;
  created_at?: string;
}

export interface SystemLog {
  id?: number;
  level: string;
  message: string;
  metadata?: string;
  created_at?: string;
}

export interface MessageStatRow {
  channel: string;
  status: string;
  count: number;
}

export interface MessageStatsByDateRow {
  date: string;
  channel: string;
  status: string;
  count: number;
}

export interface FormattedStats {
  email: StatusCounts;
  whatsapp: StatusCounts;
  total: StatusCounts;
}

interface StatusCounts {
  queued: number;
  processing: number;
  sent: number;
  failed: number;
}

export class DatabaseService {
  /**
   * Count super admin users
   */
  static countSuperAdmins(): number {
    const stmt = db.prepare(`
    SELECT COUNT(*) as count 
    FROM users 
    WHERE is_active = 1
  `);

    const allUsers = stmt.get() as { count: number };

    // Get all active users and check their roles
    const activeUsers = this.getAllUsers().filter((user) => user.is_active);

    // Count users with super_admin role
    const superAdminCount = activeUsers.filter((user) =>
      user.roles.includes(UserRole.SUPER_ADMIN)
    ).length;

    return superAdminCount;
  }

  /**
   * Get all super admin users
   */
  static getSuperAdmins(): any[] {
    const allUsers = this.getAllUsers();

    return allUsers.filter(
      (user) => user.is_active && user.roles.includes(UserRole.SUPER_ADMIN)
    );
  }

  /**
   * Check if user has super admin role
   */
  static isSuperAdmin(userId: string): boolean {
    const user = this.getUserById(userId);

    if (!user || !user.is_active) {
      return false;
    }

    return user.roles.includes(UserRole.SUPER_ADMIN);
  }

  /**
   * Create a new user
   */
  static createUser(data: {
    email: string;
    password: string;
    name: string;
    roles: UserRole[];
  }): string {
    const jakartaTime = getJakartaTime();
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const stmt = db.prepare(`
      INSERT INTO users (id, email, password, name, roles, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Convert roles array to JSON string
    const rolesJson = JSON.stringify(data.roles);

    stmt.run(
      id,
      data.email,
      data.password,
      data.name,
      rolesJson, // This is now a JSON string
      1, // SQLite uses 1/0 for boolean
      jakartaTime,
      jakartaTime
    );

    return id;
  }

  /**
   * Get user by ID
   */
  static getUserById(id: string): User | null {
    const stmt = db.prepare(`SELECT * FROM users WHERE id = ?`);
    const row = stmt.get(id) as any;

    if (!row) return null;

    return {
      ...row,
      roles: JSON.parse(row.roles),
      is_active: Boolean(row.is_active),
    };
  }

  /**
   * Get user by email
   */
  static getUserByEmail(email: string): User | null {
    const stmt = db.prepare(`SELECT * FROM users WHERE email = ?`);
    const row = stmt.get(email) as any;

    if (!row) return null;

    return {
      ...row,
      roles: JSON.parse(row.roles),
      is_active: Boolean(row.is_active),
    };
  }

  /**
   * Get all users
   */
  static getAllUsers(): User[] {
    const stmt = db.prepare(`
      SELECT * FROM users 
      ORDER BY created_at DESC
    `);

    const rows = stmt.all() as any[];

    return rows.map((row) => ({
      ...row,
      roles: JSON.parse(row.roles),
      is_active: Boolean(row.is_active),
    }));
  }

  /**
   * Update user
   */
  static updateUser(
    id: string,
    data: {
      email?: string;
      name?: string;
      roles?: UserRole[];
      is_active?: boolean;
    }
  ): boolean {
    const jakartaTime = getJakartaTime();
    const user = this.getUserById(id);

    if (!user) return false;

    const updates: string[] = [];
    const values: any[] = [];

    if (data.email !== undefined) {
      updates.push("email = ?");
      values.push(data.email);
    }

    if (data.name !== undefined) {
      updates.push("name = ?");
      values.push(data.name);
    }

    if (data.roles !== undefined) {
      updates.push("roles = ?");
      values.push(JSON.stringify(data.roles));
    }

    if (data.is_active !== undefined) {
      updates.push("is_active = ?");
      values.push(data.is_active);
    }

    if (updates.length === 0) return false;

    updates.push("updated_at = ?");
    values.push(jakartaTime);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE users 
      SET ${updates.join(", ")}
      WHERE id = ?
    `);

    stmt.run(...values);
    return true;
  }

  /**
   * Update user password
   */
  static updateUserPassword(id: string, hashedPassword: string): boolean {
    const jakartaTime = getJakartaTime();

    const stmt = db.prepare(`
      UPDATE users 
      SET password = ?, updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(hashedPassword, jakartaTime, id);
    return result.changes > 0;
  }

  /**
   * Update last login time
   */
  static updateLastLogin(id: string): boolean {
    const jakartaTime = getJakartaTime();

    const stmt = db.prepare(`
      UPDATE users 
      SET last_login_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(jakartaTime, id);
    return result.changes > 0;
  }

  /**
   * Delete user
   */
  static deleteUser(id: string): boolean {
    // First revoke all refresh tokens
    this.revokeAllUserRefreshTokens(id);

    const stmt = db.prepare(`DELETE FROM users WHERE id = ?`);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Deactivate user (soft delete)
   */
  static deactivateUser(id: string): boolean {
    return this.updateUser(id, { is_active: false });
  }

  /**
   * Activate user
   */
  static activateUser(id: string): boolean {
    return this.updateUser(id, { is_active: true });
  }

  // ============================================
  // REFRESH TOKENS
  // ============================================

  /**
   * Create refresh token
   */
  static createRefreshToken(data: {
    user_id: string;
    token: string;
    expires_at: string;
  }): string {
    const jakartaTime = getJakartaTime();
    const id = `rt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const stmt = db.prepare(`
      INSERT INTO refresh_tokens (id, user_id, token, expires_at, created_at, is_revoked)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, data.user_id, data.token, data.expires_at, jakartaTime, 0);
    return id;
  }

  /**
   * Get valid (non-revoked, non-expired) refresh tokens
   */
  static getValidRefreshTokens(): RefreshToken[] {
    const jakartaTime = getJakartaTime();

    const stmt = db.prepare(`
      SELECT * FROM refresh_tokens 
      WHERE is_revoked = 0 
        AND expires_at > ?
      ORDER BY created_at DESC
    `);

    return stmt.all(jakartaTime) as RefreshToken[];
  }

  /**
   * Get user's refresh tokens
   */
  static getUserRefreshTokens(userId: string): RefreshToken[] {
    const stmt = db.prepare(`
      SELECT * FROM refresh_tokens 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `);

    return stmt.all(userId) as RefreshToken[];
  }

  /**
   * Revoke refresh token by ID
   */
  static revokeRefreshToken(id: string): boolean {
    const stmt = db.prepare(`
      UPDATE refresh_tokens 
      SET is_revoked = 1 
      WHERE id = ?
    `);

    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Revoke all refresh tokens for a user
   */
  static revokeAllUserRefreshTokens(userId: string): number {
    const stmt = db.prepare(`
      UPDATE refresh_tokens 
      SET is_revoked = true 
      WHERE user_id = ? AND is_revoked = false
    `);

    const result = stmt.run(userId);
    return result.changes;
  }

  /**
   * Clean up expired refresh tokens
   */
  static cleanupExpiredRefreshTokens(): number {
    const jakartaTime = getJakartaTime();

    const stmt = db.prepare(`
      DELETE FROM refresh_tokens 
      WHERE expires_at < ? OR is_revoked = true
    `);

    const result = stmt.run(jakartaTime);
    return result.changes;
  }

  // Message Logs
  static logMessage(data: MessageLog): number {
    const jakartaTime = getJakartaTime();

    const stmt = db.prepare(`
      INSERT INTO message_logs (
        job_id, channel, recipient_email, recipient_phone, recipient_name,
        template_id, template_name, subject, status, error_message, message_id, attempts,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.job_id,
      data.channel,
      data.recipient_email || null,
      data.recipient_phone || null,
      data.recipient_name,
      data.template_id,
      data.template_name || null,
      data.subject || null,
      data.status,
      data.error_message || null,
      data.message_id || null,
      data.attempts || 1,
      jakartaTime,
      jakartaTime
    );

    return result.lastInsertRowid as number;
  }

  static updateMessageStatus(
    jobId: string,
    status: string,
    errorMessage?: string,
    messageId?: string,
    attempts?: number
  ): void {
    const jakartaTime = getJakartaTime();

    const stmt = db.prepare(`
      UPDATE message_logs 
      SET status = ?, error_message = ?, message_id = ?, attempts = ?, updated_at = ?
      WHERE job_id = ?
    `);

    stmt.run(
      status,
      errorMessage || null,
      messageId || null,
      attempts || 1,
      jakartaTime,
      jobId
    );
  }

  /**
   * Update message status by message_id (for webhook updates)
   */
  static updateMessageStatusByMessageId(
    messageId: string,
    status: string,
    errorMessage?: string
  ): void {
    const jakartaTime = getJakartaTime();

    const stmt = db.prepare(`
      UPDATE message_logs 
      SET status = ?, error_message = ?, updated_at = ?
      WHERE message_id = ?
    `);

    const result = stmt.run(
      status,
      errorMessage || null,
      jakartaTime,
      messageId
    );

    if (result.changes === 0) {
      console.warn(`No message found with message_id: ${messageId}`);
    }
  }

  /**
   * Get message log by message_id
   */
  static getMessageByMessageId(messageId: string): MessageLog | null {
    const stmt = db.prepare(`
      SELECT * FROM message_logs WHERE message_id = ? LIMIT 1
    `);

    return stmt.get(messageId) as MessageLog | null;
  }

  static getMessageLogs(filters?: {
    status?: string;
    channel?: string;
    email?: string;
    limit?: number;
    offset?: number;
  }): MessageLog[] {
    let query = "SELECT * FROM message_logs WHERE 1=1";
    const params: any[] = [];

    if (filters?.status) {
      query += " AND status = ?";
      params.push(filters.status);
    }

    if (filters?.channel) {
      query += " AND channel = ?";
      params.push(filters.channel);
    }

    if (filters?.email) {
      query += " AND recipient_email = ?";
      params.push(filters.email);
    }

    query += " ORDER BY created_at DESC";

    if (filters?.limit) {
      query += " LIMIT ?";
      params.push(filters.limit);
    }

    if (filters?.offset) {
      query += " OFFSET ?";
      params.push(filters.offset);
    }

    const stmt = db.prepare(query);
    return stmt.all(...params) as MessageLog[];
  }

  static getMessageStats(): MessageStatRow[] {
    const stmt = db.prepare(`
      SELECT 
        channel,
        status,
        COUNT(*) as count
      FROM message_logs
      GROUP BY channel, status
    `);

    return stmt.all() as MessageStatRow[];
  }

  static getMessageStatsByDate(days: number = 7): MessageStatsByDateRow[] {
    const stmt = db.prepare(`
      SELECT 
        DATE(created_at) as date,
        channel,
        status,
        COUNT(*) as count
      FROM message_logs
      WHERE created_at >= datetime('now', '-${days} days', 'localtime')
      GROUP BY DATE(created_at), channel, status
      ORDER BY date DESC
    `);

    return stmt.all() as MessageStatsByDateRow[];
  }

  // API Logs
  static logAPI(data: APILog): number {
    const jakartaTime = getJakartaTime();

    const stmt = db.prepare(`
      INSERT INTO api_logs (
        endpoint, method, ip_address, request_body, response_status, response_time_ms, error_message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.endpoint,
      data.method,
      data.ip_address || null,
      data.request_body || null,
      data.response_status || null,
      data.response_time_ms || null,
      data.error_message || null,
      jakartaTime
    );

    return result.lastInsertRowid as number;
  }

  static getAPILogs(limit: number = 100, offset: number = 0): APILog[] {
    const stmt = db.prepare(`
      SELECT * FROM api_logs 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `);

    return stmt.all(limit, offset) as APILog[];
  }

  // System Logs
  static logSystem(
    level: string,
    message: string,
    metadata?: Record<string, unknown>
  ): number {
    const jakartaTime = getJakartaTime();

    const stmt = db.prepare(`
      INSERT INTO system_logs (level, message, metadata, created_at)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      level,
      message,
      metadata ? JSON.stringify(metadata) : null,
      jakartaTime
    );

    return result.lastInsertRowid as number;
  }

  static getSystemLogs(
    level?: string,
    limit: number = 100,
    offset: number = 0
  ): SystemLog[] {
    let query = "SELECT * FROM system_logs";
    const params: any[] = [];

    if (level) {
      query += " WHERE level = ?";
      params.push(level);
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const stmt = db.prepare(query);
    return stmt.all(...params) as SystemLog[];
  }

  // Cleanup old logs
  static cleanupOldLogs(daysToKeep: number = 30): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];

    db.prepare(`DELETE FROM message_logs WHERE created_at < ?`).run(cutoffStr);

    db.prepare(`DELETE FROM api_logs WHERE created_at < ?`).run(cutoffStr);

    db.prepare(`DELETE FROM system_logs WHERE created_at < ?`).run(cutoffStr);
  }

  static close(): void {
    db.close();
  }
}

export default DatabaseService;

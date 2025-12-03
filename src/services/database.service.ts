// src/services/database.service.ts - PostgreSQL Version
import { Pool } from "pg";
import { RefreshToken, User, UserRole } from "../types/auth.types";

// PostgreSQL connection pool
// Pool instance dibuat, tapi koneksi fisik belum terjadi sampai query pertama
const pool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: parseInt(process.env.POSTGRES_PORT || "5432"),
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  ssl:
    process.env.POSTGRES_SSL === "true" ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || "20"),
  idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT || "30000"),
  connectionTimeoutMillis: parseInt(
    process.env.POSTGRES_CONNECTION_TIMEOUT || "5000",
  ),
});

const POSTGRES_SCHEMA = process.env.POSTGRES_SCHEMA;

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
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface APILog {
  id?: number;
  endpoint: string;
  method: string;
  ip_address?: string;
  user_id?: string;
  user_email?: string;
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
  user_id?: string;
  user_email?: string;
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

export class DatabaseService {
  /**
   * Initialize database with Retry Logic
   * Mencoba connect ke DB beberapa kali sebelum menyerah
   */
  static async initialize(retries = 5, delay = 5000): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(
          `Attempting to connect to database (Attempt ${i + 1}/${retries})...`,
        );
        const client = await pool.connect();

        try {
          await client.query("BEGIN");

          // Set schema if specified
          if (POSTGRES_SCHEMA) {
            await client.query(`SET search_path TO ${POSTGRES_SCHEMA}, public`);
            console.log(`Schema set to: ${POSTGRES_SCHEMA}`);
          }

          // Create users table
          await client.query(`
            CREATE TABLE IF NOT EXISTS users (
              id VARCHAR(255) PRIMARY KEY,
              email VARCHAR(255) UNIQUE NOT NULL,
              password VARCHAR(255) NOT NULL,
              name VARCHAR(255) NOT NULL,
              roles JSONB NOT NULL,
              is_active BOOLEAN DEFAULT true,
              created_at TIMESTAMP NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
              last_login_at TIMESTAMP
            )
          `);

          await client.query(`
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
          `);

          // Create refresh_tokens table
          await client.query(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
              id VARCHAR(255) PRIMARY KEY,
              user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              token TEXT NOT NULL,
              expires_at TIMESTAMP NOT NULL,
              created_at TIMESTAMP NOT NULL DEFAULT NOW(),
              is_revoked BOOLEAN DEFAULT false
            )
          `);

          await client.query(`
            CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
            CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
            CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked ON refresh_tokens(is_revoked);
          `);

          // Create message_logs table
          await client.query(`
            CREATE TABLE IF NOT EXISTS message_logs (
              id SERIAL PRIMARY KEY,
              job_id VARCHAR(255) NOT NULL,
              channel VARCHAR(50) NOT NULL,
              recipient_email VARCHAR(255),
              recipient_phone VARCHAR(50),
              recipient_name VARCHAR(255) NOT NULL,
              template_id VARCHAR(255) NOT NULL,
              template_name VARCHAR(255),
              subject TEXT,
              status VARCHAR(50) NOT NULL,
              error_message TEXT,
              message_id VARCHAR(255),
              attempts INTEGER DEFAULT 1,
              created_by VARCHAR(255),
              created_at TIMESTAMP NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
          `);

          await client.query(`
            CREATE INDEX IF NOT EXISTS idx_job_id ON message_logs(job_id);
            CREATE INDEX IF NOT EXISTS idx_status ON message_logs(status);
            CREATE INDEX IF NOT EXISTS idx_channel ON message_logs(channel);
            CREATE INDEX IF NOT EXISTS idx_recipient_email ON message_logs(recipient_email);
            CREATE INDEX IF NOT EXISTS idx_message_id ON message_logs(message_id);
            CREATE INDEX IF NOT EXISTS idx_created_at ON message_logs(created_at);
          `);

          // Create api_logs table
          await client.query(`
            CREATE TABLE IF NOT EXISTS api_logs (
              id SERIAL PRIMARY KEY,
              endpoint VARCHAR(255) NOT NULL,
              method VARCHAR(10) NOT NULL,
              ip_address VARCHAR(50),
              user_id VARCHAR(255),
              user_email VARCHAR(255),
              request_body TEXT,
              response_status INTEGER,
              response_time_ms INTEGER,
              error_message TEXT,
              created_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
          `);

          await client.query(`
            CREATE INDEX IF NOT EXISTS idx_api_endpoint ON api_logs(endpoint);
            CREATE INDEX IF NOT EXISTS idx_api_created_at ON api_logs(created_at);
          `);

          // Create system_logs table
          await client.query(`
            CREATE TABLE IF NOT EXISTS system_logs (
              id SERIAL PRIMARY KEY,
              level VARCHAR(20) NOT NULL,
              message TEXT NOT NULL,
              metadata JSONB,
              user_id VARCHAR(255),
              user_email VARCHAR(255),
              created_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
          `);

          await client.query(`
            CREATE INDEX IF NOT EXISTS idx_system_level ON system_logs(level);
            CREATE INDEX IF NOT EXISTS idx_system_created_at ON system_logs(created_at);
          `);

          // Create role_permissions table
          await client.query(`
            CREATE TABLE IF NOT EXISTS role_permissions (
              id SERIAL PRIMARY KEY,
              role VARCHAR(100) NOT NULL,
              permission VARCHAR(100) NOT NULL,
              created_at TIMESTAMP NOT NULL DEFAULT NOW(),
              created_by VARCHAR(255),
              UNIQUE(role, permission)
            )
          `);

          await client.query(`
            CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
            CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission);
          `);

          await client.query("COMMIT");
          console.log("✅ PostgreSQL database initialized successfully");

          // Setup on connect listener for future connections if schema is present
          if (POSTGRES_SCHEMA) {
            pool.on("connect", async (client) => {
              await client
                .query(`SET search_path TO ${POSTGRES_SCHEMA}, public`)
                .catch((err) => {
                  console.error(
                    "Failed to set search_path on new connection",
                    err,
                  );
                });
            });
          }

          client.release();
          return; // Success, exit function
        } catch (error) {
          await client.query("ROLLBACK");
          client.release();
          throw error; // Throw to outer catch to trigger retry
        }
      } catch (error) {
        console.error(
          `❌ Database connection failed (Attempt ${i + 1}/${retries}):`,
          error.message,
        );
        if (i < retries - 1) {
          console.log(`Waiting ${delay / 1000} seconds before retrying...`);
          await new Promise((res) => setTimeout(res, delay));
        } else {
          console.error("❌ All database connection attempts failed. Exiting.");
          throw error;
        }
      }
    }
  }

  /**
   * Get all permissions for a role
   */
  static async getRolePermissions(role: string): Promise<string[]> {
    const result = await pool.query(
      `SELECT permission FROM role_permissions WHERE role = $1 ORDER BY permission`,
      [role],
    );
    return result.rows.map((row) => row.permission);
  }

  /**
   * Get permissions for multiple roles (combined)
   */
  static async getRolesPermissions(roles: string[]): Promise<string[]> {
    if (roles.length === 0) return [];

    const result = await pool.query(
      `SELECT DISTINCT permission FROM role_permissions
       WHERE role = ANY($1) ORDER BY permission`,
      [roles],
    );
    return result.rows.map((row) => row.permission);
  }

  /**
   * Add permission to role
   */
  static async addRolePermission(
    role: string,
    permission: string,
    createdBy?: string,
  ): Promise<boolean> {
    try {
      const result = await pool.query(
        `INSERT INTO role_permissions (role, permission, created_at, created_by)
         VALUES ($1, $2, NOW(), $3)
         ON CONFLICT (role, permission) DO NOTHING
         RETURNING id`,
        [role, permission, createdBy || null],
      );
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error("Error adding role permission:", error);
      return false;
    }
  }

  /**
   * Remove permission from role
   */
  static async removeRolePermission(
    role: string,
    permission: string,
  ): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM role_permissions WHERE role = $1 AND permission = $2`,
      [role, permission],
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Set all permissions for a role (replace existing)
   */
  static async setRolePermissions(
    role: string,
    permissions: string[],
    createdBy?: string,
  ): Promise<boolean> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Delete existing permissions for role
      await client.query(`DELETE FROM role_permissions WHERE role = $1`, [
        role,
      ]);

      // Insert new permissions
      for (const permission of permissions) {
        await client.query(
          `INSERT INTO role_permissions (role, permission, created_at, created_by)
           VALUES ($1, $2, NOW(), $3)`,
          [role, permission, createdBy || null],
        );
      }

      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error setting role permissions:", error);
      return false;
    } finally {
      client.release();
    }
  }

  /**
   * Get all roles with their permissions
   */
  static async getAllRolePermissions(): Promise<Record<string, string[]>> {
    const result = await pool.query(
      `SELECT role, permission FROM role_permissions ORDER BY role, permission`,
    );

    const rolePermissions: Record<string, string[]> = {};
    result.rows.forEach(({ role, permission }) => {
      if (!rolePermissions[role]) {
        rolePermissions[role] = [];
      }
      rolePermissions[role].push(permission);
    });

    return rolePermissions;
  }

  /**
   * Count super admin users
   */
  static async countSuperAdmins(): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM users
       WHERE is_active = true AND roles @> $1`,
      [JSON.stringify([UserRole.SUPER_ADMIN])],
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Create a new user
   */
  static async createUser(data: {
    email: string;
    password: string;
    name: string;
    roles: UserRole[];
  }): Promise<string> {
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await pool.query(
      `INSERT INTO users (id, email, password, name, roles, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [
        id,
        data.email,
        data.password,
        data.name,
        JSON.stringify(data.roles),
        true,
      ],
    );

    return id;
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: string): Promise<User | null> {
    const result = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...row,
      roles: row.roles, // PostgreSQL JSONB automatically parsed
    };
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [
      email,
    ]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...row,
      roles: row.roles,
    };
  }

  /**
   * Get all users
   */
  static async getAllUsers(): Promise<User[]> {
    const result = await pool.query(
      `SELECT * FROM users ORDER BY created_at DESC`,
    );

    return result.rows.map((row) => ({
      ...row,
      roles: row.roles,
    }));
  }

  /**
   * Update user
   */
  static async updateUser(
    id: string,
    data: {
      email?: string;
      name?: string;
      roles?: UserRole[];
      is_active?: boolean;
    },
  ): Promise<boolean> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }

    if (data.roles !== undefined) {
      updates.push(`roles = $${paramIndex++}`);
      values.push(JSON.stringify(data.roles));
    }

    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(data.is_active);
    }

    if (updates.length === 0) return false;

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
      values,
    );

    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Update user password
   */
  static async updateUserPassword(
    id: string,
    hashedPassword: string,
  ): Promise<boolean> {
    const result = await pool.query(
      `UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2`,
      [hashedPassword, id],
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Update last login time
   */
  static async updateLastLogin(id: string): Promise<boolean> {
    const result = await pool.query(
      `UPDATE users SET last_login_at = NOW() WHERE id = $1`,
      [id],
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Delete user
   */
  static async deleteUser(id: string): Promise<boolean> {
    // Revoke all refresh tokens first
    await this.revokeAllUserRefreshTokens(id);

    const result = await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Deactivate user (soft delete)
   */
  static async deactivateUser(id: string): Promise<boolean> {
    return this.updateUser(id, { is_active: false });
  }

  /**
   * Activate user
   */
  static async activateUser(id: string): Promise<boolean> {
    return this.updateUser(id, { is_active: true });
  }

  // ============================================
  // REFRESH TOKENS
  // ============================================

  /**
   * Create refresh token
   */
  static async createRefreshToken(data: {
    user_id: string;
    token: string;
    expires_at: string;
  }): Promise<string> {
    const id = `rt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await pool.query(
      `INSERT INTO refresh_tokens (id, user_id, token, expires_at, created_at, is_revoked)
       VALUES ($1, $2, $3, $4, NOW(), false)`,
      [id, data.user_id, data.token, data.expires_at],
    );

    return id;
  }

  /**
   * Get valid (non-revoked, non-expired) refresh tokens
   */
  static async getValidRefreshTokens(): Promise<RefreshToken[]> {
    const result = await pool.query(
      `SELECT * FROM refresh_tokens
       WHERE is_revoked = false AND expires_at > NOW()
       ORDER BY created_at DESC`,
    );
    return result.rows;
  }

  /**
   * Revoke refresh token by ID
   */
  static async revokeRefreshToken(id: string): Promise<boolean> {
    const result = await pool.query(
      `UPDATE refresh_tokens SET is_revoked = true WHERE id = $1`,
      [id],
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Revoke all refresh tokens for a user
   */
  static async revokeAllUserRefreshTokens(userId: string): Promise<number> {
    const result = await pool.query(
      `UPDATE refresh_tokens SET is_revoked = true
       WHERE user_id = $1 AND is_revoked = false`,
      [userId],
    );
    return result.rowCount || 0;
  }

  /**
   * Log message with user tracking
   */
  static async logMessage(data: MessageLog): Promise<number> {
    const result = await pool.query(
      `INSERT INTO message_logs (
        job_id, channel, recipient_email, recipient_phone, recipient_name,
        template_id, template_name, subject, status, error_message, message_id, attempts,
        created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING id`,
      [
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
        data.created_by || null,
      ],
    );

    return result.rows[0].id;
  }

  /**
   * Update message status
   */
  static async updateMessageStatus(
    jobId: string,
    status: string,
    errorMessage?: string,
    messageId?: string,
    attempts?: number,
  ): Promise<void> {
    await pool.query(
      `UPDATE message_logs
       SET status = $1, error_message = $2, message_id = $3, attempts = $4, updated_at = NOW()
       WHERE job_id = $5`,
      [status, errorMessage || null, messageId || null, attempts || 1, jobId],
    );
  }

  /**
   * Update message status by message_id (for webhook updates)
   */
  static async updateMessageStatusByMessageId(
    messageId: string,
    status: string,
    errorMessage?: string,
  ): Promise<void> {
    await pool.query(
      `UPDATE message_logs
       SET status = $1, error_message = $2, updated_at = NOW()
       WHERE message_id = $3`,
      [status, errorMessage || null, messageId],
    );
  }

  /**
   * Get message log by message_id
   */
  static async getMessageByMessageId(
    messageId: string,
  ): Promise<MessageLog | null> {
    const result = await pool.query(
      `SELECT * FROM message_logs WHERE message_id = $1 LIMIT 1`,
      [messageId],
    );
    return result.rows[0] || null;
  }

  /**
   * Get message logs with filters
   */
  static async getMessageLogs(filters?: {
    status?: string;
    channel?: string;
    email?: string;
    limit?: number;
    offset?: number;
  }): Promise<MessageLog[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters?.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }

    if (filters?.channel) {
      conditions.push(`channel = $${paramIndex++}`);
      values.push(filters.channel);
    }

    if (filters?.email) {
      conditions.push(`recipient_email = $${paramIndex++}`);
      values.push(filters.email);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    values.push(filters?.limit || 100);
    values.push(filters?.offset || 0);

    const result = await pool.query(
      `SELECT * FROM message_logs ${whereClause}
       ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      values,
    );

    return result.rows;
  }

  /**
   * Get message statistics
   */
  static async getMessageStats(): Promise<MessageStatRow[]> {
    const result = await pool.query(
      `SELECT channel, status, COUNT(*) as count
       FROM message_logs
       GROUP BY channel, status`,
    );
    return result.rows;
  }

  /**
   * Get message statistics by date
   */
  static async getMessageStatsByDate(
    days: number = 7,
  ): Promise<MessageStatsByDateRow[]> {
    const result = await pool.query(
      `SELECT
        DATE(created_at) as date,
        channel,
        status,
        COUNT(*) as count
       FROM message_logs
       WHERE created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY DATE(created_at), channel, status
       ORDER BY date DESC`,
    );
    return result.rows;
  }

  /**
   * Log API request with user tracking
   */
  static async logAPI(data: APILog): Promise<number> {
    const result = await pool.query(
      `INSERT INTO api_logs (
        endpoint, method, ip_address, user_id, user_email,
        request_body, response_status, response_time_ms, error_message, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id`,
      [
        data.endpoint,
        data.method,
        data.ip_address || null,
        data.user_id || null,
        data.user_email || null,
        data.request_body || null,
        data.response_status || null,
        data.response_time_ms || null,
        data.error_message || null,
      ],
    );
    return result.rows[0].id;
  }

  /**
   * Get API logs with user filter
   */
  static async getAPILogs(
    limit: number = 100,
    offset: number = 0,
    userId?: string,
  ): Promise<APILog[]> {
    const whereClause = userId ? "WHERE user_id = $3" : "";
    const params = userId ? [limit, offset, userId] : [limit, offset];

    const result = await pool.query(
      `SELECT * FROM api_logs ${whereClause}
       ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      params,
    );
    return result.rows;
  }

  /**
   * Log system event with user tracking
   */
  static async logSystem(
    level: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<number> {
    const userId = metadata?.userId as string | undefined;
    const userEmail = metadata?.userEmail as string | undefined;

    // Optional: Check if pool is connected implicitly by wrapping in try-catch
    // If you call this before initialize(), it might fail, but with pool it usually queues.
    // The previous error happened because initDatabase was running concurrently.

    const result = await pool.query(
      `INSERT INTO system_logs (level, message, metadata, user_id, user_email, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id`,
      [
        level,
        message,
        metadata ? JSON.stringify(metadata) : null,
        userId || null,
        userEmail || null,
      ],
    );
    return result.rows[0].id;
  }

  /**
   * Get system logs with filters
   */
  static async getSystemLogs(
    level?: string,
    limit: number = 100,
    offset: number = 0,
    userId?: string,
  ): Promise<SystemLog[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (level) {
      conditions.push(`level = $${paramIndex++}`);
      values.push(level);
    }

    if (userId) {
      conditions.push(`user_id = $${paramIndex++}`);
      values.push(userId);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    values.push(limit);
    values.push(offset);

    const result = await pool.query(
      `SELECT * FROM system_logs ${whereClause}
       ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      values,
    );
    return result.rows;
  }

  /**
   * Get message logs by user
   */
  static async getMessageLogsByUser(
    userId: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<MessageLog[]> {
    const result = await pool.query(
      `SELECT * FROM message_logs
       WHERE created_by = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
    return result.rows;
  }

  /**
   * Get user activity statistics
   */
  static async getUserActivityStats(userId: string): Promise<{
    totalMessages: number;
    totalAPIRequests: number;
    lastActivity: string | null;
    messagesByChannel: Array<{ channel: string; count: number }>;
  }> {
    // Total messages
    const messagesResult = await pool.query(
      `SELECT COUNT(*) as count FROM message_logs WHERE created_by = $1`,
      [userId],
    );

    // Total API requests
    const apiResult = await pool.query(
      `SELECT COUNT(*) as count FROM api_logs WHERE user_id = $1`,
      [userId],
    );

    // Last activity
    const activityResult = await pool.query(
      `SELECT MAX(created_at) as last_activity FROM api_logs WHERE user_id = $1`,
      [userId],
    );

    // Messages by channel
    const channelResult = await pool.query(
      `SELECT channel, COUNT(*) as count
       FROM message_logs
       WHERE created_by = $1
       GROUP BY channel`,
      [userId],
    );

    return {
      totalMessages: parseInt(messagesResult.rows[0].count),
      totalAPIRequests: parseInt(apiResult.rows[0].count),
      lastActivity: activityResult.rows[0].last_activity,
      messagesByChannel: channelResult.rows,
    };
  }

  /**
   * Cleanup old logs
   */
  static async cleanupOldLogs(daysToKeep: number = 30): Promise<void> {
    await pool.query(
      `DELETE FROM message_logs WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'`,
    );

    await pool.query(
      `DELETE FROM api_logs WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'`,
    );

    await pool.query(
      `DELETE FROM system_logs WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'`,
    );
  }

  /**
   * Get permission usage statistics
   */
  static async getPermissionStats(): Promise<
    Array<{
      permission: string;
      roleCount: number;
      roles: string;
    }>
  > {
    const result = await pool.query(
      `SELECT
        permission,
        COUNT(*) as "roleCount",
        STRING_AGG(role, ',') as roles
       FROM role_permissions
       GROUP BY permission
       ORDER BY "roleCount" DESC, permission`,
    );
    return result.rows;
  }

  /**
   * Close database connection pool
   */
  static async close(): Promise<void> {
    await pool.end();
  }
}

export default DatabaseService;

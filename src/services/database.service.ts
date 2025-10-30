import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "logs.db");

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent access
db.pragma("journal_mode = WAL");

// Create tables
db.exec(`
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_job_id ON message_logs(job_id);
  CREATE INDEX IF NOT EXISTS idx_status ON message_logs(status);
  CREATE INDEX IF NOT EXISTS idx_channel ON message_logs(channel);
  CREATE INDEX IF NOT EXISTS idx_recipient_email ON message_logs(recipient_email);
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_api_endpoint ON api_logs(endpoint);
  CREATE INDEX IF NOT EXISTS idx_api_created_at ON api_logs(created_at);

  CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

export class DatabaseService {
  // Message Logs
  static logMessage(data: MessageLog): number {
    const stmt = db.prepare(`
      INSERT INTO message_logs (
        job_id, channel, recipient_email, recipient_phone, recipient_name,
        template_id, template_name, subject, status, error_message, message_id, attempts
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      data.attempts || 1
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
    const stmt = db.prepare(`
      UPDATE message_logs 
      SET status = ?, error_message = ?, message_id = ?, attempts = ?, updated_at = CURRENT_TIMESTAMP
      WHERE job_id = ?
    `);

    stmt.run(
      status,
      errorMessage || null,
      messageId || null,
      attempts || 1,
      jobId
    );
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

  static getMessageStats(): any {
    const stmt = db.prepare(`
      SELECT 
        channel,
        status,
        COUNT(*) as count
      FROM message_logs
      GROUP BY channel, status
    `);

    return stmt.all();
  }

  static getMessageStatsByDate(days: number = 7): any {
    const stmt = db.prepare(`
      SELECT 
        DATE(created_at) as date,
        channel,
        status,
        COUNT(*) as count
      FROM message_logs
      WHERE created_at >= datetime('now', '-${days} days')
      GROUP BY DATE(created_at), channel, status
      ORDER BY date DESC
    `);

    return stmt.all();
  }

  // API Logs
  static logAPI(data: APILog): number {
    const stmt = db.prepare(`
      INSERT INTO api_logs (
        endpoint, method, ip_address, request_body, response_status, response_time_ms, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.endpoint,
      data.method,
      data.ip_address || null,
      data.request_body || null,
      data.response_status || null,
      data.response_time_ms || null,
      data.error_message || null
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
  static logSystem(level: string, message: string, metadata?: any): number {
    const stmt = db.prepare(`
      INSERT INTO system_logs (level, message, metadata)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(
      level,
      message,
      metadata ? JSON.stringify(metadata) : null
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
    db.prepare(
      `DELETE FROM message_logs WHERE created_at < datetime('now', '-${daysToKeep} days')`
    ).run();
    db.prepare(
      `DELETE FROM api_logs WHERE created_at < datetime('now', '-${daysToKeep} days')`
    ).run();
    db.prepare(
      `DELETE FROM system_logs WHERE created_at < datetime('now', '-${daysToKeep} days')`
    ).run();
  }

  static close(): void {
    db.close();
  }
}

export default DatabaseService;

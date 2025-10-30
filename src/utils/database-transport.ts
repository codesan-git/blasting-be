// src/utils/database-transport.ts
import Transport from "winston-transport";
import DatabaseService from "../services/database.service";

interface LogInfo {
  level: string;
  message: string;
  timestamp?: string;
  [key: string]: unknown;
}

class DatabaseTransport extends Transport {
  constructor(opts?: Transport.TransportStreamOptions) {
    super(opts);
  }

  log(info: LogInfo, callback: () => void): void {
    setImmediate(() => {
      this.emit("logged", info);
    });

    // Hanya log level tertentu ke database
    if (["error", "warn", "info"].includes(info.level)) {
      try {
        const { level, message, timestamp, ...metadata } = info;
        DatabaseService.logSystem(level, message, metadata);
      } catch (error) {
        console.error("Failed to log to database:", error);
      }
    }

    callback();
  }
}

export default DatabaseTransport;

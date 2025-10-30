// src/utils/alerting.ts
import DatabaseService, { MessageStatRow } from "../services/database.service";
import logger from "./logger";

interface ErrorRateInfo {
  errorRate: string;
  failedJobs: number;
  totalJobs: number;
  timestamp: string;
}

export const checkErrorRate = (): void => {
  const stats: MessageStatRow[] = DatabaseService.getMessageStats();

  const failedStat = stats.find((s) => s.status === "failed");
  const failed = failedStat ? failedStat.count : 0;
  const total = stats.reduce((acc, s) => acc + s.count, 0);

  const errorRate = total > 0 ? (failed / total) * 100 : 0;

  if (errorRate > 10) {
    // Alert if error rate > 10%
    const alertInfo: ErrorRateInfo = {
      errorRate: `${errorRate.toFixed(2)}%`,
      failedJobs: failed,
      totalJobs: total,
      timestamp: new Date().toISOString(),
    };

    logger.error("High error rate detected", alertInfo);

    // Kirim notifikasi (email, Slack, dll)
    sendAlert(alertInfo);
  }
};

const sendAlert = (info: ErrorRateInfo): void => {
  // Implementasi pengiriman alert
  // Bisa via email, Slack webhook, dll
  console.log("Alert:", info);
};

// Schedule check every 5 minutes
export const scheduleErrorRateCheck = (): void => {
  const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

  setInterval(() => {
    checkErrorRate();
  }, CHECK_INTERVAL);
};

// src/middleware/apiLogger.ts
import { Request, Response, NextFunction } from "express";
import DatabaseService from "../services/database.service";

export const apiLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();

  // Capture original send method
  const originalSend = res.send.bind(res);
  let responseStatus = 200;

  // Override send method
  res.send = function (body: unknown): Response {
    responseStatus = res.statusCode;
    res.send = originalSend;
    return res.send(body);
  };

  // Log after response is sent
  res.on("finish", () => {
    const responseTime = Date.now() - startTime;

    try {
      DatabaseService.logAPI({
        endpoint: req.path,
        method: req.method,
        ip_address: req.ip,
        request_body:
          Object.keys(req.body).length > 0
            ? JSON.stringify(req.body)
            : undefined,
        response_status: responseStatus,
        response_time_ms: responseTime,
      });
    } catch (error) {
      console.error("Failed to log API request:", error);
    }
  });

  next();
};

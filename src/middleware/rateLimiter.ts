import rateLimit from "express-rate-limit";
import logger from "../utils/logger";
import ResponseHelper from "../utils/api-response.helper";

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000"), // 15 minutes default
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "1000"), // 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn("Rate limit exceeded", {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    ResponseHelper.error(
      res,
      `Too many requests, please try again later. ${res.getHeader(
        "RateLimit-Reset"
      )}`
    );
  },
});

// Stricter rate limiter for message blast endpoints
export const blastLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000,
  message: {
    success: false,
    message: "Too many blast requests. Please wait before sending more.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    logger.warn("Blast rate limit exceeded", {
      ip: req.ip,
      path: req.path,
      body: req.body,
    });
    ResponseHelper.error(
      res,
      `Too many blast requests. Maximum 10 requests per minute. ${res.getHeader(
        "RateLimit-Reset"
      )}`
    );
  },
});

// Template management rate limiter (less strict)
export const templateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Max 30 requests per minute
  message: {
    success: false,
    message: "Too many template requests.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

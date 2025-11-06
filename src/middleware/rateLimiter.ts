import rateLimit from "express-rate-limit";
import logger from "../utils/logger";
import ResponseHelper from "../utils/api-response.helper";

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // Max 1000 requests per minute
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
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

// Blast endpoint rate limiter
export const blastLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // Max 1000 requests per minute
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
      `Too many blast requests. Maximum 1000 requests per minute. ${res.getHeader(
        "RateLimit-Reset"
      )}`
    );
  },
});

// Template management rate limiter
export const templateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // Max 1000 requests per minute
  message: {
    success: false,
    message: "Too many template requests.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

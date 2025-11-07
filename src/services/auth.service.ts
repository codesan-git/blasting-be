// src/services/auth.service.ts
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { User, JWTPayload, UserRole, LoginResponse } from "../types/auth.types";
import DatabaseService from "./database.service";
import logger from "../utils/logger";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m"; // 15 minutes
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d"; // 7 days

class AuthService {
  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT access token
   */
  generateAccessToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.parseExpiry(JWT_EXPIRES_IN),
    };

    return jwt.sign(payload, JWT_SECRET);
  }

  /**
   * Generate refresh token
   */
  async generateRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(64).toString("hex");
    const hashedToken = await this.hashPassword(token);

    const expiresAt = new Date();
    expiresAt.setTime(
      expiresAt.getTime() + this.parseExpiry(JWT_REFRESH_EXPIRES_IN) * 1000
    );

    DatabaseService.createRefreshToken({
      user_id: userId,
      token: hashedToken,
      expires_at: expiresAt.toISOString(),
    });

    return token;
  }

  /**
   * Verify JWT access token
   */
  verifyAccessToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      return decoded;
    } catch (error) {
      logger.warn("Invalid access token", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    }
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(token: string): Promise<User | null> {
    try {
      // Get all non-revoked, non-expired refresh tokens
      const refreshTokens = await DatabaseService.getValidRefreshTokens();

      // Find matching token
      for (const rt of refreshTokens) {
        const isValid = await this.verifyPassword(token, rt.token);

        if (isValid) {
          // Get user
          const user = await DatabaseService.getUserById(rt.user_id);

          if (user && user.is_active) {
            return user;
          }
        }
      }

      return null;
    } catch (error) {
      logger.error("Error verifying refresh token", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    }
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(token: string): Promise<boolean> {
    try {
      const refreshTokens = await DatabaseService.getValidRefreshTokens();

      for (const rt of refreshTokens) {
        const isValid = await this.verifyPassword(token, rt.token);

        if (isValid) {
          await DatabaseService.revokeRefreshToken(rt.id);
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error("Error revoking refresh token", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      // Get user by email
      const user = await DatabaseService.getUserByEmail(email);

      if (!user) {
        return {
          success: false,
          message: "Invalid email or password",
        };
      }

      // Check if user is active
      if (!user.is_active) {
        return {
          success: false,
          message: "Account is disabled",
        };
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(
        password,
        user.password
      );

      if (!isPasswordValid) {
        return {
          success: false,
          message: "Invalid email or password",
        };
      }

      // Update last login
      await DatabaseService.updateLastLogin(user.id);

      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = await this.generateRefreshToken(user.id);

      logger.info("User logged in successfully", {
        userId: user.id,
        email: user.email,
        important: true,
      });

      return {
        success: true,
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles,
        },
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error("Login error", {
        email,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        success: false,
        message: "Login failed",
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<LoginResponse> {
    try {
      const user = await this.verifyRefreshToken(refreshToken);

      if (!user) {
        return {
          success: false,
          message: "Invalid or expired refresh token",
        };
      }

      // Generate new access token
      const accessToken = this.generateAccessToken(user);

      logger.info("Access token refreshed", {
        userId: user.id,
        email: user.email,
      });

      return {
        success: true,
        message: "Token refreshed successfully",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles,
        },
        accessToken,
      };
    } catch (error) {
      logger.error("Token refresh error", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        success: false,
        message: "Failed to refresh token",
      };
    }
  }

  /**
   * Logout user (revoke refresh token)
   */
  async logout(refreshToken: string): Promise<boolean> {
    return this.revokeRefreshToken(refreshToken);
  }

  /**
   * Create new user with super admin limit check
   */
  async createUser(
    email: string,
    password: string,
    name: string,
    roles: UserRole[]
  ): Promise<User | null> {
    try {
      // Check if email already exists
      const existingUser = await DatabaseService.getUserByEmail(email);

      if (existingUser) {
        logger.warn("Attempted to create user with existing email", { email });
        return null;
      }

      // 🔒 CHECK: Limit super admin count
      if (roles.includes(UserRole.SUPER_ADMIN)) {
        const superAdminCount = DatabaseService.countSuperAdmins();
        const MAX_SUPER_ADMINS = parseInt(
          process.env.MAX_SUPER_ADMINS || "3",
          10
        );

        if ((await superAdminCount) >= MAX_SUPER_ADMINS) {
          logger.warn("Super admin limit reached", {
            currentCount: superAdminCount,
            maxAllowed: MAX_SUPER_ADMINS,
            attemptedBy: email,
          });

          throw new Error(
            `Super admin limit reached. Maximum ${MAX_SUPER_ADMINS} super admins allowed. Current count: ${superAdminCount}`
          );
        }
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Create user
      const userId = await DatabaseService.createUser({
        email,
        password: hashedPassword,
        name,
        roles,
      });

      const user = await DatabaseService.getUserById(userId);

      logger.info("User created successfully", {
        userId,
        email,
        roles,
        important: true,
      });

      return user;
    } catch (error) {
      logger.error("Error creating user", {
        email,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      // Re-throw error untuk ditangani controller
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    try {
      const user = await DatabaseService.getUserById(userId);

      if (!user) {
        return false;
      }

      // Verify current password
      const isPasswordValid = await this.verifyPassword(
        currentPassword,
        user.password
      );

      if (!isPasswordValid) {
        return false;
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update password
      await DatabaseService.updateUserPassword(userId, hashedPassword);

      // Revoke all refresh tokens for this user
      await DatabaseService.revokeAllUserRefreshTokens(userId);

      logger.info("Password changed successfully", {
        userId,
        important: true,
      });

      return true;
    } catch (error) {
      logger.error("Error changing password", {
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  }

  /**
   * Parse expiry string (e.g., "15m", "7d") to seconds
   */
  private parseExpiry(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));

    switch (unit) {
      case "s":
        return value;
      case "m":
        return value * 60;
      case "h":
        return value * 60 * 60;
      case "d":
        return value * 60 * 60 * 24;
      default:
        return 900; // Default 15 minutes
    }
  }
}

export const authService = new AuthService();
export default authService;

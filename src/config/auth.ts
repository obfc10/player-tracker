/**
 * Authentication and authorization configuration module
 */

import { ConfigSection, ConfigValidator, EnvUtils, loadConfigSection } from './base';

export interface AuthConfig {
  readonly sessionMaxAge: number; // in seconds
  readonly sessionTimeout: number; // in milliseconds
  readonly secretKey: string;
  readonly bcryptRounds: number;
  readonly jwtExpiresIn: string;
  readonly maxLoginAttempts: number;
  readonly lockoutDuration: number; // in minutes
  readonly passwordMinLength: number;
  readonly passwordRequireSpecialChars: boolean;
  readonly sessionCookieName: string;
  readonly enableRememberMe: boolean;
  readonly rememberMeDuration: number; // in days
  readonly csrfTokenLength: number;
}

const authConfigSection: ConfigSection<AuthConfig> = {
  schema: {
    sessionMaxAge: ConfigValidator.validateInteger(300, 86400 * 30), // 5 minutes to 30 days
    sessionTimeout: ConfigValidator.validateInteger(1000, 3600000), // 1 second to 1 hour
    secretKey: ConfigValidator.validateString(32),
    bcryptRounds: ConfigValidator.validateInteger(8, 15),
    jwtExpiresIn: ConfigValidator.validateString(1),
    maxLoginAttempts: ConfigValidator.validateInteger(3, 20),
    lockoutDuration: ConfigValidator.validateInteger(5, 1440), // 5 minutes to 24 hours
    passwordMinLength: ConfigValidator.validateInteger(6, 128),
    passwordRequireSpecialChars: ConfigValidator.validateBoolean(),
    sessionCookieName: ConfigValidator.validateString(1, 50),
    enableRememberMe: ConfigValidator.validateBoolean(),
    rememberMeDuration: ConfigValidator.validateInteger(1, 90), // 1 to 90 days
    csrfTokenLength: ConfigValidator.validateInteger(16, 128)
  },
  
  defaults: {
    sessionMaxAge: EnvUtils.getInteger('AUTH_SESSION_MAX_AGE', 30 * 24 * 60 * 60), // 30 days
    sessionTimeout: EnvUtils.getInteger('AUTH_SESSION_TIMEOUT', 10000), // 10 seconds
    secretKey: EnvUtils.require('NEXTAUTH_SECRET'),
    bcryptRounds: EnvUtils.getInteger('AUTH_BCRYPT_ROUNDS', 12),
    jwtExpiresIn: EnvUtils.getString('AUTH_JWT_EXPIRES_IN', '24h'),
    maxLoginAttempts: EnvUtils.getInteger('AUTH_MAX_LOGIN_ATTEMPTS', 5),
    lockoutDuration: EnvUtils.getInteger('AUTH_LOCKOUT_DURATION', 15), // 15 minutes
    passwordMinLength: EnvUtils.getInteger('AUTH_PASSWORD_MIN_LENGTH', 8),
    passwordRequireSpecialChars: EnvUtils.getBoolean('AUTH_PASSWORD_REQUIRE_SPECIAL', true),
    sessionCookieName: EnvUtils.getString('AUTH_SESSION_COOKIE_NAME', 'player-tracker-session'),
    enableRememberMe: EnvUtils.getBoolean('AUTH_ENABLE_REMEMBER_ME', true),
    rememberMeDuration: EnvUtils.getInteger('AUTH_REMEMBER_ME_DURATION', 30), // 30 days
    csrfTokenLength: EnvUtils.getInteger('AUTH_CSRF_TOKEN_LENGTH', 32)
  } as AuthConfig,
  
  environmentOverrides: {
    development: {
      sessionMaxAge: 24 * 60 * 60, // 1 day
      bcryptRounds: 8, // Faster for development
      maxLoginAttempts: 10,
      passwordMinLength: 6,
      passwordRequireSpecialChars: false
    },
    test: {
      sessionMaxAge: 60, // 1 minute
      sessionTimeout: 1000,
      bcryptRounds: 4, // Fast for tests
      maxLoginAttempts: 3,
      lockoutDuration: 1, // 1 minute
      passwordMinLength: 4,
      passwordRequireSpecialChars: false
    },
    production: {
      sessionMaxAge: 7 * 24 * 60 * 60, // 7 days
      bcryptRounds: 14, // More secure
      maxLoginAttempts: 3,
      lockoutDuration: 30, // 30 minutes
      passwordMinLength: 12,
      passwordRequireSpecialChars: true
    }
  }
};

/**
 * Get validated authentication configuration
 */
export function getAuthConfig(): AuthConfig {
  return loadConfigSection(authConfigSection, process.env.NODE_ENV as any);
}

/**
 * Authentication utilities
 */
export class AuthUtils {
  static validatePassword(password: string, config: AuthConfig): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (password.length < config.passwordMinLength) {
      errors.push(`Password must be at least ${config.passwordMinLength} characters long`);
    }
    
    if (config.passwordRequireSpecialChars) {
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Password must contain at least one special character');
      }
      if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
      }
      if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
      }
      if (!/\d/.test(password)) {
        errors.push('Password must contain at least one number');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static isSessionExpired(sessionStart: Date, maxAge: number): boolean {
    const now = new Date();
    const expiryTime = new Date(sessionStart.getTime() + maxAge * 1000);
    return now > expiryTime;
  }

  static calculateSessionExpiry(config: AuthConfig): Date {
    return new Date(Date.now() + config.sessionMaxAge * 1000);
  }
}

/**
 * User roles and permissions
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  VIEWER = 'VIEWER',
  EVENT_MANAGER = 'EVENT_MANAGER'
}

export enum Permission {
  // Player management
  VIEW_PLAYERS = 'VIEW_PLAYERS',
  EXPORT_PLAYERS = 'EXPORT_PLAYERS',
  
  // Upload management
  UPLOAD_FILES = 'UPLOAD_FILES',
  VIEW_UPLOADS = 'VIEW_UPLOADS',
  DELETE_UPLOADS = 'DELETE_UPLOADS',
  
  // User management
  VIEW_USERS = 'VIEW_USERS',
  CREATE_USERS = 'CREATE_USERS',
  UPDATE_USERS = 'UPDATE_USERS',
  DELETE_USERS = 'DELETE_USERS',
  
  // Event management
  VIEW_EVENTS = 'VIEW_EVENTS',
  CREATE_EVENTS = 'CREATE_EVENTS',
  UPDATE_EVENTS = 'UPDATE_EVENTS',
  DELETE_EVENTS = 'DELETE_EVENTS',
  
  // System administration
  VIEW_SYSTEM_STATS = 'VIEW_SYSTEM_STATS',
  MANAGE_SYSTEM = 'MANAGE_SYSTEM'
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // Full access to everything
    Permission.VIEW_PLAYERS,
    Permission.EXPORT_PLAYERS,
    Permission.UPLOAD_FILES,
    Permission.VIEW_UPLOADS,
    Permission.DELETE_UPLOADS,
    Permission.VIEW_USERS,
    Permission.CREATE_USERS,
    Permission.UPDATE_USERS,
    Permission.DELETE_USERS,
    Permission.VIEW_EVENTS,
    Permission.CREATE_EVENTS,
    Permission.UPDATE_EVENTS,
    Permission.DELETE_EVENTS,
    Permission.VIEW_SYSTEM_STATS,
    Permission.MANAGE_SYSTEM
  ],
  
  [UserRole.EVENT_MANAGER]: [
    Permission.VIEW_PLAYERS,
    Permission.EXPORT_PLAYERS,
    Permission.UPLOAD_FILES,
    Permission.VIEW_UPLOADS,
    Permission.VIEW_EVENTS,
    Permission.CREATE_EVENTS,
    Permission.UPDATE_EVENTS,
    Permission.DELETE_EVENTS
  ],
  
  [UserRole.VIEWER]: [
    Permission.VIEW_PLAYERS,
    Permission.VIEW_EVENTS,
    Permission.VIEW_SYSTEM_STATS
  ]
};

/**
 * Permission checking utilities
 */
export class PermissionUtils {
  static hasPermission(userRole: UserRole, permission: Permission): boolean {
    return ROLE_PERMISSIONS[userRole]?.includes(permission) ?? false;
  }

  static hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(userRole, permission));
  }

  static hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(userRole, permission));
  }

  static getRolePermissions(userRole: UserRole): Permission[] {
    return ROLE_PERMISSIONS[userRole] ?? [];
  }
}
/**
 * Base configuration types and utilities
 */

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export interface BaseConfig {
  readonly environment: 'development' | 'production' | 'test';
  readonly nodeEnv: string;
  readonly version: string;
  readonly buildTimestamp: string;
}

export interface ConfigValidationRule<T = any> {
  validate: (value: T) => boolean;
  message: string;
  transform?: (value: any) => T;
}

export interface ConfigSection<T = any> {
  schema: Record<keyof T, ConfigValidationRule>;
  defaults: T;
  environmentOverrides?: Partial<Record<'development' | 'production' | 'test', DeepPartial<T>>>;
}

/**
 * Configuration validation utilities
 */
export class ConfigValidator {
  static validateString(minLength = 0, maxLength = Infinity): ConfigValidationRule<string> {
    return {
      validate: (value: string) => 
        typeof value === 'string' && 
        value.length >= minLength && 
        value.length <= maxLength,
      message: `Must be a string with length between ${minLength} and ${maxLength}`,
      transform: (value: any) => String(value)
    };
  }

  static validateNumber(min = -Infinity, max = Infinity): ConfigValidationRule<number> {
    return {
      validate: (value: number) => 
        typeof value === 'number' && 
        !isNaN(value) && 
        value >= min && 
        value <= max,
      message: `Must be a number between ${min} and ${max}`,
      transform: (value: any): number => {
        const num = Number(value);
        if (isNaN(num)) throw new Error(`Invalid number: ${value}`);
        return num;
      }
    };
  }

  static validateInteger(min = -Infinity, max = Infinity): ConfigValidationRule<number> {
    return {
      validate: (value: number) => 
        Number.isInteger(value) && 
        value >= min && 
        value <= max,
      message: `Must be an integer between ${min} and ${max}`,
      transform: (value: any): number => {
        const num = parseInt(value);
        if (isNaN(num)) throw new Error(`Invalid integer: ${value}`);
        return num;
      }
    };
  }

  static validateBoolean(): ConfigValidationRule<boolean> {
    return {
      validate: (value: boolean) => typeof value === 'boolean',
      message: 'Must be a boolean',
      transform: (value: any) => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true';
        }
        return Boolean(value);
      }
    };
  }

  static validateArray<T>(itemValidator?: ConfigValidationRule<T>): ConfigValidationRule<T[]> {
    return {
      validate: (value: T[]) => {
        if (!Array.isArray(value)) return false;
        if (!itemValidator) return true;
        return value.every(item => itemValidator.validate(item));
      },
      message: `Must be an array${itemValidator ? ` of valid items` : ''}`,
      transform: (value: any) => Array.isArray(value) ? value : [value]
    };
  }

  static validateEnum<T extends string>(allowedValues: T[]): ConfigValidationRule<T> {
    return {
      validate: (value: T) => allowedValues.includes(value),
      message: `Must be one of: ${allowedValues.join(', ')}`,
      transform: (value: any) => String(value) as T
    };
  }

  static validateUrl(): ConfigValidationRule<string> {
    return {
      validate: (value: string) => {
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      message: 'Must be a valid URL',
      transform: (value: any) => String(value)
    };
  }
}

// Load environment variables from .env file (server-side only)
if (typeof window === 'undefined') {
  try {
    require('dotenv').config();
  } catch (error) {
    // Ignore dotenv errors in environments where it's not available
    console.warn('dotenv not available:', error);
  }
}

/**
 * Environment variable utilities
 */
export class EnvUtils {
  static getString(key: string, defaultValue?: string): string | undefined {
    const value = process.env[key];
    return value !== undefined ? value : defaultValue;
  }

  static getNumber(key: string, defaultValue?: number): number | undefined {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  static getInteger(key: string, defaultValue?: number): number | undefined {
    const value = this.getNumber(key, defaultValue);
    return value !== undefined ? Math.floor(value) : undefined;
  }

  static getBoolean(key: string, defaultValue?: boolean): boolean | undefined {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true';
  }

  static getArray(key: string, separator = ',', defaultValue?: string[]): string[] | undefined {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    return value.split(separator).map(item => item.trim()).filter(Boolean);
  }

  static require(key: string): string {
    const value = process.env[key];
    if (value === undefined) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
  }
}

/**
 * Base configuration implementation
 */
export function createBaseConfig(): BaseConfig {
  return {
    environment: (process.env.NODE_ENV as any) || 'development',
    nodeEnv: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    buildTimestamp: new Date().toISOString()
  };
}

/**
 * Deep merge utility for configuration overrides
 */
function deepMerge(target: any, source: any): void {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {};
      }
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
}

/**
 * Configuration section loader with validation
 */
export function loadConfigSection<T>(
  section: ConfigSection<T>,
  environment: 'development' | 'production' | 'test' = 'development'
): T {
  const config = { ...section.defaults };
  
  // Apply environment overrides
  if (section.environmentOverrides?.[environment]) {
    deepMerge(config, section.environmentOverrides[environment]);
  }

  // Validate configuration
  const errors: string[] = [];
  
  for (const [key, rule] of Object.entries(section.schema)) {
    const value = config[key as keyof T];
    
    // Handle nested object validation
    if (typeof rule === 'object' && rule !== null && !('validate' in rule)) {
      // This is a nested schema object, validate recursively
      if (typeof value === 'object' && value !== null) {
        for (const [nestedKey, nestedRule] of Object.entries(rule)) {
          const nestedValue = (value as any)[nestedKey];
          const validationRule = nestedRule as ConfigValidationRule;
          
          if (validationRule && typeof validationRule.validate === 'function') {
            if (!validationRule.validate(nestedValue)) {
              // Try to transform the value if transformer exists
              if (validationRule.transform) {
                const transformed = validationRule.transform(nestedValue);
                if (transformed !== undefined && validationRule.validate(transformed)) {
                  (value as any)[nestedKey] = transformed;
                  continue;
                }
              }
              
              errors.push(`Configuration error for ${key}.${nestedKey}: ${validationRule.message}. Got: ${JSON.stringify(nestedValue)}`);
            }
          }
        }
      }
    } else {
      // This is a direct validation rule
      const validationRule = rule as ConfigValidationRule;
      
      if (validationRule && typeof validationRule.validate === 'function') {
        if (!validationRule.validate(value)) {
          // Try to transform the value if transformer exists
          if (validationRule.transform) {
            const transformed = validationRule.transform(value);
            if (transformed !== undefined && validationRule.validate(transformed)) {
              (config as any)[key] = transformed;
              continue;
            }
          }
          
          errors.push(`Configuration error for ${key}: ${validationRule.message}. Got: ${JSON.stringify(value)}`);
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }

  return config;
}
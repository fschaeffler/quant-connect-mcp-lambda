import { DEFAULT_RATE_LIMITS, RateLimitTier, type RateLimitConfig } from '@fschaeffler/mcp-middy'

/**
 * Environment-specific rate limiting configurations
 */
export const RATE_LIMITING_CONFIG = {
  // Development environment - more permissive for testing
  development: {
    enabled: true,
    rateLimitOverrides: {
      [RateLimitTier.CRITICAL]: {
        windowMs: 60 * 1000,  // 1 minute
        maxRequests: 10,      // More permissive for development
        blockDurationMs: 2 * 60 * 1000, // 2 minutes
      } as Partial<RateLimitConfig>,
      [RateLimitTier.HIGH]: {
        windowMs: 60 * 1000,
        maxRequests: 20,
        blockDurationMs: 60 * 1000, // 1 minute
      } as Partial<RateLimitConfig>,
    },
  },

  // Staging environment - production-like but slightly more permissive
  staging: {
    enabled: true,
    rateLimitOverrides: {
      [RateLimitTier.CRITICAL]: {
        windowMs: 60 * 1000,
        maxRequests: 8,       // Slightly more than production
        blockDurationMs: 3 * 60 * 1000, // 3 minutes
      } as Partial<RateLimitConfig>,
    },
  },

  // Production environment - strict rate limiting
  production: {
    enabled: true,
    rateLimitOverrides: {
      [RateLimitTier.CRITICAL]: {
        windowMs: 60 * 1000,  // 1 minute
        maxRequests: 5,       // Very strict for live trading
        blockDurationMs: 5 * 60 * 1000, // 5 minutes block
      } as Partial<RateLimitConfig>,
      [RateLimitTier.HIGH]: {
        windowMs: 60 * 1000,
        maxRequests: 8,       // Stricter than default
        blockDurationMs: 2 * 60 * 1000,
      } as Partial<RateLimitConfig>,
    },
  },
}

export function getRateLimitingConfig(environment: string = 'production') {
  const config = RATE_LIMITING_CONFIG[environment as keyof typeof RATE_LIMITING_CONFIG] || RATE_LIMITING_CONFIG.production
  
  return {
    ...config,
    // Merge with defaults to ensure all tiers are configured
    rateLimitOverrides: {
      ...DEFAULT_RATE_LIMITS,
      ...config.rateLimitOverrides,
    },
  }
}

export const CRITICAL_OPERATIONS_MONITORING = {
  // Operations that should trigger immediate security alerts
  highRiskOperations: [
    'create_live_algorithm',
    'liquidate_live_algorithm',
    'stop_live_algorithm',
    'create_live_command',
    'broadcast_live_command',
  ],
  
  // Suspicious patterns that should be monitored
  suspiciousPatterns: {
    rapidFireRequests: {
      threshold: 10,        // 10 requests
      windowMs: 10 * 1000,  // in 10 seconds
      description: 'Rapid-fire requests detected',
    },
    multipleFailedAuth: {
      threshold: 5,         // 5 failed attempts
      windowMs: 5 * 60 * 1000, // in 5 minutes
      description: 'Multiple failed authentication attempts',
    },
    unusualTrafficPattern: {
      threshold: 100,       // 100 requests
      windowMs: 60 * 1000,  // in 1 minute
      description: 'Unusual traffic pattern detected',
    },
  },
}
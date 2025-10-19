import { z } from 'zod'
import { DEFAULT_RATE_LIMITS, getRateLimitConfig, getRateLimitTier, type RateLimitConfig, RateLimitTier } from './rate-limit-config'
import { MemoryRateLimitStore, type RateLimitStore } from './rate-limit-store'

export const RateLimitResultSchema = z.object({
  allowed: z.boolean(),
  limit: z.number().int().positive(),
  current: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
  resetTime: z.number().int().positive(),
  retryAfter: z.number().int().nonnegative().optional(),
  tier: z.nativeEnum(RateLimitTier),
  blockUntil: z.number().int().nonnegative().optional(),
})

export type RateLimitResult = z.infer<typeof RateLimitResultSchema>

export interface RateLimiterOptions {
  store?: RateLimitStore
  keyGenerator?: (identifier: string, toolName: string) => string
  rateLimitOverrides?: Partial<Record<RateLimitTier, Partial<RateLimitConfig>>>
  enabled?: boolean
}

export class RateLimiter {
  private store: RateLimitStore
  private keyGenerator: (identifier: string, toolName: string) => string
  private rateLimitConfigs: Record<RateLimitTier, RateLimitConfig>
  private enabled: boolean

  constructor(options: RateLimiterOptions = {}) {
    this.store = options.store ?? new MemoryRateLimitStore()
    this.keyGenerator = options.keyGenerator ?? this.defaultKeyGenerator
    this.enabled = options.enabled ?? true
    
    // Apply any rate limit overrides
    this.rateLimitConfigs = { ...DEFAULT_RATE_LIMITS }
    if (options.rateLimitOverrides) {
      for (const [tier, overrides] of Object.entries(options.rateLimitOverrides)) {
        const tierKey = tier as RateLimitTier
        this.rateLimitConfigs[tierKey] = getRateLimitConfig(tierKey, overrides)
      }
    }
  }

  private defaultKeyGenerator(identifier: string, toolName: string): string {
    return `rate_limit:${identifier}:${toolName}`
  }

  async checkRateLimit(
    identifier: string,
    toolName: string,
    options: { 
      customConfig?: Partial<RateLimitConfig>
      skipCheck?: boolean 
    } = {}
  ): Promise<RateLimitResult> {
    if (!this.enabled || options.skipCheck) {
      return this.createAllowedResult(toolName)
    }

    const tier = getRateLimitTier(toolName)
    const config = options.customConfig 
      ? getRateLimitConfig(tier, options.customConfig)
      : this.rateLimitConfigs[tier]
    
    const key = this.keyGenerator(identifier, toolName)
    const now = Date.now()

    try {
      // Check if currently blocked
      const existing = await this.store.get(key)
      if (existing?.blockUntil && existing.blockUntil > now) {
        return this.createBlockedResult(config, existing, tier)
      }

      // Increment counter
      const entry = await this.store.increment(key, config.windowMs)
      
      // Check if limit exceeded
      if (entry.count > config.maxRequests) {
        // Apply blocking if configured
        if (config.blockDurationMs) {
          const blockUntil = now + config.blockDurationMs
          const blockedEntry = { ...entry, blockUntil }
          await this.store.set(key, blockedEntry)
          return this.createBlockedResult(config, blockedEntry, tier)
        }
        
        return this.createDeniedResult(config, entry, tier)
      }

      return this.createAllowedResult(toolName, config, entry, tier)
    } catch (error) {
      // Log error but don't block requests on store failures
      console.error('Rate limit store error:', error)
      return this.createAllowedResult(toolName)
    }
  }

  private createAllowedResult(
    toolName: string,
    config?: RateLimitConfig,
    entry?: { count: number; resetTime: number },
    tier?: RateLimitTier
  ): RateLimitResult {
    const defaultTier = tier ?? getRateLimitTier(toolName)
    const defaultConfig = config ?? this.rateLimitConfigs[defaultTier]
    
    return {
      allowed: true,
      limit: defaultConfig.maxRequests,
      current: entry?.count ?? 0,
      remaining: Math.max(0, defaultConfig.maxRequests - (entry?.count ?? 0)),
      resetTime: entry?.resetTime ?? Date.now() + defaultConfig.windowMs,
      tier: defaultTier,
    }
  }

  private createDeniedResult(
    config: RateLimitConfig,
    entry: { count: number; resetTime: number },
    tier: RateLimitTier
  ): RateLimitResult {
    const retryAfter = Math.ceil((entry.resetTime - Date.now()) / 1000)
    
    return {
      allowed: false,
      limit: config.maxRequests,
      current: entry.count,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.max(1, retryAfter),
      tier,
    }
  }

  private createBlockedResult(
    config: RateLimitConfig,
    entry: { count: number; resetTime: number; blockUntil?: number },
    tier: RateLimitTier
  ): RateLimitResult {
    const blockUntil = entry.blockUntil ?? Date.now()
    const retryAfter = Math.ceil((blockUntil - Date.now()) / 1000)
    
    return {
      allowed: false,
      limit: config.maxRequests,
      current: entry.count,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.max(1, retryAfter),
      blockUntil,
      tier,
    }
  }

  async resetLimit(identifier: string, toolName: string): Promise<void> {
    const key = this.keyGenerator(identifier, toolName)
    await this.store.delete(key)
  }

  async resetAllLimits(): Promise<void> {
    await this.store.clear()
  }

  getRateLimitConfig(tier: RateLimitTier): RateLimitConfig {
    return this.rateLimitConfigs[tier]
  }

  updateRateLimitConfig(tier: RateLimitTier, config: Partial<RateLimitConfig>): void {
    this.rateLimitConfigs[tier] = getRateLimitConfig(tier, config)
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  isEnabled(): boolean {
    return this.enabled
  }
}
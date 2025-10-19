import { RateLimiter } from './rate-limiter'
import { MemoryRateLimitStore } from './rate-limit-store'
import { RateLimitTier } from './rate-limit-config'

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter
  let store: MemoryRateLimitStore

  beforeEach(() => {
    store = new MemoryRateLimitStore()
    rateLimiter = new RateLimiter({ store })
  })

  afterEach(() => {
    store.destroy()
  })

  describe('Critical Operations Rate Limiting', () => {
    const identifier = 'test-api-key'
    const criticalTool = 'create_live_algorithm'

    it('should allow requests within limit', async () => {
      const result = await rateLimiter.checkRateLimit(identifier, criticalTool)
      
      expect(result.allowed).toBe(true)
      expect(result.tier).toBe(RateLimitTier.CRITICAL)
      expect(result.current).toBe(1)
      expect(result.remaining).toBe(4) // Critical limit is 5
    })

    it('should deny requests exceeding limit', async () => {
      // Make 5 requests (the limit)
      for (let i = 0; i < 5; i++) {
        await rateLimiter.checkRateLimit(identifier, criticalTool)
      }

      // 6th request should be denied
      const result = await rateLimiter.checkRateLimit(identifier, criticalTool)
      
      expect(result.allowed).toBe(false)
      expect(result.current).toBe(6)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBeGreaterThan(0)
    })

    it('should block requests after limit exceeded', async () => {
      // Exceed the limit
      for (let i = 0; i < 6; i++) {
        await rateLimiter.checkRateLimit(identifier, criticalTool)
      }

      // Should be blocked even after some time
      const result = await rateLimiter.checkRateLimit(identifier, criticalTool)
      
      expect(result.allowed).toBe(false)
      expect(result.blockUntil).toBeDefined()
      expect(result.blockUntil).toBeGreaterThan(Date.now())
    })

    it('should differentiate between identifiers', async () => {
      const identifier1 = 'api-key-1'
      const identifier2 = 'api-key-2'

      // Exhaust limit for identifier1
      for (let i = 0; i < 6; i++) {
        await rateLimiter.checkRateLimit(identifier1, criticalTool)
      }

      // identifier2 should still be allowed
      const result = await rateLimiter.checkRateLimit(identifier2, criticalTool)
      expect(result.allowed).toBe(true)
    })
  })

  describe('Different Tool Tiers', () => {
    const identifier = 'test-api-key'

    it('should apply different limits for different tiers', async () => {
      const criticalTool = 'create_live_algorithm'
      const highTool = 'create_backtest'
      const lowTool = 'read_account'

      const criticalResult = await rateLimiter.checkRateLimit(identifier, criticalTool)
      const highResult = await rateLimiter.checkRateLimit(identifier, highTool)
      const lowResult = await rateLimiter.checkRateLimit(identifier, lowTool)

      expect(criticalResult.limit).toBe(5)   // Critical tier
      expect(highResult.limit).toBe(10)      // High tier
      expect(lowResult.limit).toBe(100)      // Low tier
    })

    it('should handle unknown tools with medium tier', async () => {
      const unknownTool = 'unknown_operation'
      const result = await rateLimiter.checkRateLimit(identifier, unknownTool)
      
      expect(result.tier).toBe(RateLimitTier.MEDIUM)
      expect(result.limit).toBe(30) // Medium tier default
    })
  })

  describe('Rate Limit Reset', () => {
    const identifier = 'test-api-key'
    const tool = 'create_live_algorithm'

    it('should reset limits for specific identifier and tool', async () => {
      // Make some requests
      await rateLimiter.checkRateLimit(identifier, tool)
      await rateLimiter.checkRateLimit(identifier, tool)

      let result = await rateLimiter.checkRateLimit(identifier, tool)
      expect(result.current).toBe(3)

      // Reset limits
      await rateLimiter.resetLimit(identifier, tool)

      // Next request should start fresh
      result = await rateLimiter.checkRateLimit(identifier, tool)
      expect(result.current).toBe(1)
    })

    it('should reset all limits', async () => {
      // Make requests for multiple tools
      await rateLimiter.checkRateLimit(identifier, 'create_live_algorithm')
      await rateLimiter.checkRateLimit(identifier, 'create_backtest')

      // Reset all
      await rateLimiter.resetAllLimits()

      // All should start fresh
      const result1 = await rateLimiter.checkRateLimit(identifier, 'create_live_algorithm')
      const result2 = await rateLimiter.checkRateLimit(identifier, 'create_backtest')

      expect(result1.current).toBe(1)
      expect(result2.current).toBe(1)
    })
  })

  describe('Configuration', () => {
    it('should allow custom rate limit overrides', async () => {
      const customRateLimiter = new RateLimiter({
        store: new MemoryRateLimitStore(),
        rateLimitOverrides: {
          [RateLimitTier.CRITICAL]: {
            maxRequests: 2, // Override to 2 instead of 5
          }
        }
      })

      const identifier = 'test-api-key'
      const tool = 'create_live_algorithm'

      const result = await customRateLimiter.checkRateLimit(identifier, tool)
      expect(result.limit).toBe(2) // Should use overridden value
    })

    it('should respect enabled/disabled state', async () => {
      rateLimiter.setEnabled(false)
      
      const identifier = 'test-api-key'
      const tool = 'create_live_algorithm'

      // Should allow even if we exceed normal limits
      for (let i = 0; i < 10; i++) {
        const result = await rateLimiter.checkRateLimit(identifier, tool)
        expect(result.allowed).toBe(true)
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle store failures gracefully', async () => {
      // Mock a store failure
      const failingStore = new MemoryRateLimitStore()
      jest.spyOn(failingStore, 'increment').mockRejectedValue(new Error('Store failure'))

      const failingRateLimiter = new RateLimiter({ store: failingStore })
      
      const result = await failingRateLimiter.checkRateLimit('test', 'test_tool')
      
      // Should allow request when store fails
      expect(result.allowed).toBe(true)
    })
  })
})
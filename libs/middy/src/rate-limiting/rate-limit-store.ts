import { z } from 'zod'

export const RateLimitEntrySchema = z.object({
  count: z.number().int().nonnegative(),
  resetTime: z.number().int().positive(),
  blockUntil: z.number().int().nonnegative().optional(),
})

export type RateLimitEntry = z.infer<typeof RateLimitEntrySchema>

export interface RateLimitStore {
  get(key: string): Promise<RateLimitEntry | null>
  set(key: string, entry: RateLimitEntry, ttlMs?: number): Promise<void>
  increment(key: string, windowMs: number, ttlMs?: number): Promise<RateLimitEntry>
  delete(key: string): Promise<void>
  clear(): Promise<void>
}

/**
 * In-memory rate limit store implementation
 * WARNING: This should only be used for development/testing
 * In production, use a distributed store like Redis or DynamoDB
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, { entry: RateLimitEntry; expiry: number }>()
  private cleanupInterval: NodeJS.Timeout

  constructor(cleanupIntervalMs = 60000) {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, cleanupIntervalMs)
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    const item = this.store.get(key)
    if (!item) return null
    
    if (Date.now() > item.expiry) {
      this.store.delete(key)
      return null
    }
    
    return item.entry
  }

  async set(key: string, entry: RateLimitEntry, ttlMs = 3600000): Promise<void> {
    const expiry = Date.now() + ttlMs
    this.store.set(key, { entry, expiry })
  }

  async increment(key: string, windowMs: number, ttlMs = 3600000): Promise<RateLimitEntry> {
    const now = Date.now()
    const resetTime = now + windowMs
    
    const existing = await this.get(key)
    
    if (!existing || now >= existing.resetTime) {
      // Create new window
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime,
        blockUntil: existing?.blockUntil && existing.blockUntil > now ? existing.blockUntil : undefined,
      }
      await this.set(key, newEntry, ttlMs)
      return newEntry
    }
    
    // Increment existing window
    const updatedEntry: RateLimitEntry = {
      ...existing,
      count: existing.count + 1,
    }
    await this.set(key, updatedEntry, ttlMs)
    return updatedEntry
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }

  async clear(): Promise<void> {
    this.store.clear()
  }

  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []
    
    for (const [key, item] of this.store.entries()) {
      if (now > item.expiry) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => this.store.delete(key))
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.clear()
  }
}

/**
 * DynamoDB-based rate limit store for production use
 * This would require AWS SDK and proper IAM permissions
 */
export class DynamoDBRateLimitStore implements RateLimitStore {
  constructor(
    private tableName: string,
    private region = 'us-east-1'
  ) {}

  async get(key: string): Promise<RateLimitEntry | null> {
    // Implementation would use AWS DynamoDB SDK
    // For now, this is a placeholder
    throw new Error('DynamoDBRateLimitStore not implemented - use MemoryRateLimitStore for development')
  }

  async set(key: string, entry: RateLimitEntry, ttlMs?: number): Promise<void> {
    throw new Error('DynamoDBRateLimitStore not implemented - use MemoryRateLimitStore for development')
  }

  async increment(key: string, windowMs: number, ttlMs?: number): Promise<RateLimitEntry> {
    throw new Error('DynamoDBRateLimitStore not implemented - use MemoryRateLimitStore for development')
  }

  async delete(key: string): Promise<void> {
    throw new Error('DynamoDBRateLimitStore not implemented - use MemoryRateLimitStore for development')
  }

  async clear(): Promise<void> {
    throw new Error('DynamoDBRateLimitStore not implemented - use MemoryRateLimitStore for development')
  }
}
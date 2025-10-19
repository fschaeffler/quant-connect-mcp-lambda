import type middy from '@middy/core'
import type { Context } from 'aws-lambda'
import createHttpError from 'http-errors'
import { z } from 'zod'
import type { RequestEvent, ResponseEvent } from '../types'
import { RateLimiter, type RateLimiterOptions, type RateLimitResult } from './rate-limiter'

interface RateLimitMiddlewareOptions extends RateLimiterOptions {
  identifierExtractor?: (event: RequestEvent, context: Context) => string | Promise<string>
  toolNameExtractor?: (event: RequestEvent, context: Context) => string | Promise<string>
  onRateLimitExceeded?: (result: RateLimitResult, event: RequestEvent, context: Context) => void | Promise<void>
  includeHeaders?: boolean
  skipPaths?: string[]
  skipMethods?: string[]
}

type RequestContext = Context & {
  rateLimitResult?: RateLimitResult
  rateLimitIdentifier?: string
  rateLimitToolName?: string
}

const JSONRPCRequestSchema = z.object({
  method: z.string(),
  params: z.record(z.any()).optional(),
  id: z.union([z.string(), z.number()]).optional(),
})

const createRateLimitError = (result: RateLimitResult) => {
  const message = result.blockUntil 
    ? `Rate limit exceeded. Blocked until ${new Date(result.blockUntil).toISOString()}. Retry after ${result.retryAfter} seconds.`
    : `Rate limit exceeded. ${result.remaining}/${result.limit} requests remaining. Retry after ${result.retryAfter} seconds.`

  const error = createHttpError(429, message)
  
  // Add rate limit headers
  error.headers = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
    'X-RateLimit-Tier': result.tier,
    'Retry-After': result.retryAfter?.toString() ?? '60',
    ...(result.blockUntil && { 'X-RateLimit-BlockUntil': Math.ceil(result.blockUntil / 1000).toString() }),
  }

  return error
}

export const rateLimitMiddleware = (
  options: RateLimitMiddlewareOptions = {}
): middy.MiddlewareObj<RequestEvent, ResponseEvent, Error, RequestContext> => {
  const rateLimiter = new RateLimiter(options)
  
  const {
    identifierExtractor = defaultIdentifierExtractor,
    toolNameExtractor = defaultToolNameExtractor,
    onRateLimitExceeded,
    includeHeaders = true,
    skipPaths = [],
    skipMethods = ['OPTIONS'],
  } = options

  return {
    before: async ({ event, context }) => {
      // Skip rate limiting for certain paths or methods
      if (skipPaths.some(path => event.pathParameters?.proxy?.includes(path)) ||
          skipMethods.includes(event.httpMethod)) {
        return
      }

      try {
        // Extract identifier and tool name
        const identifier = await identifierExtractor(event, context)
        const toolName = await toolNameExtractor(event, context)
        
        context.rateLimitIdentifier = identifier
        context.rateLimitToolName = toolName

        if (!identifier || !toolName) {
          console.warn('Rate limiting skipped: missing identifier or tool name', { identifier, toolName })
          return
        }

        // Check rate limit
        const result = await rateLimiter.checkRateLimit(identifier, toolName)
        context.rateLimitResult = result

        if (!result.allowed) {
          // Log rate limit violation
          console.warn('Rate limit exceeded', {
            identifier,
            toolName,
            tier: result.tier,
            current: result.current,
            limit: result.limit,
            blockUntil: result.blockUntil,
            timestamp: new Date().toISOString(),
          })

          // Call custom handler if provided
          if (onRateLimitExceeded) {
            await onRateLimitExceeded(result, event, context)
          }

          throw createRateLimitError(result)
        }

        // Log successful rate limit check for critical operations
        if (result.tier === 'CRITICAL' || result.tier === 'HIGH') {
          console.info('Rate limit check passed for critical operation', {
            identifier,
            toolName,
            tier: result.tier,
            current: result.current,
            limit: result.limit,
            remaining: result.remaining,
          })
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
          throw error
        }
        
        // Log error but don't block request
        console.error('Rate limiting error:', error)
      }
    },

    after: async ({ response, context }) => {
      if (!includeHeaders || !response || !context.rateLimitResult) {
        return
      }

      const result = context.rateLimitResult

      // Add rate limit headers to response
      const headers = response.headers || {}
      headers['X-RateLimit-Limit'] = result.limit.toString()
      headers['X-RateLimit-Remaining'] = result.remaining.toString()
      headers['X-RateLimit-Reset'] = Math.ceil(result.resetTime / 1000).toString()
      headers['X-RateLimit-Tier'] = result.tier

      if (result.blockUntil) {
        headers['X-RateLimit-BlockUntil'] = Math.ceil(result.blockUntil / 1000).toString()
      }

      response.headers = headers
    },

    onError: async ({ error, context }) => {
      // Log rate limit errors with context
      if (error?.statusCode === 429 && context.rateLimitIdentifier && context.rateLimitToolName) {
        console.error('Rate limit error occurred', {
          identifier: context.rateLimitIdentifier,
          toolName: context.rateLimitToolName,
          error: error.message,
          timestamp: new Date().toISOString(),
        })
      }
    },
  }
}

async function defaultIdentifierExtractor(event: RequestEvent, context: Context): Promise<string> {
  // Extract API key from headers (set by AWS API Gateway)
  const apiKey = event.requestContext?.identity?.apiKey || 
                 event.headers?.['x-api-key'] || 
                 event.headers?.['X-API-Key']
  
  if (apiKey) {
    return `api_key:${apiKey}`
  }

  // Fallback to IP address
  const ip = event.requestContext?.identity?.sourceIp || 'unknown'
  return `ip:${ip}`
}

async function defaultToolNameExtractor(event: RequestEvent, context: Context): Promise<string> {
  try {
    if (!event.body) {
      return 'unknown'
    }

    const body = event.isBase64Encoded ? 
      Buffer.from(event.body, 'base64').toString() : 
      event.body

    const jsonBody = JSON.parse(body)
    
    // Handle array of JSON-RPC requests
    const requests = Array.isArray(jsonBody) ? jsonBody : [jsonBody]
    
    // For multiple requests, use the first one for rate limiting
    const firstRequest = requests[0]
    const parsed = JSONRPCRequestSchema.safeParse(firstRequest)
    
    if (!parsed.success) {
      return 'unknown'
    }

    // Extract method name for tool identification
    const method = parsed.data.method
    
    // For tools/call method, extract the actual tool name
    if (method === 'tools/call' && parsed.data.params?.name) {
      return parsed.data.params.name
    }
    
    return method || 'unknown'
  } catch (error) {
    console.error('Error extracting tool name:', error)
    return 'unknown'
  }
}
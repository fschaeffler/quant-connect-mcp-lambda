import { middyMCP, middyQCClient, rateLimitMiddleware, MemoryRateLimitStore } from '@fschaeffler/mcp-middy'
import { QCMCPServer, getRateLimitingConfig, CRITICAL_OPERATIONS_MONITORING } from '@fschaeffler/quant-connect-mcp'
import middy from '@middy/core'
import httpErrorHandler from '@middy/http-error-handler'

// Get environment-specific rate limiting configuration
const environment = process.env.NODE_ENV || 'production'
const rateLimitConfig = getRateLimitingConfig(environment)

export const handler = middy()
  .use(middyQCClient())
  .use(rateLimitMiddleware({
    store: new MemoryRateLimitStore(),
    ...rateLimitConfig,
    includeHeaders: true,
    onRateLimitExceeded: async (result, event, context) => {
      const isHighRiskOperation = CRITICAL_OPERATIONS_MONITORING.highRiskOperations.includes(
        context.rateLimitToolName || ''
      )
      
      // Enhanced logging with security context
      const securityEvent = {
        eventType: 'RATE_LIMIT_VIOLATION',
        severity: result.tier === 'CRITICAL' || isHighRiskOperation ? 'CRITICAL' : 'HIGH',
        identifier: context.rateLimitIdentifier,
        toolName: context.rateLimitToolName,
        tier: result.tier,
        current: result.current,
        limit: result.limit,
        blockUntil: result.blockUntil,
        sourceIp: event.requestContext?.identity?.sourceIp,
        userAgent: event.headers?.['User-Agent'] || event.headers?.['user-agent'],
        apiKey: event.requestContext?.identity?.apiKey,
        timestamp: new Date().toISOString(),
        environment,
        // Additional context for security analysis
        requestId: context.awsRequestId,
        region: process.env.AWS_REGION,
        functionName: context.functionName,
      }

      // Log as structured JSON for parsing by monitoring systems
      console.error('SECURITY ALERT: Rate limit exceeded', securityEvent)
      
      // For critical operations, also log at WARN level to ensure visibility
      if (securityEvent.severity === 'CRITICAL') {
        console.warn('CRITICAL SECURITY EVENT: Trading operation rate limit exceeded', {
          toolName: context.rateLimitToolName,
          identifier: context.rateLimitIdentifier,
          sourceIp: event.requestContext?.identity?.sourceIp,
        })
      }
    }
  }))
  .use(middyMCP({ server: QCMCPServer.getInstance() }))
  .use(httpErrorHandler())

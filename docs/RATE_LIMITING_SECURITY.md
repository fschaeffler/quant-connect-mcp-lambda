# QuantConnect MCP Rate Limiting Security Implementation

## Overview

This document describes the comprehensive rate limiting security implementation for the QuantConnect MCP server to address the **T3: Insufficient Rate Limiting Controls** security finding.

## Security Issue Addressed

**Risk Level**: HIGH
**Finding**: Only AWS API Gateway rate limiting (100 req/sec, 200 burst)
**Impact**: No protection against financial API abuse, trading system overload
**Attack Vector**: Rapid-fire trading operations, market manipulation attempts
**Financial Risk**: Potential significant financial losses through automated trading abuse

## Solution Architecture

### Multi-Layer Rate Limiting

1. **AWS API Gateway Level** (Infrastructure)
   - Overall API throttling: 50 req/sec, 100 burst
   - Per-API-key throttling: 30 req/sec, 60 burst
   - Daily quota: 10,000 requests/day per API key
   - Endpoint-specific throttling for `/mcp` POST: 20 req/sec, 40 burst

2. **Application Level** (Middleware)
   - Tool-specific rate limiting based on operation criticality
   - Tiered rate limits with blocking capabilities
   - In-memory store for Lambda (extensible to Redis/DynamoDB)
   - Context-aware rate limiting with enhanced logging

3. **Monitoring & Alerting** (CloudWatch + SNS)
   - Real-time monitoring of rate limit violations
   - Security alerts for critical operations
   - Automated incident response capabilities

## Rate Limiting Tiers

### CRITICAL Tier (Live Trading Operations)
- **Limit**: 5 requests/minute
- **Block Duration**: 5 minutes after violation
- **Operations**:
  - `create_live_algorithm` - Start live trading
  - `liquidate_live_algorithm` - Liquidate positions
  - `stop_live_algorithm` - Stop trading algorithms
  - `create_live_command` - Send trading commands
  - `broadcast_live_command` - Broadcast to all algorithms

### HIGH Tier (Resource-Intensive Operations)
- **Limit**: 10 requests/minute
- **Block Duration**: 2 minutes after violation
- **Operations**:
  - `create_backtest` - Strategy backtesting
  - `create_optimization` - Parameter optimization
  - `create_compile` - Algorithm compilation

### MEDIUM Tier (Management Operations)
- **Limit**: 30 requests/minute
- **Block Duration**: 1 minute after violation
- **Operations**:
  - Project management (CRUD)
  - File operations
  - Object store operations
  - AI-assisted operations

### LOW Tier (Read Operations)
- **Limit**: 100 requests/minute
- **No blocking** (failed requests don't count)
- **Operations**:
  - All read/list operations
  - Status checks
  - Data retrieval

## Implementation Details

### Key Components

1. **Rate Limiter** (`libs/middy/src/rate-limiting/rate-limiter.ts`)
   - Core rate limiting logic
   - Configurable thresholds and blocking
   - Support for multiple storage backends

2. **Middleware** (`libs/middy/src/rate-limiting/middleware.ts`)
   - Express/Lambda middleware integration
   - Request context extraction
   - Error handling and logging

3. **Configuration** (`libs/quant-connect-mcp/src/configs/rate-limiting.ts`)
   - Environment-specific settings
   - Tool-to-tier mappings
   - Monitoring configurations

4. **Infrastructure** (`infra/lib/quant-connect-mcp.ts`)
   - AWS API Gateway throttling
   - CloudWatch alarms and metrics
   - SNS alerting setup

### Request Flow

```
[Client Request]
     ↓
[API Gateway Throttling] ← First line of defense
     ↓
[Lambda Function]
     ↓
[Rate Limiting Middleware] ← Application-level protection
     ↓
[Tool Execution]
     ↓
[Response with Rate Limit Headers]
```

### Rate Limiting Logic

1. **Request Identification**: API key or IP address
2. **Tool Classification**: Map tool name to tier
3. **Rate Check**: Increment counter in time window
4. **Decision**: Allow, deny, or block based on limits
5. **Logging**: Security events for monitoring
6. **Response**: Include rate limit headers

## Configuration

### Environment Variables

```bash
NODE_ENV=production|staging|development
```

### Environment-Specific Limits

**Production** (Strictest):
- Critical: 5/min, 5min block
- High: 8/min, 2min block

**Staging** (Moderate):
- Critical: 8/min, 3min block
- High: 10/min, 2min block

**Development** (Permissive):
- Critical: 10/min, 2min block
- High: 20/min, 1min block

## Monitoring & Alerting

### CloudWatch Metrics

- `QuantConnect/MCP/Security/RateLimitViolations`
- `QuantConnect/MCP/Security/CriticalOperations`
- `AWS/ApiGateway/ClientError`
- `AWS/Lambda/Errors`

### Alarms

1. **Rate Limit Violations**: ≥5 violations in 2 periods
2. **Critical Operations**: ≥1 violation (immediate alert)
3. **API Gateway Throttling**: ≥10 throttles in 2 periods
4. **Lambda Errors**: ≥5 errors in 2 periods

### Alert Actions

- SNS notifications to security team
- Structured logging for SIEM integration
- Context-rich security event data

## Security Features

### Attack Prevention

1. **Rapid-Fire Trading**: Critical tier limits prevent burst trading
2. **Resource Exhaustion**: High tier limits prevent compute abuse
3. **Reconnaissance**: Request patterns logged for analysis
4. **Distributed Attacks**: Per-identifier rate limiting

### Logging & Forensics

All rate limit violations include:
- Request identifier (API key/IP)
- Tool name and tier
- Current usage vs limits
- Source IP and User-Agent
- AWS request context
- Timestamp and environment

### Response Headers

```http
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 2
X-RateLimit-Reset: 1640995200
X-RateLimit-Tier: CRITICAL
X-RateLimit-BlockUntil: 1640995500
Retry-After: 300
```

## Production Considerations

### Scaling

- **In-Memory Store**: Suitable for single Lambda instances
- **Redis Store**: Recommended for high-traffic, multi-instance deployments
- **DynamoDB Store**: AWS-native option with global distribution

### Performance

- Minimal latency impact (<5ms per request)
- Asynchronous logging
- Efficient in-memory operations
- Cleanup automation

### Reliability

- Graceful degradation on store failures
- No blocking on monitoring errors
- Circuit breaker patterns for external dependencies

## Testing

### Rate Limit Testing

```bash
# Test critical operation limits
for i in {1..6}; do
  curl -X POST api/mcp \
    -H "x-api-key: test-key" \
    -d '{"method":"tools/call","params":{"name":"create_live_algorithm"}}'
done
```

### Load Testing

- Simulate burst traffic patterns
- Test blocking behavior
- Verify monitoring accuracy
- Validate alert triggering

## Compliance & Auditing

### Financial Regulations

- Rate limiting helps meet regulatory requirements for trading system controls
- Audit trail for all trading-related operations
- Risk management through technical controls

### Security Standards

- Defense in depth architecture
- Comprehensive logging and monitoring
- Incident response capabilities
- Regular security reviews

## Maintenance

### Regular Tasks

1. **Review Rate Limits**: Analyze usage patterns and adjust limits
2. **Monitor Alerts**: Investigate security events and false positives  
3. **Update Configurations**: Adapt to new tools and requirements
4. **Performance Tuning**: Optimize for changing traffic patterns

### Emergency Procedures

1. **Disable Rate Limiting**: Set `enabled: false` for emergencies
2. **Adjust Limits**: Temporary limit changes via configuration
3. **Block Specific Users**: Enhanced blocking capabilities
4. **Incident Response**: Structured security event handling

## Future Enhancements

1. **Machine Learning**: Anomaly detection for unusual patterns
2. **Geographic Limits**: Region-based rate limiting
3. **Adaptive Limits**: Dynamic adjustment based on risk scores
4. **Integration**: SIEM and security orchestration platforms

## Conclusion

This comprehensive rate limiting implementation provides multi-layered protection against financial API abuse while maintaining system performance and user experience. The tiered approach ensures critical trading operations receive the highest level of protection while allowing normal operations to continue smoothly.
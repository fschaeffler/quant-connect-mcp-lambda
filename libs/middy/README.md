# Middy MCP Integration Library

AWS Lambda middleware for integrating Model Context Protocol (MCP) servers with Lambda functions using the Middy framework.

## Overview

This library provides middleware for running MCP servers in AWS Lambda environments. It handles HTTP transport, request/response transformation, and integrates the QuantConnect client for seamless API access.

## Features

- **MCP over HTTP**: HTTP transport for MCP JSON-RPC communication
- **Lambda Integration**: Seamless AWS Lambda and API Gateway support
- **Notification Support**: Proper handling of MCP notifications (messages without ID)
- **Middy Middleware**: Compatible with the Middy middleware framework
- **Error Handling**: Comprehensive error mapping and HTTP status codes
- **Type Safety**: Full TypeScript support with proper typing

> **Acknowledgment**: This MCP integration is inspired by the [`middy-mcp`](https://github.com/fredericbarthelet/middy-mcp) package by Frédéric Barthelet, with independent development and architectural adaptations for this project's specific requirements.

## Architecture

```
src/
├── index.ts                    # Main exports
├── quant-connect-client.ts     # QuantConnect client middleware
├── types/                      # Type definitions
│   ├── index.ts
│   ├── request.ts             # Request type definitions
│   └── response.ts            # Response type definitions
└── mcp/
    ├── index.ts               # MCP middleware exports
    └── http-server-transport.ts # HTTP transport implementation
```

## Usage

### Basic Lambda Setup

```typescript
import { middyMCP, middyQCClient } from '@fschaeffler/mcp-middy'
import { QCMCPServer } from '@fschaeffler/quant-connect-mcp'
import middy from '@middy/core'
import httpErrorHandler from '@middy/http-error-handler'

export const handler = middy()
  .use(middyQCClient())           // QuantConnect client middleware
  .use(middyMCP({                 // MCP server middleware
    server: QCMCPServer.getInstance()
  }))
  .use(httpErrorHandler())        // Error handling
```

### QuantConnect Client Middleware

The `middyQCClient` middleware initializes the QuantConnect client with AWS Secrets Manager integration:

```typescript
import { middyQCClient } from '@fschaeffler/mcp-middy'

// Automatically configures QuantConnect client with secrets
const middleware = middyQCClient({
  userIdSecretName: 'quant-connect-mcp/user-id',      // Default
  apiTokenSecretName: 'quant-connect-mcp/api-token',  // Default
  region: 'us-east-1'                                 // Default
})
```

### MCP Server Middleware

The `middyMCP` middleware handles MCP JSON-RPC communication over HTTP:

```typescript
import { middyMCP } from '@fschaeffler/mcp-middy'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

const middleware = middyMCP({
  server: mcpServerInstance,
  enableCors: true,           // Default: true
  corsOrigin: '*',           // Default: '*'
  enableLogging: true        // Default: false
})
```

## HTTP Transport

### Request Format

The middleware expects MCP JSON-RPC requests over HTTP POST:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "create_project",
    "arguments": {
      "name": "My Algorithm",
      "language": "Python"
    }
  }
}
```

### Response Format

Responses follow the JSON-RPC 2.0 specification:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [],
    "structuredContent": {
      "projectId": 12345,
      "name": "My Algorithm",
      "language": "Python"
    }
  }
}
```

### Notification Handling

The middleware properly handles MCP notifications (messages without `id` field):

```json
// Notification request (no id field)
{
  "jsonrpc": "2.0",
  "method": "notifications/initialized"
}

// Response: HTTP 200 with empty body
// (Notifications don't require responses)
```

This ensures compatibility with MCP clients that send initialization notifications during the connection handshake.

### Error Responses

Errors are properly formatted with HTTP status codes:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": {
      "details": "Missing required parameter: name"
    }
  }
}
```

## Type Definitions

### Lambda Event Types

```typescript
interface APIGatewayProxyEvent {
  body: string | null
  headers: { [name: string]: string | undefined }
  multiValueHeaders: { [name: string]: string[] | undefined }
  httpMethod: string
  isBase64Encoded: boolean
  path: string
  pathParameters: { [name: string]: string | undefined } | null
  queryStringParameters: { [name: string]: string | undefined } | null
  multiValueQueryStringParameters: { [name: string]: string[] | undefined } | null
  stageVariables: { [name: string]: string | undefined } | null
  requestContext: APIGatewayEventRequestContext
  resource: string
}
```

### MCP Request/Response Types

```typescript
interface MCPRequest {
  jsonrpc: '2.0'
  id?: string | number | null
  method: string
  params?: any
}

interface MCPResponse {
  jsonrpc: '2.0'
  id?: string | number | null
  result?: any
  error?: MCPError
}

interface MCPError {
  code: number
  message: string
  data?: any
}
```

## Middleware Configuration

### QuantConnect Client Options

```typescript
interface QCClientMiddlewareOptions {
  userIdSecretName?: string      // AWS secret name for user ID
  apiTokenSecretName?: string    // AWS secret name for API token
  region?: string               // AWS region for Secrets Manager
  cacheCredentials?: boolean    // Cache credentials (default: true)
  timeout?: number             // Request timeout (default: 30000ms)
}
```

### MCP Server Options

```typescript
interface MCPMiddlewareOptions {
  server: McpServer            // MCP server instance
  enableCors?: boolean         // Enable CORS headers (default: true)
  corsOrigin?: string         // CORS origin (default: '*')
  enableLogging?: boolean     // Enable request/response logging
  maxRequestSize?: number     // Max request body size (default: 1MB)
}
```

## Error Handling

The middleware maps MCP errors to appropriate HTTP status codes:

```typescript
const errorMapping = {
  [-32700]: 400, // Parse error
  [-32600]: 400, // Invalid Request
  [-32601]: 404, // Method not found
  [-32602]: 400, // Invalid params
  [-32603]: 500, // Internal error
  [-32000]: 500, // Server error
}
```

### Custom Error Handling

```typescript
import { MCPError } from '@fschaeffler/mcp-middy'

// Custom error types
class AuthenticationError extends MCPError {
  constructor(message: string) {
    super(-32001, message, { type: 'authentication' })
  }
}

class RateLimitError extends MCPError {
  constructor(message: string) {
    super(-32002, message, { type: 'rate_limit' })
  }
}
```

## CORS Configuration

The middleware automatically handles CORS for cross-origin requests:

```typescript
// Default CORS headers
const defaultCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400'
}

// Custom CORS configuration
const middleware = middyMCP({
  server: mcpServer,
  corsOrigin: 'https://myapp.com',
  corsHeaders: {
    'Access-Control-Allow-Credentials': 'true'
  }
})
```

## Logging and Monitoring

### Request/Response Logging

```typescript
const middleware = middyMCP({
  server: mcpServer,
  enableLogging: true,
  logLevel: 'debug',
  logRequest: true,
  logResponse: true,
  redactSensitive: true  // Redact sensitive data
})
```

### CloudWatch Integration

The middleware automatically logs to CloudWatch when running in Lambda:

```typescript
// Structured logging for CloudWatch
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'INFO',
  message: 'MCP request processed',
  requestId: context.awsRequestId,
  method: request.method,
  duration: processingTime
}))
```

## Security

### Input Validation

All requests are validated before processing:

```typescript
// Request validation
const validateRequest = (body: string): MCPRequest => {
  try {
    const request = JSON.parse(body)
    
    if (!request.jsonrpc || request.jsonrpc !== '2.0') {
      throw new MCPError(-32600, 'Invalid Request: missing or invalid jsonrpc')
    }
    
    if (!request.method) {
      throw new MCPError(-32600, 'Invalid Request: missing method')
    }
    
    return request
  } catch (error) {
    throw new MCPError(-32700, 'Parse error')
  }
}
```

### Rate Limiting

Implement rate limiting using API Gateway or custom middleware:

```typescript
import rateLimit from 'express-rate-limit'

const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
})
```

## Examples

### Complete Lambda Function

```typescript
import { middyMCP, middyQCClient } from '@fschaeffler/mcp-middy'
import { QCMCPServer } from '@fschaeffler/quant-connect-mcp'
import middy from '@middy/core'
import httpErrorHandler from '@middy/http-error-handler'
import cors from '@middy/http-cors'

export const handler = middy()
  .use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
    credentials: true
  }))
  .use(middyQCClient({
    userIdSecretName: process.env.QC_USER_ID_SECRET,
    apiTokenSecretName: process.env.QC_API_TOKEN_SECRET,
    region: process.env.AWS_REGION
  }))
  .use(middyMCP({
    server: QCMCPServer.getInstance(),
    enableLogging: process.env.NODE_ENV === 'development'
  }))
  .use(httpErrorHandler({
    logger: console
  }))
```

### Custom MCP Handler

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { middyMCP } from '@fschaeffler/mcp-middy'

// Create custom MCP server
const server = new McpServer({
  name: 'Custom MCP Server',
  version: '1.0.0'
}, {
  capabilities: {
    tools: {}
  }
})

// Register custom tools
server.registerTool('custom_tool', {
  description: 'A custom tool',
  inputSchema: {
    type: 'object',
    properties: {
      input: { type: 'string' }
    }
  }
}, async (params) => {
  return {
    content: [],
    structuredContent: { result: 'Custom response' }
  }
})

// Use with middleware
export const handler = middyMCP({
  server: server
})
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Local Testing

```bash
# Run with SAM CLI
sam local start-api

# Test with curl
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Dependencies

- **@middy/core**: Middy middleware framework
- **@modelcontextprotocol/sdk**: MCP protocol implementation
- **@aws-sdk/client-secrets-manager**: AWS Secrets Manager client
- **@fschaeffler/quant-connect-client**: QuantConnect API client

## Best Practices

1. **Error Handling**: Always use proper error middleware
2. **Logging**: Enable structured logging for production
3. **Security**: Validate all inputs and handle sensitive data carefully
4. **Performance**: Cache credentials and reuse connections
5. **Monitoring**: Implement health checks and metrics

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure proper CORS configuration for your domain
2. **Authentication**: Verify AWS Secrets Manager permissions
3. **Timeout**: Adjust timeout settings for long-running operations
4. **Memory**: Monitor Lambda memory usage for large responses

### Debug Mode

Enable debug logging:

```typescript
const middleware = middyMCP({
  server: mcpServer,
  enableLogging: true,
  logLevel: 'debug'
})
```

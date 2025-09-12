# QuantConnect MCP Local Service

Local HTTP server for development and testing without AWS infrastructure.

## Features

- Lambda simulation for local testing
- Environment variable configuration
- Hot reloading and CORS support
- Mimics API Gateway behavior

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Assistant  │───▶│   HTTP Server   │───▶│  Lambda Handler │
│   (Local Dev)   │    │   (Port 55555)  │    │   (Simulated)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                               ┌─────────────────┐
                                               │  MCP Server     │
                                               │  (QuantConnect) │
                                               └─────────────────┘
                                                       │
                                               ┌─────────────────┐
                                               │ QuantConnect API│
                                               └─────────────────┘
```

## Quick Start

### Prerequisites
1. **Node.js 18+**: Required for the development server
2. **QuantConnect Account**: With API access enabled
3. **Environment Variables**: QuantConnect credentials

### Setup

1. **Install dependencies**:
   ```bash
   cd services/quant-connect-local
   npm ci
   ```

2. **Configure environment**:
   ```bash
   # Create .env file
   echo "QC_USER_ID=your-user-id" > .env
   echo "QC_API_TOKEN=your-api-token" >> .env
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

4. **Test the connection**:
   ```bash
   curl -X POST http://localhost:55555/mcp \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
   ```

## Server Configuration

### Default Settings
- **Host**: `0.0.0.0` (all interfaces)
- **Port**: `55555`
- **Protocol**: HTTP (no TLS in development)
- **Endpoint**: `/mcp`

### Environment Variables

Create a `.env` file in the service directory:

```bash
# QuantConnect API Credentials
QC_USER_ID=your-quantconnect-user-id
QC_API_TOKEN=your-quantconnect-api-token

# Optional: Server Configuration
PORT=55555
HOST=0.0.0.0
NODE_ENV=development
DEBUG=true
LOG_LEVEL=debug
```

### Advanced Configuration

```typescript
// Custom server configuration
const serverConfig = {
  port: process.env.PORT || 55555,
  host: process.env.HOST || '0.0.0.0',
  timeout: 30000,
  keepAliveTimeout: 5000,
  headersTimeout: 60000,
  maxHeaderSize: 8192
}
```

## API Compatibility

The local server provides the same API interface as the AWS Lambda service:

### Endpoint
```
http://localhost:55555/mcp
```

### Request Format
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "create_project",
    "arguments": {
      "name": "Local Test Project",
      "language": "Python"
    }
  }
}
```

### Response Format
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [],
    "structuredContent": {
      "projectId": 12345,
      "name": "Local Test Project",
      "language": "Python"
    }
  }
}
```

## Development Workflow

### Testing MCP Tools

```bash
# Test health check
curl -X POST http://localhost:55555/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"read_infra_health"}'

# Test project creation
curl -X POST http://localhost:55555/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "create_project",
      "arguments": {
        "name": "My Algorithm",
        "language": "Python"
      }
    }
  }'

# Test tool listing
curl -X POST http://localhost:55555/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/list"}'
```

### Hot Reloading

For development with file watching:

```bash
# Install nodemon globally
npm install -g nodemon

# Start with hot reloading
nodemon --watch src --ext ts,js --exec "npm start"
```

### Debug Mode

Enable detailed logging:

```bash
# Set debug environment
DEBUG=* npm start

# Or specific debug patterns
DEBUG=quant-connect:* npm start
```

## Lambda Environment Simulation

The local server simulates AWS Lambda environment:

### Event Transformation
```typescript
const toApiGwV2Event = (req: http.IncomingMessage, body: string): APIGatewayProxyEventV2 => {
  return {
    version: '2.0',
    routeKey: `${req.method} ${url.pathname}`,
    rawPath: url.pathname,
    headers: Object.fromEntries(
      Object.entries(req.headers).map(([k, v]) => [k, String(v)])
    ),
    requestContext: {
      // Simulated Lambda request context
      accountId: '123456789012',
      apiId: 'local',
      domainName: 'localhost',
      // ... additional context
    },
    body: body || undefined,
    isBase64Encoded: false
  }
}
```

### Context Simulation
```typescript
const getApiGwV2DefaultContext = () => ({
  functionName: 'local',
  functionVersion: '$LATEST',
  invokedFunctionArn: 'arn:aws:lambda:local:000000000000:function:local',
  memoryLimitInMB: '128',
  awsRequestId: 'local-' + Date.now(),
  getRemainingTimeInMillis: () => 10000,
  // ... additional Lambda context
})
```

## Error Handling

### HTTP Error Responses
```typescript
// Error response format
{
  statusCode: 500,
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'InternalServerError',
    message: 'Detailed error message',
    stack: 'Error stack trace (in development)',
    cause: 'Root cause information'
  })
}
```

### Common Error Scenarios

1. **Invalid JSON**:
   ```json
   {
     "jsonrpc": "2.0",
     "id": 1,
     "error": {
       "code": -32700,
       "message": "Parse error"
     }
   }
   ```

2. **Method Not Found**:
   ```json
   {
     "jsonrpc": "2.0",
     "id": 1,
     "error": {
       "code": -32601,
       "message": "Method not found"
     }
   }
   ```

3. **Invalid Parameters**:
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

## CORS Configuration

The server automatically handles CORS for web development:

```typescript
// Default CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
}

// Preflight OPTIONS request handling
if (req.method === 'OPTIONS') {
  res.writeHead(200, corsHeaders)
  res.end()
  return
}
```

## Testing

### Unit Testing
```bash
npm test
```

### Integration Testing
```typescript
import { handler } from '../src/index'
import { APIGatewayProxyEventV2 } from 'aws-lambda'

describe('Local Service', () => {
  it('should handle MCP requests', async () => {
    const event: APIGatewayProxyEventV2 = {
      version: '2.0',
      routeKey: 'POST /mcp',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list'
      }),
      headers: {
        'content-type': 'application/json'
      },
      requestContext: {
        // Mock request context
      }
    }
    
    const response = await handler(event, mockContext, mockCallback)
    expect(response.statusCode).toBe(200)
  })
})
```

### Load Testing
```bash
# Install artillery for load testing
npm install -g artillery

# Create artillery config
cat > load-test.yml << EOF
config:
  target: 'http://localhost:55555'
  phases:
    - duration: 60
      arrivalRate: 10

scenarios:
  - name: "MCP Health Check"
    requests:
      - post:
          url: "/mcp"
          json:
            jsonrpc: "2.0"
            id: 1
            method: "read_infra_health"
EOF

# Run load test
artillery run load-test.yml
```

## Performance Monitoring

### Request Timing
```typescript
const startTime = Date.now()

// Process request
const result = await handler(event, context)

const duration = Date.now() - startTime
console.log(`Request processed in ${duration}ms`)
```

### Memory Monitoring
```typescript
const memUsage = process.memoryUsage()
console.log('Memory usage:', {
  rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
  heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
  heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
  external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
})
```

## Security Considerations

### Development Only
⚠️ **WARNING**: This service is for development only and should never be used in production:

- No authentication or authorization
- No rate limiting
- No input sanitization beyond basic validation
- No HTTPS/TLS encryption
- Debug information exposed in responses

### Safe Development Practices

1. **Network Isolation**: Run on localhost only for sensitive testing
2. **Environment Separation**: Use test QuantConnect accounts
3. **Credential Management**: Use environment variables, never commit secrets
4. **Access Control**: Restrict network access to development machines

## Troubleshooting

### Common Issues

1. **Port Already in Use**:
   ```bash
   # Find process using port 55555
   lsof -i :55555
   
   # Kill the process
   kill -9 <PID>
   
   # Or use a different port
   PORT=55556 npm start
   ```

2. **QuantConnect Authentication**:
   ```bash
   # Verify credentials
   echo $QC_USER_ID
   echo $QC_API_TOKEN
   
   # Test direct API access
   curl -X GET "https://www.quantconnect.com/api/v2/projects" \
     -H "Authorization: Basic $(echo -n $QC_USER_ID:$QC_API_TOKEN | base64)"
   ```

3. **CORS Issues**:
   ```bash
   # Test preflight request
   curl -X OPTIONS http://localhost:55555/mcp \
     -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type"
   ```

4. **Memory Issues**:
   ```bash
   # Increase Node.js memory limit
   NODE_OPTIONS="--max-old-space-size=4096" npm start
   ```

### Debug Output

Enable verbose logging:

```bash
# Full debug output
DEBUG=* npm start

# QuantConnect-specific debug
DEBUG=quant-connect:* npm start

# HTTP request/response debug
DEBUG=http:* npm start
```

## Configuration Reference

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `QC_USER_ID` | QuantConnect user ID | - | Yes |
| `QC_API_TOKEN` | QuantConnect API token | - | Yes |
| `PORT` | Server port | 55555 | No |
| `HOST` | Server host | 0.0.0.0 | No |
| `NODE_ENV` | Environment mode | development | No |
| `DEBUG` | Debug patterns | - | No |
| `LOG_LEVEL` | Logging level | info | No |

### Package Scripts

```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.ts",
    "build": "tsc",
    "test": "jest",
    "lint": "eslint src/",
    "clean": "rm -rf dist/"
  }
}
```

## Differences from Production

### Lambda Service vs Local Service

| Feature | Lambda Service | Local Service |
|---------|----------------|---------------|
| **Authentication** | API Gateway + API Key | None |
| **HTTPS** | Required | HTTP only |
| **Scaling** | Auto-scaling | Single process |
| **Cold Start** | 2-3 seconds | Immediate |
| **Memory** | 1024MB limit | System memory |
| **Timeout** | 30 seconds | Configurable |
| **Secrets** | AWS Secrets Manager | Environment variables |
| **Monitoring** | CloudWatch | Console logs |
| **CORS** | API Gateway config | Built-in middleware |

### Migration to Production

When moving from local to production:

1. **Deploy infrastructure**: Run CDK deployment
2. **Configure secrets**: Set up AWS Secrets Manager
3. **Update endpoints**: Change from localhost to API Gateway URL
4. **Add API keys**: Configure authentication
5. **Enable monitoring**: Set up CloudWatch alarms
6. **Test thoroughly**: Validate all functionality in production environment

## Contributing

When developing with the local service:

1. **Use consistent formatting**: Follow project ESLint/Prettier config
2. **Test locally first**: Validate changes before deploying to AWS
3. **Document changes**: Update README for configuration changes
4. **Monitor performance**: Check for memory leaks or performance regressions
5. **Security awareness**: Never commit credentials or sensitive data

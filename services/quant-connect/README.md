# QuantConnect MCP Lambda Service

AWS Lambda deployment of QuantConnect MCP server with API Gateway.

## Features

- Serverless deployment with API key authentication
- Middy middleware for error handling and CORS
- AWS Secrets Manager integration
- CloudWatch logging and monitoring

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Assistant  │───▶│   API Gateway   │───▶│  Lambda Handler │
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

## Deployment

The service is deployed as part of the CDK infrastructure stack:

```typescript
// Automatically deployed via CDK
const handler = new NodejsFunction(this, 'qc-mcp-lambda-handler', {
  entry: path.join('services', 'quant-connect', 'src', 'index.ts'),
  handler: 'handler',
  runtime: Runtime.NODEJS_22_X,
  memorySize: 1024,
  timeout: Duration.seconds(30)
})
```

## Handler Implementation

```typescript
import { middyMCP, middyQCClient } from '@fschaeffler/mcp-middy'
import { QCMCPServer } from '@fschaeffler/quant-connect-mcp'
import middy from '@middy/core'
import httpErrorHandler from '@middy/http-error-handler'

export const handler = middy()
  .use(middyQCClient())           // Initialize QuantConnect client
  .use(middyMCP({                 // Setup MCP server
    server: QCMCPServer.getInstance()
  }))
  .use(httpErrorHandler())        // Handle errors gracefully
```

## API Endpoint

### Base URL
The service is deployed with API Gateway providing a REST endpoint:

```
https://{api-id}.execute-api.{region}.amazonaws.com/prod/mcp
```

### Authentication
API key authentication is required for all requests:

```bash
curl -X POST https://api-gateway-url/prod/mcp \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### Supported HTTP Methods

- **POST**: MCP JSON-RPC requests
- **OPTIONS**: CORS preflight requests
- **GET**: Returns 405 with helpful error message (SSE not supported)

## Request/Response Format

### MCP Request
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "create_project",
    "arguments": {
      "name": "My Trading Algorithm",
      "language": "Python"
    }
  }
}
```

### MCP Response
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [],
    "structuredContent": {
      "projectId": 12345,
      "name": "My Trading Algorithm",
      "language": "Python",
      "created": "2023-12-01T10:30:00Z"
    }
  }
}
```

### Error Response
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

## Environment Configuration

### AWS Secrets Manager
The service automatically retrieves QuantConnect credentials from AWS Secrets Manager:

- **Secret Name**: `quant-connect-mcp/user-id`
  - **Value**: Your QuantConnect user ID
- **Secret Name**: `quant-connect-mcp/api-token`
  - **Value**: Your QuantConnect API token

### Lambda Environment Variables
Standard AWS Lambda environment variables are available:

- `AWS_REGION`: AWS region
- `AWS_LAMBDA_FUNCTION_NAME`: Function name
- `AWS_LAMBDA_FUNCTION_VERSION`: Function version
- `AWS_REQUEST_ID`: Request identifier (per invocation)

## Performance Characteristics

### Cold Start
- **Initial**: ~2-3 seconds (includes dependency loading)
- **Subsequent**: ~500ms (Lambda reuse)

### Memory Usage
- **Configured**: 1024MB
- **Typical Usage**: 150-300MB
- **Peak Usage**: 400-500MB (large backtests)

### Timeout
- **Configured**: 30 seconds
- **Typical Response**: 1-5 seconds
- **Long Operations**: 10-25 seconds (optimization, large backtests)

## Monitoring and Logging

### CloudWatch Logs
All requests and responses are logged to CloudWatch:

```json
{
  "timestamp": "2023-12-01T10:30:00.000Z",
  "level": "INFO",
  "requestId": "12345678-1234-1234-1234-123456789012",
  "message": "MCP request processed",
  "method": "create_project",
  "duration": 1250,
  "success": true
}
```

### CloudWatch Metrics
Key metrics are automatically tracked:

- **Invocations**: Total function invocations
- **Duration**: Request processing time
- **Errors**: Error count and rate
- **Throttles**: Concurrent execution limits
- **Memory**: Memory utilization

### Custom Metrics
Additional metrics can be added:

```typescript
import { CloudWatchMetrics } from 'aws-lambda-middleware'

// Track custom business metrics
await putMetric('QuantConnect.Projects.Created', 1)
await putMetric('QuantConnect.Backtests.Started', 1)
```

## Error Handling

### HTTP Status Codes
- **200**: Successful MCP response
- **400**: Invalid JSON-RPC request
- **401**: Missing or invalid API key
- **404**: Method not found
- **405**: Method not allowed (GET requests)
- **429**: Rate limit exceeded
- **500**: Internal server error

### Error Categories

1. **Client Errors** (4xx):
   - Invalid JSON syntax
   - Missing required parameters
   - Invalid tool names
   - Authentication failures

2. **Server Errors** (5xx):
   - QuantConnect API errors
   - Lambda function errors
   - Timeout exceptions
   - Memory limitations

3. **MCP Protocol Errors**:
   - Invalid JSON-RPC format
   - Unsupported methods
   - Parameter validation failures

## Security

### API Gateway Security
- **API Key Authentication**: Required for all requests
- **Usage Plans**: Rate limiting and quotas
- **CORS Configuration**: Controlled cross-origin access
- **Request Validation**: Input schema validation

### Lambda Security
- **IAM Roles**: Minimal required permissions
- **VPC Configuration**: Optional VPC deployment
- **Secrets Manager**: Encrypted credential storage
- **Environment Encryption**: KMS encryption for environment variables

### Data Protection
- **In Transit**: HTTPS/TLS encryption
- **At Rest**: Encrypted secrets and logs
- **Logging**: No sensitive data in logs
- **Temporary Data**: Minimal data retention

## Scalability

### Concurrent Executions
- **Default**: 1000 concurrent executions
- **Burst**: Up to 3000 concurrent executions
- **Reserved**: Can configure reserved concurrency

### Auto Scaling
- **Automatic**: AWS Lambda handles scaling
- **Warm-up**: Optional provisioned concurrency
- **Regional**: Multi-region deployment supported

### Performance Optimization
- **Connection Pooling**: HTTP client reuse
- **Credential Caching**: Secrets cached per Lambda execution
- **Memory Allocation**: Optimized for workload
- **Cold Start Reduction**: Provisioned concurrency available

## Cost Optimization

### Pricing Factors
- **Requests**: $0.20 per 1M requests
- **Duration**: $0.0000166667 per GB-second
- **API Gateway**: $3.50 per million API calls
- **Data Transfer**: Standard AWS data transfer rates

### Cost Optimization Strategies
1. **Right-sizing**: Optimize memory allocation
2. **Caching**: Reduce redundant QuantConnect API calls
3. **Batching**: Group multiple operations
4. **Provisioned Concurrency**: For predictable workloads

## Deployment

### Via CDK (Recommended)
```bash
cd infra
npm run deploy
```

### Manual Deployment
```bash
# Package the function
npm run build
zip -r function.zip dist/

# Deploy via AWS CLI
aws lambda update-function-code \
  --function-name qc-mcp-lambda-handler \
  --zip-file fileb://function.zip
```

### CI/CD Pipeline
Example GitHub Actions workflow:

```yaml
name: Deploy Lambda
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run deploy
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## Testing

### Local Testing
Use AWS SAM for local testing:

```bash
# Start local API
sam local start-api

# Test endpoint
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### End-to-End Testing

Test against deployed AWS infrastructure:

```bash
# Set up environment
export QUANT_CONNECT_MCP_URL="https://your-api-gateway-url/prod/mcp"
export QUANT_CONNECT_MCP_API_GATEWAY_API_KEY="your-api-key"

# Run E2E tests
cd ../../e2e
npm run test:e2e
```

E2E tests validate:
- API Gateway authentication with `x-api-key` header
- Lambda function execution and performance
- MCP protocol compliance including notification handling
- Complete tool functionality

### Integration Testing
```typescript
import { handler } from '../src/index'

describe('Lambda Handler', () => {
  it('should handle MCP requests', async () => {
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list'
      }),
      headers: { 'x-api-key': 'test-key' }
    }
    
    const response = await handler(event, {}, () => {})
    expect(response.statusCode).toBe(200)
  })
})
```

## Troubleshooting

### Common Issues

1. **Cold Start Timeouts**:
   - Increase memory allocation
   - Consider provisioned concurrency
   - Optimize initialization code

2. **Authentication Errors**:
   - Verify API key configuration
   - Check Secrets Manager permissions
   - Validate QuantConnect credentials

3. **Memory Errors**:
   - Monitor CloudWatch memory metrics
   - Increase memory allocation
   - Optimize data processing

4. **Rate Limiting**:
   - Implement exponential backoff
   - Monitor API Gateway quotas
   - Cache QuantConnect responses

### Debug Mode
Enable debug logging:

```typescript
process.env.DEBUG = 'true'
process.env.LOG_LEVEL = 'debug'
```

### Health Checks
The service includes health check endpoints:

```bash
# Check service health
curl -X POST https://api-gateway-url/prod/mcp \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"read_infra_health"}'
```

## Maintenance

### Updates
1. Update dependencies in `package.json`
2. Test changes locally with SAM
3. Deploy via CDK
4. Monitor CloudWatch metrics
5. Validate functionality

### Monitoring
Set up CloudWatch alarms for:
- Error rate > 5%
- Duration > 25 seconds
- Memory utilization > 80%
- Invocation count thresholds

### Backup and Recovery
- **Code**: Stored in version control
- **Configuration**: Defined in CDK
- **Secrets**: Backed up in Secrets Manager
- **Logs**: Retained according to policy

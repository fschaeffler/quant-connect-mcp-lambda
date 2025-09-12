# End-to-End Tests

Comprehensive E2E tests for the QuantConnect MCP Server deployed on AWS infrastructure.

## Overview

These tests validate the complete deployment stack:
- AWS API Gateway authentication
- Lambda function execution
- MCP protocol compliance
- QuantConnect API integration
- Real-world performance and reliability

## Prerequisites

### Environment Variables

Create an `.env` file in the `e2e/` directory:

```bash
# AWS API Gateway endpoint
QUANT_CONNECT_MCP_URL=https://your-api-gateway-id.execute-api.region.amazonaws.com/prod/mcp

# API Gateway API key for authentication
QUANT_CONNECT_MCP_API_GATEWAY_API_KEY=your-api-gateway-key
```

### Deployed Infrastructure

E2E tests require the MCP server to be deployed to AWS:

1. **Deploy the infrastructure**:
   ```bash
   cd infra && npm run deploy
   ```

2. **Configure API Gateway**: Ensure API key is properly set up

3. **Verify deployment**:
   ```bash
   curl -X POST "https://your-api-gateway-url/prod/mcp" \
     -H "x-api-key: your-api-key" \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":"test","method":"tools/call","params":{"name":"read_infra_health"}}'
   ```

## Test Categories

### Server Health Tests (`mcp-server.test.ts`)

Validates basic server functionality and MCP protocol compliance:

- **Connection**: MCP client can connect to deployed server
- **Health Check**: `read_infra_health` tool returns `{ healthStatus: 'ok' }`
- **Tool Discovery**: Server exposes 50+ tools via `tools/list`
- **Version Info**: Server returns version information
- **Performance**: Response times under 5 seconds
- **Concurrency**: Multiple simultaneous requests work correctly

### Project Lifecycle Tests (`project.test.ts`)

Tests complete project management workflow:

- **Create Project**: Creates new QuantConnect project
- **List Projects**: Finds created project in project list
- **Read Project**: Retrieves project details
- **Update Project**: Modifies project properties
- **Delete Project**: Removes project and verifies deletion

### File Operations Tests (`file.test.ts`)

Validates file management within projects:

- **Create Files**: Add algorithm files to projects
- **Read Files**: Retrieve file contents
- **Update Files**: Modify file contents
- **Delete Files**: Remove files from projects
- **File Listing**: Enumerate project files

### Backtest Tests (`backtest.test.ts`)

Tests algorithm backtesting workflow:

- **Create Backtest**: Start historical simulation
- **Monitor Progress**: Check backtest status
- **Read Results**: Retrieve backtest data
- **Performance Metrics**: Validate result structure

## Running Tests

### All E2E Tests

```bash
cd e2e
npm run test:e2e
```

### Specific Test Suites

```bash
# Health checks only
npm test -- mcp-server.test.ts

# Project lifecycle
npm test -- project.test.ts

# File operations
npm test -- file.test.ts

# Backtesting
npm test -- backtest.test.ts
```

### Debug Mode

Enable verbose logging:

```bash
# Enable debug output
DEBUG=* npm run test:e2e

# Or with Jest verbose
npm test -- --verbose
```

## Test Configuration

### Jest Configuration

```typescript
// jest.config.ts
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['dotenv/config'],
  testTimeout: 30000, // 30 second timeout for E2E tests
  collectCoverageFrom: ['src/**/*.ts'],
}
```

### Environment Loading

Tests automatically load environment variables from:
1. `e2e/.env` (local development)
2. System environment variables (CI/CD)

### Timeouts

E2E tests use extended timeouts for real network operations:

- **Connection**: 30 seconds
- **Tool calls**: 10 seconds (default)
- **External API calls**: 15 seconds (npm registry, etc.)
- **Workflow tests**: 60 seconds (full project lifecycle)

## MCP Client Integration

### Authentication

Tests use AWS API Gateway authentication:

```typescript
const transport = new StreamableHTTPClientTransport(new URL(mcpServerURL), {
  requestInit: {
    headers: {
      'x-api-key': mcpServerAPIGatewayAPIKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  },
})
```

### Protocol Support

Tests validate full MCP protocol compliance:

- **Initialize handshake**: Client connects with server capabilities
- **Tool discovery**: `tools/list` returns all available tools
- **Tool execution**: `tools/call` executes tools with parameters
- **Notifications**: Proper handling of `notifications/initialized`
- **Error handling**: Invalid requests return proper error responses

## Troubleshooting

### Common Issues

#### Connection Failures

```bash
# Test basic connectivity
curl -X POST "$QUANT_CONNECT_MCP_URL" \
  -H "x-api-key: $QUANT_CONNECT_MCP_API_GATEWAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"test","method":"tools/call","params":{"name":"read_infra_health"}}'

# Expected: HTTP 200 with health status response
```

#### Environment Variables

```bash
# Verify environment variables are set
echo "URL: $QUANT_CONNECT_MCP_URL"
echo "API Key: ${QUANT_CONNECT_MCP_API_GATEWAY_API_KEY:0:10}..." # Show first 10 chars
```

#### API Gateway Issues

1. **HTTP 403**: API key is invalid or missing
2. **HTTP 502**: Lambda function error (check CloudWatch logs)
3. **HTTP 504**: Lambda timeout (increase timeout or optimize code)

#### Lambda Cold Starts

First requests may be slower due to Lambda cold starts:

```bash
# Warm up the Lambda function
curl -X POST "$QUANT_CONNECT_MCP_URL" \
  -H "x-api-key: $QUANT_CONNECT_MCP_API_GATEWAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"warmup","method":"tools/call","params":{"name":"read_infra_health"}}'
```

### Debug Steps

1. **Verify deployment**: Check AWS CloudFormation stack status
2. **Check logs**: Review CloudWatch logs for Lambda function
3. **Test connectivity**: Use curl to test basic HTTP connectivity
4. **Validate credentials**: Ensure API key and QuantConnect credentials are correct
5. **Check timeouts**: Increase test timeouts if needed

## Best Practices

1. **Test Independence**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up created resources (projects, files, etc.)
3. **Timeouts**: Use appropriate timeouts for network operations
4. **Error Handling**: Test both success and failure scenarios
5. **Performance**: Include performance assertions for critical operations
6. **Real Data**: Use real API calls but clean up test data
7. **Environment Isolation**: Tests should work in any AWS region/environment

The E2E tests provide confidence that the deployed MCP server works correctly in real-world scenarios with actual AWS infrastructure and QuantConnect API integration.

# QuantConnect Client Library

Type-safe HTTP client for QuantConnect API with authentication and error handling.

## Features

- TypeScript support with generated types
- Automatic authentication and rate limiting
- Date parsing and connection pooling
- Comprehensive error mapping

## Architecture

```
src/
├── index.ts              # Main client class and exports
└── date-time-parser.ts   # Date/time utilities
```

## Usage

### Basic Setup

```typescript
import { QCClient } from '@fschaeffler/quant-connect-client'

// Get the singleton client instance
const client = QCClient.getInstance()

// Make API requests
const projects = await client.get('/api/v2/projects')
const project = await client.post('/api/v2/projects', {
  name: 'My Algorithm',
  language: 'Python'
})
```

### Authentication

The client handles authentication automatically using environment variables or AWS Secrets Manager:

```typescript
// For local development
process.env.QC_USER_ID = 'your-user-id'
process.env.QC_API_TOKEN = 'your-api-token'

// For AWS Lambda (handled automatically)
// Secrets are read from AWS Secrets Manager:
// - quant-connect-mcp/user-id
// - quant-connect-mcp/api-token
```

### HTTP Methods

```typescript
// GET requests
const projects = await client.get<Project[]>('/api/v2/projects')

// POST requests with data
const newProject = await client.post<Project>('/api/v2/projects', {
  name: 'Strategy Name',
  language: 'Python'
})

// PUT requests for updates
const updatedProject = await client.put<Project>(`/api/v2/projects/${id}`, {
  name: 'Updated Name'
})

// DELETE requests
await client.delete(`/api/v2/projects/${id}`)
```

### Type Safety

The client integrates with the QuantConnect types library:

```typescript
import { Project, Backtest } from '@fschaeffler/quant-connect-types'

// Type-safe responses
const project: Project = await client.get(`/api/v2/projects/${id}`)
const backtests: Backtest[] = await client.get(`/api/v2/projects/${id}/backtests`)

// Type-safe requests
const newBacktest: Backtest = await client.post('/api/v2/backtests', {
  projectId: id,
  name: 'Test Run'
})
```

## Date/Time Handling

The library includes utilities for parsing QuantConnect's date/time formats:

```typescript
import { parseDateTime, formatDateTime } from '@fschaeffler/quant-connect-client'

// Parse various date formats
const date1 = parseDateTime('2023-12-01T10:30:00') // ISO format
const date2 = parseDateTime('12/01/2023 10:30:00') // US format
const date3 = parseDateTime('2023-12-01 10:30:00') // Alternative format

// Format dates for API requests
const formatted = formatDateTime(new Date()) // ISO format string
```

### Supported Date Formats

The parser handles multiple QuantConnect date formats:

- ISO 8601: `2023-12-01T10:30:00.000Z`
- US Format: `12/01/2023 10:30:00 AM`
- Alternative: `2023-12-01 10:30:00`
- Date Only: `2023-12-01`
- Time Only: `10:30:00`

## Error Handling

The client provides comprehensive error handling:

```typescript
import { QCAPIError } from '@fschaeffler/quant-connect-client'

try {
  const project = await client.get(`/api/v2/projects/${invalidId}`)
} catch (error) {
  if (error instanceof QCAPIError) {
    console.error('API Error:', error.message)
    console.error('Status Code:', error.statusCode)
    console.error('Response:', error.response)
  } else {
    console.error('Network Error:', error.message)
  }
}
```

### Error Types

- **QCAPIError**: QuantConnect API returned an error response
- **NetworkError**: Network or connection issues
- **AuthenticationError**: Invalid credentials or expired tokens
- **RateLimitError**: API rate limit exceeded
- **ValidationError**: Request data validation failed

## Advanced Features

### Request Interceptors

```typescript
// Add custom headers or modify requests
client.addRequestInterceptor((config) => {
  config.headers['Custom-Header'] = 'value'
  return config
})
```

### Response Interceptors

```typescript
// Transform responses or handle errors globally
client.addResponseInterceptor(
  (response) => {
    // Transform successful responses
    return response
  },
  (error) => {
    // Handle errors globally
    console.error('Global error handler:', error)
    throw error
  }
)
```

### Timeout Configuration

```typescript
// Set request timeout (default: 30 seconds)
client.setTimeout(60000) // 60 seconds
```

### Retry Logic

```typescript
// Configure automatic retries for failed requests
client.setRetryConfig({
  retries: 3,
  retryDelay: 1000, // ms
  retryCondition: (error) => error.statusCode >= 500
})
```

## Authentication Methods

### Environment Variables (Local Development)

```bash
export QC_USER_ID="your-user-id"
export QC_API_TOKEN="your-api-token"
```

### AWS Secrets Manager (Production)

The client automatically retrieves credentials from AWS Secrets Manager when running in AWS Lambda:

```json
{
  "quant-connect-mcp/user-id": "your-user-id",
  "quant-connect-mcp/api-token": "your-api-token"
}
```

### Manual Configuration

```typescript
// Set credentials programmatically
client.setCredentials({
  userId: 'your-user-id',
  apiToken: 'your-api-token'
})
```

## Configuration

### Default Configuration

```typescript
const defaultConfig = {
  baseURL: 'https://www.quantconnect.com',
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'QuantConnect-MCP-Client/1.0.0'
  }
}
```

### Custom Configuration

```typescript
// Override default configuration
client.configure({
  baseURL: 'https://custom-endpoint.com',
  timeout: 60000,
  headers: {
    'Custom-Header': 'value'
  }
})
```

## Examples

### Project Management

```typescript
// List all projects
const projects = await client.get<Project[]>('/api/v2/projects')

// Create a new project
const newProject = await client.post<Project>('/api/v2/projects', {
  name: 'Trading Strategy',
  language: 'Python',
  description: 'My trading algorithm'
})

// Get project details
const project = await client.get<Project>(`/api/v2/projects/${newProject.projectId}`)

// Update project
const updated = await client.put<Project>(`/api/v2/projects/${project.projectId}`, {
  name: 'Updated Strategy Name'
})

// Delete project
await client.delete(`/api/v2/projects/${project.projectId}`)
```

### Backtest Operations

```typescript
// Start a backtest
const backtest = await client.post<Backtest>('/api/v2/backtests', {
  projectId: project.projectId,
  name: 'Strategy Test',
  note: 'Initial backtest'
})

// Check backtest status
const status = await client.get<Backtest>(`/api/v2/backtests/${backtest.backtestId}`)

// Get backtest results
if (status.completed) {
  const results = await client.get(`/api/v2/backtests/${backtest.backtestId}/report`)
}
```

### File Operations

```typescript
// List project files
const files = await client.get<ProjectFile[]>(`/api/v2/projects/${projectId}/files`)

// Read file content
const file = await client.get<ProjectFile>(`/api/v2/files/${fileId}`)

// Create/update file
const newFile = await client.post<ProjectFile>('/api/v2/files', {
  projectId: projectId,
  name: 'algorithm.py',
  content: 'class MyAlgorithm(QCAlgorithm):\n    pass'
})
```

## Dependencies

- **HTTP Client**: Built on modern fetch API
- **Type Safety**: Integrates with `@fschaeffler/quant-connect-types`
- **Date Parsing**: Custom date/time utilities
- **AWS SDK**: For Secrets Manager integration (in Lambda environment)

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Type Checking

```bash
npm run type-check
```

## Best Practices

1. **Use the Singleton**: Always use `QCClient.getInstance()` for connection pooling
2. **Handle Errors**: Always wrap API calls in try-catch blocks
3. **Type Everything**: Use TypeScript types for all requests and responses
4. **Respect Rate Limits**: The client handles this automatically, but be mindful
5. **Secure Credentials**: Never hardcode API tokens, use environment variables or secrets

## Troubleshooting

### Common Issues

1. **Authentication Errors**:
   - Verify user ID and API token are correct
   - Check if credentials are properly set in environment or secrets

2. **Network Timeouts**:
   - Increase timeout configuration
   - Check network connectivity to QuantConnect

3. **Rate Limiting**:
   - The client handles retries automatically
   - Consider implementing backoff strategies for high-volume usage

4. **Date Parsing Errors**:
   - Check date format from API responses
   - Use the provided date utilities for consistency

### Debug Mode

Enable debug logging:

```typescript
client.setDebugMode(true)
```

This will log all requests and responses for troubleshooting.

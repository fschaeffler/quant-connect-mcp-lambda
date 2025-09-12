# QuantConnect MCP API Reference

Complete reference for all Model Context Protocol tools provided by the QuantConnect MCP server.

## Overview

The QuantConnect MCP server provides 50+ tools organized into logical categories for comprehensive algorithmic trading functionality. All tools follow the JSON-RPC 2.0 specification and provide type-safe interfaces.

## Tool Categories

- [MCP Server Tools](#mcp-server-tools) - Server health and version management
- [Project Tools](#project-tools) - Project creation and management
- [File Tools](#file-tools) - Source code file operations
- [Backtest Tools](#backtest-tools) - Historical simulation and analysis
- [Live Trading Tools](#live-trading-tools) - Live algorithm deployment and management
- [Compilation Tools](#compilation-tools) - Code compilation and validation
- [AI Tools](#ai-tools) - AI-powered code assistance
- [Optimization Tools](#optimization-tools) - Parameter optimization and tuning
- [Object Store Tools](#object-store-tools) - Data storage and management
- [Account Tools](#account-tools) - Account information and settings
- [Project Collaboration Tools](#project-collaboration-tools) - Team collaboration features
- [Project Node Tools](#project-node-tools) - Computing resource management
- [Lean Version Tools](#lean-version-tools) - Engine version management
- [Live Command Tools](#live-command-tools) - Live algorithm control

## Request Format

All tools use the standard MCP JSON-RPC format:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "tool_name",
    "arguments": {
      // Tool-specific parameters
    }
  }
}
```

## Response Format

All tools return responses in the standard MCP format:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [],
    "structuredContent": {
      // Tool-specific response data
    }
  }
}
```

## Tool Annotations

Each tool includes metadata annotations:

- **readOnlyHint**: Tool doesn't modify state (true/false)
- **destructiveHint**: Tool may delete or significantly modify data (true/false)
- **idempotentHint**: Multiple calls with same parameters produce same result (true/false)
- **openWorldHint**: Tool may access external resources (true/false)

---

## MCP Server Tools

System-level tools for server health and version management.

### read_infra_health

Check the health status of the MCP server.

**Method**: `read_infra_health`

**Parameters**: None

**Response**:
```typescript
{
  healthStatus: "ok"
}
```

**Annotations**: `readOnly: true, idempotent: true`

### read_mcp_server_version

Get the current MCP server version.

**Method**: `read_mcp_server_version`

**Parameters**: None

**Response**:
```typescript
{
  version: string // Current server version
}
```

**Annotations**: `readOnly: true, idempotent: true`

### read_latest_mcp_server_version

Get the latest available MCP server version.

**Method**: `read_latest_mcp_server_version`

**Parameters**: None

**Response**:
```typescript
{
  version: string // Latest available version
}
```

**Annotations**: `readOnly: true, idempotent: true`

---

## Project Tools

Tools for managing QuantConnect projects.

### create_project

Create a new project in your default organization.

**Method**: `create_project`

**Parameters**:
```typescript
{
  name: string           // Project name
  language?: "Py" | "C#" // Programming language (default: "Py")
  description?: string   // Project description
}
```

**Response**:
```typescript
{
  projectId: number      // Unique project identifier
  name: string          // Project name
  description?: string  // Project description
  language: "Py" | "C#" // Programming language
  created: Date         // Creation timestamp
  modified: Date        // Last modification timestamp
}
```

### read_project

Get details of a specific project.

**Method**: `read_project`

**Parameters**:
```typescript
{
  projectId: number // Project identifier
}
```

**Response**:
```typescript
{
  projectId: number
  name: string
  description?: string
  language: "Py" | "C#"
  created: Date
  modified: Date
  // Additional project metadata
}
```

**Annotations**: `readOnly: true`

### list_projects

List all projects with optional pagination.

**Method**: `list_projects`

**Parameters**:
```typescript
{
  start?: number // Starting index for pagination
  end?: number   // Ending index for pagination
}
```

**Response**:
```typescript
{
  projects: Array<{
    projectId: number
    name: string
    description?: string
    language: "Py" | "C#"
    created: Date
    modified: Date
  }>
  total: number // Total number of projects
}
```

**Annotations**: `readOnly: true`

### update_project

Update a project's name or description.

**Method**: `update_project`

**Parameters**:
```typescript
{
  projectId: number     // Project identifier
  name?: string        // New project name
  description?: string // New project description
}
```

**Response**:
```typescript
{
  projectId: number
  name: string
  description?: string
  // Updated project details
}
```

**Annotations**: `idempotent: true`

### delete_project

Delete a project permanently.

**Method**: `delete_project`

**Parameters**:
```typescript
{
  projectId: number // Project identifier
}
```

**Response**:
```typescript
{
  success: boolean // Deletion status
}
```

**Annotations**: `destructive: true`

---

## File Tools

Tools for managing project source files.

### create_file

Create a new file in a project.

**Method**: `create_file`

**Parameters**:
```typescript
{
  projectId: number // Project identifier
  name: string      // File name (e.g., "algorithm.py")
  content: string   // File content
}
```

**Response**:
```typescript
{
  name: string      // File name
  content: string   // File content
  modified: Date    // Last modification timestamp
}
```

### read_file

Read the contents of a project file.

**Method**: `read_file`

**Parameters**:
```typescript
{
  projectId: number // Project identifier
  name: string      // File name
}
```

**Response**:
```typescript
{
  name: string      // File name
  content: string   // File content
  modified: Date    // Last modification timestamp
}
```

**Annotations**: `readOnly: true`

### update_file_contents

Update the contents of an existing file.

**Method**: `update_file_contents`

**Parameters**:
```typescript
{
  projectId: number // Project identifier
  name: string      // File name
  content: string   // New file content
}
```

**Response**:
```typescript
{
  name: string      // File name
  content: string   // Updated content
  modified: Date    // Modification timestamp
}
```

### update_file_name

Rename an existing file.

**Method**: `update_file_name`

**Parameters**:
```typescript
{
  projectId: number // Project identifier
  name: string      // Current file name
  newName: string   // New file name
}
```

**Response**:
```typescript
{
  name: string      // New file name
  content: string   // File content
  modified: Date    // Modification timestamp
}
```

### delete_file

Delete a file from a project.

**Method**: `delete_file`

**Parameters**:
```typescript
{
  projectId: number // Project identifier
  name: string      // File name
}
```

**Response**:
```typescript
{
  success: boolean // Deletion status
}
```

**Annotations**: `destructive: true`

---

## Backtest Tools

Tools for historical simulation and analysis.

### create_backtest

Start a new backtest simulation.

**Method**: `create_backtest`

**Parameters**:
```typescript
{
  projectId: number   // Project identifier
  name: string        // Backtest name
  note?: string       // Optional description
}
```

**Response**:
```typescript
{
  backtestId: string  // Unique backtest identifier
  projectId: number   // Project identifier
  name: string        // Backtest name
  note?: string       // Description
  created: Date       // Creation timestamp
  progress: number    // Completion progress (0-1)
  status: string      // Current status
}
```

### read_backtest

Get detailed backtest results.

**Method**: `read_backtest`

**Parameters**:
```typescript
{
  projectId: number    // Project identifier
  backtestId: string   // Backtest identifier
}
```

**Response**:
```typescript
{
  backtestId: string
  projectId: number
  name: string
  created: Date
  completed?: Date
  progress: number
  status: string
  result?: {
    totalReturn: number
    sharpeRatio: number
    maxDrawdown: number
    // Additional performance metrics
  }
}
```

**Annotations**: `readOnly: true`

### list_backtests

List all backtests for a project.

**Method**: `list_backtests`

**Parameters**:
```typescript
{
  projectId: number // Project identifier
  start?: number    // Pagination start
  end?: number      // Pagination end
}
```

**Response**:
```typescript
{
  backtests: Array<{
    backtestId: string
    name: string
    created: Date
    completed?: Date
    progress: number
    status: string
  }>
  total: number
}
```

**Annotations**: `readOnly: true`

### read_backtest_chart

Get backtest chart data for visualization.

**Method**: `read_backtest_chart`

**Parameters**:
```typescript
{
  projectId: number    // Project identifier
  backtestId: string   // Backtest identifier
}
```

**Response**:
```typescript
{
  series: Array<{
    name: string        // Series name
    unit: string       // Data unit
    values: Array<{
      x: Date          // Timestamp
      y: number        // Value
    }>
  }>
}
```

**Annotations**: `readOnly: true`

### read_backtest_orders

Get order history from a backtest.

**Method**: `read_backtest_orders`

**Parameters**:
```typescript
{
  projectId: number    // Project identifier
  backtestId: string   // Backtest identifier
  start?: number       // Pagination start
  end?: number         // Pagination end
}
```

**Response**:
```typescript
{
  orders: Array<{
    symbol: string
    type: string
    quantity: number
    price: number
    time: Date
    status: string
  }>
  total: number
}
```

**Annotations**: `readOnly: true`

### delete_backtest

Delete a backtest and its results.

**Method**: `delete_backtest`

**Parameters**:
```typescript
{
  projectId: number    // Project identifier
  backtestId: string   // Backtest identifier
}
```

**Response**:
```typescript
{
  success: boolean
}
```

**Annotations**: `destructive: true`

---

## Live Trading Tools

Tools for deploying and managing live trading algorithms.

### create_live_algorithm

Deploy an algorithm for live trading.

**Method**: `create_live_algorithm`

**Parameters**:
```typescript
{
  projectId: number     // Project identifier
  compileId: string     // Compilation identifier
  brokerage: string     // Brokerage name
  dataHandler: string   // Data feed provider
  live: boolean         // Enable live trading (true for real money)
  // Additional brokerage-specific settings
}
```

**Response**:
```typescript
{
  projectId: number
  deployId: string      // Live deployment identifier
  status: "Running" | "Stopped" | "Error"
  launched: Date
  // Deployment details
}
```

### read_live_algorithm

Get live algorithm status and performance.

**Method**: `read_live_algorithm`

**Parameters**:
```typescript
{
  projectId: number    // Project identifier
  deployId: string     // Deployment identifier
}
```

**Response**:
```typescript
{
  projectId: number
  deployId: string
  status: string
  launched: Date
  stopped?: Date
  statistics: {
    totalReturn: number
    unrealizedProfit: number
    realizedProfit: number
    // Additional live performance metrics
  }
}
```

**Annotations**: `readOnly: true`

### list_live_algorithms

List all live algorithm deployments.

**Method**: `list_live_algorithms`

**Parameters**:
```typescript
{
  status?: string      // Filter by status
  start?: number       // Pagination start
  end?: number         // Pagination end
}
```

**Response**:
```typescript
{
  deployments: Array<{
    projectId: number
    deployId: string
    status: string
    launched: Date
    stopped?: Date
  }>
  total: number
}
```

**Annotations**: `readOnly: true`

### stop_live_algorithm

Stop a live trading algorithm.

**Method**: `stop_live_algorithm`

**Parameters**:
```typescript
{
  projectId: number    // Project identifier
  deployId: string     // Deployment identifier
}
```

**Response**:
```typescript
{
  projectId: number
  deployId: string
  status: "Stopped"
  stopped: Date
}
```

### liquidate_live_algorithm

Liquidate all positions and stop algorithm.

**Method**: `liquidate_live_algorithm`

**Parameters**:
```typescript
{
  projectId: number    // Project identifier
  deployId: string     // Deployment identifier
}
```

**Response**:
```typescript
{
  projectId: number
  deployId: string
  status: "Liquidated"
  liquidated: Date
  positions: Array<{
    symbol: string
    quantity: number
    liquidationPrice: number
  }>
}
```

**Annotations**: `destructive: true`

---

## Compilation Tools

Tools for code compilation and validation.

### create_compile

Compile project code for execution.

**Method**: `create_compile`

**Parameters**:
```typescript
{
  projectId: number    // Project identifier
}
```

**Response**:
```typescript
{
  compileId: string    // Compilation identifier
  state: "InQueue" | "Building" | "BuildSuccess" | "BuildError"
  logs: string         // Compilation logs
  errors?: Array<{
    line: number
    message: string
    file: string
  }>
}
```

### read_compile

Get compilation status and results.

**Method**: `read_compile`

**Parameters**:
```typescript
{
  projectId: number    // Project identifier
  compileId: string    // Compilation identifier
}
```

**Response**:
```typescript
{
  compileId: string
  state: string
  logs: string
  errors?: Array<{
    line: number
    message: string
    file: string
  }>
  completed?: Date
}
```

**Annotations**: `readOnly: true`

---

## AI Tools

AI-powered tools for code assistance and improvement.

### complete_code

Get AI-powered code completion suggestions.

**Method**: `complete_code`

**Parameters**:
```typescript
{
  line: string         // Current line of code
  code: string         // Full code context
  language: "python" | "csharp"
}
```

**Response**:
```typescript
{
  completions: Array<{
    text: string       // Completion text
    confidence: number // Confidence score (0-1)
    description: string // Explanation
  }>
}
```

**Annotations**: `readOnly: true`

### enhance_error_message

Get enhanced error messages with suggestions.

**Method**: `enhance_error_message`

**Parameters**:
```typescript
{
  error: string        // Original error message
  code: string         // Code context
  language: "python" | "csharp"
}
```

**Response**:
```typescript
{
  enhancedMessage: string
  suggestions: Array<{
    description: string
    code?: string      // Suggested code fix
    line?: number      // Line number for fix
  }>
  relatedDocs: Array<{
    title: string
    url: string
  }>
}
```

**Annotations**: `readOnly: true`

### update_code_to_pep8

Convert code to PEP8 compliance (Python only).

**Method**: `update_code_to_pep8`

**Parameters**:
```typescript
{
  code: string         // Python code to format
}
```

**Response**:
```typescript
{
  formattedCode: string
  changes: Array<{
    line: number
    description: string
    original: string
    updated: string
  }>
}
```

### check_syntax

Validate code syntax and structure.

**Method**: `check_syntax`

**Parameters**:
```typescript
{
  code: string         // Code to validate
  language: "python" | "csharp"
}
```

**Response**:
```typescript
{
  valid: boolean
  errors: Array<{
    line: number
    column: number
    message: string
    severity: "error" | "warning"
  }>
  suggestions: Array<{
    line: number
    message: string
    fix?: string
  }>
}
```

**Annotations**: `readOnly: true`

### search_quantconnect

Search QuantConnect documentation and community.

**Method**: `search_quantconnect`

**Parameters**:
```typescript
{
  query: string        // Search query
  type?: "docs" | "community" | "all"
}
```

**Response**:
```typescript
{
  results: Array<{
    title: string
    url: string
    snippet: string
    type: "documentation" | "forum" | "tutorial"
    relevance: number
  }>
  total: number
}
```

**Annotations**: `readOnly: true, openWorld: true`

---

## Optimization Tools

Tools for parameter optimization and strategy tuning.

### create_optimization

Start a parameter optimization job.

**Method**: `create_optimization`

**Parameters**:
```typescript
{
  projectId: number
  name: string
  target: string       // Optimization target (e.g., "Sharpe Ratio")
  parameters: Array<{
    name: string
    min: number
    max: number
    step: number
  }>
  constraints?: Array<{
    target: string
    operator: ">=" | "<=" | "=" | ">" | "<"
    value: number
  }>
}
```

**Response**:
```typescript
{
  optimizationId: string
  projectId: number
  name: string
  status: "InQueue" | "Running" | "Completed" | "Error"
  created: Date
  progress: number
}
```

### read_optimization

Get optimization results and progress.

**Method**: `read_optimization`

**Parameters**:
```typescript
{
  projectId: number
  optimizationId: string
}
```

**Response**:
```typescript
{
  optimizationId: string
  status: string
  progress: number
  results?: Array<{
    parameterSet: Record<string, number>
    performance: Record<string, number>
    rank: number
  }>
  bestResult?: {
    parameterSet: Record<string, number>
    performance: Record<string, number>
  }
}
```

**Annotations**: `readOnly: true`

---

## Object Store Tools

Tools for managing research data and file storage.

### upload_object

Upload data to the object store.

**Method**: `upload_object`

**Parameters**:
```typescript
{
  key: string          // Object key/name
  data: string         // Base64 encoded data
  metadata?: Record<string, string>
}
```

**Response**:
```typescript
{
  key: string
  size: number
  uploaded: Date
  checksum: string
}
```

### read_object_properties

Get object metadata and properties.

**Method**: `read_object_properties`

**Parameters**:
```typescript
{
  key: string          // Object key
}
```

**Response**:
```typescript
{
  key: string
  size: number
  uploaded: Date
  modified: Date
  metadata: Record<string, string>
  checksum: string
}
```

**Annotations**: `readOnly: true`

### list_object_store_files

List stored objects with optional filtering.

**Method**: `list_object_store_files`

**Parameters**:
```typescript
{
  prefix?: string      // Key prefix filter
  maxResults?: number  // Maximum results to return
}
```

**Response**:
```typescript
{
  objects: Array<{
    key: string
    size: number
    uploaded: Date
    modified: Date
  }>
  total: number
  truncated: boolean
}
```

**Annotations**: `readOnly: true`

### delete_object

Delete an object from storage.

**Method**: `delete_object`

**Parameters**:
```typescript
{
  key: string          // Object key
}
```

**Response**:
```typescript
{
  key: string
  deleted: boolean
}
```

**Annotations**: `destructive: true`

---

## Account Tools

Tools for account information and settings.

### read_account

Get account information and subscription details.

**Method**: `read_account`

**Parameters**: None

**Response**:
```typescript
{
  userId: number
  email: string
  name: string
  subscription: {
    type: string
    features: string[]
    limits: Record<string, number>
  }
  usage: {
    backtests: number
    liveAlgorithms: number
    dataDownloads: number
  }
  billing: {
    nextBilling: Date
    amount: number
    currency: string
  }
}
```

**Annotations**: `readOnly: true`

---

## Error Handling

All tools return errors in the standard JSON-RPC 2.0 error format:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": {
      "details": "Missing required parameter: projectId",
      "parameter": "projectId",
      "suggestions": ["Ensure projectId is provided as a number"]
    }
  }
}
```

### Common Error Codes

- **-32700**: Parse error (invalid JSON)
- **-32600**: Invalid Request (malformed JSON-RPC)
- **-32601**: Method not found (unknown tool)
- **-32602**: Invalid params (parameter validation failed)
- **-32603**: Internal error (server-side error)
- **-32000**: Server error (QuantConnect API error)

### QuantConnect-Specific Errors

- **401**: Authentication failed (invalid credentials)
- **403**: Forbidden (insufficient permissions)
- **404**: Resource not found (project, backtest, etc.)
- **429**: Rate limit exceeded
- **500**: QuantConnect server error

## Rate Limiting

The MCP server respects QuantConnect API rate limits:

- **Default**: 100 requests per minute
- **Burst**: 200 requests in first 10 seconds
- **Backoff**: Exponential backoff on rate limit errors

## Best Practices

1. **Error Handling**: Always handle potential errors in your MCP client
2. **Rate Limiting**: Implement client-side rate limiting for high-volume usage
3. **Pagination**: Use pagination for large result sets
4. **Caching**: Cache read-only results to reduce API calls
5. **Idempotency**: Leverage idempotent operations for retry safety
6. **Validation**: Validate parameters before sending requests
7. **Monitoring**: Monitor tool usage and performance metrics

## Examples

### Complete Workflow Example

```typescript
// 1. Check server health
const health = await mcp.call('read_infra_health')

// 2. Create a new project
const project = await mcp.call('create_project', {
  name: 'My Trading Strategy',
  language: 'Py',
  description: 'A momentum-based trading algorithm'
})

// 3. Create algorithm file
await mcp.call('create_file', {
  projectId: project.projectId,
  name: 'main.py',
  content: `
class MyAlgorithm(QCAlgorithm):
    def Initialize(self):
        self.SetStartDate(2020, 1, 1)
        self.SetEndDate(2023, 1, 1)
        self.SetCash(100000)
        
        self.spy = self.AddEquity("SPY", Resolution.Daily).Symbol
        
    def OnData(self, data):
        if not self.Portfolio.Invested:
            self.SetHoldings(self.spy, 1.0)
`
})

// 4. Compile the algorithm
const compile = await mcp.call('create_compile', {
  projectId: project.projectId
})

// 5. Wait for compilation to complete
let compileResult
do {
  compileResult = await mcp.call('read_compile', {
    projectId: project.projectId,
    compileId: compile.compileId
  })
  await new Promise(resolve => setTimeout(resolve, 1000))
} while (compileResult.state === 'Building')

// 6. Start backtest if compilation successful
if (compileResult.state === 'BuildSuccess') {
  const backtest = await mcp.call('create_backtest', {
    projectId: project.projectId,
    name: 'Initial Test'
  })
  
  // 7. Monitor backtest progress
  let backtestResult
  do {
    backtestResult = await mcp.call('read_backtest', {
      projectId: project.projectId,
      backtestId: backtest.backtestId
    })
    await new Promise(resolve => setTimeout(resolve, 5000))
  } while (backtestResult.progress < 1)
  
  console.log('Backtest completed:', backtestResult.result)
}
```

This API reference provides complete documentation for integrating with the QuantConnect MCP server. For additional examples and advanced usage patterns, see the individual tool documentation and project examples.

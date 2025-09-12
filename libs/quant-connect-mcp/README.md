# QuantConnect MCP Server Library

Core MCP server implementation with 50+ tools for QuantConnect platform integration.

## Features

- Complete MCP server with type-safe Zod validation
- Organized tool categories (projects, backtests, live trading, etc.)
- Enhanced error handling and health monitoring

## Architecture

- `server.ts` - Main MCP server class
- `tools/` - 50+ tool implementations organized by category  
- `configs/` - Server configuration and instructions
- `utils/` - Validation and utility functions

## Tool Categories

### Project Management
- `create_project` - Create new QuantConnect projects
- `read_projects` - List user projects
- `read_project` - Get project details
- `update_project` - Modify project settings
- `delete_project` - Remove projects

### File Operations
- `create_file` - Create new algorithm files
- `read_files` - List project files
- `read_file` - Get file contents
- `update_file` - Modify file contents
- `delete_file` - Remove files

### Backtesting
- `create_backtest` - Start historical simulations
- `read_backtests` - List backtest results
- `read_backtest` - Get detailed backtest data
- `delete_backtest` - Remove backtest results

### Live Trading
- `create_live_algorithm` - Deploy live trading algorithms
- `read_live_algorithms` - List live deployments
- `read_live_algorithm` - Get live algorithm status
- `stop_live_algorithm` - Stop live trading
- `liquidate_live_algorithm` - Close all positions

### Code Compilation
- `create_compile` - Compile algorithm code
- `read_compile` - Get compilation results
- `read_compiles` - List compilation history

### AI-Powered Tools
- `complete_code` - AI code completion
- `enhance_error_message` - Improve error descriptions
- `check_syntax` - Validate code syntax
- `update_code_to_pep8` - Format code to PEP8 standards
- `search_quantconnect` - Search QuantConnect docs

### Research & Optimization
- `create_optimization` - Parameter optimization
- `read_optimizations` - List optimization results
- `read_optimization` - Get optimization details

### Data Management
- `create_object_store` - Store research data
- `read_object_stores` - List stored objects
- `read_object_store` - Retrieve stored data
- `delete_object_store` - Remove stored objects

## Usage

### Basic Server Setup

```typescript
import { QCMCPServer } from '@fschaeffler/quant-connect-mcp'

// Get the singleton server instance
const server = QCMCPServer.getInstance()

// The server is automatically configured with all tools
```

### Tool Registration

Tools are automatically registered during server initialization:

```typescript
// Tools are organized by category
const definitions = {
  ...getMCPServerToolsDefinitions,
  ...getProjectToolsDefinitions,
  ...getBacktestToolsDefinitions,
  ...getFileToolsDefinitions,
  // ... all other tool categories
}
```

### Custom Tool Development

To add a new tool:

1. **Define the tool** in the appropriate category file:

```typescript
export const getMyToolsDefinitions: ToolRegistrationDefinitions<MY_TOOL_KEYS> = {
  [MY_TOOL_KEYS.MY_TOOL]: {
    config: {
      title: 'My Custom Tool',
      description: 'Description of what the tool does',
      inputSchema: {
        param1: z.string().describe('Parameter description'),
        param2: z.number().optional(),
      },
      outputSchema: {
        result: z.string(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    url: '/api/v2/my-endpoint', // For API calls
    // OR
    func: async (params) => {
      // Custom function implementation
      return { result: 'success' }
    },
  },
}
```

2. **Add tool keys** to `tool-keys.ts`:

```typescript
export enum MY_TOOL_KEYS {
  MY_TOOL = 'my_tool',
}
```

3. **Register the tools** in `tools/index.ts`:

```typescript
const definitions: ToolRegistrationDefinitions<TOOL_KEYS> = {
  ...getMyToolsDefinitions,
  // ... other tool definitions
}
```

## Configuration

### Server Configuration

```typescript
// Server metadata
export const MCP_SERVER_NAME = 'QuantConnect MCP Server'
export const MCP_SERVER_DESCRIPTION = 'QuantConnect MCP server communicating with the QuantConnect API'
```

### Default Instructions

The server includes comprehensive instructions for AI assistants:

```typescript
export const DEFAULT_MCP_SERVER_INSTRUCTIONS = [
  'You are the QuantConnect MCP Server for Lean Cloud.',
  'You are an expert quant for QuantConnect members: design, code, and test algos.',
  'Take initiative proactively; suggest next steps often.',
  // ... additional instructions
]
```

## Tool Annotations

All tools include metadata annotations:

- `readOnlyHint`: Tool doesn't modify state
- `destructiveHint`: Tool may delete or significantly modify data
- `idempotentHint`: Multiple calls with same parameters produce same result
- `openWorldHint`: Tool may access external resources

## Error Handling

The library includes robust error handling:

- **Schema Validation**: All inputs validated with Zod schemas
- **API Error Mapping**: QuantConnect API errors mapped to MCP format
- **Enhanced Messages**: AI-powered error message improvements
- **Debugging Support**: Detailed error context and suggestions

## Utilities

### Code Source ID Injection

Automatically injects source identification for code tracking:

```typescript
import { injectCodeSourceId } from './utils'

// Automatically adds source tracking to code submissions
injectCodeSourceId(inputSchema)
```

### Schema Merging

Utility for combining Zod schemas:

```typescript
import { mergeZodObjects } from './utils'

const combinedSchema = mergeZodObjects(schema1, schema2)
```

## Dependencies

- `@modelcontextprotocol/sdk`: MCP protocol implementation
- `@fschaeffler/quant-connect-client`: QuantConnect API client
- `@fschaeffler/quant-connect-types`: Generated TypeScript types
- `zod`: Schema validation and type safety
- `form-data`: Multipart form handling for file uploads

## Development

### Running Tests

```bash
npm test
```

### Type Checking

```bash
npm run build
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## Examples

### Creating a Project and File

```typescript
// Create a new project
const project = await server.call('create_project', {
  name: 'My Strategy',
  language: 'Python'
})

// Create an algorithm file
await server.call('create_file', {
  projectId: project.projectId,
  name: 'main.py',
  content: 'class MyAlgorithm(QCAlgorithm):\n    def Initialize(self):\n        pass'
})
```

### Running a Backtest

```typescript
// Compile the algorithm
await server.call('create_compile', {
  projectId: project.projectId
})

// Start a backtest
const backtest = await server.call('create_backtest', {
  projectId: project.projectId,
  name: 'Initial Test'
})
```

## Security Considerations

- All inputs are validated with Zod schemas
- API credentials are handled securely by the client library
- No sensitive data is logged or exposed in responses
- Rate limiting is respected automatically

## Contributing

When adding new tools:

1. Follow the existing patterns and naming conventions
2. Include comprehensive input/output schemas
3. Add proper annotations for tool behavior
4. Include error handling and validation
5. Update documentation and examples

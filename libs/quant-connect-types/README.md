# QuantConnect Types Library

Auto-generated TypeScript types and Zod schemas from QuantConnect's OpenAPI specification.

## Features

- TypeScript types with Zod validation
- Automatic date parsing and null safety
- Runtime validation for all API data

## Generation Process

Types are generated using [Orval](https://orval.dev/) from the QuantConnect Platform 2.0.0 OpenAPI specification:

```typescript
const config: Config = {
  api: {
    input: {
      target: './data/QuantConnect-Platform-2.0.0.yaml',
    },
    output: {
      client: 'zod',
      mode: 'single',
      target: './src/index.ts',
      override: {
        useDates: true,
        zod: {
          generate: { 
            param: false, 
            query: false, 
            header: false, 
            body: true, 
            response: true 
          },
          coerce: {
            response: ['number', 'date'],
          },
        },
      },
    },
  },
}
```

## Usage

### Import Types

```typescript
import { 
  Project,
  Backtest,
  LiveAlgorithm,
  ProjectFile,
  // ... other types
} from '@fschaeffler/quant-connect-types'
```

### Zod Schema Validation

```typescript
import { ProjectSchema } from '@fschaeffler/quant-connect-types'

// Validate API response
const project = ProjectSchema.parse(apiResponse)

// Type-safe access
console.log(project.name) // TypeScript knows this is a string
```

### Common Types

#### Project Types
```typescript
interface Project {
  projectId: number
  name: string
  description?: string
  language: 'Py' | 'C#'
  created: Date
  modified: Date
  // ... additional fields
}
```

#### Backtest Types
```typescript
interface Backtest {
  backtestId: string
  projectId: number
  name: string
  note?: string
  created: Date
  completed?: Date
  progress: number
  result?: BacktestResult
  // ... additional fields
}
```

#### Live Algorithm Types
```typescript
interface LiveAlgorithm {
  projectId: number
  deployId: string
  status: 'Running' | 'Stopped' | 'Liquidated'
  launched: Date
  stopped?: Date
  // ... additional fields
}
```

## Building Types

### Prerequisites
- Node.js 18+
- npm

### Generate Types

```bash
# Install dependencies
npm ci

# Generate types from OpenAPI spec
npm run build
```

This will:
1. Read the OpenAPI specification from `data/QuantConnect-Platform-2.0.0.yaml`
2. Generate TypeScript types and Zod schemas
3. Apply post-processing to handle nullable fields correctly
4. Output to `src/index.ts`

## Post-Processing

The generated types undergo post-processing to ensure compatibility:

```typescript
// Convert .optional() to .optional().nullable() for better null handling
const patchedContent = fileContent
  .split('.optional()')
  .join('.optional().nullable()')
```

This ensures that optional fields can also be explicitly null, matching QuantConnect's API behavior.

## Type Categories

### Core Entities
- **Project**: Trading algorithm projects
- **Backtest**: Historical simulation results
- **LiveAlgorithm**: Live trading deployments
- **ProjectFile**: Source code files
- **Optimization**: Parameter optimization results

### Data Types
- **Security**: Financial instruments
- **Market**: Market data and pricing
- **Order**: Trading orders and executions
- **Portfolio**: Portfolio holdings and statistics
- **Performance**: Performance metrics and analytics

### System Types
- **User**: User account information
- **Organization**: Team and organization data
- **Node**: Computing resources
- **Log**: System and algorithm logs
- **Error**: Error messages and codes

## Zod Schema Features

### Automatic Coercion
```typescript
// Numbers are automatically coerced from strings
const schema = z.object({
  price: z.number().describe('Stock price')
})

// Dates are automatically parsed
const dateSchema = z.object({
  created: z.date().describe('Creation timestamp')
})
```

### Optional and Nullable Fields
```typescript
// Fields can be optional, nullable, or both
const schema = z.object({
  description: z.string().optional().nullable(),
  notes: z.string().optional(),
  required: z.string()
})
```

### Validation Examples
```typescript
import { ProjectSchema, BacktestSchema } from '@fschaeffler/quant-connect-types'

// Validate project data
try {
  const project = ProjectSchema.parse(apiData)
  console.log('Valid project:', project.name)
} catch (error) {
  console.error('Invalid project data:', error.message)
}

// Validate backtest results
const backtest = BacktestSchema.parse(backtestData)
if (backtest.result) {
  console.log('Backtest completed with return:', backtest.result.totalReturn)
}
```

## Development

### Updating Types

When QuantConnect updates their API:

1. **Update the OpenAPI spec**:
   ```bash
   # Replace data/QuantConnect-Platform-2.0.0.yaml with the new version
   ```

2. **Regenerate types**:
   ```bash
   npm run build
   ```

3. **Test the changes**:
   ```bash
   npm test
   ```

### Custom Types

If you need custom types not in the OpenAPI spec:

```typescript
// Add to src/custom-types.ts
export interface CustomType {
  // Your custom fields
}

// Re-export in src/index.ts
export * from './custom-types'
```

## Dependencies

- **orval**: OpenAPI to TypeScript/Zod generator
- **zod**: Schema validation library
- **typescript**: TypeScript compiler

## Configuration

The `orval.config.ts` file controls type generation:

```typescript
const config: Config = {
  api: {
    input: {
      target: './data/QuantConnect-Platform-2.0.0.yaml', // OpenAPI spec location
    },
    output: {
      client: 'zod',           // Generate Zod schemas
      mode: 'single',          // Single output file
      target: './src/index.ts', // Output location
      override: {
        useDates: true,        // Parse dates automatically
        zod: {
          generate: {
            body: true,        // Generate request body schemas
            response: true,    // Generate response schemas
          },
          coerce: {
            response: ['number', 'date'], // Auto-coerce these types
          },
        },
      },
    },
  },
}
```

## Best Practices

### Using Generated Types

1. **Always validate API responses**:
   ```typescript
   const response = await api.getProject(id)
   const project = ProjectSchema.parse(response)
   ```

2. **Use type guards for optional data**:
   ```typescript
   if (backtest.result) {
     // TypeScript knows result is defined here
     console.log(backtest.result.totalReturn)
   }
   ```

3. **Leverage IntelliSense**:
   ```typescript
   // TypeScript provides autocomplete for all fields
   project.name // ✅ string
   project.invalidField // ❌ TypeScript error
   ```

### Error Handling

```typescript
import { ZodError } from 'zod'

try {
  const data = ApiResponseSchema.parse(response)
} catch (error) {
  if (error instanceof ZodError) {
    console.error('Validation errors:', error.format())
  }
}
```

## Troubleshooting

### Common Issues

1. **Type Generation Fails**:
   - Check that the OpenAPI spec file exists and is valid YAML
   - Ensure orval dependencies are installed

2. **Validation Errors**:
   - Check if the API response format has changed
   - Verify that optional fields are handled correctly

3. **Date Parsing Issues**:
   - Ensure dates are in ISO format from the API
   - Check timezone handling if needed

### Debugging

Enable verbose logging during generation:

```bash
DEBUG=orval* npm run build
```

This will show detailed information about the type generation process.

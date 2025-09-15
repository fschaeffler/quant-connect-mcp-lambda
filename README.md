# QuantConnect MCP Server

Model Context Protocol server for AI assistants to interact with QuantConnect's algorithmic trading platform.

<div align="center">
   <img src="docs/images/quantconnect-mcp-lambda.jpg" width="75%">
</div>

## Overview

Bridge between AI assistants and QuantConnect platform for:
- Algorithm development and management
- Backtesting and live trading deployment
- Data management and research tools
- Project collaboration and optimization

## Architecture

The project follows a monorepo structure with multiple specialized packages:

```
aws-lambda-mcp/
├── libs/                           # Core libraries
│   ├── quant-connect-mcp/         # Main MCP server implementation (67 tools)
│   ├── quant-connect-types/       # TypeScript types from QuantConnect API
│   ├── quant-connect-client/      # HTTP client for QuantConnect API
│   └── middy/                     # AWS Lambda middleware integration
├── services/                      # Deployable services
│   ├── quant-connect/            # Main Lambda service
│   └── quant-connect-local/      # Local development service
├── infra/                        # AWS CDK infrastructure
└── e2e/                          # End-to-end testing
```

### Core Components

- **MCP Server**: Model Context Protocol implementation with 67 tools organized by category
- **QuantConnect Client**: HTTP client with authentication, rate limiting, and error handling
- **AWS Lambda**: Serverless deployment with API Gateway, Secrets Manager integration
- **Type Safety**: Auto-generated TypeScript types with Zod validation
- **Local Development**: HTTP server for development without AWS infrastructure

> **Note**: Uses modified OpenAPI spec to fix validation issues in the official specification.

## vs Official QuantConnect MCP Server

Alternative to [official MCP server](https://github.com/QuantConnect/mcp-server) with key differences:

### Architecture
| Feature | This Implementation | Official Server |
|---------|-------------------|-----------------|
| **Language** | TypeScript/Node.js | Python |
| **Deployment** | AWS Lambda + API Gateway | Docker container |
| **Runtime** | Serverless | Container-based |
| **Scaling** | Auto-scaling Lambda | Manual container scaling |
| **Infrastructure** | AWS CDK (Infrastructure as Code) | Docker Compose/Kubernetes |

### Tools
| Category | This Implementation | Official Server |
|----------|-------------------|-----------------|
| **Total Tools** | 67 tools | 64 tools |
| **Project Management** | ✅ Full support | ✅ Full support |
| **File Operations** | ✅ Full support | ✅ Full support + `patch_file` |
| **Backtesting** | ✅ Full support | ✅ Full support |
| **Live Trading** | ✅ Full support | ✅ Full support |
| **AI Tools** | ✅ Full support | ✅ Full support |
| **Optimization** | ✅ Full support | ✅ Full support |
| **Object Store** | ✅ Full support | ✅ Full support |

### Key Differences

**Missing Features:**
- `patch_file` tool (git-style patches)
- `authorize_connection` tool (two-step live auth)

**Unique Features:**
- AWS cloud integration (Lambda, API Gateway, Secrets Manager, CloudWatch)
- Infrastructure as Code (CDK)
- Full TypeScript type safety with Zod validation
- Local development server
- Built-in monitoring and authentication

### Development
| Aspect | This Implementation | Official Server |
|--------|-------------------|-----------------|
| **Setup** | Node.js ecosystem | Python ecosystem |
| **Type Safety** | Full TypeScript + Zod validation | Python type hints |
| **Testing** | Jest + comprehensive test suite | Python testing framework |
| **Documentation** | Extensive MD docs + API reference | README + inline docs |
| **Local Development** | HTTP server + nodemon for dev reloading | Python STDIO + inspector |
| **IDE Support** | Full IntelliSense + autocomplete | Python IDE support |

### Production
| Factor | This Implementation | Official Server |
|--------|-------------------|-----------------|
| **Security** | AWS IAM + API Gateway auth | Container security |
| **Monitoring** | CloudWatch logs + metrics | Container logging |
| **Cost** | Pay-per-request (serverless) | Fixed container costs |
| **Maintenance** | Managed AWS services | Container updates needed |
| **Reliability** | AWS SLA (99.95%+) | Container orchestration dependent |
| **Global Distribution** | Multi-region AWS deployment | Manual geographic deployment |

## Features

67 tools organized across categories:

### Project Management (5 tools)
- Create, read, update, delete projects
- List user projects

### File Operations (5 tools)
- Create, read, update, delete algorithm files
- Update file names and contents

### Backtesting (10 tools)
- Create and manage backtests
- Read results, charts, orders, insights, reports
- Historical simulation analytics

### Live Trading (12 tools)
- Deploy algorithms to live trading
- Monitor portfolio, orders, logs
- Risk controls and liquidation

### AI-Powered Tools (6 tools)
- Code completion and syntax checking
- Error message enhancement
- PEP8 formatting
- QuantConnect documentation search

### Research & Data (8 tools)
- Object store for research data
- Parameter optimization
- Compilation services
- Account information

### Collaboration & Infrastructure (21 tools)
- Project collaboration tools
- Node management
- Live command broadcasting
- Health monitoring
- Version information

## Quick Start

**Prerequisites:** Node.js 18+, QuantConnect account

### Local Development

```bash
# Install dependencies
git clone <repository-url>
cd aws-lambda-mcp
npm ci
npm run build

# Configure credentials
cd services/quant-connect-local
echo "QUANTCONNECT_USER_ID=your-user-id" > .env
echo "QUANTCONNECT_API_TOKEN=your-api-token" >> .env

# Start development server
npm start
# Server runs at http://localhost:55555/mcp

# Test the connection
curl -X POST http://localhost:55555/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### AWS Production Deployment

```bash
# Deploy infrastructure (creates empty secrets)
cd infra && npm run deploy

# Populate secrets with actual QuantConnect credentials
aws secretsmanager update-secret \
  --secret-id "quant-connect-mcp/user-id" \
  --secret-string "your-quantconnect-user-id"
aws secretsmanager update-secret \
  --secret-id "quant-connect-mcp/api-token" \
  --secret-string "your-quantconnect-api-token"
```

After deployment, you'll receive API Gateway endpoint and API key for authentication.

## Configuration

### Local Development
- **Environment Variables**: `QUANTCONNECT_USER_ID`, `QUANTCONNECT_USER_ID` in `.env` file
- **Server**: Runs on port 55555 (configurable via `PORT`)
- **Debug**: Enable with `DEBUG=*` or `DEBUG=quant-connect:*`

### AWS Production
- **API Gateway**: REST endpoint with API key authentication
- **Lambda Function**: Node.js 22.x runtime, 1024MB memory, 30s timeout
- **Secrets Manager**: Encrypted credential storage
- **CloudWatch**: Logging and monitoring with 3-day retention

## MCP Protocol Support

Enhanced MCP protocol implementation:

- **Full JSON-RPC 2.0 compliance** with proper request/response handling
- **Notification support** for MCP client handshake (initialize/initialized flow)
- **HTTP transport compatibility** with AWS Lambda/API Gateway
- **Error handling** with appropriate HTTP status codes
- **67 tools** with comprehensive input/output validation using Zod schemas

## AWS Infrastructure

### Components
- **API Gateway**: REST API with throttling (100 req/sec, 200 burst)
- **Lambda Function**: Serverless execution with automatic scaling
- **Secrets Manager**: Secure credential storage with rotation support
- **CloudWatch**: Structured logging and performance metrics
- **IAM Roles**: Minimal permissions (secrets access, logging)

### Security Features
- API key authentication for all requests
- HTTPS/TLS encryption in transit
- Encrypted secrets and logs at rest
- Zod input validation for all tools
- No sensitive data in logs or responses

### Scaling & Performance
- **Automatic scaling**: Up to 1000 concurrent Lambda executions
- **Cold start**: ~2-3 seconds initial, ~500ms subsequent
- **Typical response**: 1-5 seconds
- **Memory usage**: 150-300MB typical, up to 500MB for large operations

## Development

### Monorepo Structure
```bash
npm run lint        # Code linting across all packages
npm run build       # Build all packages  
npm test           # Run unit tests
npm run test:e2e   # End-to-end tests (requires deployed server)
```

### Hot Reloading for Development
Enable file watching during development:

```bash
# Install nodemon globally
npm install -g nodemon

# Start with automatic restart on changes
cd services/quant-connect-local
nodemon --watch src --ext ts,js --exec "npm start"
```

### Testing Strategy

- **Unit Tests**: 100% coverage for all TypeScript files
- **Integration Tests**: Component interaction validation  
- **E2E Tests**: Real server testing with AWS authentication

```bash
# Run specific test suites
npm test                    # All unit tests
npm run test:coverage      # With coverage report
cd e2e && npm run test:e2e # End-to-end tests
```

E2E tests validate:
- API Gateway authentication with API keys
- Complete MCP protocol compliance
- All 67 tools functionality
- Real QuantConnect API integration

## Type Safety & Validation

### Generated Types
- **Source**: Auto-generated from QuantConnect OpenAPI 2.0.0 specification
- **Validation**: Zod schemas for runtime validation
- **Features**: Automatic date parsing, null safety, coercion

### Tool Validation
All tools include:
- **Input validation**: Zod schema validation for parameters
- **Output validation**: Structured response validation
- **Error handling**: Comprehensive error mapping
- **Annotations**: Tool behavior hints (readOnly, destructive, idempotent)

## Documentation

### Complete Documentation Guide
- **[API Reference](docs/api.md)** - Complete MCP tools and API documentation
- **[Development Guide](docs/DEVELOPMENT.md)** - Development setup, debugging, and best practices
- **[Contributing Guidelines](docs/CONTRIBUTING.md)** - How to contribute, coding standards, and release process

### Architecture Documentation
Each component includes comprehensive documentation covering setup, configuration, usage examples, troubleshooting, and best practices.

## Cost Optimization

### AWS Pricing (Estimated)
- **Lambda**: ~$0.0005 per invocation (1024MB, 30s avg)
- **API Gateway**: $3.50 per million API calls
- **Secrets Manager**: $0.40 per secret per month
- **CloudWatch**: $0.50 per GB logs ingested

### Optimization Strategies
- Right-size Lambda memory allocation
- Implement request caching for repeated operations
- Use provisioned concurrency for predictable workloads
- Monitor and optimize based on CloudWatch metrics

## Security

- **AWS Secrets Manager**: Encrypted credential storage with automatic rotation
- **API Gateway**: Authentication, rate limiting, and request validation  
- **Zod Validation**: All inputs validated against TypeScript schemas
- **IAM Permissions**: Minimal required permissions (secrets read, logging)
- **TLS Encryption**: All data encrypted in transit
- **Audit Logging**: All requests logged to CloudWatch

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify QuantConnect credentials are correct
   - Check AWS Secrets Manager configuration (production)
   - Ensure environment variables are set (local development)

2. **Cold Start Timeouts**
   - First Lambda invocation may take 2-3 seconds
   - Consider provisioned concurrency for production workloads

3. **Rate Limiting**
   - API Gateway enforces 100 req/sec by default
   - Implement exponential backoff for high-volume usage

4. **Tool Validation Errors**
   - Check input parameters match expected Zod schemas
   - Review tool documentation for required fields

### Debug Mode
Enable verbose logging:

```bash
# Local development
DEBUG=* npm start

# Lambda (via environment variables)
LOG_LEVEL=debug
```

## Acknowledgments

This project's Middy MCP integration is inspired by the [`middy-mcp`](https://github.com/fredericbarthelet/middy-mcp) package by Frédéric Barthelet. While our implementation is independently developed with different architectural choices, we acknowledge the foundational work done by the `middy-mcp` community in establishing patterns for MCP server integration with AWS Lambda.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- [QuantConnect Documentation](https://quantconnect.com/docs)
- [MCP Specification](https://modelcontextprotocol.io)
- Report issues via GitHub Issues
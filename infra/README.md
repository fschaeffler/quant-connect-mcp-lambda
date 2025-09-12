# QuantConnect MCP Infrastructure

AWS CDK stack for serverless MCP server deployment.

## Overview

Deploys complete serverless architecture:
- Lambda function with API Gateway
- Secrets Manager for credentials
- CloudWatch logging and IAM roles

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                         AWS Cloud                          │
│                                                            │
│  ┌─────────────────┐    ┌──────────────────┐               │
│  │   API Gateway   │───▶│  Lambda Function │               │
│  │                 │    │                  │               │
│  │ • Authentication│    │ • MCP Server     │               │
│  │ • Rate Limiting │    │ • QuantConnect   │               │
│  │ • CORS          │    │   Integration    │               │
│  └─────────────────┘    └──────────────────┘               │
│           │                       │                        │
│           │              ┌─────────────────┐               │
│           │              │ Secrets Manager │               │
│           │              │                 │               │
│           │              │ • User ID       │               │
│           │              │ • API Token     │               │
│           │              └─────────────────┘               │
│           │                                                │
│   ┌─────────────────┐                                      │
│   │   CloudWatch    │                                      │
│   │                 │                                      │
│   │ • Logs          │                                      │
│   │ • Metrics       │                                      │
│   │ • Alarms        │                                      │
│   └─────────────────┘                                      │
└────────────────────────────────────────────────────────────┘
```

## Stack Components

### API Gateway (`RestApi`)
- **Purpose**: HTTP endpoint for MCP requests
- **Features**: API key authentication, usage plans, CORS
- **Endpoints**:
  - `POST /mcp`: MCP JSON-RPC requests
  - `GET /mcp`: Returns 405 (method not allowed)
  - `OPTIONS /mcp`: CORS preflight handling

### Lambda Function (`NodejsFunction`)
- **Runtime**: Node.js 22.x
- **Memory**: 1024 MB
- **Timeout**: 30 seconds
- **Handler**: Middy-wrapped MCP server
- **Bundling**: Minified with esbuild

### Secrets Manager
- **`quant-connect-mcp/user-id`**: QuantConnect user ID
- **`quant-connect-mcp/api-token`**: QuantConnect API token
- **Access**: Read-only for Lambda function

### CloudWatch
- **Log Group**: `/aws/lambda/qc-mcp-lambda-handler`
- **Retention**: 3 days
- **Policy**: Retain on update/delete

## Prerequisites

### Required Tools
- **AWS CLI**: Configured with appropriate permissions
- **AWS CDK**: Version 2.x
- **Node.js**: Version 18+
- **npm**: For dependency management

### AWS Permissions
Your AWS credentials need the following permissions:
- **CloudFormation**: Full access for stack management
- **Lambda**: Function creation and management
- **API Gateway**: API creation and configuration
- **IAM**: Role and policy management
- **Secrets Manager**: Secret creation and access
- **CloudWatch**: Log group management
- **S3**: CDK asset storage (CDK bootstrap bucket)

### CDK Bootstrap
Bootstrap your AWS account/region for CDK:

```bash
# Bootstrap for your account/region
npx cdk bootstrap aws://ACCOUNT-ID/REGION

# Example
npx cdk bootstrap aws://123456789012/us-east-1
```

## Deployment

### Environment Setup

1. **Install dependencies**:
   ```bash
   cd infra
   npm ci
   ```

2. **Configure AWS credentials**:
   ```bash
   # Using AWS CLI
   aws configure

   # Or using environment variables
   export AWS_ACCESS_KEY_ID=your-access-key
   export AWS_SECRET_ACCESS_KEY=your-secret-key
   export AWS_DEFAULT_REGION=us-east-1
   ```

3. **Set QuantConnect credentials**:
   
   > **Note**: The initial CDK deployment will create empty secrets in AWS Secrets Manager. You must populate these secrets with your actual QuantConnect credentials after the first deployment.

   ```bash
   # After initial deployment, update the secrets with your actual credentials
   aws secretsmanager update-secret \
     --secret-id "quant-connect-mcp/user-id" \
     --secret-string "your-quantconnect-user-id"

   aws secretsmanager update-secret \
     --secret-id "quant-connect-mcp/api-token" \
     --secret-string "your-quantconnect-api-token"
   ```

   Alternatively, you can create the secrets manually before deployment:
   ```bash
   # Create secrets with values before deployment
   aws secretsmanager create-secret \
     --name "quant-connect-mcp/user-id" \
     --description "QuantConnect User ID for MCP Server" \
     --secret-string "your-quantconnect-user-id"

   aws secretsmanager create-secret \
     --name "quant-connect-mcp/api-token" \
     --description "QuantConnect API Token for MCP Server" \
     --secret-string "your-quantconnect-api-token"
   ```

### Deployment Commands

```bash
# Synthesize CloudFormation template (optional)
npx cdk synth

# Deploy the stack
npm run deploy

# Or deploy with CDK directly
npx cdk deploy --all --require-approval never
```

### Deployment Output

After successful deployment, you'll see outputs like:

```
QuantConnectMCPStack.APIGatewayEndpoint = https://abcd1234.execute-api.us-east-1.amazonaws.com/prod/
QuantConnectMCPStack.APIKeyId = your-api-key-id
QuantConnectMCPStack.LambdaFunctionName = qc-mcp-lambda-handler
```

## Configuration

### CDK Configuration (`cdk.json`)

```json
{
  "app": "npx ts-node --prefer-ts-exts bin/cdk.ts",
  "watch": {
    "include": [
      "**"
    ],
    "exclude": [
      "README.md",
      "cdk*.json",
      "**/*.d.ts",
      "**/*.js",
      "tsconfig.json",
      "package*.json",
      "yarn.lock",
      "node_modules",
      "test"
    ]
  },
  "context": {
    "@aws-cdk/aws-apigateway:usagePlanKeyOrderInsensitiveId": true,
    "@aws-cdk/core:stackRelativeExports": true
  }
}
```

### Stack Configuration

Key configuration options in the stack:

```typescript
export class QuantConnectMCPStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    // API Gateway configuration
    this.restAPI = new RestApi(this, 'qc-mcp-api-gateway', {
      restApiName: 'qc-mcp-api-gateway',
      description: 'This service serves QuantConnect MCP requests.',
      deployOptions: {
        stageName: 'prod',
        throttle: {
          rateLimit: 100,    // requests per second
          burstLimit: 200    // burst capacity
        }
      }
    })

    // Lambda configuration
    this.handler = new NodejsFunction(this, 'qc-mcp-lambda-handler', {
      entry: path.join('services', 'quant-connect', 'src', 'index.ts'),
      runtime: Runtime.NODEJS_22_X,
      memorySize: 1024,
      timeout: Duration.seconds(30),
      environment: {
        NODE_ENV: 'production'
      }
    })
  }
}
```

## Security

### IAM Roles and Policies

The stack creates minimal IAM permissions:

```typescript
// Lambda execution role (created automatically)
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:*:*:secret:quant-connect-mcp/user-id*",
        "arn:aws:secretsmanager:*:*:secret:quant-connect-mcp/api-token*"
      ]
    }
  ]
}
```

### API Security

```typescript
// API Gateway security features
const apiKey = new ApiKey(this, 'qc-mcp-api-key', {
  apiKeyName: 'qc-mcp-api-key',
  description: 'API key for QuantConnect MCP access'
})

const usagePlan = this.restAPI.addUsagePlan('qc-mcp-usage-plan', {
  name: 'qc-mcp-usage-plan',
  throttle: {
    rateLimit: 100,
    burstLimit: 200
  },
  quota: {
    limit: 10000,
    period: Period.DAY
  }
})

usagePlan.addApiKey(apiKey)
```

### Secrets Security

```typescript
const secrets = [
  new Secret(this, 'quant-connect-mcp-secret-user-id', {
    secretName: 'quant-connect-mcp/user-id',
    description: 'QuantConnect User ID',
    generateSecretString: {
      excludeCharacters: '"\\/',
      includeSpace: false
    }
  }),
  // API token secret similar configuration
]

// Grant read access to Lambda
secrets.forEach(secret => {
  secret.grantRead(this.handler)
})
```

## Monitoring and Logging

### CloudWatch Logs

```typescript
const logGroup = new LogGroup(this, 'qc-mcp-lambda-log-group', {
  logGroupName: '/aws/lambda/qc-mcp-lambda-handler',
  removalPolicy: RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
  retention: RetentionDays.THREE_DAYS
})
```

### CloudWatch Metrics

Key metrics to monitor:
- **Invocations**: Function execution count
- **Duration**: Execution time
- **Errors**: Error rate and count
- **Throttles**: Concurrency throttling
- **Memory**: Memory utilization

### CloudWatch Alarms

Set up alarms for production monitoring:

```bash
# High error rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "QC-MCP-High-Error-Rate" \
  --alarm-description "High error rate for QuantConnect MCP" \
  --metric-name "Errors" \
  --namespace "AWS/Lambda" \
  --statistic "Sum" \
  --period 300 \
  --threshold 5 \
  --comparison-operator "GreaterThanThreshold" \
  --dimensions Name=FunctionName,Value=qc-mcp-lambda-handler \
  --evaluation-periods 2

# High duration alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "QC-MCP-High-Duration" \
  --alarm-description "High duration for QuantConnect MCP" \
  --metric-name "Duration" \
  --namespace "AWS/Lambda" \
  --statistic "Average" \
  --period 300 \
  --threshold 25000 \
  --comparison-operator "GreaterThanThreshold" \
  --dimensions Name=FunctionName,Value=qc-mcp-lambda-handler \
  --evaluation-periods 3
```

## Cost Optimization

### Pricing Components

1. **Lambda**:
   - Requests: $0.20 per 1M requests
   - Duration: $0.0000166667 per GB-second
   - 1024MB * 30s = ~$0.0005 per invocation

2. **API Gateway**:
   - REST API: $3.50 per million API calls
   - Data transfer: $0.09 per GB

3. **Secrets Manager**:
   - $0.40 per secret per month
   - $0.05 per 10,000 API calls

4. **CloudWatch**:
   - Logs: $0.50 per GB ingested
   - Metrics: $0.30 per metric per month

### Cost Optimization Strategies

```typescript
// Optimize Lambda memory based on profiling
memorySize: 512, // Reduce if CPU-bound workload

// Reduce log retention
retention: RetentionDays.ONE_DAY,

// Use provisioned concurrency for predictable workloads
provisionedConcurrencyConfig: {
  provisionedConcurrency: 5
}
```

## Scaling

### Auto Scaling
Lambda automatically scales based on incoming requests:
- **Default**: 1000 concurrent executions
- **Burst**: 3000 concurrent executions (first minute)
- **Regional**: Per-region limits

### Reserved Concurrency
Configure reserved concurrency for guaranteed capacity:

```typescript
this.handler.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: {
    allowedMethods: [HttpMethod.POST],
    allowedOrigins: ['*']
  }
})

// Reserve concurrency
this.handler.addAlias('prod', {
  version: this.handler.currentVersion,
  provisionedConcurrencyConfig: {
    provisionedConcurrency: 10
  }
})
```

## Maintenance

### Updates

1. **Code Updates**:
   ```bash
   # Deploy updated code
   npm run deploy
   ```

2. **Infrastructure Updates**:
   ```bash
   # Review changes
   npx cdk diff
   
   # Deploy changes
   npx cdk deploy
   ```

3. **Dependency Updates**:
   ```bash
   # Update CDK
   npm update aws-cdk-lib
   
   # Update dependencies
   npm update
   ```

### Backup and Recovery

1. **Infrastructure as Code**: CDK templates are version controlled
2. **Secrets**: AWS Secrets Manager handles backups automatically
3. **Code**: Stored in version control and CDK assets
4. **Logs**: CloudWatch log retention policy

## Troubleshooting

### Deployment Issues

1. **CDK Bootstrap Required**:
   ```bash
   npx cdk bootstrap aws://123456789012/us-east-1
   ```

2. **Insufficient Permissions**:
   ```bash
   # Check AWS credentials
   aws sts get-caller-identity
   
   # Verify permissions with dry run
   npx cdk synth
   ```

3. **Stack Already Exists**:
   ```bash
   # Check existing stacks
   aws cloudformation list-stacks
   
   # Delete if needed
   npx cdk destroy
   ```

### Runtime Issues

1. **Lambda Timeout**:
   ```typescript
   // Increase timeout
   timeout: Duration.seconds(60)
   ```

2. **Memory Issues**:
   ```typescript
   // Increase memory
   memorySize: 2048
   ```

3. **Permission Errors**:
   ```bash
   # Check CloudWatch logs
   aws logs describe-log-streams \
     --log-group-name "/aws/lambda/qc-mcp-lambda-handler"
   ```

### Monitoring Commands

```bash
# Check function status
aws lambda get-function --function-name qc-mcp-lambda-handler

# View recent logs
aws logs tail /aws/lambda/qc-mcp-lambda-handler --follow

# Check API Gateway metrics
aws apigateway get-usage-plans

# Monitor CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=qc-mcp-lambda-handler \
  --start-time 2023-12-01T00:00:00Z \
  --end-time 2023-12-01T23:59:59Z \
  --period 3600 \
  --statistics Average
```

## Development Workflow

### Local Testing
```bash
# Use SAM for local testing
sam local start-api --template-file cdk.out/QuantConnectMCPStack.template.json
```

### CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Deploy Infrastructure
on:
  push:
    branches: [main]
    paths: ['infra/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: 'infra/package-lock.json'
      
      - name: Install dependencies
        run: |
          cd infra
          npm ci
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Deploy CDK stack
        run: |
          cd infra
          npx cdk deploy --require-approval never
```

## Advanced Configuration

### Multiple Environments

```typescript
// Environment-specific configuration
const envConfig = {
  dev: {
    memorySize: 512,
    timeout: Duration.seconds(30),
    logRetention: RetentionDays.ONE_DAY
  },
  prod: {
    memorySize: 1024,
    timeout: Duration.seconds(30),
    logRetention: RetentionDays.THREE_DAYS
  }
}

const env = process.env.NODE_ENV || 'dev'
const config = envConfig[env]
```

### Custom Domain

```typescript
import { DomainName } from 'aws-cdk-lib/aws-apigateway'
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager'

const domainName = new DomainName(this, 'CustomDomain', {
  domainName: 'mcp-api.yourdomain.com',
  certificate: Certificate.fromCertificateArn(
    this, 'Certificate', 
    'arn:aws:acm:us-east-1:123456789012:certificate/...'
  )
})

this.restAPI.addDomainName('CustomDomainMapping', {
  domainName: domainName
})
```

### VPC Configuration

```typescript
import { Vpc } from 'aws-cdk-lib/aws-ec2'

const vpc = Vpc.fromLookup(this, 'VPC', {
  vpcId: 'vpc-12345678'
})

this.handler = new NodejsFunction(this, 'handler', {
  // ... other config
  vpc: vpc,
  vpcSubnets: {
    subnetType: SubnetType.PRIVATE_WITH_EGRESS
  }
})
```

This infrastructure provides a robust, scalable, and secure foundation for running the QuantConnect MCP server in production.

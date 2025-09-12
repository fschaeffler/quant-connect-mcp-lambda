import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib'
import { LambdaIntegration, MockIntegration, PassthroughBehavior, Resource, RestApi, UsagePlan } from 'aws-cdk-lib/aws-apigateway'
import { ApiKey, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2'
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs'
import { Secret } from 'aws-cdk-lib/aws-secretsmanager'
import { Construct } from 'constructs'
import path from 'path'

export class QuantConnectMCPStack extends Stack {
  private static readonly NPM_ROOT = path.join(path.dirname(__filename), '..', '..')
  private readonly restAPI: RestApi
  private readonly handler: NodejsFunction
  private readonly mcpResource: Resource
  private readonly restAPIUsagePlan: UsagePlan

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    this.restAPI = new RestApi(this, 'qc-mcp-api-gateway', {
      restApiName: 'qc-mcp-api-gateway',
      description: 'This service serves QuantConnect MCP requests.',
      deployOptions: {
        stageName: 'prod',
      },
    })

    this.restAPIUsagePlan = this.restAPI.addUsagePlan('qc-mcp-usage-plan', {
      name: 'qc-mcp-usage-plan',
      apiStages: [
        {
          api: this.restAPI,
          stage: this.restAPI.deploymentStage,
        },
      ],
    })

    this.restAPIUsagePlan.addApiKey(new ApiKey(this, 'qc-mcp-api-key', { apiKeyName: 'qc-mcp-api-key' }))

    this.mcpResource = this.restAPI.root.addResource('mcp')

    this.handler = new NodejsFunction(this, 'qc-mcp-lambda-handler', {
      entry: path.join(QuantConnectMCPStack.NPM_ROOT, 'services', 'quant-connect', 'src', 'index.ts'),
      handler: 'handler',
      functionName: 'qc-mcp-lambda-handler',
      memorySize: 1024,
      runtime: Runtime.NODEJS_22_X,
      timeout: Duration.seconds(30),
      bundling: {
        minify: true,
        tsconfig: path.join(QuantConnectMCPStack.NPM_ROOT, 'services', 'quant-connect', 'tsconfig.json'),
      },
      logGroup: new LogGroup(this, 'qc-mcp-lambda-log-group', {
        logGroupName: '/aws/lambda/qc-mcp-lambda-handler',
        removalPolicy: RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
        retention: RetentionDays.THREE_DAYS,
      }),
    })

    const secrets = [
      new Secret(this, 'quant-connect-mcp-secret-user-id', { secretName: 'quant-connect-mcp/user-id' }),
      new Secret(this, 'quant-connect-mcp-secret-api-token', { secretName: 'quant-connect-mcp/api-token' }),
    ]

    Object.values(secrets).forEach((secret) => {
      secret.grantRead(this.handler)
    })

    this.handler.addPermission('qc-mcp-api-gateway-integration', {
      principal: new ServicePrincipal('apigateway.amazonaws.com'),
    })

    this.mcpResource.addMethod(HttpMethod.POST, new LambdaIntegration(this.handler), { apiKeyRequired: true })

    this.mcpResource.addMethod(
      HttpMethod.GET,
      new MockIntegration({
        integrationResponses: [
          {
            statusCode: '405',
            responseParameters: {
              'method.response.header.Allow': "'POST, OPTIONS'",
              'method.response.header.Content-Type': "'application/json'",
            },
            responseTemplates: {
              'application/json': '{"message": "SSE streaming is not supported. Use POST /mcp for JSON-RPC requests."}',
              'text/plain': 'SSE streaming is not supported. Use POST /mcp for JSON-RPC requests.',
            },
          },
        ],
        passthroughBehavior: PassthroughBehavior.NEVER,
      }),
      {
        methodResponses: [
          {
            statusCode: '405',
            responseParameters: {
              'method.response.header.Allow': true,
              'method.response.header.Content-Type': true,
            },
          },
        ],
        apiKeyRequired: true,
      }
    )

    this.mcpResource.addMethod(
      HttpMethod.OPTIONS,
      new MockIntegration({
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': "'*'",
              'method.response.header.Access-Control-Allow-Headers': "'*'",
              'method.response.header.Access-Control-Allow-Methods': "'POST, GET, OPTIONS'",
            },
          },
        ],
        requestTemplates: {
          'application/json': '{"statusCode": 200}',
          'text/plain': '200 (OK)',
        },
        passthroughBehavior: PassthroughBehavior.NEVER,
      }),
      {
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': true,
              'method.response.header.Access-Control-Allow-Headers': true,
              'method.response.header.Access-Control-Allow-Methods': true,
            },
          },
        ],
      }
    )
  }
}

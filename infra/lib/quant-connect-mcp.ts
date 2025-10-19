import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib'
import { LambdaIntegration, MockIntegration, PassthroughBehavior, QuotaSettings, Resource, RestApi, ThrottleSettings, UsagePlan } from 'aws-cdk-lib/aws-apigateway'
import { ApiKey, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2'
import { Alarm, ComparisonOperator, Metric, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch'
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions'
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { FilterPattern, LogGroup, MetricFilter, RetentionDays } from 'aws-cdk-lib/aws-logs'
import { Secret } from 'aws-cdk-lib/aws-secretsmanager'
import { Topic } from 'aws-cdk-lib/aws-sns'
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions'
import { Construct } from 'constructs'
import path from 'path'

export class QuantConnectMCPStack extends Stack {
  private static readonly NPM_ROOT = path.join(path.dirname(__filename), '..', '..')
  private readonly restAPI: RestApi
  private readonly handler: NodejsFunction
  private readonly mcpResource: Resource
  private readonly restAPIUsagePlan: UsagePlan
  private readonly alertsTopic: Topic

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    // Create SNS topic for security alerts
    this.alertsTopic = new Topic(this, 'qc-mcp-security-alerts', {
      topicName: 'qc-mcp-security-alerts',
      displayName: 'QuantConnect MCP Security Alerts',
    })

    // TODO: Replace with actual email address for production
    this.alertsTopic.addSubscription(new EmailSubscription('admin@example.com'))

    this.restAPI = new RestApi(this, 'qc-mcp-api-gateway', {
      restApiName: 'qc-mcp-api-gateway',
      description: 'This service serves QuantConnect MCP requests.',
      deployOptions: {
        stageName: 'prod',
        throttle: {
          rateLimit: 50,  // Reduced from default 10,000
          burstLimit: 100 // Reduced from default 5,000
        },
      },
    })

    this.restAPIUsagePlan = this.restAPI.addUsagePlan('qc-mcp-usage-plan', {
      name: 'qc-mcp-usage-plan',
      description: 'Usage plan with strict rate limits for financial API protection',
      throttle: {
        rateLimit: 30,   // 30 requests per second per API key
        burstLimit: 60   // 60 burst capacity per API key
      },
      quota: {
        limit: 10000,    // 10,000 requests per day per API key
        period: QuotaSettings.PERIOD_DAY,
      },
      apiStages: [
        {
          api: this.restAPI,
          stage: this.restAPI.deploymentStage,
          throttle: [
            {
              path: '/mcp',
              method: HttpMethod.POST,
              throttle: {
                rateLimit: 20,  // Even stricter for main endpoint
                burstLimit: 40
              }
            }
          ]
        },
      ],
    })

    const apiKey = new ApiKey(this, 'qc-mcp-api-key', { 
      apiKeyName: 'qc-mcp-api-key',
      description: 'API key for QuantConnect MCP access with rate limiting'
    })
    this.restAPIUsagePlan.addApiKey(apiKey)

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

    this.mcpResource.addMethod(HttpMethod.POST, new LambdaIntegration(this.handler), {
      apiKeyRequired: true,
    })

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

    this.setupMonitoringAndAlerting()
  }

  private setupMonitoringAndAlerting(): void {
    // Create metric filters for security events
    const rateLimitViolationFilter = new MetricFilter(this, 'RateLimitViolationFilter', {
      logGroup: this.handler.logGroup,
      metricNamespace: 'QuantConnect/MCP/Security',
      metricName: 'RateLimitViolations',
      filterPattern: FilterPattern.stringValue('$.message', '=', 'SECURITY ALERT: Rate limit exceeded'),
      metricValue: '1',
      defaultValue: 0,
    })

    const criticalOperationFilter = new MetricFilter(this, 'CriticalOperationFilter', {
      logGroup: this.handler.logGroup,
      metricNamespace: 'QuantConnect/MCP/Security',
      metricName: 'CriticalOperations',
      filterPattern: FilterPattern.stringValue('$.severity', '=', 'CRITICAL'),
      metricValue: '1',
      defaultValue: 0,
    })

    // Create alarms
    const rateLimitViolationAlarm = new Alarm(this, 'RateLimitViolationAlarm', {
      alarmName: 'QC-MCP-RateLimit-Violations',
      alarmDescription: 'Alert when rate limit violations occur',
      metric: rateLimitViolationFilter.metric(),
      threshold: 5, // Alert if more than 5 violations in evaluation period
      evaluationPeriods: 2,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    })

    const criticalOperationAlarm = new Alarm(this, 'CriticalOperationAlarm', {
      alarmName: 'QC-MCP-Critical-Operations',
      alarmDescription: 'Alert on critical trading operations rate limit violations',
      metric: criticalOperationFilter.metric(),
      threshold: 1, // Alert on any critical operation violation
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    })

    // API Gateway throttling alarms
    const apiGatewayThrottleAlarm = new Alarm(this, 'ApiGatewayThrottleAlarm', {
      alarmName: 'QC-MCP-ApiGateway-Throttling',
      alarmDescription: 'Alert when API Gateway throttling occurs',
      metric: new Metric({
        namespace: 'AWS/ApiGateway',
        metricName: 'ClientError',
        dimensionsMap: {
          ApiName: this.restAPI.restApiName,
        },
        statistic: 'Sum',
      }),
      threshold: 10,
      evaluationPeriods: 2,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    })

    // Lambda error rate alarm
    const lambdaErrorAlarm = new Alarm(this, 'LambdaErrorAlarm', {
      alarmName: 'QC-MCP-Lambda-Errors',
      alarmDescription: 'Alert on Lambda function errors',
      metric: this.handler.metricErrors(),
      threshold: 5,
      evaluationPeriods: 2,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    })

    // Add SNS actions to all alarms
    const snsAction = new SnsAction(this.alertsTopic)
    rateLimitViolationAlarm.addAlarmAction(snsAction)
    criticalOperationAlarm.addAlarmAction(snsAction)
    apiGatewayThrottleAlarm.addAlarmAction(snsAction)
    lambdaErrorAlarm.addAlarmAction(snsAction)
  }
}

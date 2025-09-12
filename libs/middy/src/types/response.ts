import { ALBResult, APIGatewayProxyResult, APIGatewayProxyResultV2 } from 'aws-lambda'

export type ResponseEvent = APIGatewayProxyResult | APIGatewayProxyResultV2 | ALBResult

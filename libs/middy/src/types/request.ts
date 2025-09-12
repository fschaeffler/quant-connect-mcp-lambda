import { ALBEvent, APIGatewayProxyEvent, APIGatewayProxyEventV2 } from 'aws-lambda'

export type RequestEvent = APIGatewayProxyEvent | APIGatewayProxyEventV2 | ALBEvent

import dotenv from 'dotenv'
dotenv.config()

import { handler } from '@fschaeffler/quant-connect-mcp-service'
import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import http from 'http'
import { Readable } from 'stream'
import { URL } from 'url'

const toApiGwV2Event = (req: http.IncomingMessage, body: string): APIGatewayProxyEventV2 => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const headers = Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, String(v)]))
  const queryStringParameters = Object.fromEntries(url.searchParams)

  return {
    version: '2.0',
    routeKey: `${req.method} ${url.pathname}`,
    rawPath: url.pathname,
    rawQueryString: url.searchParams.toString(),
    headers,
    requestContext: {
      accountId: '123456789012',
      apiId: 'local',
      domainName: headers.host || 'localhost',
      domainPrefix: 'local',
      http: {
        method: req.method || 'GET',
        path: url.pathname,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: req.headers['user-agent'] || '',
      },
      requestId: 'local',
      routeKey: '$default',
      stage: '$default',
      time: new Date().toUTCString(),
      timeEpoch: Date.now(),
    },
    isBase64Encoded: false,
    body: body || undefined,
    queryStringParameters: Object.keys(queryStringParameters).length ? queryStringParameters : undefined,
  }
}

const getApiGwV2DefaultContext = () => ({
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'local',
  functionVersion: '$LATEST',
  invokedFunctionArn: 'arn:aws:lambda:local:000000000000:function:local',
  memoryLimitInMB: '128',
  awsRequestId: 'local',
  logGroupName: '/aws/lambda/local',
  logStreamName: '2020/01/01/[$LATEST]local',
  getRemainingTimeInMillis: () => 10000,
  done: () => undefined,
  fail: () => undefined,
  succeed: () => undefined,
})

const server = http.createServer(async (req, res) => {
  const chunks: Buffer[] = []

  req.on('data', (chunk) => chunks.push(chunk))

  req.on('end', async () => {
    const body = Buffer.concat(chunks).toString('utf8')

    let payload: any = ''

    try {
      const result = await handler(toApiGwV2Event(req, body), getApiGwV2DefaultContext() as any)

      res.statusCode = result?.statusCode ?? 200

      if (result?.headers) {
        Object.entries(result.headers).forEach(([key, value]) => {
          if (typeof value !== 'undefined') {
            res.setHeader(key, String(value))
          }
        })
      }

      if (result?.cookies && result.cookies.length) {
        res.setHeader('set-cookie', result.cookies)
      }

      if (result?.isBase64Encoded === true) {
        payload = Buffer.from(result.body ?? '', 'base64')
      } else {
        payload = result?.body || ''
      }
    } catch (error: any) {
      const errorObj = error as Error

      res.statusCode = error.statusCode ?? 500

      payload = {
        name: errorObj.name || 'InternalServerError',
        message: errorObj.message,
        stack: errorObj.stack,
        cause: errorObj.cause,
      }
    }

    Readable.from([payload]).pipe(res)
  })
})

// eslint-disable-next-line no-console
server.listen(55555, '0.0.0.0', () => console.log('http://0.0.0.0:55555/mcp'))

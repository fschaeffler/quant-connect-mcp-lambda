import type middy from '@middy/core'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type JSONRPCError, type JSONRPCMessage, JSONRPCMessageSchema } from '@modelcontextprotocol/sdk/types.js'
import type { Context } from 'aws-lambda'
import createHttpError from 'http-errors'
import { z } from 'zod'
import type { RequestEvent, ResponseEvent } from '../types'
import { HttpServerTransport } from './http-server-transport'

const createMcpError = (httpStatusCode: number, mcpError: { code: number; message: string }) => {
  const jsonRPCError: JSONRPCError = {
    jsonrpc: '2.0',
    error: mcpError,
    id: 123,
  }

  return createHttpError(httpStatusCode, JSON.stringify(jsonRPCError))
}

type RequestContext = Context & {
  jsonRPCMessages: JSONRPCMessage[]
}

type MCPMiddlewareOptions = {
  server: McpServer
}

const getHeadersWithDefaults = (headers: Record<string, string | number | boolean> | undefined) => ({
  'Content-Type': 'application/json',
  ...headers,
})

export const middyMCP = ({ server }: MCPMiddlewareOptions): middy.MiddlewareObj<RequestEvent, ResponseEvent, Error, RequestContext> => {
  const transport = new HttpServerTransport()
  const serverReady = server.connect(transport)

  return {
    before: async ({ event: { headers, body, isBase64Encoded }, context }) => {
      // eslint-disable-next-line no-console
      console.log('MCP request received', { headers, body, isBase64Encoded })

      const contentTypeHeaderValue = headers?.['content-type'] ?? headers?.['Content-Type']
      const acceptHeaderValue = headers?.['accept'] ?? headers?.['Accept']

      if (acceptHeaderValue === undefined || !acceptHeaderValue.includes('application/json')) {
        throw createMcpError(406, {
          code: -32000,
          message: 'Not Acceptable: Client must accept application/json',
        })
      }

      if (contentTypeHeaderValue === undefined || !contentTypeHeaderValue.includes('application/json')) {
        throw createMcpError(415, {
          code: -32000,
          message: 'Unsupported Media Type: Content-Type must be application/json',
        })
      }

      try {
        const jsonRPCMessages = z
          .string()
          .transform((body) => {
            const decodedBody = isBase64Encoded ? Buffer.from(body, 'base64').toString() : body
            const parsedJSONBody = JSON.parse(decodedBody)

            return Array.isArray(parsedJSONBody) ? parsedJSONBody : [parsedJSONBody]
          })
          .pipe(z.array(JSONRPCMessageSchema))
          .parse(body)

        context.jsonRPCMessages = jsonRPCMessages
      } catch {
        throw createMcpError(422, {
          code: -32000,
          message: 'Unprocessable Entity: Invalid or malformed JSON was provided',
        })
      }
    },
    after: async (request) => {
      await serverReady

      if (request.response === null || typeof request.response === 'string') {
        request.response = {
          headers: {
            'Content-Type': 'text/plain',
          },
          statusCode: 202,
          body: '',
        }
      }

      const responseMessages = await transport.handleJSONRPCMessages(request.context.jsonRPCMessages)

      if (responseMessages !== undefined) {
        request.response = {
          ...request.response,
          headers: getHeadersWithDefaults(request.response?.headers),
          statusCode: 200,
          body:
            Array.isArray(responseMessages) && responseMessages.length === 0
              ? '' // Empty response for notifications
              : JSON.stringify(responseMessages),
        }
      }
    },
  }
}

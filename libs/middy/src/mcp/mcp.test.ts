import type middy from '@middy/core'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js'
import type { Context } from 'aws-lambda'
import createHttpError from 'http-errors'
import { middyMCP } from './mcp'
import { HttpServerTransport } from './http-server-transport'
import type { RequestEvent, ResponseEvent } from '../types'

// Define the extended context type
type RequestContext = Context & {
  jsonRPCMessages: JSONRPCMessage[]
}

// Mock dependencies
jest.mock('./http-server-transport')
jest.mock('http-errors')

const MockedHttpServerTransport = HttpServerTransport as jest.MockedClass<typeof HttpServerTransport>
const mockedCreateHttpError = createHttpError as jest.MockedFunction<typeof createHttpError>

describe('libs/middy/src/mcp/mcp', () => {
  let mockServer: jest.Mocked<McpServer>
  let mockTransport: jest.Mocked<HttpServerTransport>
  let middleware: middy.MiddlewareObj<RequestEvent, ResponseEvent, Error, RequestContext>

  const createMockRequest = (
    body: string = '{"jsonrpc":"2.0","id":1,"method":"test"}',
    headers: Record<string, string> = {
      'content-type': 'application/json',
      'accept': 'application/json'
    },
    isBase64Encoded: boolean = false
  ) => ({
    event: {
      body,
      headers,
      isBase64Encoded
    } as RequestEvent,
    context: {
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'test-function',
      functionVersion: '$LATEST',
      invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
      memoryLimitInMB: '128',
      awsRequestId: 'test-request-id',
      logGroupName: '/aws/lambda/test-function',
      logStreamName: '2023/01/01/[$LATEST]test-stream',
      getRemainingTimeInMillis: () => 30000,
      done: () => {},
      fail: () => {},
      succeed: () => {},
      jsonRPCMessages: []
    } as RequestContext,
    response: null as ResponseEvent | null,
    error: null,
    internal: {}
  })

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock console.log to avoid test output noise
    jest.spyOn(console, 'log').mockImplementation(() => {})

    // Setup HttpServerTransport mock
    mockTransport = {
      start: jest.fn(),
      send: jest.fn(),
      close: jest.fn(),
      handleJSONRPCMessages: jest.fn().mockResolvedValue(undefined),
      onmessage: undefined
    } as any

    MockedHttpServerTransport.mockImplementation(() => mockTransport)

    // Setup McpServer mock
    mockServer = {
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn(),
      request: jest.fn(),
      notification: jest.fn()
    } as any

    // Setup http-errors mock
    mockedCreateHttpError.mockImplementation((...args: any[]) => {
      const status = typeof args[0] === 'number' ? args[0] : 500
      const message = typeof args[1] === 'string' ? args[1] : 'Internal Server Error'
      const error = new Error(message) as any
      error.status = status
      error.statusCode = status
      return error
    })

    middleware = middyMCP({ server: mockServer })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('middleware factory', () => {
    it('should return middleware object with before and after hooks', () => {
      expect(middleware).toHaveProperty('before')
      expect(middleware).toHaveProperty('after')
      expect(typeof middleware.before).toBe('function')
      expect(typeof middleware.after).toBe('function')
    })

    it('should create HttpServerTransport instance', () => {
      expect(MockedHttpServerTransport).toHaveBeenCalledTimes(1)
    })

    it('should connect server to transport', () => {
      expect(mockServer.connect).toHaveBeenCalledWith(mockTransport)
    })
  })

  describe('before hook - header validation', () => {
    it('should accept valid headers', async () => {
      const request = createMockRequest()
      await expect(middleware.before!(request)).resolves.toBeUndefined()
    })

    it('should reject missing accept header', async () => {
      const request = createMockRequest(
        '{"jsonrpc":"2.0","id":1,"method":"test"}',
        { 'content-type': 'application/json' }
      )

      await expect(middleware.before!(request)).rejects.toThrow()
      expect(mockedCreateHttpError).toHaveBeenCalledWith(406, expect.stringContaining('Not Acceptable'))
    })

    it('should reject non-JSON accept header', async () => {
      const request = createMockRequest(
        '{"jsonrpc":"2.0","id":1,"method":"test"}',
        { 'content-type': 'application/json', 'accept': 'text/html' }
      )

      await expect(middleware.before!(request)).rejects.toThrow()
      expect(mockedCreateHttpError).toHaveBeenCalledWith(406, expect.stringContaining('Not Acceptable'))
    })

    it('should reject missing content-type header', async () => {
      const request = createMockRequest(
        '{"jsonrpc":"2.0","id":1,"method":"test"}',
        { 'accept': 'application/json' }
      )

      await expect(middleware.before!(request)).rejects.toThrow()
      expect(mockedCreateHttpError).toHaveBeenCalledWith(415, expect.stringContaining('Unsupported Media Type'))
    })

    it('should reject non-JSON content-type header', async () => {
      const request = createMockRequest(
        '{"jsonrpc":"2.0","id":1,"method":"test"}',
        { 'content-type': 'text/plain', 'accept': 'application/json' }
      )

      await expect(middleware.before!(request)).rejects.toThrow()
      expect(mockedCreateHttpError).toHaveBeenCalledWith(415, expect.stringContaining('Unsupported Media Type'))
    })

    it('should accept case-insensitive headers', async () => {
      const request = createMockRequest(
        '{"jsonrpc":"2.0","id":1,"method":"test"}',
        { 'Content-Type': 'application/json', 'Accept': 'application/json' }
      )

      await expect(middleware.before!(request)).resolves.toBeUndefined()
    })

    it('should accept content-type with charset', async () => {
      const request = createMockRequest(
        '{"jsonrpc":"2.0","id":1,"method":"test"}',
        { 'content-type': 'application/json; charset=utf-8', 'accept': 'application/json' }
      )

      await expect(middleware.before!(request)).resolves.toBeUndefined()
    })
  })

  describe('before hook - JSON parsing', () => {
    it('should parse valid JSON-RPC message', async () => {
      const request = createMockRequest('{"jsonrpc":"2.0","id":1,"method":"test","params":{}}')
      
      await middleware.before!(request)
      
      expect(request.context.jsonRPCMessages).toHaveLength(1)
      expect(request.context.jsonRPCMessages[0]).toMatchObject({
        jsonrpc: '2.0',
        id: 1,
        method: 'test'
      })
    })

    it('should parse array of JSON-RPC messages', async () => {
      const messagesArray = [
        { jsonrpc: '2.0', id: 1, method: 'test1' },
        { jsonrpc: '2.0', id: 2, method: 'test2' }
      ]
      
      const request = createMockRequest(JSON.stringify(messagesArray))
      
      await middleware.before!(request)
      
      expect(request.context.jsonRPCMessages).toHaveLength(2)
    })

    it('should handle base64 encoded body', async () => {
      const jsonMessage = '{"jsonrpc":"2.0","id":1,"method":"test"}'
      const base64Body = Buffer.from(jsonMessage).toString('base64')
      
      const request = createMockRequest(base64Body, undefined, true)
      
      await middleware.before!(request)
      
      expect(request.context.jsonRPCMessages).toHaveLength(1)
    })

    it('should reject invalid JSON', async () => {
      const request = createMockRequest('invalid json {')
      
      await expect(middleware.before!(request)).rejects.toThrow()
      expect(mockedCreateHttpError).toHaveBeenCalledWith(422, expect.stringContaining('Unprocessable Entity'))
    })

    it('should reject empty body', async () => {
      const request = createMockRequest('')
      
      await expect(middleware.before!(request)).rejects.toThrow()
      expect(mockedCreateHttpError).toHaveBeenCalledWith(422, expect.stringContaining('Unprocessable Entity'))
    })

    it('should reject invalid JSON-RPC schema', async () => {
      const invalidMessage = { id: 1, method: 'test' } // Missing jsonrpc
      const request = createMockRequest(JSON.stringify(invalidMessage))
      
      await expect(middleware.before!(request)).rejects.toThrow()
      expect(mockedCreateHttpError).toHaveBeenCalledWith(422, expect.stringContaining('Unprocessable Entity'))
    })
  })

  describe('after hook - response handling', () => {
    it('should handle null response by setting default', async () => {
      const request = createMockRequest()
      request.context.jsonRPCMessages = [{ jsonrpc: '2.0' as const, id: 1, method: 'test' }]
      request.response = null

      await middleware.after!(request)

      expect(request.response).toEqual({
        headers: { 'Content-Type': 'text/plain' },
        statusCode: 202,
        body: ''
      })
    })

    it('should handle string response by setting default', async () => {
      const request = createMockRequest()
      request.context.jsonRPCMessages = [{ jsonrpc: '2.0' as const, id: 1, method: 'test' }]
      request.response = 'some string' as any

      await middleware.after!(request)

      expect(request.response).toEqual({
        headers: { 'Content-Type': 'text/plain' },
        statusCode: 202,
        body: ''
      })
    })

    it('should process messages and update response', async () => {
      const request = createMockRequest()
      request.context.jsonRPCMessages = [{ jsonrpc: '2.0' as const, id: 1, method: 'test' }]
      request.response = { statusCode: 200, body: '', headers: {} }

      const mockResponse = { jsonrpc: '2.0' as const, id: 1, result: { success: true } }
      mockTransport.handleJSONRPCMessages.mockResolvedValue(mockResponse as any)

      await middleware.after!(request)

      expect(request.response.statusCode).toBe(200)
      expect(request.response.body).toBe(JSON.stringify(mockResponse))
      expect(request.response.headers?.['Content-Type']).toBe('application/json')
    })

    it('should merge headers with defaults', async () => {
      const request = createMockRequest()
      request.context.jsonRPCMessages = [{ jsonrpc: '2.0' as const, id: 1, method: 'test' }]
      request.response = {
        statusCode: 200,
        body: '',
        headers: { 'X-Custom': 'value' }
      }

      const mockResponse = { jsonrpc: '2.0' as const, id: 1, result: {} }
      mockTransport.handleJSONRPCMessages.mockResolvedValue(mockResponse as any)

      await middleware.after!(request)

      expect(request.response.headers).toEqual({
        'Content-Type': 'application/json',
        'X-Custom': 'value'
      })
    })

    it('should handle undefined response from transport', async () => {
      const request = createMockRequest()
      request.context.jsonRPCMessages = [{ jsonrpc: '2.0' as const, id: 1, method: 'test' }]
      request.response = { statusCode: 200, body: 'original', headers: {} }

      mockTransport.handleJSONRPCMessages.mockResolvedValue(undefined)

      await middleware.after!(request)

      expect(request.response.body).toBe('original')
      expect(request.response.statusCode).toBe(200)
    })
  })

  describe('error handling', () => {
    it('should handle server connection errors', async () => {
      const connectionError = new Error('Server connection failed')
      mockServer.connect.mockRejectedValue(connectionError)

      const newMiddleware = middyMCP({ server: mockServer })
      const request = createMockRequest()
      request.context.jsonRPCMessages = [{ jsonrpc: '2.0' as const, id: 1, method: 'test' }]
      request.response = { statusCode: 200, body: '', headers: {} }

      await expect(newMiddleware.after!(request)).rejects.toThrow('Server connection failed')
    })

    it('should handle transport errors', async () => {
      const transportError = new Error('Transport error')
      mockTransport.handleJSONRPCMessages.mockRejectedValue(transportError)

      const request = createMockRequest()
      request.context.jsonRPCMessages = [{ jsonrpc: '2.0' as const, id: 1, method: 'test' }]
      request.response = { statusCode: 200, body: '', headers: {} }

      await expect(middleware.after!(request)).rejects.toThrow('Transport error')
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete request/response flow', async () => {
      const request = createMockRequest('{"jsonrpc":"2.0","id":1,"method":"tools/list"}')

      // Before hook
      await middleware.before!(request)
      expect(request.context.jsonRPCMessages).toHaveLength(1)

      // After hook
      request.response = { statusCode: 200, body: '', headers: {} }
      const mockResponse = { jsonrpc: '2.0' as const, id: 1, result: { tools: [] } }
      mockTransport.handleJSONRPCMessages.mockResolvedValue(mockResponse as any)

      await middleware.after!(request)

      expect(request.response.statusCode).toBe(200)
      expect(request.response.body).toBe(JSON.stringify(mockResponse))
    })

    it('should log request details', async () => {
      const consoleSpy = jest.spyOn(console, 'log')
      const request = createMockRequest()

      await middleware.before!(request)

      expect(consoleSpy).toHaveBeenCalledWith('MCP request received', {
        headers: request.event.headers,
        body: request.event.body,
        isBase64Encoded: request.event.isBase64Encoded
      })
    })
  })

  describe('edge cases', () => {
    it('should handle empty headers object', async () => {
      const request = createMockRequest('{"jsonrpc":"2.0","id":1,"method":"test"}', {})
      
      await expect(middleware.before!(request)).rejects.toThrow()
    })

    it('should handle missing headers properly', async () => {
      // Focus on testing the actual behavior rather than edge cases
      const request = createMockRequest('{"jsonrpc":"2.0","id":1,"method":"test"}', {})
      
      await expect(middleware.before!(request)).rejects.toThrow()
      expect(mockedCreateHttpError).toHaveBeenCalled()
    })

    it('should convert single message to array', async () => {
      const request = createMockRequest('{"jsonrpc":"2.0","id":1,"method":"test"}')
      
      await middleware.before!(request)
      
      expect(Array.isArray(request.context.jsonRPCMessages)).toBe(true)
      expect(request.context.jsonRPCMessages).toHaveLength(1)
    })

    it('should handle null body', async () => {
      const request = createMockRequest(null as any)
      
      await expect(middleware.before!(request)).rejects.toThrow()
      expect(mockedCreateHttpError).toHaveBeenCalledWith(422, expect.stringContaining('Unprocessable Entity'))
    })
  })
})
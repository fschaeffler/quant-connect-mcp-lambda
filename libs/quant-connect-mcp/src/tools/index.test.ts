/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable max-lines-per-function */
/* eslint-disable @typescript-eslint/no-empty-function */
import { QCClient } from '@fschaeffler/quant-connect-client'
import { z, ZodObject } from 'zod'
import { QCMCPServer } from '../server'
import { injectCodeSourceId } from '../utils'
import { getAccountToolsDefinitions } from './account-tools'
import { getAIToolsDefinitions } from './ai-tools'
import { getBacktestToolsDefinitions } from './backtest-tools'
import { getCompileToolsDefinitions } from './compile-tools'
import { getFileToolsDefinitions } from './file-tools'
import {
  registerTools,
  ToolRegistrationDefinitionData,
  ToolRegistrationDefinitionDataCommon,
  ToolRegistrationDefinitionDataCustom,
  ToolRegistrationDefinitionDataQCAPI,
  ToolRegistrationDefinitions,
} from './index'
import { getLeanVersionToolsDefinitions } from './lean-version-tools'
import { getLiveCommandToolsDefinitions } from './live-command-tools'
import { getLiveToolsDefinitions } from './live-tools'
import { getMCPServerToolsDefinitions } from './mcp-server-tools'
import { getObjectStoreToolsDefinitions } from './object-store-tools'
import { getOptimizationToolsDefinitions } from './optimization-tools'
import { getProjectCollaborationToolsDefinitions } from './project-collaboration-tools'
import { getProjectNodeToolsDefinitions } from './project-node-tools'
import { getProjectToolsDefinitions } from './project-tools'

// Mock dependencies
jest.mock('@fschaeffler/quant-connect-client')
jest.mock('../server')
jest.mock('../utils')
jest.mock('./account-tools')
jest.mock('./ai-tools')
jest.mock('./backtest-tools')
jest.mock('./compile-tools')
jest.mock('./file-tools')
jest.mock('./lean-version-tools')
jest.mock('./live-command-tools')
jest.mock('./live-tools')
jest.mock('./mcp-server-tools')
jest.mock('./object-store-tools')
jest.mock('./optimization-tools')
jest.mock('./project-collaboration-tools')
jest.mock('./project-node-tools')
jest.mock('./project-tools')

const MockedQCClient = jest.mocked(QCClient)
jest.mocked(QCMCPServer)
const mockedInjectCodeSourceId = injectCodeSourceId as jest.MockedFunction<typeof injectCodeSourceId>

// Mock tool definitions
const mockCustomTool = {
  config: {
    title: 'Mock Custom Tool',
    description: 'A mock custom tool for testing.',
    inputSchema: { param1: z.string() },
    outputSchema: { result: z.string() },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  },
  func: jest.fn().mockResolvedValue({ result: 'custom result' }),
}

const mockAPITool = {
  config: {
    title: 'Mock API Tool',
    description: 'A mock API tool for testing.',
    inputSchema: { param1: z.string() },
    outputSchema: { result: z.string() },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  },
  url: '/mock/api',
}

const mockAPIToolWithCodeSourceId = {
  config: {
    title: 'Mock API Tool with Code Source ID',
    description: 'A mock API tool that injects code source ID.',
    inputSchema: { param1: z.string() },
    outputSchema: { result: z.string() },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  url: '/mock/api/with-code-source-id',
  injectCodeSourceId: true,
}

const mockAPIToolWithoutOutputSchema = {
  config: {
    title: 'Mock API Tool without Output Schema',
    description: 'A mock API tool without output schema.',
    inputSchema: { param1: z.string() },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  },
  url: '/mock/api/no-output',
}

const mockInvalidTool = {
  config: {
    title: 'Mock Invalid Tool',
    description: 'A mock invalid tool for testing error cases.',
    inputSchema: { param1: z.string() },
    outputSchema: { result: z.string() },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  },
  // Neither 'func' nor 'url' property
}

describe('libs/quant-connect-mcp/src/tools/index', () => {
  let mockQCClientInstance: jest.Mocked<QCClient>
  let mockQCMCPServerInstance: jest.Mocked<QCMCPServer>
  let mockRegisterTool: jest.MockedFunction<any>

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock QCClient instance
    mockQCClientInstance = {
      post: jest.fn(),
    } as any
    MockedQCClient.getInstance.mockReturnValue(mockQCClientInstance)

    // Mock QCMCPServer instance
    mockRegisterTool = jest.fn()
    mockQCMCPServerInstance = {
      server: {
        registerTool: mockRegisterTool,
      },
    } as any

    // Mock tool definition imports
    ;(getAccountToolsDefinitions as any) = { ACCOUNT_TOOL_1: mockCustomTool }
    ;(getAIToolsDefinitions as any) = { AI_TOOL_1: mockAPITool }
    ;(getBacktestToolsDefinitions as any) = { BACKTEST_TOOL_1: mockAPIToolWithCodeSourceId }
    ;(getCompileToolsDefinitions as any) = { COMPILE_TOOL_1: mockAPIToolWithoutOutputSchema }
    ;(getFileToolsDefinitions as any) = {}
    ;(getLeanVersionToolsDefinitions as any) = {}
    ;(getLiveCommandToolsDefinitions as any) = {}
    ;(getLiveToolsDefinitions as any) = {}
    ;(getMCPServerToolsDefinitions as any) = {}
    ;(getObjectStoreToolsDefinitions as any) = {}
    ;(getOptimizationToolsDefinitions as any) = {}
    ;(getProjectCollaborationToolsDefinitions as any) = {}
    ;(getProjectNodeToolsDefinitions as any) = {}
    ;(getProjectToolsDefinitions as any) = {}

    // Mock utilities
    mockedInjectCodeSourceId.mockImplementation(() => {})
  })

  describe('type definitions', () => {
    it('should define ToolRegistrationDefinitionDataCommon interface', () => {
      const commonData: ToolRegistrationDefinitionDataCommon<any, any> = {
        config: {
          title: 'Test Tool',
          description: 'Test description',
          inputSchema: { param: z.string() },
          outputSchema: { result: z.string() },
          annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
        },
      }

      expect(commonData.config).toBeDefined()
      expect(commonData.config.title).toBe('Test Tool')
      expect(commonData.config.description).toBe('Test description')
      expect(commonData.config.inputSchema).toBeDefined()
      expect(commonData.config.outputSchema).toBeDefined()
      expect(commonData.config.annotations).toBeDefined()
    })

    it('should define ToolRegistrationDefinitionDataCustom interface', () => {
      const customData: ToolRegistrationDefinitionDataCustom<any, any> = {
        config: {
          title: 'Custom Tool',
          description: 'Custom tool description',
        },
        func: jest.fn().mockResolvedValue({ result: 'test' }),
      }

      expect(customData.config).toBeDefined()
      expect(customData.func).toBeDefined()
      expect(typeof customData.func).toBe('function')
    })

    it('should define ToolRegistrationDefinitionDataQCAPI interface', () => {
      const apiData: ToolRegistrationDefinitionDataQCAPI<any, any> = {
        config: {
          title: 'API Tool',
          description: 'API tool description',
        },
        url: '/api/endpoint',
        injectCodeSourceId: true,
      }

      expect(apiData.config).toBeDefined()
      expect(apiData.url).toBe('/api/endpoint')
      expect(apiData.injectCodeSourceId).toBe(true)
    })

    it('should define ToolRegistrationDefinitionData union type', () => {
      const customTool: ToolRegistrationDefinitionData<any, any> = {
        config: { title: 'Custom' },
        func: jest.fn(),
      }

      const apiTool: ToolRegistrationDefinitionData<any, any> = {
        config: { title: 'API' },
        url: '/api',
      }

      expect('func' in customTool).toBe(true)
      expect('url' in customTool).toBe(false)
      expect('func' in apiTool).toBe(false)
      expect('url' in apiTool).toBe(true)
    })

    it('should define ToolRegistrationDefinitions type', () => {
      type TestToolKeys = 'TOOL_1' | 'TOOL_2'
      const definitions: ToolRegistrationDefinitions<TestToolKeys> = {
        TOOL_1: {
          config: { title: 'Tool 1' },
          func: jest.fn(),
        },
        TOOL_2: {
          config: { title: 'Tool 2' },
          url: '/api/tool2',
        },
      }

      expect(definitions.TOOL_1).toBeDefined()
      expect(definitions.TOOL_2).toBeDefined()
      expect('func' in definitions.TOOL_1).toBe(true)
      expect('url' in definitions.TOOL_2).toBe(true)
    })
  })

  describe('registerTools function', () => {
    it('should be a function', () => {
      expect(typeof registerTools).toBe('function')
    })

    it('should register tools when called with QCMCPServer context', () => {
      registerTools.call(mockQCMCPServerInstance)

      expect(mockRegisterTool).toHaveBeenCalled()
      expect(mockRegisterTool.mock.calls.length).toBeGreaterThan(0)
    })

    it('should merge all tool definitions', () => {
      registerTools.call(mockQCMCPServerInstance)

      // Verify that tools from different modules are registered
      const registeredToolNames = mockRegisterTool.mock.calls.map((call: any) => call[0])

      expect(registeredToolNames).toContain('ACCOUNT_TOOL_1')
      expect(registeredToolNames).toContain('AI_TOOL_1')
      expect(registeredToolNames).toContain('BACKTEST_TOOL_1')
      expect(registeredToolNames).toContain('COMPILE_TOOL_1')
    })

    it('should register each tool with correct configuration', () => {
      registerTools.call(mockQCMCPServerInstance)

      // Find the custom tool registration
      const customToolCall = mockRegisterTool.mock.calls.find((call: any) => call[0] === 'ACCOUNT_TOOL_1')
      expect(customToolCall).toBeDefined()
      expect(customToolCall[1]).toEqual(mockCustomTool.config)
      expect(typeof customToolCall[2]).toBe('function')
    })

    it('should handle custom tools with func property', async () => {
      registerTools.call(mockQCMCPServerInstance)

      // Get the handler for the custom tool
      const customToolCall = mockRegisterTool.mock.calls.find((call: any) => call[0] === 'ACCOUNT_TOOL_1')
      const handler = customToolCall[2]

      const testParams = { param1: 'test value' }
      const result = await handler(testParams)

      expect(mockCustomTool.func).toHaveBeenCalledWith(testParams)
      expect(result).toEqual({
        content: [],
        structuredContent: { result: 'custom result' },
      })
    })

    it('should handle API tools with url property', async () => {
      mockQCClientInstance.post.mockResolvedValue({ result: 'api result' })

      registerTools.call(mockQCMCPServerInstance)

      // Get the handler for the API tool
      const apiToolCall = mockRegisterTool.mock.calls.find((call: any) => call[0] === 'AI_TOOL_1')
      const handler = apiToolCall[2]

      const testParams = { param1: 'test value' }
      const result = await handler(testParams)

      expect(mockQCClientInstance.post).toHaveBeenCalledWith('/mock/api', testParams)
      expect(result).toEqual({
        content: [],
        structuredContent: { result: 'api result' },
      })
    })

    it('should inject code source ID when injectCodeSourceId is true', async () => {
      mockQCClientInstance.post.mockResolvedValue({ result: 'api result with code source id' })

      registerTools.call(mockQCMCPServerInstance)

      // Get the handler for the API tool with code source ID injection
      const apiToolCall = mockRegisterTool.mock.calls.find((call: any) => call[0] === 'BACKTEST_TOOL_1')
      const handler = apiToolCall[2]

      const testParams = { param1: 'test value' }
      await handler(testParams)

      expect(mockedInjectCodeSourceId).toHaveBeenCalledWith(mockAPIToolWithCodeSourceId.config.inputSchema)
      expect(mockQCClientInstance.post).toHaveBeenCalledWith('/mock/api/with-code-source-id', testParams)
    })

    it('should not inject code source ID when injectCodeSourceId is false or undefined', async () => {
      mockQCClientInstance.post.mockResolvedValue({ result: 'api result' })

      registerTools.call(mockQCMCPServerInstance)

      // Get the handler for the API tool without code source ID injection
      const apiToolCall = mockRegisterTool.mock.calls.find((call: any) => call[0] === 'AI_TOOL_1')
      const handler = apiToolCall[2]

      const testParams = { param1: 'test value' }
      await handler(testParams)

      expect(mockedInjectCodeSourceId).not.toHaveBeenCalled()
    })

    it('should parse response with output schema when provided', async () => {
      const mockApiResponse = { result: 'parsed result', extra: 'ignored' }
      mockQCClientInstance.post.mockResolvedValue(mockApiResponse)

      // Mock ZodObject.create and parse
      const mockParse = jest.fn().mockReturnValue({ result: 'parsed result' })
      const mockZodObject = { parse: mockParse }
      jest.spyOn(ZodObject, 'create').mockReturnValue(mockZodObject as any)

      registerTools.call(mockQCMCPServerInstance)

      // Get the handler for the API tool with output schema
      const apiToolCall = mockRegisterTool.mock.calls.find((call: any) => call[0] === 'AI_TOOL_1')
      const handler = apiToolCall[2]

      const result = await handler({ param1: 'test' })

      expect(ZodObject.create).toHaveBeenCalledWith(mockAPITool.config.outputSchema)
      expect(mockParse).toHaveBeenCalledWith(mockApiResponse)
      expect(result).toEqual({
        content: [],
        structuredContent: { result: 'parsed result' },
      })
    })

    it('should not parse response when output schema is not provided', async () => {
      const mockApiResponse = { result: 'unparsed result' }
      mockQCClientInstance.post.mockResolvedValue(mockApiResponse)

      const createSpy = jest.spyOn(ZodObject, 'create')

      registerTools.call(mockQCMCPServerInstance)

      // Get the handler for the API tool without output schema
      const apiToolCall = mockRegisterTool.mock.calls.find((call: any) => call[0] === 'COMPILE_TOOL_1')
      const handler = apiToolCall[2]

      const result = await handler({ param1: 'test' })

      expect(createSpy).not.toHaveBeenCalled()
      expect(result).toEqual({
        content: [],
        structuredContent: mockApiResponse,
      })
    })

    it('should throw error for invalid tool definition', async () => {
      // Add an invalid tool to the definitions
      ;(getAccountToolsDefinitions as any) = { INVALID_TOOL: mockInvalidTool }

      registerTools.call(mockQCMCPServerInstance)

      // Get the handler for the invalid tool
      const invalidToolCall = mockRegisterTool.mock.calls.find((call: any) => call[0] === 'INVALID_TOOL')
      const handler = invalidToolCall[2]

      await expect(handler({ param1: 'test' })).rejects.toThrow('Invalid tool definition')
    })

    it('should handle custom tool function errors', async () => {
      const customError = new Error('Custom tool error')
      mockCustomTool.func.mockRejectedValue(customError)

      registerTools.call(mockQCMCPServerInstance)

      const customToolCall = mockRegisterTool.mock.calls.find((call: any) => call[0] === 'ACCOUNT_TOOL_1')
      const handler = customToolCall[2]

      await expect(handler({ param1: 'test' })).rejects.toThrow('Custom tool error')
    })

    it('should handle API tool request errors', async () => {
      const apiError = new Error('API request failed')
      mockQCClientInstance.post.mockRejectedValue(apiError)

      registerTools.call(mockQCMCPServerInstance)

      const apiToolCall = mockRegisterTool.mock.calls.find((call: any) => call[0] === 'AI_TOOL_1')
      const handler = apiToolCall[2]

      await expect(handler({ param1: 'test' })).rejects.toThrow('API request failed')
    })

    it('should handle Zod parsing errors', async () => {
      const mockApiResponse = { invalid: 'response' }
      mockQCClientInstance.post.mockResolvedValue(mockApiResponse)

      const parseError = new Error('Zod parsing failed')
      const mockParse = jest.fn().mockImplementation(() => {
        throw parseError
      })
      const mockZodObject = { parse: mockParse }
      jest.spyOn(ZodObject, 'create').mockReturnValue(mockZodObject as any)

      registerTools.call(mockQCMCPServerInstance)

      const apiToolCall = mockRegisterTool.mock.calls.find((call: any) => call[0] === 'AI_TOOL_1')
      const handler = apiToolCall[2]

      await expect(handler({ param1: 'test' })).rejects.toThrow('Zod parsing failed')
    })
  })
})

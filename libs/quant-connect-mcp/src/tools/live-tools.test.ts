/* eslint-disable max-lines-per-function */
import { QCClient } from '@fschaeffler/quant-connect-client'
import {
  authorizeLiveAuth0Body,
  createLiveBody,
  createLiveResponse,
  liquidateLiveBody,
  liquidateLiveResponse,
  listLiveBody,
  listLiveResponse,
  readLiveAuth0Response,
  readLiveBody,
  readLiveChartBody,
  readLiveInsightBody,
  readLiveInsightResponse,
  readLiveLogBody,
  readLiveLogResponse,
  readLiveOrderBody,
  readLivePortfolioBody,
  readLivePortfolioResponse,
  stopLiveBody,
  stopLiveResponse,
} from '@fschaeffler/quant-connect-types'
import { mergeUnionToRawShape } from '../utils'
import { getLiveToolsDefinitions } from './live-tools'
import { LIVE_TOOL_KEYS } from './tool-keys'

// Mock dependencies
jest.mock('@fschaeffler/quant-connect-client')
jest.mock('../utils')

const mockedQCClient = QCClient as jest.Mocked<typeof QCClient>
const mockedMergeUnionToRawShape = mergeUnionToRawShape as jest.MockedFunction<typeof mergeUnionToRawShape>

describe('libs/quant-connect-mcp/src/tools/live-tools', () => {
  let mockQCClientInstance: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock QCClient instance
    mockQCClientInstance = {
      postWithRawResponse: jest.fn().mockResolvedValue({
        headers: {
          Location: 'https://auth.example.com/callback?code=abc123',
        },
      }),
      post: jest.fn().mockResolvedValue({
        success: true,
        liveAlgorithm: {
          id: 'live-123',
          name: 'Test Live Algorithm',
          status: 'running',
        },
      }),
    }

    mockedQCClient.getInstance.mockReturnValue(mockQCClientInstance)

    // Mock mergeUnionToRawShape
    mockedMergeUnionToRawShape.mockReturnValue({ merged: 'schema' } as any)
  })

  describe('tool definitions export', () => {
    it('should export getLiveToolsDefinitions', () => {
      expect(getLiveToolsDefinitions).toBeDefined()
      expect(typeof getLiveToolsDefinitions).toBe('object')
    })

    it('should contain all expected live tools', () => {
      const toolKeys = Object.keys(getLiveToolsDefinitions)

      expect(toolKeys).toContain(LIVE_TOOL_KEYS.AUTHORIZE_CONNECTION_STEP1)
      expect(toolKeys).toContain(LIVE_TOOL_KEYS.AUTHORIZE_CONNECTION_STEP2)
      expect(toolKeys).toContain(LIVE_TOOL_KEYS.CREATE_LIVE_ALGORITHM)
      expect(toolKeys).toContain(LIVE_TOOL_KEYS.READ_LIVE_ALGORITHM)
      expect(toolKeys).toContain(LIVE_TOOL_KEYS.LIST_LIVE_ALGORITHMS)
      expect(toolKeys).toContain(LIVE_TOOL_KEYS.READ_LIVE_CHART)
      expect(toolKeys).toContain(LIVE_TOOL_KEYS.READ_LIVE_LOGS)
      expect(toolKeys).toContain(LIVE_TOOL_KEYS.READ_LIVE_PORTFOLIO)
      expect(toolKeys).toContain(LIVE_TOOL_KEYS.READ_LIVE_ORDERS)
      expect(toolKeys).toContain(LIVE_TOOL_KEYS.READ_LIVE_INSIGHTS)
      expect(toolKeys).toContain(LIVE_TOOL_KEYS.STOP_LIVE_ALGORITHM)
      expect(toolKeys).toContain(LIVE_TOOL_KEYS.LIQUIDATE_LIVE_ALGORITHM)
    })

    it('should have exactly the expected number of tools', () => {
      const toolKeys = Object.keys(getLiveToolsDefinitions)
      expect(toolKeys).toHaveLength(12)
    })
  })

  describe('AUTHORIZE_CONNECTION_STEP1 tool', () => {
    const authStep1Tool = getLiveToolsDefinitions[LIVE_TOOL_KEYS.AUTHORIZE_CONNECTION_STEP1]

    it('should have proper configuration', () => {
      expect(authStep1Tool.config.title).toBe('Authorize external connection - Step 1')
      expect(authStep1Tool.config.description).toContain('Authorize an external connection')
      expect(authStep1Tool.config.description).toContain('Authorization process is always in two steps')
      expect(authStep1Tool.config.description).toContain('URL is returned that needs to get opened')
      expect(authStep1Tool.config.inputSchema).toBe(authorizeLiveAuth0Body.shape)
    })

    it('should have custom output schema with authURL', () => {
      expect(authStep1Tool.config.outputSchema).toBeDefined()
      expect(authStep1Tool.config.outputSchema).toHaveProperty('authURL')
    })

    it('should have proper annotations for authorization', () => {
      expect(authStep1Tool.config.annotations?.readOnlyHint).toBe(false)
      expect(authStep1Tool.config.annotations?.destructiveHint).toBe(false)
      expect(authStep1Tool.config.annotations?.idempotentHint).toBe(true)
    })

    it('should be a custom tool with function', () => {
      expect('func' in authStep1Tool).toBe(true)
      expect('url' in authStep1Tool).toBe(false)
      if ('func' in authStep1Tool) {
        expect(typeof authStep1Tool.func).toBe('function')
      }
    })

    it('should execute custom function and extract redirect URL', async () => {
      if ('func' in authStep1Tool) {
        const result = await authStep1Tool.func({})

        expect(mockQCClientInstance.postWithRawResponse).toHaveBeenCalledWith('/live/auth0/authorize', { redirect: false }, { timeout: 5 * 60 * 1000 })
        expect(result).toEqual({
          authURL: 'https://auth.example.com/callback?code=abc123',
        })
      }
    })

    it('should handle case-insensitive Location header', async () => {
      if ('func' in authStep1Tool) {
        // Test lowercase 'location' header
        mockQCClientInstance.postWithRawResponse.mockResolvedValue({
          headers: {
            location: 'https://auth.example.com/callback?code=xyz789',
          },
        })

        const result = await authStep1Tool.func({})
        expect(result.authURL).toBe('https://auth.example.com/callback?code=xyz789')
      }
    })

    it('should handle missing Location header', async () => {
      if ('func' in authStep1Tool) {
        mockQCClientInstance.postWithRawResponse.mockResolvedValue({
          headers: {},
        })

        const result = await authStep1Tool.func({})
        expect(result.authURL).toBeUndefined()
      }
    })

    it('should use 5-minute timeout for authorization', async () => {
      if ('func' in authStep1Tool) {
        await authStep1Tool.func({})

        expect(mockQCClientInstance.postWithRawResponse).toHaveBeenCalledWith(
          '/live/auth0/authorize',
          { redirect: false },
          { timeout: 300000 } // 5 minutes in milliseconds
        )
      }
    })
  })

  describe('AUTHORIZE_CONNECTION_STEP2 tool', () => {
    const authStep2Tool = getLiveToolsDefinitions[LIVE_TOOL_KEYS.AUTHORIZE_CONNECTION_STEP2]

    it('should have proper configuration', () => {
      expect(authStep2Tool.config.title).toBe('Authorize external connection - Step 2')
      expect(authStep2Tool.config.description).toContain('Authorize an external connection')
      expect(authStep2Tool.config.description).toContain('authorization config is stored')
      expect(authStep2Tool.config.inputSchema).toBe(authorizeLiveAuth0Body.shape)
      expect(authStep2Tool.config.outputSchema).toBe(readLiveAuth0Response.shape)
    })

    it('should have proper annotations for authorization', () => {
      expect(authStep2Tool.config.annotations?.readOnlyHint).toBe(false)
      expect(authStep2Tool.config.annotations?.destructiveHint).toBe(false)
      expect(authStep2Tool.config.annotations?.idempotentHint).toBe(true)
    })

    it('should be a QC API tool', () => {
      expect('url' in authStep2Tool).toBe(true)
      expect('func' in authStep2Tool).toBe(false)
      if ('url' in authStep2Tool) {
        expect(authStep2Tool.url).toBe('/live/auth0/read')
      }
    })
  })

  describe('CREATE_LIVE_ALGORITHM tool', () => {
    const createTool = getLiveToolsDefinitions[LIVE_TOOL_KEYS.CREATE_LIVE_ALGORITHM]

    it('should have proper configuration', () => {
      expect(createTool.config.title).toBe('Create live algorithm')
      expect(createTool.config.description).toBe('Create a live algorithm.')
      expect(createTool.config.inputSchema).toBe(createLiveBody.shape)
      expect(createTool.config.outputSchema).toBe(createLiveResponse.shape)
    })

    it('should have proper annotations for creation', () => {
      expect(createTool.config.annotations?.readOnlyHint).toBe(false)
      expect(createTool.config.annotations?.destructiveHint).toBe(false)
      expect(createTool.config.annotations?.idempotentHint).toBe(false)
    })

    it('should be a QC API tool', () => {
      expect('url' in createTool).toBe(true)
      if ('url' in createTool) {
        expect(createTool.url).toBe('/live/create')
      }
    })
  })

  describe('READ_LIVE_ALGORITHM tool', () => {
    const readTool = getLiveToolsDefinitions[LIVE_TOOL_KEYS.READ_LIVE_ALGORITHM]

    it('should have proper configuration', () => {
      expect(readTool.config.title).toBe('Read live algorithm')
      expect(readTool.config.description).toBe('Read details of a live algorithm.')
      expect(readTool.config.inputSchema).toBe(readLiveBody.shape)
      expect(readTool.config.outputSchema).toBe(createLiveResponse.shape)
    })

    it('should have read-only annotations', () => {
      expect(readTool.config.annotations?.readOnlyHint).toBe(true)
      expect(readTool.config.annotations?.destructiveHint).toBe(false)
      expect(readTool.config.annotations?.idempotentHint).toBe(true)
    })

    it('should be a QC API tool', () => {
      expect('url' in readTool).toBe(true)
      if ('url' in readTool) {
        expect(readTool.url).toBe('/live/read')
      }
    })
  })

  describe('LIST_LIVE_ALGORITHMS tool', () => {
    const listTool = getLiveToolsDefinitions[LIVE_TOOL_KEYS.LIST_LIVE_ALGORITHMS]

    it('should have proper configuration', () => {
      expect(listTool.config.title).toBe('List live algorithms')
      expect(listTool.config.description).toBe('List all your past and current live trading deployments.')
      expect(listTool.config.inputSchema).toBe(listLiveBody.shape)
      expect(listTool.config.outputSchema).toBe(listLiveResponse.shape)
    })

    it('should have minimal annotations (only readOnlyHint)', () => {
      expect(listTool.config.annotations?.readOnlyHint).toBe(true)
      expect(listTool.config.annotations?.destructiveHint).toBeUndefined()
      expect(listTool.config.annotations?.idempotentHint).toBeUndefined()
    })

    it('should be a QC API tool', () => {
      expect('url' in listTool).toBe(true)
      if ('url' in listTool) {
        expect(listTool.url).toBe('/live/list')
      }
    })
  })

  describe('READ_LIVE_CHART tool', () => {
    const chartTool = getLiveToolsDefinitions[LIVE_TOOL_KEYS.READ_LIVE_CHART]

    it('should have proper configuration', () => {
      expect(chartTool.config.title).toBe('Read live chart')
      expect(chartTool.config.description).toBe('Read a chart from a live algorithm.')
      expect(chartTool.config.inputSchema).toBe(readLiveChartBody.shape)
    })

    it('should have output schema configuration', () => {
      // The tool should have an output schema configured
      expect(chartTool.config).toHaveProperty('outputSchema')
    })

    it('should have read-only idempotent annotations', () => {
      expect(chartTool.config.annotations?.readOnlyHint).toBe(true)
      expect(chartTool.config.annotations?.destructiveHint).toBe(false)
      expect(chartTool.config.annotations?.idempotentHint).toBe(true)
    })

    it('should be a QC API tool', () => {
      expect('url' in chartTool).toBe(true)
      if ('url' in chartTool) {
        expect(chartTool.url).toBe('/live/chart/read')
      }
    })
  })

  describe('READ_LIVE_LOGS tool', () => {
    const logsTool = getLiveToolsDefinitions[LIVE_TOOL_KEYS.READ_LIVE_LOGS]

    it('should have proper configuration', () => {
      expect(logsTool.config.title).toBe('Read live logs')
      expect(logsTool.config.description).toBe('Get the logs of a live algorithm. The snapshot updates about every 5 minutes.')
      expect(logsTool.config.inputSchema).toBe(readLiveLogBody.shape)
      expect(logsTool.config.outputSchema).toBe(readLiveLogResponse.shape)
    })

    it('should have read-only idempotent annotations', () => {
      expect(logsTool.config.annotations?.readOnlyHint).toBe(true)
      expect(logsTool.config.annotations?.destructiveHint).toBe(false)
      expect(logsTool.config.annotations?.idempotentHint).toBe(true)
    })

    it('should be a QC API tool', () => {
      expect('url' in logsTool).toBe(true)
      if ('url' in logsTool) {
        expect(logsTool.url).toBe('/live/logs/read')
      }
    })

    it('should mention update frequency in description', () => {
      expect(logsTool.config.description).toContain('5 minutes')
    })
  })

  describe('READ_LIVE_PORTFOLIO tool', () => {
    const portfolioTool = getLiveToolsDefinitions[LIVE_TOOL_KEYS.READ_LIVE_PORTFOLIO]

    it('should have proper configuration', () => {
      expect(portfolioTool.config.title).toBe('Read live portfolio')
      expect(portfolioTool.config.description).toBe('Read out the portfolio state of a live algorithm. The snapshot updates about every 10 minutes.')
      expect(portfolioTool.config.inputSchema).toBe(readLivePortfolioBody.shape)
      expect(portfolioTool.config.outputSchema).toBe(readLivePortfolioResponse.shape)
    })

    it('should have read-only idempotent annotations', () => {
      expect(portfolioTool.config.annotations?.readOnlyHint).toBe(true)
      expect(portfolioTool.config.annotations?.destructiveHint).toBe(false)
      expect(portfolioTool.config.annotations?.idempotentHint).toBe(true)
    })

    it('should be a QC API tool', () => {
      expect('url' in portfolioTool).toBe(true)
      if ('url' in portfolioTool) {
        expect(portfolioTool.url).toBe('/live/portfolio/read')
      }
    })

    it('should mention update frequency in description', () => {
      expect(portfolioTool.config.description).toContain('10 minutes')
    })
  })

  describe('READ_LIVE_ORDERS tool', () => {
    const ordersTool = getLiveToolsDefinitions[LIVE_TOOL_KEYS.READ_LIVE_ORDERS]

    it('should have proper configuration', () => {
      expect(ordersTool.config.title).toBe('Read live orders')
      expect(ordersTool.config.description).toBe('Read out the orders of a live algorithm. The snapshot updates about every 10 minutes.')
      expect(ordersTool.config.inputSchema).toBe(readLiveOrderBody.shape)
    })

    it('should have output schema configuration', () => {
      // The tool should have an output schema configured
      expect(ordersTool.config).toHaveProperty('outputSchema')
    })

    it('should have read-only idempotent annotations', () => {
      expect(ordersTool.config.annotations?.readOnlyHint).toBe(true)
      expect(ordersTool.config.annotations?.destructiveHint).toBe(false)
      expect(ordersTool.config.annotations?.idempotentHint).toBe(true)
    })

    it('should be a QC API tool', () => {
      expect('url' in ordersTool).toBe(true)
      if ('url' in ordersTool) {
        expect(ordersTool.url).toBe('/live/orders/read')
      }
    })

    it('should mention update frequency in description', () => {
      expect(ordersTool.config.description).toContain('10 minutes')
    })
  })

  describe('READ_LIVE_INSIGHTS tool', () => {
    const insightsTool = getLiveToolsDefinitions[LIVE_TOOL_KEYS.READ_LIVE_INSIGHTS]

    it('should have proper configuration', () => {
      expect(insightsTool.config.title).toBe('Read live insights')
      expect(insightsTool.config.description).toBe('Read out the insights of a live algorithm. The snapshot updates about every 10 minutes.')
      expect(insightsTool.config.inputSchema).toBe(readLiveInsightBody.shape)
      expect(insightsTool.config.outputSchema).toBe(readLiveInsightResponse.shape)
    })

    it('should have read-only idempotent annotations', () => {
      expect(insightsTool.config.annotations?.readOnlyHint).toBe(true)
      expect(insightsTool.config.annotations?.destructiveHint).toBe(false)
      expect(insightsTool.config.annotations?.idempotentHint).toBe(true)
    })

    it('should be a QC API tool', () => {
      expect('url' in insightsTool).toBe(true)
      if ('url' in insightsTool) {
        expect(insightsTool.url).toBe('/live/insights/read')
      }
    })

    it('should mention update frequency in description', () => {
      expect(insightsTool.config.description).toContain('10 minutes')
    })
  })

  describe('STOP_LIVE_ALGORITHM tool', () => {
    const stopTool = getLiveToolsDefinitions[LIVE_TOOL_KEYS.STOP_LIVE_ALGORITHM]

    it('should have proper configuration', () => {
      expect(stopTool.config.title).toBe('Stop live algorithm')
      expect(stopTool.config.description).toBe('Stop a live algorithm.')
      expect(stopTool.config.inputSchema).toBe(stopLiveBody.shape)
      expect(stopTool.config.outputSchema).toBe(stopLiveResponse.shape)
    })

    it('should have destructive idempotent annotations', () => {
      expect(stopTool.config.annotations?.readOnlyHint).toBe(false)
      expect(stopTool.config.annotations?.destructiveHint).toBe(true)
      expect(stopTool.config.annotations?.idempotentHint).toBe(true)
    })

    it('should be a QC API tool', () => {
      expect('url' in stopTool).toBe(true)
      if ('url' in stopTool) {
        expect(stopTool.url).toBe('/live/update/stop')
      }
    })
  })

  describe('LIQUIDATE_LIVE_ALGORITHM tool', () => {
    const liquidateTool = getLiveToolsDefinitions[LIVE_TOOL_KEYS.LIQUIDATE_LIVE_ALGORITHM]

    it('should have proper configuration', () => {
      expect(liquidateTool.config.title).toBe('Liquidate live algorithm')
      expect(liquidateTool.config.description).toBe('Liquidate and stop a live algorithm.')
      expect(liquidateTool.config.inputSchema).toBe(liquidateLiveBody.shape)
      expect(liquidateTool.config.outputSchema).toBe(liquidateLiveResponse.shape)
    })

    it('should have destructive idempotent annotations', () => {
      expect(liquidateTool.config.annotations?.readOnlyHint).toBe(false)
      expect(liquidateTool.config.annotations?.destructiveHint).toBe(true)
      expect(liquidateTool.config.annotations?.idempotentHint).toBe(true)
    })

    it('should be a QC API tool', () => {
      expect('url' in liquidateTool).toBe(true)
      if ('url' in liquidateTool) {
        expect(liquidateTool.url).toBe('/live/update/liquidate')
      }
    })

    it('should be marked as destructive operation', () => {
      expect(liquidateTool.config.annotations?.destructiveHint).toBe(true)
    })
  })

  describe('schema integration', () => {
    it('should use imported schema shapes correctly', () => {
      const tools = getLiveToolsDefinitions

      // Verify all tools use proper schema shapes
      expect(tools[LIVE_TOOL_KEYS.AUTHORIZE_CONNECTION_STEP1].config.inputSchema).toBe(authorizeLiveAuth0Body.shape)
      expect(tools[LIVE_TOOL_KEYS.AUTHORIZE_CONNECTION_STEP2].config.inputSchema).toBe(authorizeLiveAuth0Body.shape)
      expect(tools[LIVE_TOOL_KEYS.CREATE_LIVE_ALGORITHM].config.inputSchema).toBe(createLiveBody.shape)
      expect(tools[LIVE_TOOL_KEYS.READ_LIVE_ALGORITHM].config.inputSchema).toBe(readLiveBody.shape)
      expect(tools[LIVE_TOOL_KEYS.LIST_LIVE_ALGORITHMS].config.inputSchema).toBe(listLiveBody.shape)
      expect(tools[LIVE_TOOL_KEYS.READ_LIVE_CHART].config.inputSchema).toBe(readLiveChartBody.shape)
      expect(tools[LIVE_TOOL_KEYS.READ_LIVE_LOGS].config.inputSchema).toBe(readLiveLogBody.shape)
      expect(tools[LIVE_TOOL_KEYS.READ_LIVE_PORTFOLIO].config.inputSchema).toBe(readLivePortfolioBody.shape)
      expect(tools[LIVE_TOOL_KEYS.READ_LIVE_ORDERS].config.inputSchema).toBe(readLiveOrderBody.shape)
      expect(tools[LIVE_TOOL_KEYS.READ_LIVE_INSIGHTS].config.inputSchema).toBe(readLiveInsightBody.shape)
      expect(tools[LIVE_TOOL_KEYS.STOP_LIVE_ALGORITHM].config.inputSchema).toBe(stopLiveBody.shape)
      expect(tools[LIVE_TOOL_KEYS.LIQUIDATE_LIVE_ALGORITHM].config.inputSchema).toBe(liquidateLiveBody.shape)
    })

    it('should configure union response types for chart and orders tools', () => {
      // The chart and orders tools use mergeUnionToRawShape for their output schemas
      const chartTool = getLiveToolsDefinitions[LIVE_TOOL_KEYS.READ_LIVE_CHART]
      const ordersTool = getLiveToolsDefinitions[LIVE_TOOL_KEYS.READ_LIVE_ORDERS]

      // These tools should have output schema properties configured
      expect(chartTool.config).toHaveProperty('outputSchema')
      expect(ordersTool.config).toHaveProperty('outputSchema')
    })

    it('should use direct schema shapes for non-union types', () => {
      const tools = getLiveToolsDefinitions

      // These should use direct schema shapes
      expect(tools[LIVE_TOOL_KEYS.AUTHORIZE_CONNECTION_STEP2].config.outputSchema).toBe(readLiveAuth0Response.shape)
      expect(tools[LIVE_TOOL_KEYS.CREATE_LIVE_ALGORITHM].config.outputSchema).toBe(createLiveResponse.shape)
      expect(tools[LIVE_TOOL_KEYS.READ_LIVE_ALGORITHM].config.outputSchema).toBe(createLiveResponse.shape)
      expect(tools[LIVE_TOOL_KEYS.LIST_LIVE_ALGORITHMS].config.outputSchema).toBe(listLiveResponse.shape)
      expect(tools[LIVE_TOOL_KEYS.READ_LIVE_LOGS].config.outputSchema).toBe(readLiveLogResponse.shape)
      expect(tools[LIVE_TOOL_KEYS.READ_LIVE_PORTFOLIO].config.outputSchema).toBe(readLivePortfolioResponse.shape)
      expect(tools[LIVE_TOOL_KEYS.READ_LIVE_INSIGHTS].config.outputSchema).toBe(readLiveInsightResponse.shape)
      expect(tools[LIVE_TOOL_KEYS.STOP_LIVE_ALGORITHM].config.outputSchema).toBe(stopLiveResponse.shape)
      expect(tools[LIVE_TOOL_KEYS.LIQUIDATE_LIVE_ALGORITHM].config.outputSchema).toBe(liquidateLiveResponse.shape)
    })
  })

  describe('tool categorization', () => {
    it('should categorize read-only tools correctly', () => {
      const readOnlyTools = [
        LIVE_TOOL_KEYS.READ_LIVE_ALGORITHM,
        LIVE_TOOL_KEYS.LIST_LIVE_ALGORITHMS,
        LIVE_TOOL_KEYS.READ_LIVE_CHART,
        LIVE_TOOL_KEYS.READ_LIVE_LOGS,
        LIVE_TOOL_KEYS.READ_LIVE_PORTFOLIO,
        LIVE_TOOL_KEYS.READ_LIVE_ORDERS,
        LIVE_TOOL_KEYS.READ_LIVE_INSIGHTS,
      ]

      readOnlyTools.forEach((toolKey) => {
        const tool = getLiveToolsDefinitions[toolKey]
        expect(tool.config.annotations?.readOnlyHint).toBe(true)
      })
    })

    it('should categorize destructive tools correctly', () => {
      const destructiveTools = [LIVE_TOOL_KEYS.STOP_LIVE_ALGORITHM, LIVE_TOOL_KEYS.LIQUIDATE_LIVE_ALGORITHM]

      destructiveTools.forEach((toolKey) => {
        const tool = getLiveToolsDefinitions[toolKey]
        expect(tool.config.annotations?.destructiveHint).toBe(true)
      })
    })

    it('should categorize idempotent tools correctly', () => {
      const idempotentTools = [
        LIVE_TOOL_KEYS.AUTHORIZE_CONNECTION_STEP1,
        LIVE_TOOL_KEYS.AUTHORIZE_CONNECTION_STEP2,
        LIVE_TOOL_KEYS.READ_LIVE_ALGORITHM,
        LIVE_TOOL_KEYS.READ_LIVE_CHART,
        LIVE_TOOL_KEYS.READ_LIVE_LOGS,
        LIVE_TOOL_KEYS.READ_LIVE_PORTFOLIO,
        LIVE_TOOL_KEYS.READ_LIVE_ORDERS,
        LIVE_TOOL_KEYS.READ_LIVE_INSIGHTS,
        LIVE_TOOL_KEYS.STOP_LIVE_ALGORITHM,
        LIVE_TOOL_KEYS.LIQUIDATE_LIVE_ALGORITHM,
      ]

      idempotentTools.forEach((toolKey) => {
        const tool = getLiveToolsDefinitions[toolKey]
        expect(tool.config.annotations?.idempotentHint).toBe(true)
      })
    })

    it('should categorize non-idempotent tools correctly', () => {
      const nonIdempotentTools = [LIVE_TOOL_KEYS.CREATE_LIVE_ALGORITHM]

      nonIdempotentTools.forEach((toolKey) => {
        const tool = getLiveToolsDefinitions[toolKey]
        expect(tool.config.annotations?.idempotentHint).toBe(false)
      })
    })
  })

  describe('URL patterns', () => {
    it('should use consistent URL patterns', () => {
      const tools = getLiveToolsDefinitions

      // Authorization tools
      const authStep2Tool = tools[LIVE_TOOL_KEYS.AUTHORIZE_CONNECTION_STEP2]
      if ('url' in authStep2Tool) {
        expect(authStep2Tool.url).toBe('/live/auth0/read')
      }

      // Basic CRUD operations
      const createTool = tools[LIVE_TOOL_KEYS.CREATE_LIVE_ALGORITHM]
      const readTool = tools[LIVE_TOOL_KEYS.READ_LIVE_ALGORITHM]
      const listTool = tools[LIVE_TOOL_KEYS.LIST_LIVE_ALGORITHMS]

      if ('url' in createTool) {
        expect(createTool.url).toBe('/live/create')
      }
      if ('url' in readTool) {
        expect(readTool.url).toBe('/live/read')
      }
      if ('url' in listTool) {
        expect(listTool.url).toBe('/live/list')
      }

      // Read operations for different data types
      const chartTool = tools[LIVE_TOOL_KEYS.READ_LIVE_CHART]
      const logsTool = tools[LIVE_TOOL_KEYS.READ_LIVE_LOGS]
      const portfolioTool = tools[LIVE_TOOL_KEYS.READ_LIVE_PORTFOLIO]
      const ordersTool = tools[LIVE_TOOL_KEYS.READ_LIVE_ORDERS]
      const insightsTool = tools[LIVE_TOOL_KEYS.READ_LIVE_INSIGHTS]

      if ('url' in chartTool) {
        expect(chartTool.url).toBe('/live/chart/read')
      }
      if ('url' in logsTool) {
        expect(logsTool.url).toBe('/live/logs/read')
      }
      if ('url' in portfolioTool) {
        expect(portfolioTool.url).toBe('/live/portfolio/read')
      }
      if ('url' in ordersTool) {
        expect(ordersTool.url).toBe('/live/orders/read')
      }
      if ('url' in insightsTool) {
        expect(insightsTool.url).toBe('/live/insights/read')
      }

      // Control operations
      const stopTool = tools[LIVE_TOOL_KEYS.STOP_LIVE_ALGORITHM]
      const liquidateTool = tools[LIVE_TOOL_KEYS.LIQUIDATE_LIVE_ALGORITHM]

      if ('url' in stopTool) {
        expect(stopTool.url).toBe('/live/update/stop')
      }
      if ('url' in liquidateTool) {
        expect(liquidateTool.url).toBe('/live/update/liquidate')
      }
    })

    it('should have leading slashes in URLs (different from backtest tools)', () => {
      Object.values(getLiveToolsDefinitions).forEach((tool) => {
        if ('url' in tool) {
          expect(tool.url).toMatch(/^\//)
        }
      })
    })

    it('should have valid URL formats with leading slash', () => {
      Object.values(getLiveToolsDefinitions).forEach((tool) => {
        if ('url' in tool) {
          expect(tool.url).toMatch(/^\/[a-z0-9]+[a-z0-9\\/]*[a-z0-9]$/)
          expect(tool.url).not.toContain(' ')
          expect(tool.url).not.toContain('_')
        }
      })
    })
  })

  describe('tool type distribution', () => {
    it('should have mostly QC API tools', () => {
      const tools = Object.values(getLiveToolsDefinitions)
      const qcApiTools = tools.filter((tool) => 'url' in tool)
      const customTools = tools.filter((tool) => 'func' in tool)

      expect(qcApiTools.length).toBe(11)
      expect(customTools.length).toBe(1)
    })

    it('should have one custom tool for authorization step 1', () => {
      const customTools = Object.entries(getLiveToolsDefinitions).filter(([, tool]) => 'func' in tool)

      expect(customTools).toHaveLength(1)
      expect(customTools[0][0]).toBe(LIVE_TOOL_KEYS.AUTHORIZE_CONNECTION_STEP1)
    })
  })

  describe('authorization workflow', () => {
    it('should have two-step authorization process', () => {
      const step1 = getLiveToolsDefinitions[LIVE_TOOL_KEYS.AUTHORIZE_CONNECTION_STEP1]
      const step2 = getLiveToolsDefinitions[LIVE_TOOL_KEYS.AUTHORIZE_CONNECTION_STEP2]

      expect(step1.config.title).toContain('Step 1')
      expect(step2.config.title).toContain('Step 2')

      // Both should use the same input schema
      expect(step1.config.inputSchema).toBe(authorizeLiveAuth0Body.shape)
      expect(step2.config.inputSchema).toBe(authorizeLiveAuth0Body.shape)
    })

    it('should have consistent authorization descriptions', () => {
      const step1 = getLiveToolsDefinitions[LIVE_TOOL_KEYS.AUTHORIZE_CONNECTION_STEP1]
      const step2 = getLiveToolsDefinitions[LIVE_TOOL_KEYS.AUTHORIZE_CONNECTION_STEP2]

      // Both should mention two-step process
      expect(step1.config.description).toContain('Authorization process is always in two steps')
      expect(step2.config.description).toContain('Authorization process is always in two steps')

      // Both should mention URL and config storage
      expect(step1.config.description).toContain('URL is returned')
      expect(step2.config.description).toContain('authorization config is stored')
    })

    it('should have different implementation approaches', () => {
      const step1 = getLiveToolsDefinitions[LIVE_TOOL_KEYS.AUTHORIZE_CONNECTION_STEP1]
      const step2 = getLiveToolsDefinitions[LIVE_TOOL_KEYS.AUTHORIZE_CONNECTION_STEP2]

      expect('func' in step1).toBe(true) // Custom function
      expect('url' in step2).toBe(true) // QC API endpoint
    })
  })

  describe('error handling and edge cases', () => {
    it('should handle QCClient errors in authorization step 1', async () => {
      const authTool = getLiveToolsDefinitions[LIVE_TOOL_KEYS.AUTHORIZE_CONNECTION_STEP1]

      const qcError = new Error('Authorization API Error')
      mockQCClientInstance.postWithRawResponse.mockRejectedValue(qcError)

      if ('func' in authTool) {
        await expect(authTool.func({})).rejects.toThrow('Authorization API Error')
      }
    })

    it('should throw error when response headers are undefined (bug in implementation)', async () => {
      const authTool = getLiveToolsDefinitions[LIVE_TOOL_KEYS.AUTHORIZE_CONNECTION_STEP1]

      mockQCClientInstance.postWithRawResponse.mockResolvedValue({
        headers: undefined,
      })

      if ('func' in authTool) {
        await expect(authTool.func({})).rejects.toThrow('Cannot read properties of undefined')
      }
    })

    it('should throw error when response has no headers property (bug in implementation)', async () => {
      const authTool = getLiveToolsDefinitions[LIVE_TOOL_KEYS.AUTHORIZE_CONNECTION_STEP1]

      mockQCClientInstance.postWithRawResponse.mockResolvedValue({})

      if ('func' in authTool) {
        await expect(authTool.func({})).rejects.toThrow('Cannot read properties of undefined')
      }
    })
  })

  describe('tool consistency', () => {
    it('should have consistent title formatting', () => {
      Object.values(getLiveToolsDefinitions).forEach((tool) => {
        expect(tool.config.title).toBeDefined()
        expect(typeof tool.config.title).toBe('string')

        if (tool.config.title) {
          expect(tool.config.title.length).toBeGreaterThan(0)

          // Should not end with period
          expect(tool.config.title).not.toMatch(/\.$/)

          // Should be properly capitalized
          expect(tool.config.title.charAt(0)).toMatch(/[A-Z]/)
        }
      })
    })

    it('should have consistent description formatting', () => {
      Object.values(getLiveToolsDefinitions).forEach((tool) => {
        if (tool.config.description) {
          expect(typeof tool.config.description).toBe('string')
          expect(tool.config.description.length).toBeGreaterThan(0)

          // Authorization tools have multiline descriptions without ending period
          if (tool.config.title?.includes('Authorize external connection')) {
            expect(tool.config.description).not.toMatch(/\.$/)
            expect(tool.config.description).toContain('\n')
          } else {
            // Other tools should end with period
            expect(tool.config.description).toMatch(/\.$/)
          }

          // Should be properly capitalized
          expect(tool.config.description.charAt(0)).toMatch(/[A-Z]/)
        }
      })
    })

    it('should have consistent annotation patterns', () => {
      Object.values(getLiveToolsDefinitions).forEach((tool) => {
        if (tool.config.annotations) {
          // All annotation values should be boolean when present
          if (tool.config.annotations.readOnlyHint !== undefined) {
            expect(typeof tool.config.annotations.readOnlyHint).toBe('boolean')
          }
          if (tool.config.annotations.destructiveHint !== undefined) {
            expect(typeof tool.config.annotations.destructiveHint).toBe('boolean')
          }
          if (tool.config.annotations.idempotentHint !== undefined) {
            expect(typeof tool.config.annotations.idempotentHint).toBe('boolean')
          }
        }
      })
    })
  })

  describe('live trading specific features', () => {
    it('should have tools for real-time data access', () => {
      const realTimeTools = [
        LIVE_TOOL_KEYS.READ_LIVE_LOGS,
        LIVE_TOOL_KEYS.READ_LIVE_PORTFOLIO,
        LIVE_TOOL_KEYS.READ_LIVE_ORDERS,
        LIVE_TOOL_KEYS.READ_LIVE_INSIGHTS,
      ]

      realTimeTools.forEach((toolKey) => {
        const tool = getLiveToolsDefinitions[toolKey]
        expect(tool.config.description).toMatch(/\d+ minutes/)
      })
    })

    it('should have tools for algorithm lifecycle management', () => {
      const lifecycleTools = [LIVE_TOOL_KEYS.CREATE_LIVE_ALGORITHM, LIVE_TOOL_KEYS.STOP_LIVE_ALGORITHM, LIVE_TOOL_KEYS.LIQUIDATE_LIVE_ALGORITHM]

      lifecycleTools.forEach((toolKey) => {
        const tool = getLiveToolsDefinitions[toolKey]
        expect(tool.config.title).toMatch(/live algorithm/)
      })
    })

    it('should have tools for external authorization', () => {
      const authTools = [LIVE_TOOL_KEYS.AUTHORIZE_CONNECTION_STEP1, LIVE_TOOL_KEYS.AUTHORIZE_CONNECTION_STEP2]

      authTools.forEach((toolKey) => {
        const tool = getLiveToolsDefinitions[toolKey]
        expect(tool.config.title).toContain('Authorize external connection')
        expect(tool.config.description).toContain('external connection with a live brokerage')
      })
    })

    it('should have proper risk management tools', () => {
      const riskTools = [LIVE_TOOL_KEYS.STOP_LIVE_ALGORITHM, LIVE_TOOL_KEYS.LIQUIDATE_LIVE_ALGORITHM]

      riskTools.forEach((toolKey) => {
        const tool = getLiveToolsDefinitions[toolKey]
        expect(tool.config.annotations?.destructiveHint).toBe(true)
        expect(tool.config.annotations?.idempotentHint).toBe(true)
      })
    })
  })

  describe('custom function implementation', () => {
    it('should use postWithRawResponse for header access', async () => {
      const authTool = getLiveToolsDefinitions[LIVE_TOOL_KEYS.AUTHORIZE_CONNECTION_STEP1]

      if ('func' in authTool) {
        await authTool.func({})

        expect(mockQCClientInstance.postWithRawResponse).toHaveBeenCalledWith('/live/auth0/authorize', { redirect: false }, { timeout: 300000 })
      }
    })

    it('should extract redirect URL from response headers', async () => {
      const authTool = getLiveToolsDefinitions[LIVE_TOOL_KEYS.AUTHORIZE_CONNECTION_STEP1]

      if ('func' in authTool) {
        const testUrl = 'https://test-auth.example.com/callback'
        mockQCClientInstance.postWithRawResponse.mockResolvedValue({
          headers: { Location: testUrl },
        })

        const result = await authTool.func({})
        expect(result.authURL).toBe(testUrl)
      }
    })

    it('should handle both Location header cases', async () => {
      const authTool = getLiveToolsDefinitions[LIVE_TOOL_KEYS.AUTHORIZE_CONNECTION_STEP1]

      if ('func' in authTool) {
        // Test uppercase Location
        mockQCClientInstance.postWithRawResponse.mockResolvedValue({
          headers: { Location: 'https://upper.example.com' },
        })

        let result = await authTool.func({})
        expect(result.authURL).toBe('https://upper.example.com')

        // Test lowercase location
        mockQCClientInstance.postWithRawResponse.mockResolvedValue({
          headers: { location: 'https://lower.example.com' },
        })

        result = await authTool.func({})
        expect(result.authURL).toBe('https://lower.example.com')
      }
    })
  })
})

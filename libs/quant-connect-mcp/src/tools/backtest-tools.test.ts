/* eslint-disable max-lines-per-function */
import { QCClient } from '@fschaeffler/quant-connect-client'
import {
  createBacktestBody,
  createBacktestResponse,
  deleteBacktestBody,
  deleteBacktestResponse,
  listBacktestsBody,
  listBacktestsResponse,
  readBacktestBody,
  readBacktestChartBody,
  readBacktestOrderBody,
  readBacktestOrderResponse,
  readBacktestResponse,
  readBacktestsInsightsBody,
  readBacktestsInsightsResponse,
  readBacktestsReportBody,
  updateBacktestBody,
  updateBacktestResponse,
} from '@fschaeffler/quant-connect-types'
import { mergeUnionToRawShape } from '../utils'
import { getBacktestToolsDefinitions } from './backtest-tools'
import { BACKTEST_TOOL_KEYS } from './tool-keys'

// Mock dependencies
jest.mock('@fschaeffler/quant-connect-client')
jest.mock('../utils')

const mockedQCClient = QCClient as jest.Mocked<typeof QCClient>
const mockedMergeUnionToRawShape = mergeUnionToRawShape as jest.MockedFunction<typeof mergeUnionToRawShape>

describe('libs/quant-connect-mcp/src/tools/backtest-tools', () => {
  let mockQCClientInstance: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock QCClient instance
    mockQCClientInstance = {
      post: jest.fn().mockResolvedValue({
        success: true,
        backtest: {
          id: 12345,
          name: 'Test Backtest',
          charts: { chart1: 'data' },
          totalPerformance: {
            closedTrades: ['trade1', 'trade2'],
          },
          rollingWindow: { window: 'data' },
        },
        orders: ['order1', 'order2'],
      }),
    }

    mockedQCClient.getInstance.mockReturnValue(mockQCClientInstance)

    // Mock mergeUnionToRawShape
    mockedMergeUnionToRawShape.mockReturnValue({ merged: 'schema' } as any)
  })

  describe('tool definitions export', () => {
    it('should export getBacktestToolsDefinitions', () => {
      expect(getBacktestToolsDefinitions).toBeDefined()
      expect(typeof getBacktestToolsDefinitions).toBe('object')
    })

    it('should contain all expected backtest tools', () => {
      const toolKeys = Object.keys(getBacktestToolsDefinitions)

      expect(toolKeys).toContain(BACKTEST_TOOL_KEYS.CREATE_BACKTEST)
      expect(toolKeys).toContain(BACKTEST_TOOL_KEYS.READ_BACKTEST)
      expect(toolKeys).toContain(BACKTEST_TOOL_KEYS.READ_BACKTEST_REDUCED)
      expect(toolKeys).toContain(BACKTEST_TOOL_KEYS.LIST_BACKTESTS)
      expect(toolKeys).toContain(BACKTEST_TOOL_KEYS.READ_BACKTEST_CHART)
      expect(toolKeys).toContain(BACKTEST_TOOL_KEYS.READ_BACKTEST_ORDERS)
      expect(toolKeys).toContain(BACKTEST_TOOL_KEYS.READ_BACKTEST_INSIGHTS)
      expect(toolKeys).toContain(BACKTEST_TOOL_KEYS.READ_BACKTEST_REPORT)
      expect(toolKeys).toContain(BACKTEST_TOOL_KEYS.UPDATE_BACKTEST)
      expect(toolKeys).toContain(BACKTEST_TOOL_KEYS.DELETE_BACKTEST)
    })

    it('should have exactly the expected number of tools', () => {
      const toolKeys = Object.keys(getBacktestToolsDefinitions)
      expect(toolKeys).toHaveLength(10)
    })
  })

  describe('CREATE_BACKTEST tool', () => {
    const createTool = getBacktestToolsDefinitions[BACKTEST_TOOL_KEYS.CREATE_BACKTEST]

    it('should have proper configuration', () => {
      expect(createTool.config.title).toBe('Create backtest')
      expect(createTool.config.description).toBe('Create a new backtest request and get the backtest Id.')
      expect(createTool.config.inputSchema).toBe(createBacktestBody.shape)
      expect(createTool.config.outputSchema).toBe(createBacktestResponse.shape)
    })

    it('should have correct annotations', () => {
      expect(createTool.config.annotations?.readOnlyHint).toBe(false)
      expect(createTool.config.annotations?.idempotentHint).toBe(false)
      expect(createTool.config.annotations?.destructiveHint).toBe(false)
    })

    it('should be a QC API tool with URL', () => {
      expect('url' in createTool).toBe(true)
      expect('func' in createTool).toBe(false)
      if ('url' in createTool) {
        expect(createTool.url).toBe('backtests/create')
      }
    })

    it('should not have injectCodeSourceId flag', () => {
      if ('injectCodeSourceId' in createTool) {
        expect(createTool.injectCodeSourceId).toBeUndefined()
      }
    })
  })

  describe('READ_BACKTEST tool', () => {
    const readTool = getBacktestToolsDefinitions[BACKTEST_TOOL_KEYS.READ_BACKTEST]

    it('should have proper configuration', () => {
      expect(readTool.config.title).toBe('Read backtest')
      expect(readTool.config.description).toBe('Read the full results of a backtest.')
      expect(readTool.config.inputSchema).toBe(readBacktestBody.shape)
      expect(readTool.config.outputSchema).toBe(readBacktestResponse.shape)
    })

    it('should have read-only annotations', () => {
      expect(readTool.config.annotations?.readOnlyHint).toBe(true)
      expect(readTool.config.annotations?.idempotentHint).toBe(false)
      expect(readTool.config.annotations?.destructiveHint).toBeUndefined()
    })

    it('should be a QC API tool', () => {
      expect('url' in readTool).toBe(true)
      if ('url' in readTool) {
        expect(readTool.url).toBe('backtests/read')
      }
    })
  })

  describe('READ_BACKTEST_REDUCED tool', () => {
    const reducedTool = getBacktestToolsDefinitions[BACKTEST_TOOL_KEYS.READ_BACKTEST_REDUCED]

    it('should have proper configuration', () => {
      expect(reducedTool.config.title).toBe('Read backtest reduced')
      expect(reducedTool.config.description).toContain('reduced payload without orders, charts, closed trades and rolling window')
      expect(reducedTool.config.inputSchema).toBe(readBacktestBody.shape)
      expect(reducedTool.config.outputSchema).toBe(readBacktestResponse.shape)
    })

    it('should have read-only annotations', () => {
      expect(reducedTool.config.annotations?.readOnlyHint).toBe(true)
      expect(reducedTool.config.annotations?.destructiveHint).toBe(false)
    })

    it('should be a custom tool with function', () => {
      expect('func' in reducedTool).toBe(true)
      expect('url' in reducedTool).toBe(false)
      if ('func' in reducedTool) {
        expect(typeof reducedTool.func).toBe('function')
      }
    })

    it('should execute custom function and remove specified properties', async () => {
      if ('func' in reducedTool) {
        const mockParams = { backtestId: 12345 }
        const result = await reducedTool.func(mockParams)

        expect(mockQCClientInstance.post).toHaveBeenCalledWith('backtests/read', mockParams)

        // Should call readBacktestResponse.parse
        expect(result).toBeDefined()
      }
    })

    it('should remove orders property when present', async () => {
      const mockData = {
        success: true,
        orders: ['order1', 'order2'],
        backtest: { id: 123 },
      }

      mockQCClientInstance.post.mockResolvedValue(mockData)

      if ('func' in reducedTool) {
        await reducedTool.func({ backtestId: 123 })
      }

      // The function should delete the orders property
      expect(mockData.orders).toBeUndefined()
    })

    it('should remove charts property when present', async () => {
      const mockData = {
        success: true,
        backtest: {
          id: 123,
          charts: { chart1: 'data', chart2: 'data' },
        },
      }

      mockQCClientInstance.post.mockResolvedValue(mockData)

      if ('func' in reducedTool) {
        await reducedTool.func({ backtestId: 123 })
      }

      // The function should delete the charts property
      expect(mockData.backtest.charts).toBeUndefined()
    })

    it('should remove closedTrades property when present', async () => {
      const mockData = {
        success: true,
        backtest: {
          id: 123,
          totalPerformance: {
            closedTrades: ['trade1', 'trade2'],
            otherMetric: 'preserved',
          },
        },
      }

      mockQCClientInstance.post.mockResolvedValue(mockData)

      if ('func' in reducedTool) {
        await reducedTool.func({ backtestId: 123 })
      }

      // Should delete closedTrades but preserve other properties
      expect(mockData.backtest.totalPerformance.closedTrades).toBeUndefined()
      expect(mockData.backtest.totalPerformance.otherMetric).toBe('preserved')
    })

    it('should remove rollingWindow property when present', async () => {
      const mockData = {
        success: true,
        backtest: {
          id: 123,
          rollingWindow: { window: 'data' },
          otherProperty: 'preserved',
        },
      }

      mockQCClientInstance.post.mockResolvedValue(mockData)

      if ('func' in reducedTool) {
        await reducedTool.func({ backtestId: 123 })
      }

      // Should delete rollingWindow but preserve other properties
      expect(mockData.backtest.rollingWindow).toBeUndefined()
      expect(mockData.backtest.otherProperty).toBe('preserved')
    })

    it('should handle missing properties gracefully', async () => {
      const mockData = {
        success: true,
        backtest: {
          id: 123,
          // Missing optional properties
        },
      }

      mockQCClientInstance.post.mockResolvedValue(mockData)

      if ('func' in reducedTool) {
        await expect(reducedTool.func({ backtestId: 123 })).resolves.toBeDefined()
      }
    })

    it('should handle null/undefined data by throwing validation error', async () => {
      mockQCClientInstance.post.mockResolvedValue(null)

      if ('func' in reducedTool) {
        await expect(reducedTool.func({ backtestId: 123 })).rejects.toThrow()
      }
    })

    it('should handle missing backtest property', async () => {
      const mockData = {
        success: true,
        // Missing backtest property
      }

      mockQCClientInstance.post.mockResolvedValue(mockData)

      if ('func' in reducedTool) {
        await expect(reducedTool.func({ backtestId: 123 })).resolves.toBeDefined()
      }
    })
  })

  describe('LIST_BACKTESTS tool', () => {
    const listTool = getBacktestToolsDefinitions[BACKTEST_TOOL_KEYS.LIST_BACKTESTS]

    it('should have proper configuration', () => {
      expect(listTool.config.title).toBe('List backtests')
      expect(listTool.config.description).toContain('List all backtests in your default organization')
      expect(listTool.config.description).toContain('Use start and end to page through results')
      expect(listTool.config.inputSchema).toBe(listBacktestsBody.shape)
      expect(listTool.config.outputSchema).toBe(listBacktestsResponse.shape)
    })

    it('should have read-only annotations', () => {
      expect(listTool.config.annotations?.readOnlyHint).toBe(true)
      expect(listTool.config.annotations?.destructiveHint).toBe(false)
    })

    it('should be a QC API tool', () => {
      expect('url' in listTool).toBe(true)
      if ('url' in listTool) {
        expect(listTool.url).toBe('backtests/list')
      }
    })
  })

  describe('READ_BACKTEST_CHART tool', () => {
    const chartTool = getBacktestToolsDefinitions[BACKTEST_TOOL_KEYS.READ_BACKTEST_CHART]

    it('should have proper configuration', () => {
      expect(chartTool.config.title).toBe('Read backtest chart')
      expect(chartTool.config.description).toBe('Read a chart from a backtest.')
      expect(chartTool.config.inputSchema).toBe(readBacktestChartBody.shape)
    })

    it('should have output schema configuration', () => {
      // The tool should have an output schema configured
      expect(chartTool.config).toHaveProperty('outputSchema')
    })

    it('should have read-only annotations', () => {
      expect(chartTool.config.annotations?.readOnlyHint).toBe(true)
      expect(chartTool.config.annotations?.destructiveHint).toBe(false)
    })

    it('should be a QC API tool', () => {
      expect('url' in chartTool).toBe(true)
      if ('url' in chartTool) {
        expect(chartTool.url).toBe('backtests/chart/read')
      }
    })
  })

  describe('READ_BACKTEST_ORDERS tool', () => {
    const ordersTool = getBacktestToolsDefinitions[BACKTEST_TOOL_KEYS.READ_BACKTEST_ORDERS]

    it('should have proper configuration', () => {
      expect(ordersTool.config.title).toBe('Read backtest orders')
      expect(ordersTool.config.description).toBe('Read out the orders of a backtest.')
      expect(ordersTool.config.inputSchema).toBe(readBacktestOrderBody.shape)
      expect(ordersTool.config.outputSchema).toBe(readBacktestOrderResponse.shape)
    })

    it('should have read-only annotations', () => {
      expect(ordersTool.config.annotations?.readOnlyHint).toBe(true)
      expect(ordersTool.config.annotations?.destructiveHint).toBe(false)
    })

    it('should be a QC API tool', () => {
      expect('url' in ordersTool).toBe(true)
      // This line was already fixed above in the URL patterns section
    })
  })

  describe('READ_BACKTEST_INSIGHTS tool', () => {
    const insightsTool = getBacktestToolsDefinitions[BACKTEST_TOOL_KEYS.READ_BACKTEST_INSIGHTS]

    it('should have proper configuration', () => {
      expect(insightsTool.config.title).toBe('Read backtest insights')
      expect(insightsTool.config.description).toBe('Read out the insights of a backtest.')
      expect(insightsTool.config.inputSchema).toBe(readBacktestsInsightsBody.shape)
      expect(insightsTool.config.outputSchema).toBe(readBacktestsInsightsResponse.shape)
    })

    it('should have read-only annotations', () => {
      expect(insightsTool.config.annotations?.readOnlyHint).toBe(true)
      expect(insightsTool.config.annotations?.destructiveHint).toBe(false)
    })

    it('should use correct URL with read before insights', () => {
      expect('url' in insightsTool).toBe(true)
      if ('url' in insightsTool) {
        expect(insightsTool.url).toBe('backtests/read/insights')
      }
    })
  })

  describe('READ_BACKTEST_REPORT tool', () => {
    const reportTool = getBacktestToolsDefinitions[BACKTEST_TOOL_KEYS.READ_BACKTEST_REPORT]

    it('should have proper configuration', () => {
      expect(reportTool.config.title).toBe('Read backtest report')
      expect(reportTool.config.description).toBe('Read out the report of a backtest.')
      expect(reportTool.config.inputSchema).toBe(readBacktestsReportBody.shape)
    })

    it('should have output schema configuration', () => {
      // The tool should have an output schema configured
      expect(reportTool.config).toHaveProperty('outputSchema')
    })

    it('should have read-only annotations', () => {
      expect(reportTool.config.annotations?.readOnlyHint).toBe(true)
      expect(reportTool.config.annotations?.destructiveHint).toBe(false)
    })

    it('should use correct URL with read before report', () => {
      expect('url' in reportTool).toBe(true)
      if ('url' in reportTool) {
        expect(reportTool.url).toBe('backtests/read/report')
      }
    })
  })

  describe('UPDATE_BACKTEST tool', () => {
    const updateTool = getBacktestToolsDefinitions[BACKTEST_TOOL_KEYS.UPDATE_BACKTEST]

    it('should have proper configuration', () => {
      expect(updateTool.config.title).toBe('Update backtest')
      expect(updateTool.config.description).toBe('Update the name or note of a backtest.')
      expect(updateTool.config.inputSchema).toBe(updateBacktestBody.shape)
      expect(updateTool.config.outputSchema).toBe(updateBacktestResponse.shape)
    })

    it('should have proper annotations for update operations', () => {
      expect(updateTool.config.annotations?.readOnlyHint).toBe(false)
      expect(updateTool.config.annotations?.idempotentHint).toBe(true)
      expect(updateTool.config.annotations?.destructiveHint).toBe(false)
    })

    it('should be a QC API tool', () => {
      expect('url' in updateTool).toBe(true)
      if ('url' in updateTool) {
        expect(updateTool.url).toBe('backtests/update')
      }
    })
  })

  describe('DELETE_BACKTEST tool', () => {
    const deleteTool = getBacktestToolsDefinitions[BACKTEST_TOOL_KEYS.DELETE_BACKTEST]

    it('should have proper configuration', () => {
      expect(deleteTool.config.title).toBe('Delete backtest')
      expect(deleteTool.config.description).toBe('Delete a backtest from a project. This action is irreversible.')
      expect(deleteTool.config.inputSchema).toBe(deleteBacktestBody.shape)
      expect(deleteTool.config.outputSchema).toBe(deleteBacktestResponse.shape)
    })

    it('should have destructive annotations', () => {
      expect(deleteTool.config.annotations?.readOnlyHint).toBe(false)
      expect(deleteTool.config.annotations?.idempotentHint).toBe(true)
      expect(deleteTool.config.annotations?.destructiveHint).toBe(true)
    })

    it('should be a QC API tool', () => {
      expect('url' in deleteTool).toBe(true)
      if ('url' in deleteTool) {
        expect(deleteTool.url).toBe('backtests/delete')
      }
    })

    it('should be marked as destructive operation', () => {
      expect(deleteTool.config.annotations?.destructiveHint).toBe(true)
    })
  })

  describe('schema integration', () => {
    it('should use imported schema shapes correctly', () => {
      const tools = getBacktestToolsDefinitions

      // Verify all tools use proper schema shapes
      expect(tools[BACKTEST_TOOL_KEYS.CREATE_BACKTEST].config.inputSchema).toBe(createBacktestBody.shape)
      expect(tools[BACKTEST_TOOL_KEYS.READ_BACKTEST].config.inputSchema).toBe(readBacktestBody.shape)
      expect(tools[BACKTEST_TOOL_KEYS.LIST_BACKTESTS].config.inputSchema).toBe(listBacktestsBody.shape)
      expect(tools[BACKTEST_TOOL_KEYS.READ_BACKTEST_ORDERS].config.inputSchema).toBe(readBacktestOrderBody.shape)
      expect(tools[BACKTEST_TOOL_KEYS.READ_BACKTEST_INSIGHTS].config.inputSchema).toBe(readBacktestsInsightsBody.shape)
      expect(tools[BACKTEST_TOOL_KEYS.UPDATE_BACKTEST].config.inputSchema).toBe(updateBacktestBody.shape)
      expect(tools[BACKTEST_TOOL_KEYS.DELETE_BACKTEST].config.inputSchema).toBe(deleteBacktestBody.shape)
    })

    it('should configure union response types for chart and report tools', () => {
      // The chart and report tools use mergeUnionToRawShape for their output schemas
      const chartTool = getBacktestToolsDefinitions[BACKTEST_TOOL_KEYS.READ_BACKTEST_CHART]
      const reportTool = getBacktestToolsDefinitions[BACKTEST_TOOL_KEYS.READ_BACKTEST_REPORT]

      // These tools should have output schema properties configured
      expect(chartTool.config).toHaveProperty('outputSchema')
      expect(reportTool.config).toHaveProperty('outputSchema')
    })

    it('should use direct schema shapes for non-union types', () => {
      const tools = getBacktestToolsDefinitions

      // These should use direct schema shapes, not mergeUnionToRawShape
      expect(tools[BACKTEST_TOOL_KEYS.CREATE_BACKTEST].config.outputSchema).toBe(createBacktestResponse.shape)
      expect(tools[BACKTEST_TOOL_KEYS.READ_BACKTEST].config.outputSchema).toBe(readBacktestResponse.shape)
      expect(tools[BACKTEST_TOOL_KEYS.LIST_BACKTESTS].config.outputSchema).toBe(listBacktestsResponse.shape)
      expect(tools[BACKTEST_TOOL_KEYS.READ_BACKTEST_ORDERS].config.outputSchema).toBe(readBacktestOrderResponse.shape)
      expect(tools[BACKTEST_TOOL_KEYS.READ_BACKTEST_INSIGHTS].config.outputSchema).toBe(readBacktestsInsightsResponse.shape)
      expect(tools[BACKTEST_TOOL_KEYS.UPDATE_BACKTEST].config.outputSchema).toBe(updateBacktestResponse.shape)
      expect(tools[BACKTEST_TOOL_KEYS.DELETE_BACKTEST].config.outputSchema).toBe(deleteBacktestResponse.shape)
    })
  })

  describe('tool categorization', () => {
    it('should categorize read-only tools correctly', () => {
      const readOnlyTools = [
        BACKTEST_TOOL_KEYS.READ_BACKTEST,
        BACKTEST_TOOL_KEYS.READ_BACKTEST_REDUCED,
        BACKTEST_TOOL_KEYS.LIST_BACKTESTS,
        BACKTEST_TOOL_KEYS.READ_BACKTEST_CHART,
        BACKTEST_TOOL_KEYS.READ_BACKTEST_ORDERS,
        BACKTEST_TOOL_KEYS.READ_BACKTEST_INSIGHTS,
        BACKTEST_TOOL_KEYS.READ_BACKTEST_REPORT,
      ]

      readOnlyTools.forEach((toolKey) => {
        const tool = getBacktestToolsDefinitions[toolKey]
        expect(tool.config.annotations?.readOnlyHint).toBe(true)
      })
    })

    it('should categorize destructive tools correctly', () => {
      const destructiveTools = [BACKTEST_TOOL_KEYS.DELETE_BACKTEST]

      destructiveTools.forEach((toolKey) => {
        const tool = getBacktestToolsDefinitions[toolKey]
        expect(tool.config.annotations?.destructiveHint).toBe(true)
      })
    })

    it('should categorize idempotent tools correctly', () => {
      const idempotentTools = [BACKTEST_TOOL_KEYS.UPDATE_BACKTEST, BACKTEST_TOOL_KEYS.DELETE_BACKTEST]

      idempotentTools.forEach((toolKey) => {
        const tool = getBacktestToolsDefinitions[toolKey]
        expect(tool.config.annotations?.idempotentHint).toBe(true)
      })
    })

    it('should categorize non-idempotent tools correctly', () => {
      const nonIdempotentTools = [BACKTEST_TOOL_KEYS.CREATE_BACKTEST, BACKTEST_TOOL_KEYS.READ_BACKTEST]

      nonIdempotentTools.forEach((toolKey) => {
        const tool = getBacktestToolsDefinitions[toolKey]
        expect(tool.config.annotations?.idempotentHint).toBe(false)
      })
    })
  })

  describe('URL patterns', () => {
    it('should use consistent URL patterns', () => {
      const tools = getBacktestToolsDefinitions

      // Basic CRUD operations
      // Basic CRUD operations
      const createTool = tools[BACKTEST_TOOL_KEYS.CREATE_BACKTEST]
      const listTool = tools[BACKTEST_TOOL_KEYS.LIST_BACKTESTS]
      const updateTool = tools[BACKTEST_TOOL_KEYS.UPDATE_BACKTEST]
      const deleteTool = tools[BACKTEST_TOOL_KEYS.DELETE_BACKTEST]

      if ('url' in createTool) {
        expect(createTool.url).toBe('backtests/create')
      }
      if ('url' in listTool) {
        expect(listTool.url).toBe('backtests/list')
      }
      if ('url' in updateTool) {
        expect(updateTool.url).toBe('backtests/update')
      }
      if ('url' in deleteTool) {
        expect(deleteTool.url).toBe('backtests/delete')
      }

      // Read operations
      const readTool = tools[BACKTEST_TOOL_KEYS.READ_BACKTEST]
      const ordersTool = tools[BACKTEST_TOOL_KEYS.READ_BACKTEST_ORDERS]
      const chartTool = tools[BACKTEST_TOOL_KEYS.READ_BACKTEST_CHART]
      const insightsTool = tools[BACKTEST_TOOL_KEYS.READ_BACKTEST_INSIGHTS]
      const reportTool = tools[BACKTEST_TOOL_KEYS.READ_BACKTEST_REPORT]

      if ('url' in readTool) {
        expect(readTool.url).toBe('backtests/read')
      }
      if ('url' in ordersTool) {
        expect(ordersTool.url).toBe('backtests/orders/read')
      }
      if ('url' in chartTool) {
        expect(chartTool.url).toBe('backtests/chart/read')
      }
      if ('url' in insightsTool) {
        expect(insightsTool.url).toBe('backtests/read/insights')
      }
      if ('url' in reportTool) {
        expect(reportTool.url).toBe('backtests/read/report')
      }
    })

    it('should not have leading slashes in URLs', () => {
      Object.values(getBacktestToolsDefinitions).forEach((tool) => {
        if ('url' in tool) {
          expect(tool.url).not.toMatch(/^\//)
        }
      })
    })

    it('should have valid URL formats', () => {
      Object.values(getBacktestToolsDefinitions).forEach((tool) => {
        if ('url' in tool) {
          expect(tool.url).toMatch(/^[a-z]+[a-z\\/]*[a-z]$/)
          expect(tool.url).not.toContain(' ')
          expect(tool.url).not.toContain('_')
        }
      })
    })
  })

  describe('tool type distribution', () => {
    it('should have mostly QC API tools', () => {
      const tools = Object.values(getBacktestToolsDefinitions)
      const qcApiTools = tools.filter((tool) => 'url' in tool)
      const customTools = tools.filter((tool) => 'func' in tool)

      expect(qcApiTools.length).toBe(9)
      expect(customTools.length).toBe(1)
    })

    it('should have one custom tool for data reduction', () => {
      const customTools = Object.entries(getBacktestToolsDefinitions).filter(([, tool]) => 'func' in tool)

      expect(customTools).toHaveLength(1)
      expect(customTools[0][0]).toBe(BACKTEST_TOOL_KEYS.READ_BACKTEST_REDUCED)
    })
  })

  describe('data processing logic', () => {
    it('should use Object.hasOwn for property checking', async () => {
      const reducedTool = getBacktestToolsDefinitions[BACKTEST_TOOL_KEYS.READ_BACKTEST_REDUCED]

      // Mock Object.hasOwn
      const originalHasOwn = Object.hasOwn
      Object.hasOwn = jest.fn().mockReturnValue(true)

      const mockData = { orders: ['test'] }
      mockQCClientInstance.post.mockResolvedValue(mockData)

      if ('func' in reducedTool) {
        await reducedTool.func({ backtestId: 123 })
      }

      expect(Object.hasOwn).toHaveBeenCalledWith(mockData, 'orders')

      // Restore Object.hasOwn
      Object.hasOwn = originalHasOwn
    })

    it('should handle nested property deletion safely', async () => {
      const reducedTool = getBacktestToolsDefinitions[BACKTEST_TOOL_KEYS.READ_BACKTEST_REDUCED]

      // Test with deeply nested structure
      const mockData = {
        backtest: {
          totalPerformance: {
            closedTrades: ['trade1'],
            nestedObject: {
              deepProperty: 'preserved',
            },
          },
          otherData: 'preserved',
        },
      }

      mockQCClientInstance.post.mockResolvedValue(mockData)

      if ('func' in reducedTool) {
        await reducedTool.func({ backtestId: 123 })
      }

      // Should only delete the specific property
      expect(mockData.backtest.totalPerformance.closedTrades).toBeUndefined()
      expect(mockData.backtest.totalPerformance.nestedObject.deepProperty).toBe('preserved')
      expect(mockData.backtest.otherData).toBe('preserved')
    })

    it('should handle partial data structures', async () => {
      const reducedTool = getBacktestToolsDefinitions[BACKTEST_TOOL_KEYS.READ_BACKTEST_REDUCED]

      // Test with missing intermediate objects
      const mockData = {
        backtest: {
          // Missing totalPerformance
          charts: { chart1: 'data' },
        },
      }

      mockQCClientInstance.post.mockResolvedValue(mockData)

      if ('func' in reducedTool) {
        await expect(reducedTool.func({ backtestId: 123 })).resolves.toBeDefined()
      }

      // Should delete charts but not crash on missing totalPerformance
      expect(mockData.backtest.charts).toBeUndefined()
    })
  })

  describe('error handling and edge cases', () => {
    it('should handle QCClient errors in reduced tool', async () => {
      const reducedTool = getBacktestToolsDefinitions[BACKTEST_TOOL_KEYS.READ_BACKTEST_REDUCED]

      const qcError = new Error('API Error')
      mockQCClientInstance.post.mockRejectedValue(qcError)

      if ('func' in reducedTool) {
        await expect(reducedTool.func({ backtestId: 123 })).rejects.toThrow('API Error')
      }
    })

    it('should handle schema parsing errors in reduced tool', async () => {
      const reducedTool = getBacktestToolsDefinitions[BACKTEST_TOOL_KEYS.READ_BACKTEST_REDUCED]

      // Mock readBacktestResponse.parse to throw
      const originalParse = readBacktestResponse.parse
      readBacktestResponse.parse = jest.fn().mockImplementation(() => {
        throw new Error('Schema validation failed')
      })

      mockQCClientInstance.post.mockResolvedValue({ test: 'data' })

      if ('func' in reducedTool) {
        await expect(reducedTool.func({ backtestId: 123 })).rejects.toThrow('Schema validation failed')
      }

      // Restore original parse
      readBacktestResponse.parse = originalParse
    })

    it('should handle empty response data', async () => {
      const reducedTool = getBacktestToolsDefinitions[BACKTEST_TOOL_KEYS.READ_BACKTEST_REDUCED]

      mockQCClientInstance.post.mockResolvedValue({})

      if ('func' in reducedTool) {
        await expect(reducedTool.func({ backtestId: 123 })).resolves.toBeDefined()
      }
    })
  })

  describe('tool consistency', () => {
    it('should have consistent title formatting', () => {
      Object.values(getBacktestToolsDefinitions).forEach((tool) => {
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
      Object.values(getBacktestToolsDefinitions).forEach((tool) => {
        if (tool.config.description) {
          expect(typeof tool.config.description).toBe('string')
          expect(tool.config.description.length).toBeGreaterThan(0)

          // Should end with period
          expect(tool.config.description).toMatch(/\.$/)

          // Should be properly capitalized
          expect(tool.config.description.charAt(0)).toMatch(/[A-Z]/)
        }
      })
    })

    it('should have consistent annotation patterns', () => {
      Object.values(getBacktestToolsDefinitions).forEach((tool) => {
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
})

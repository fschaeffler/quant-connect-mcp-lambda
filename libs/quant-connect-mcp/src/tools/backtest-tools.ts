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
  readBacktestChartResponse,
  readBacktestOrderBody,
  readBacktestOrderResponse,
  readBacktestResponse,
  readBacktestsInsightsBody,
  readBacktestsInsightsResponse,
  readBacktestsReportBody,
  readBacktestsReportResponse,
  updateBacktestBody,
  updateBacktestResponse,
} from '@fschaeffler/quant-connect-types'
import type z from 'zod'
import { mergeUnionToRawShape } from '../utils'
import type { ToolRegistrationDefinitions } from './index'
import { BACKTEST_TOOL_KEYS } from './tool-keys'

export const getBacktestToolsDefinitions: ToolRegistrationDefinitions<BACKTEST_TOOL_KEYS> = {
  [BACKTEST_TOOL_KEYS.CREATE_BACKTEST]: {
    config: {
      title: 'Create backtest',
      description: 'Create a new backtest request and get the backtest Id.',
      inputSchema: createBacktestBody.shape,
      outputSchema: createBacktestResponse.shape,
      annotations: {
        readOnlyHint: false,
        idempotentHint: false,
        destructiveHint: false,
      },
    },
    url: 'backtests/create',
  },
  [BACKTEST_TOOL_KEYS.READ_BACKTEST]: {
    config: {
      title: 'Read backtest',
      description: 'Read the full results of a backtest.',
      inputSchema: readBacktestBody.shape,
      outputSchema: readBacktestResponse.shape,
      annotations: {
        readOnlyHint: true,
        idempotentHint: false,
      },
    },
    url: 'backtests/read',
  },
  [BACKTEST_TOOL_KEYS.READ_BACKTEST_REDUCED]: {
    config: {
      title: 'Read backtest reduced',
      description: 'Read the reduced results of a backtest. Returns a reduced payload without orders, charts, closed trades and rolling window.',
      inputSchema: readBacktestBody.shape,
      outputSchema: readBacktestResponse.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
      },
    },
    func: async (params) => {
      const data = await QCClient.getInstance().post<z.infer<typeof readBacktestResponse>, z.infer<typeof readBacktestResponse>>('backtests/read', params)

      // attribute not specified in the response schema, but it's there in reality
      if (data && Object.hasOwn(data, 'orders')) {
        delete (data as any).orders
      }

      if (data?.backtest?.charts) {
        delete data.backtest.charts
      }

      if (data?.backtest?.totalPerformance?.closedTrades) {
        delete data.backtest.totalPerformance.closedTrades
      }

      if (data?.backtest?.rollingWindow) {
        delete data.backtest.rollingWindow
      }

      return readBacktestResponse.parse(data)
    },
  },
  [BACKTEST_TOOL_KEYS.LIST_BACKTESTS]: {
    config: {
      title: 'List backtests',
      description: 'List all backtests in your default organization. Use start and end to page through results.',
      inputSchema: listBacktestsBody.shape,
      outputSchema: listBacktestsResponse.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
      },
    },
    url: 'backtests/list',
  },
  [BACKTEST_TOOL_KEYS.READ_BACKTEST_CHART]: {
    config: {
      title: 'Read backtest chart',
      description: 'Read a chart from a backtest.',
      inputSchema: readBacktestChartBody.shape,
      outputSchema: mergeUnionToRawShape(readBacktestChartResponse),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
      },
    },
    url: 'backtests/chart/read',
  },
  [BACKTEST_TOOL_KEYS.READ_BACKTEST_ORDERS]: {
    config: {
      title: 'Read backtest orders',
      description: 'Read out the orders of a backtest.',
      inputSchema: readBacktestOrderBody.shape,
      outputSchema: readBacktestOrderResponse.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
      },
    },
    url: 'backtests/orders/read',
  },
  [BACKTEST_TOOL_KEYS.READ_BACKTEST_INSIGHTS]: {
    config: {
      title: 'Read backtest insights',
      description: 'Read out the insights of a backtest.',
      inputSchema: readBacktestsInsightsBody.shape,
      outputSchema: readBacktestsInsightsResponse.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
      },
    },
    // url is correct, even though it's `read` before `insights`
    url: 'backtests/read/insights',
  },
  [BACKTEST_TOOL_KEYS.READ_BACKTEST_REPORT]: {
    config: {
      title: 'Read backtest report',
      description: 'Read out the report of a backtest.',
      inputSchema: readBacktestsReportBody.shape,
      outputSchema: mergeUnionToRawShape(readBacktestsReportResponse),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
      },
    },
    // url is correct, even though it's `read` before `report`
    url: 'backtests/read/report',
  },
  [BACKTEST_TOOL_KEYS.UPDATE_BACKTEST]: {
    config: {
      title: 'Update backtest',
      description: 'Update the name or note of a backtest.',
      inputSchema: updateBacktestBody.shape,
      outputSchema: updateBacktestResponse.shape,
      annotations: {
        readOnlyHint: false,
        idempotentHint: true,
        destructiveHint: false,
      },
    },
    url: 'backtests/update',
  },
  [BACKTEST_TOOL_KEYS.DELETE_BACKTEST]: {
    config: {
      title: 'Delete backtest',
      description: 'Delete a backtest from a project. This action is irreversible.',
      inputSchema: deleteBacktestBody.shape,
      outputSchema: deleteBacktestResponse.shape,
      annotations: {
        readOnlyHint: false,
        idempotentHint: true,
        destructiveHint: true,
      },
    },
    url: 'backtests/delete',
  },
}

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
  readLiveChartResponse,
  readLiveInsightBody,
  readLiveInsightResponse,
  readLiveLogBody,
  readLiveLogResponse,
  readLiveOrderBody,
  readLiveOrderResponse,
  readLivePortfolioBody,
  readLivePortfolioResponse,
  stopLiveBody,
  stopLiveResponse,
} from '@fschaeffler/quant-connect-types'
import z from 'zod'
import { mergeUnionToRawShape } from '../utils'
import type { ToolRegistrationDefinitions } from './index'
import { LIVE_TOOL_KEYS } from './tool-keys'

export const getLiveToolsDefinitions: ToolRegistrationDefinitions<LIVE_TOOL_KEYS> = {
  [LIVE_TOOL_KEYS.AUTHORIZE_CONNECTION_STEP1]: {
    config: {
      title: 'Authorize external connection - Step 1',
      description: [
        'Authorize an external connection with a live brokerage or data provider.',
        'Authorization process is always in two steps.',
        'First, an URL is returned that needs to get opened by the user.',
        'Second, the authorization config is stored in the Quant Connect project',
      ].join('\n'),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      },
      inputSchema: authorizeLiveAuth0Body.shape,
      outputSchema: {
        authURL: z.string().url().describe('The URL to open in the browser to complete the authentication flow.'),
      },
    },
    func: async () => {
      const response = await QCClient.getInstance().postWithRawResponse('/live/auth0/authorize', { redirect: false }, { timeout: 5 * 60 * 1000 })
      const redirectURL = response.headers['Location'] || response.headers['location']
      return { authURL: redirectURL }
    },
  },
  [LIVE_TOOL_KEYS.AUTHORIZE_CONNECTION_STEP2]: {
    config: {
      title: 'Authorize external connection - Step 2',
      description: [
        'Authorize an external connection with a live brokerage or data provider.',
        'Authorization process is always in two steps.',
        'First, an URL is returned that needs to get opened by the user.',
        'Second, the authorization config is stored in the Quant Connect project',
      ].join('\n'),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      },
      inputSchema: authorizeLiveAuth0Body.shape,
      outputSchema: readLiveAuth0Response.shape,
    },
    url: '/live/auth0/read',
  },
  [LIVE_TOOL_KEYS.CREATE_LIVE_ALGORITHM]: {
    config: {
      title: 'Create live algorithm',
      description: 'Create a live algorithm.',
      inputSchema: createLiveBody.shape,
      outputSchema: createLiveResponse.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    url: '/live/create',
  },
  [LIVE_TOOL_KEYS.READ_LIVE_ALGORITHM]: {
    config: {
      title: 'Read live algorithm',
      description: 'Read details of a live algorithm.',
      inputSchema: readLiveBody.shape,
      outputSchema: createLiveResponse.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    url: '/live/read',
  },
  [LIVE_TOOL_KEYS.LIST_LIVE_ALGORITHMS]: {
    config: {
      title: 'List live algorithms',
      description: 'List all your past and current live trading deployments.',
      inputSchema: listLiveBody.shape,
      outputSchema: listLiveResponse.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    url: '/live/list',
  },
  [LIVE_TOOL_KEYS.READ_LIVE_CHART]: {
    config: {
      title: 'Read live chart',
      description: 'Read a chart from a live algorithm.',
      inputSchema: readLiveChartBody.shape,
      outputSchema: mergeUnionToRawShape(readLiveChartResponse),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    url: '/live/chart/read',
  },
  [LIVE_TOOL_KEYS.READ_LIVE_LOGS]: {
    config: {
      title: 'Read live logs',
      description: 'Get the logs of a live algorithm. The snapshot updates about every 5 minutes.',
      inputSchema: readLiveLogBody.shape,
      outputSchema: readLiveLogResponse.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    url: '/live/logs/read',
  },
  [LIVE_TOOL_KEYS.READ_LIVE_PORTFOLIO]: {
    config: {
      title: 'Read live portfolio',
      description: 'Read out the portfolio state of a live algorithm. The snapshot updates about every 10 minutes.',
      inputSchema: readLivePortfolioBody.shape,
      outputSchema: readLivePortfolioResponse.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    url: '/live/portfolio/read',
  },
  [LIVE_TOOL_KEYS.READ_LIVE_ORDERS]: {
    config: {
      title: 'Read live orders',
      description: 'Read out the orders of a live algorithm. The snapshot updates about every 10 minutes.',
      inputSchema: readLiveOrderBody.shape,
      outputSchema: mergeUnionToRawShape(readLiveOrderResponse),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    url: '/live/orders/read',
  },
  [LIVE_TOOL_KEYS.READ_LIVE_INSIGHTS]: {
    config: {
      title: 'Read live insights',
      description: 'Read out the insights of a live algorithm. The snapshot updates about every 10 minutes.',
      inputSchema: readLiveInsightBody.shape,
      outputSchema: readLiveInsightResponse.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    url: '/live/insights/read',
  },
  [LIVE_TOOL_KEYS.STOP_LIVE_ALGORITHM]: {
    config: {
      title: 'Stop live algorithm',
      description: 'Stop a live algorithm.',
      inputSchema: stopLiveBody.shape,
      outputSchema: stopLiveResponse.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
      },
    },
    url: '/live/update/stop',
  },
  [LIVE_TOOL_KEYS.LIQUIDATE_LIVE_ALGORITHM]: {
    config: {
      title: 'Liquidate live algorithm',
      description: 'Liquidate and stop a live algorithm.',
      inputSchema: liquidateLiveBody.shape,
      outputSchema: liquidateLiveResponse.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
      },
    },
    url: '/live/update/liquidate',
  },
}

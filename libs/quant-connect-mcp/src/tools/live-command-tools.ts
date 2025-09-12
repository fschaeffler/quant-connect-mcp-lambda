import { broadcastLiveCommandBody, broadcastLiveCommandResponse, createLiveCommandBody, createLiveCommandResponse } from '@fschaeffler/quant-connect-types'
import type { ToolRegistrationDefinitions } from './index'
import { LIVE_COMMAND_TOOL_KEYS } from './tool-keys'

export const getLiveCommandToolsDefinitions: ToolRegistrationDefinitions<LIVE_COMMAND_TOOL_KEYS> = {
  [LIVE_COMMAND_TOOL_KEYS.CREATE_LIVE_COMMAND]: {
    config: {
      title: 'Create live command',
      description: 'Send a command to a live trading algorithm.',
      inputSchema: createLiveCommandBody.shape,
      outputSchema: createLiveCommandResponse.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    url: '/live/commands/create',
  },
  [LIVE_COMMAND_TOOL_KEYS.BROADCAST_LIVE_COMMAND]: {
    config: {
      title: 'Broadcast live command',
      description: 'Broadcast a live command to all live algorithms in an organization',
      inputSchema: broadcastLiveCommandBody.shape,
      outputSchema: broadcastLiveCommandResponse.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    url: '/live/commands/broadcast',
  },
}

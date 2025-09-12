import { readAccountResponse } from '@fschaeffler/quant-connect-types'
import type { ToolRegistrationDefinitions } from './index'
import { ACCOUNT_TOOL_KEYS } from './tool-keys'

export const getAccountToolsDefinitions: ToolRegistrationDefinitions<ACCOUNT_TOOL_KEYS> = {
  [ACCOUNT_TOOL_KEYS.READ_ACCOUNT]: {
    config: {
      title: 'Read account',
      description: 'Read the organization account status.',
      outputSchema: readAccountResponse.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    url: '/account/read',
  },
}

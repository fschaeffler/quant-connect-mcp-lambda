import { createCompileBody, createCompileResponse, readCompileBody, readCompileResponse } from '@fschaeffler/quant-connect-types'
import type { ToolRegistrationDefinitions } from './index'
import { COMPILE_TOOL_KEYS } from './tool-keys'

export const getCompileToolsDefinitions: ToolRegistrationDefinitions<COMPILE_TOOL_KEYS> = {
  [COMPILE_TOOL_KEYS.CREATE_COMPILE]: {
    config: {
      title: 'Create compile',
      description: 'Asynchronously create a compile job request for a project.',
      inputSchema: createCompileBody.shape,
      outputSchema: createCompileResponse.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    url: '/compile/create',
  },
  [COMPILE_TOOL_KEYS.READ_COMPILE]: {
    config: {
      title: 'Read compile',
      description: 'Read a compile packet job result.',
      inputSchema: readCompileBody.shape,
      outputSchema: readCompileResponse.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    url: '/compile/read',
  },
}

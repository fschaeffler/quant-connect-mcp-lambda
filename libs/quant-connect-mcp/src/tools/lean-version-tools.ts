import { readLeanVersionResponse } from '@fschaeffler/quant-connect-types'
import type { ToolRegistrationDefinitions } from './index'
import { LEAN_VERSION_TOOL_KEYS } from './tool-keys'

export const getLeanVersionToolsDefinitions: ToolRegistrationDefinitions<LEAN_VERSION_TOOL_KEYS> = {
  [LEAN_VERSION_TOOL_KEYS.READ_LEAN_VERSIONS]: {
    config: {
      title: 'Read LEAN versions',
      description: 'Returns a list of LEAN versions with basic information for each version.',
      outputSchema: readLeanVersionResponse.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    url: '/lean/versions/read',
  },
}

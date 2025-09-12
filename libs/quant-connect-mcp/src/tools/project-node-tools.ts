import { readProjectNodeBody, updateProjectNodeBody, updateProjectNodeResponse } from '@fschaeffler/quant-connect-types'
import type { ToolRegistrationDefinitions } from './index'
import { PROJECT_NODE_TOOL_KEYS } from './tool-keys'

export const getProjectNodeToolsDefinitions: ToolRegistrationDefinitions<PROJECT_NODE_TOOL_KEYS> = {
  [PROJECT_NODE_TOOL_KEYS.READ_PROJECT_NODES]: {
    config: {
      title: 'Read project nodes',
      description: 'Read the available and selected nodes of a project.',
      inputSchema: readProjectNodeBody.shape,
      outputSchema: readProjectNodeBody.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    url: '/projects/nodes/read',
  },
  [PROJECT_NODE_TOOL_KEYS.UPDATE_PROJECT_NODES]: {
    config: {
      title: 'Update project nodes',
      description: [
        'Update the active state of the given nodes to true.',
        `If you don't provide any nodes, all the nodes become inactive and autoSelectNode is true.`,
      ].join(' '),
      inputSchema: updateProjectNodeBody.shape,
      outputSchema: updateProjectNodeResponse.shape,
      annotations: {
        destructiveHint: false,
      },
    },
    url: '/projects/nodes/update',
  },
}

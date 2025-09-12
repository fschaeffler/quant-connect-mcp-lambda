import {
  acquireProjectCollaborationLockBody,
  acquireProjectCollaborationLockResponse,
  createProjectCollaborationBody,
  createProjectCollaborationResponse,
  deleteProjectCollaborationBody,
  deleteProjectCollaborationResponse,
  readProjectCollaborationBody,
  readProjectCollaborationResponse,
  updateProjectCollaborationBody,
  updateProjectCollaborationResponse,
} from '@fschaeffler/quant-connect-types'
import type { ToolRegistrationDefinitions } from './index'
import { PROJECT_COLLABORATION_TOOL_KEYS } from './tool-keys'

export const getProjectCollaborationToolsDefinitions: ToolRegistrationDefinitions<PROJECT_COLLABORATION_TOOL_KEYS> = {
  [PROJECT_COLLABORATION_TOOL_KEYS.CREATE_PROJECT_COLLABORATOR]: {
    config: {
      title: 'Create project collaborator',
      description: 'Add a collaborator to a project.',
      inputSchema: createProjectCollaborationBody.shape,
      outputSchema: createProjectCollaborationResponse.shape,
      annotations: {
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    url: '/projects/collaboration/create',
  },
  [PROJECT_COLLABORATION_TOOL_KEYS.READ_PROJECT_COLLABORATORS]: {
    config: {
      title: 'Read project collaborators',
      description: 'List all collaborators on a project.',
      inputSchema: readProjectCollaborationBody.shape,
      outputSchema: readProjectCollaborationResponse.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    url: '/projects/collaboration/read',
  },
  [PROJECT_COLLABORATION_TOOL_KEYS.UPDATE_PROJECT_COLLABORATOR]: {
    config: {
      title: 'Update project collaborator',
      description: 'Update collaborator information in a project.',
      inputSchema: updateProjectCollaborationBody.shape,
      outputSchema: updateProjectCollaborationResponse.shape,
      annotations: {
        idempotentHint: true,
      },
    },
    url: '/projects/collaboration/update',
  },
  [PROJECT_COLLABORATION_TOOL_KEYS.DELETE_PROJECT_COLLABORATOR]: {
    config: {
      title: 'Delete project collaborator',
      description: 'Remove a collaborator from a project.',
      inputSchema: deleteProjectCollaborationBody.shape,
      outputSchema: deleteProjectCollaborationResponse.shape,
      annotations: {
        idempotentHint: true,
      },
    },
    url: '/projects/collaboration/delete',
  },
  [PROJECT_COLLABORATION_TOOL_KEYS.LOCK_PROJECT_WITH_COLLABORATORS]: {
    config: {
      title: 'Lock project with collaborators',
      description: [
        'Lock a project so you can edit it.',
        'This is necessary when the project has collaborators or when an LLM is editing files on your behalf via our MCP Server.',
      ].join(' '),
      inputSchema: acquireProjectCollaborationLockBody.shape,
      outputSchema: acquireProjectCollaborationLockResponse.shape,
    },
    url: '/projects/collaboration/lock/acquire',
    injectCodeSourceId: true,
  },
}

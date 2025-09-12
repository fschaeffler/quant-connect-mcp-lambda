import {
  createProjectBody,
  createProjectResponse,
  deleteProjectBody,
  deleteProjectResponse,
  readProjectBody,
  readProjectResponse,
  updateProjectBody,
  updateProjectResponse,
} from '@fschaeffler/quant-connect-types'
import type { ToolRegistrationDefinitions } from './index'
import { PROJECT_TOOL_KEYS } from './tool-keys'

export const getProjectToolsDefinitions: ToolRegistrationDefinitions<PROJECT_TOOL_KEYS> = {
  [PROJECT_TOOL_KEYS.CREATE_PROJECT]: {
    config: {
      title: 'Create Project',
      description: 'Create a new project in your default organization.',
      inputSchema: createProjectBody.shape,
      outputSchema: createProjectResponse.shape,
    },
    url: 'projects/create',
  },
  [PROJECT_TOOL_KEYS.READ_PROJECT]: {
    config: {
      title: 'Read Project',
      description: 'List the details of a project.',
      inputSchema: readProjectBody.shape,
      outputSchema: readProjectResponse.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
      },
    },
    url: 'projects/read',
  },
  [PROJECT_TOOL_KEYS.LIST_PROJECTS]: {
    config: {
      title: 'List Projects',
      description: 'List the details of all projects. Omit projectId. Use start and end to page through results.',
      inputSchema: readProjectBody.shape,
      outputSchema: readProjectResponse.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
      },
    },
    url: 'projects/read',
  },
  [PROJECT_TOOL_KEYS.UPDATE_PROJECT]: {
    config: {
      title: 'Update Project',
      description: `Update a project's name or description.`,
      inputSchema: updateProjectBody.shape,
      outputSchema: updateProjectResponse.shape,
      annotations: {
        readOnlyHint: false,
        idempotentHint: true,
      },
    },
    url: 'projects/update',
  },
  [PROJECT_TOOL_KEYS.DELETE_PROJECT]: {
    config: {
      title: 'Delete Project',
      description: 'Delete a project. This action cannot be undone.',
      inputSchema: deleteProjectBody.shape,
      outputSchema: deleteProjectResponse.shape,
    },
    url: 'projects/delete',
  },
}

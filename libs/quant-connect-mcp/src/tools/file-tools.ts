import {
  createFileBody,
  createFileResponse,
  deleteFileBody,
  deleteFileResponse,
  readFileBody,
  readFileResponse,
  updateFileBody,
  updateFileResponse,
} from '@fschaeffler/quant-connect-types'
import { mergeUnionToRawShape } from '../utils'
import type { ToolRegistrationDefinitions } from './index'
import { FILE_TOOL_KEYS } from './tool-keys'

export const getFileToolsDefinitions: ToolRegistrationDefinitions<FILE_TOOL_KEYS> = {
  [FILE_TOOL_KEYS.CREATE_FILE]: {
    config: {
      title: 'Create file',
      description: 'Add a file to a given project.',
      inputSchema: createFileBody.shape,
      outputSchema: createFileResponse.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    url: '/files/create',
    injectCodeSourceId: true,
  },
  [FILE_TOOL_KEYS.READ_FILE]: {
    config: {
      title: 'Read file',
      description: 'Read a file from a project, or all files in the project if no file name is provided.',
      inputSchema: readFileBody.shape,
      outputSchema: readFileResponse.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    url: '/files/read',
    injectCodeSourceId: true,
  },
  [FILE_TOOL_KEYS.UPDATE_FILE_NAME]: {
    config: {
      title: 'Update file name',
      description: 'Update the name of a file.',
      inputSchema: mergeUnionToRawShape(updateFileBody),
      outputSchema: mergeUnionToRawShape(updateFileResponse),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    url: '/files/update',
    injectCodeSourceId: true,
  },
  [FILE_TOOL_KEYS.UPDATE_FILE_CONTENTS]: {
    config: {
      title: 'Update file contents',
      description: 'Update the contents of a file.',
      inputSchema: mergeUnionToRawShape(updateFileBody),
      outputSchema: mergeUnionToRawShape(updateFileResponse),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    url: '/files/update',
    injectCodeSourceId: true,
  },
  [FILE_TOOL_KEYS.DELETE_FILE]: {
    config: {
      title: 'Delete file',
      description: 'Delete a file in a project.',
      inputSchema: deleteFileBody.shape,
      outputSchema: deleteFileResponse.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
      },
    },
    url: '/files/delete',
    injectCodeSourceId: true,
  },
}

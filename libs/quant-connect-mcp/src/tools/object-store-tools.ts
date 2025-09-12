import { QCClient } from '@fschaeffler/quant-connect-client'
import {
  deleteObjectBody,
  deleteObjectResponse,
  getObjectBody,
  getObjectPropertiesBody,
  getObjectPropertiesResponse,
  getObjectResponse,
  listObjectBody,
  listObjectResponse,
  setObjectBody,
  setObjectResponse,
} from '@fschaeffler/quant-connect-types'
import FormData from 'form-data'
import z from 'zod'
import { mergeUnionToRawShape } from '../utils'
import type { ToolRegistrationDefinitions } from './index'
import { OBJECT_STORE_TOOL_KEYS } from './tool-keys'

export const getObjectStoreToolsDefinitions: ToolRegistrationDefinitions<OBJECT_STORE_TOOL_KEYS> = {
  [OBJECT_STORE_TOOL_KEYS.UPLOAD_OBJECT]: {
    config: {
      title: 'Upload object',
      description: 'Upload files to the Object Store.',
      inputSchema: setObjectBody.shape,
      outputSchema: setObjectResponse.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    func: async (params) => {
      const formData = new FormData()
      formData.append('objectData', params.objectData)

      delete params.objectData

      const data = await QCClient.getInstance().postFormData<z.infer<typeof setObjectBody>, z.infer<typeof setObjectResponse>>('/object/set', params, formData)

      return data
    },
  },
  [OBJECT_STORE_TOOL_KEYS.READ_OBJECT_PROPERTIES]: {
    config: {
      title: 'Read object store file properties',
      description: `Get Object Store properties of a specific organization and and key. It doesn't work if the key is a directory in the Object Store.`,
      inputSchema: getObjectPropertiesBody.shape,
      outputSchema: getObjectPropertiesResponse.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    url: '/object/properties',
  },
  [OBJECT_STORE_TOOL_KEYS.READ_OBJECT_STORE_FILE_JOB_ID]: {
    config: {
      title: 'Read Object Store file job Id',
      description: 'Create a job to download files from the Object Store and then read the job Id.',
      inputSchema: mergeUnionToRawShape(getObjectBody),
      outputSchema: getObjectResponse.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    url: '/object/get',
  },
  [OBJECT_STORE_TOOL_KEYS.READ_OBJECT_STORE_FILE_DOWNLOAD_URL]: {
    config: {
      title: 'Read Object Store file download URL',
      description: 'Get the URL for downloading files from the Object Store.',
      inputSchema: mergeUnionToRawShape(getObjectBody),
      outputSchema: getObjectResponse.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    url: '/object/get',
  },
  [OBJECT_STORE_TOOL_KEYS.LIST_OBJECT_STORE_FILES]: {
    config: {
      title: 'List Object Store files',
      description: 'List the Object Store files under a specific directory in an organization.',
      inputSchema: listObjectBody.shape,
      outputSchema: listObjectResponse.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    url: '/object/list',
  },
  [OBJECT_STORE_TOOL_KEYS.DELETE_OBJECT]: {
    config: {
      title: 'Delete Object Store file',
      description: 'Delete the Object Store file of a specific organization and  key.',
      inputSchema: deleteObjectBody.shape,
      outputSchema: deleteObjectResponse.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
      },
    },
    url: '/object/delete',
  },
}

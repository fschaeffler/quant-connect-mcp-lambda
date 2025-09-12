import {
  abortOptimizationBody,
  abortOptimizationResponse,
  createOptimizationBody,
  createOptimizationResponse,
  deleteOptimizationBody,
  deleteOptimizationResponse,
  estimateOptimizationBody,
  estimateOptimizationResponse,
  listOptimizationsBody,
  listOptimizationsResponse,
  readOptimizationBody,
  readOptimizationResponse,
  updateOptimizationBody,
  updateOptimizationResponse,
} from '@fschaeffler/quant-connect-types'
import type { ToolRegistrationDefinitions } from './index'
import { OPTIMIZATION_TOOL_KEYS } from './tool-keys'

export const getOptimizationToolsDefinitions: ToolRegistrationDefinitions<OPTIMIZATION_TOOL_KEYS> = {
  [OPTIMIZATION_TOOL_KEYS.ESTIMATE_OPTIMIZAION_TIME]: {
    config: {
      title: 'Estimate optimization time',
      description: 'Estimate the execution time of an optimization with the specified parameters.',
      inputSchema: estimateOptimizationBody.shape,
      outputSchema: estimateOptimizationResponse.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    url: '/optimizations/estimate',
  },
  [OPTIMIZATION_TOOL_KEYS.CREATE_OPTIMIZATION]: {
    config: {
      title: 'Create optimization',
      description: 'Create an optimization with the specified parameters.',
      inputSchema: createOptimizationBody.shape,
      outputSchema: createOptimizationResponse.shape,
      annotations: {
        destructiveHint: false,
      },
    },
    url: '/optimizations/create',
  },
  [OPTIMIZATION_TOOL_KEYS.READ_OPTIMIZATION]: {
    config: {
      title: 'Read optimization',
      description: 'Read an optimization.',
      inputSchema: readOptimizationBody.shape,
      outputSchema: readOptimizationResponse.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    url: '/optimizations/read',
  },
  [OPTIMIZATION_TOOL_KEYS.LIST_OPTIMIZATIONS]: {
    config: {
      title: 'List optimizations',
      description: 'List all the optimizations for a project.',
      inputSchema: listOptimizationsBody.shape,
      outputSchema: listOptimizationsResponse.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    url: '/optimizations/list',
  },
  [OPTIMIZATION_TOOL_KEYS.UPDATE_OPTIMIZATION]: {
    config: {
      title: 'Update optimization',
      description: 'Update the name of an optimization.',
      inputSchema: updateOptimizationBody.shape,
      outputSchema: updateOptimizationResponse.shape,
      annotations: {
        idempotentHint: true,
        destructiveHint: false,
      },
    },
    url: '/optimizations/update',
  },
  [OPTIMIZATION_TOOL_KEYS.ABORT_OPTIMIZATION]: {
    config: {
      title: 'Abort optimization',
      description: 'Abort an optimization.',
      inputSchema: abortOptimizationBody.shape,
      outputSchema: abortOptimizationResponse.shape,
      annotations: {
        idempotentHint: true,
      },
    },
    url: '/optimizations/abort',
  },
  [OPTIMIZATION_TOOL_KEYS.DELETE_OPTIMIZATION]: {
    config: {
      title: 'Delete optimization',
      description: 'Delete an optimization.',
      inputSchema: deleteOptimizationBody.shape,
      outputSchema: deleteOptimizationResponse.shape,
      annotations: {
        idempotentHint: true,
        destructiveHint: true,
      },
    },
    url: '/optimizations/delete',
  },
}

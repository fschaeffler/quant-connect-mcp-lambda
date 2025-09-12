import { QCClient } from '@fschaeffler/quant-connect-client'
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types'
import { ZodObject, type ZodRawShape } from 'zod'
import { QCMCPServer } from '../server'
import { injectCodeSourceId } from '../utils'
import { getAccountToolsDefinitions } from './account-tools'
import { getAIToolsDefinitions } from './ai-tools'
import { getBacktestToolsDefinitions } from './backtest-tools'
import { getCompileToolsDefinitions } from './compile-tools'
import { getFileToolsDefinitions } from './file-tools'
import { getLeanVersionToolsDefinitions } from './lean-version-tools'
import { getLiveCommandToolsDefinitions } from './live-command-tools'
import { getLiveToolsDefinitions } from './live-tools'
import { getMCPServerToolsDefinitions } from './mcp-server-tools'
import { getObjectStoreToolsDefinitions } from './object-store-tools'
import { getOptimizationToolsDefinitions } from './optimization-tools'
import { getProjectCollaborationToolsDefinitions } from './project-collaboration-tools'
import { getProjectNodeToolsDefinitions } from './project-node-tools'
import { getProjectToolsDefinitions } from './project-tools'
import { TOOL_KEYS } from './tool-keys'

export interface ToolRegistrationDefinitionDataQCAPI<InputArgs extends ZodRawShape, OutputArgs extends ZodRawShape>
  extends ToolRegistrationDefinitionDataCommon<InputArgs, OutputArgs> {
  url: string
  injectCodeSourceId?: boolean
}

export interface ToolRegistrationDefinitionDataCustom<InputArgs extends ZodRawShape, OutputArgs extends ZodRawShape>
  extends ToolRegistrationDefinitionDataCommon<InputArgs, OutputArgs> {
  func: (params: any) => Promise<any>
}

export interface ToolRegistrationDefinitionDataCommon<InputArgs extends ZodRawShape, OutputArgs extends ZodRawShape> {
  config: {
    title?: string
    description?: string
    inputSchema?: InputArgs
    outputSchema?: OutputArgs
    annotations?: ToolAnnotations
  }
}

export type ToolRegistrationDefinitionData<InputArgs extends ZodRawShape, OutputArgs extends ZodRawShape> =
  | ToolRegistrationDefinitionDataCustom<InputArgs, OutputArgs>
  | ToolRegistrationDefinitionDataQCAPI<InputArgs, OutputArgs>

export type ToolRegistrationDefinitions<T extends string> = Record<T, ToolRegistrationDefinitionData<ZodRawShape, ZodRawShape>>

export function registerTools(this: QCMCPServer) {
  const definitions: ToolRegistrationDefinitions<TOOL_KEYS> = {
    ...getMCPServerToolsDefinitions,
    ...getBacktestToolsDefinitions,
    ...getCompileToolsDefinitions,
    ...getFileToolsDefinitions,
    ...getProjectToolsDefinitions,
    ...getAccountToolsDefinitions,
    ...getAIToolsDefinitions,
    ...getLeanVersionToolsDefinitions,
    ...getLiveCommandToolsDefinitions,
    ...getLiveToolsDefinitions,
    ...getObjectStoreToolsDefinitions,
    ...getOptimizationToolsDefinitions,
    ...getProjectCollaborationToolsDefinitions,
    ...getProjectNodeToolsDefinitions,
  }

  Object.entries(definitions).forEach(([toolName, definition]) => {
    this.server.registerTool(toolName, definition.config, async (params: typeof definition.config.inputSchema) => {
      let response: any

      if ('func' in definition) {
        response = await definition.func(params)
      } else if ('url' in definition) {
        if (definition.injectCodeSourceId === true) {
          injectCodeSourceId(definition.config.inputSchema)
        }

        response = await QCClient.getInstance().post<any, any>(definition.url, params)

        if (definition.config.outputSchema) {
          response = ZodObject.create(definition.config.outputSchema).parse(response)
        }
      } else {
        throw new Error('Invalid tool definition')
      }

      return {
        content: [],
        structuredContent: response,
      }
    })
  })
}

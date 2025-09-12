import z from 'zod'
import { name, version } from '../../package.json'
import type { ToolRegistrationDefinitions } from './index'
import { MCP_SERVER_TOOL_KEYS } from './tool-keys'

export const getMCPServerToolsDefinitions: ToolRegistrationDefinitions<MCP_SERVER_TOOL_KEYS> = {
  [MCP_SERVER_TOOL_KEYS.READ_INFRA_HEALTH]: {
    config: {
      title: 'Read the health of the MCP server',
      description: 'Returns a health status of the server.',
      inputSchema: undefined,
      outputSchema: {
        healthStatus: z.literal('ok'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
    },
    func: () => Promise.resolve({ healthStatus: 'ok' }),
  },
  [MCP_SERVER_TOOL_KEYS.READ_MCP_SERVER_VERSION]: {
    config: {
      title: 'Read the MCP server version',
      description: 'Returns the version of the QC MCP Server that is running.',
      outputSchema: {
        version: z.string().describe('The version of the MCP server.'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
    },
    func: () => Promise.resolve({ version }),
  },
  [MCP_SERVER_TOOL_KEYS.READ_LATEST_MCP_SERVER_VERSION]: {
    config: {
      title: 'Read the latest MCP server version',
      description: 'Returns the latest released version of the MCP Server.',
      outputSchema: {
        version: z.string().describe('The latest released version of the MCP server.'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
        idempotentHint: true,
      },
    },
    func: async () => {
      const response = await fetch(`https://registry.npmjs.org/-/package/${name}/dist-tags`)

      if (!response.ok) {
        throw new Error(`Failed to fetch latest MCP server version: ${response.status} ${response.statusText}`)
      }

      const data = (await response.json()) as { latest: string | null } | null

      return { version: data?.latest as string }
    },
  },
}

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { MCP_SERVER_DESCRIPTION, MCP_SERVER_IDENTIFIER, MCP_SERVER_NAME } from './configs'
import { DEFAULT_MCP_SERVER_INSTRUCTIONS } from './instructions'
import { registerTools } from './tools'

export class QCMCPServer {
  private static instance: QCMCPServer
  protected server: McpServer

  private constructor() {
    this.server = new McpServer(
      {
        name: MCP_SERVER_NAME,
        version: MCP_SERVER_IDENTIFIER,
        description: MCP_SERVER_DESCRIPTION,
      },
      {
        instructions: DEFAULT_MCP_SERVER_INSTRUCTIONS,
      }
    )

    registerTools.call(this)
  }

  public static getInstance(): McpServer {
    if (!QCMCPServer.instance) {
      QCMCPServer.instance = new QCMCPServer()
    }

    return QCMCPServer.instance.server
  }
}

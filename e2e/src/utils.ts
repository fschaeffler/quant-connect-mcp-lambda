import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true })

import { expect } from '@jest/globals'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

export const getMCPClient = async (): Promise<Client> => {
  const mcpServerURL = process.env.QUANT_CONNECT_MCP_URL as string
  const mcpServerAPIGatewayAPIKey = process.env.QUANT_CONNECT_MCP_API_GATEWAY_API_KEY as string

  // Validate environment variables
  if (!mcpServerURL) {
    throw new Error('QUANT_CONNECT_MCP_URL environment variable is required for E2E tests')
  }
  if (!mcpServerAPIGatewayAPIKey) {
    throw new Error('QUANT_CONNECT_MCP_API_GATEWAY_API_KEY environment variable is required for E2E tests')
  }

  expect(mcpServerURL).toBeDefined()
  expect(mcpServerURL.length).toBeGreaterThan(0)
  expect(mcpServerAPIGatewayAPIKey).toBeDefined()
  expect(mcpServerAPIGatewayAPIKey.length).toBeGreaterThan(0)

  const transport = new StreamableHTTPClientTransport(new URL(mcpServerURL), {
    requestInit: {
      headers: {
        'x-api-key': mcpServerAPIGatewayAPIKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    },
  })

  const client = new Client(
    {
      name: 'e2e-test-client',
      version: '1.0.0',
    },
    {
      capabilities: {
        roots: {
          listChanged: true,
        },
      },
    }
  )

  await client.connect(transport)

  return client
}

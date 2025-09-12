import { describe, expect, it } from '@jest/globals'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { getMCPClient } from './utils'

describe('mcp-server', () => {
  let client: Client

  beforeAll(async () => {
    client = await getMCPClient()
  })

  afterAll(async () => {
    if (client) {
      await client.close()
    }
  })

  it('should list available tools', async () => {
    const { tools } = await client.listTools()

    expect(tools).toBeDefined()
    expect(tools.length).toBeGreaterThan(0)
  })

  it('should get a successful health check response', async () => {
    const result = await client.callTool({ name: 'read_infra_health' })
    expect(result?.structuredContent).toEqual({ healthStatus: 'ok' })
  })
})

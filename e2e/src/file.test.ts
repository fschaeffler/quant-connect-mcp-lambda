import { createFileResponse, createProjectResponse, readFileResponse, updateFileResponse } from '@fschaeffler/quant-connect-types'
import { describe, expect, it } from '@jest/globals'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { getMCPClient } from './utils'

describe('file', () => {
  let client: Client
  let projectId: number

  beforeAll(async () => {
    client = await getMCPClient()

    const response = await client.callTool({
      name: 'create_project',
      arguments: {
        name: 'E2E Test Project',
        language: 'Py',
      },
    })

    const data = createProjectResponse.parse(response?.structuredContent)

    projectId = data.projects?.at(0)?.projectId as number
  })

  afterAll(async () => {
    if (client) {
      if (projectId) {
        await client.callTool({
          name: 'delete_project',
          arguments: {
            projectId: projectId,
          },
        })
      }

      await client.close()
    }
  })

  it('should create a file', async () => {
    const response = await client.callTool({
      name: 'create_file',
      arguments: {
        projectId,
        name: 'test.py',
        content: 'print("Hello, world!")',
      },
    })

    const data = createFileResponse.parse(response?.structuredContent)

    expect(data.success).toBe(true)
  })

  it('should read a file', async () => {
    const response = await client.callTool({
      name: 'read_file',
      arguments: {
        projectId,
        name: 'test.py',
      },
    })

    const data = readFileResponse.parse(response?.structuredContent)

    expect(data.files).toBeDefined()
    expect(data.files?.length).toBeGreaterThanOrEqual(1)

    const file = data.files?.find((file) => file.name === 'test.py')

    expect(file).toBeDefined()
    expect(file?.content).toBe('print("Hello, world!")')
  })

  it('should update a file contents', async () => {
    const response = await client.callTool({
      name: 'update_file_contents',
      arguments: {
        projectId,
        name: 'test.py',
        content: 'print("Hello, world!")',
      },
    })

    const data = updateFileResponse.parse(response?.structuredContent)

    expect(data.success).toBe(true)
  })
})

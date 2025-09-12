import { createProjectResponse, deleteProjectResponse, readProjectResponse, updateProjectResponse } from '@fschaeffler/quant-connect-types'
import { describe, expect, it } from '@jest/globals'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { getMCPClient } from './utils'

describe('project', () => {
  let client: Client
  let projectId: number

  beforeAll(async () => {
    client = await getMCPClient()
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

  it('should create a project', async () => {
    const response = await client.callTool({
      name: 'create_project',
      arguments: {
        name: 'E2E Test Project',
        language: 'Py',
      },
    })

    const data = createProjectResponse.parse(response?.structuredContent)

    expect(data.projects).toBeDefined()
    expect(data.projects?.length).toBe(1)

    projectId = data.projects?.at(0)?.projectId as number

    expect(projectId).toBeDefined()
  })

  it('should get the created project', async () => {
    const response = await client.callTool({
      name: 'read_project',
      arguments: {
        projectId,
      },
    })

    const data = createProjectResponse.parse(response?.structuredContent)

    expect(data.projects).toBeDefined()
    expect(data.projects?.length).toBe(1)
    expect(data.projects?.at(0)?.projectId).toBe(projectId)
  })

  it('should list all projects', async () => {
    const response = await client.callTool({
      name: 'list_projects',
      arguments: {},
    })

    const data = readProjectResponse.parse(response?.structuredContent)

    expect(data.projects).toBeDefined()
    expect(data.projects?.length).toBeGreaterThan(0)
  })

  it('should update the created project', async () => {
    const newName = 'E2E Test Project - Updated'

    const response = await client.callTool({
      name: 'update_project',
      arguments: {
        projectId,
        name: newName,
      },
    })

    const data = updateProjectResponse.parse(response?.structuredContent)

    expect(data.success).toBe(true)
  })

  it('should delete the created project', async () => {
    const response = await client.callTool({
      name: 'delete_project',
      arguments: {
        projectId,
      },
    })

    const data = deleteProjectResponse.parse(response?.structuredContent)

    expect(data.success).toBe(true)

    // Set projectId to undefined to avoid afterAll trying to delete it again
    projectId = undefined as unknown as number
  })
})

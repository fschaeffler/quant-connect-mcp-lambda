import { createBacktestResponse, createCompileResponse, createFileResponse, createProjectResponse } from '@fschaeffler/quant-connect-types'
import { describe, expect, it } from '@jest/globals'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import fs from 'fs'
import path from 'path'
import { getMCPClient } from './utils'

describe('backtest', () => {
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

  it('should backtest a project', async () => {
    const exampleAlgorithm = fs.readFileSync(path.resolve(path.join(__dirname), '../data/example-algorithm.py'), 'utf-8')

    expect(exampleAlgorithm).toBeDefined()
    expect(exampleAlgorithm.length).toBeGreaterThan(0)

    const responseCreateFile = await client.callTool({
      name: 'update_file_contents',
      arguments: {
        projectId,
        name: 'main.py',
        content: exampleAlgorithm,
      },
    })

    const createFileData = createFileResponse.parse(responseCreateFile?.structuredContent)

    expect(createFileData.success).toBe(true)

    const responseCompile = await client.callTool({
      name: 'create_compile',
      arguments: {
        projectId,
      },
    })

    const compileData = createCompileResponse.parse(responseCompile?.structuredContent)

    expect(compileData.success).toBe(true)
    expect(compileData.compileId).toBeDefined()

    const responseCreateBacktest = await client.callTool({
      name: 'create_backtest',
      arguments: {
        projectId,
        backtestName: 'E2E Test Backtest',
        compileId: compileData.compileId as any as number,
      },
    })

    const createBacktestData = createBacktestResponse.parse(responseCreateBacktest?.structuredContent)

    expect(createBacktestData.backtest).toBeDefined()
    expect(createBacktestData.backtest?.backtestId).toBeDefined()

    const backtestId = createBacktestData.backtest?.backtestId as any as number

    let backtestDone = false
    let backtestHasErrors = false

    while (!backtestDone) {
      const responseReadBacktest = await client.callTool({
        name: 'read_backtest',
        arguments: {
          projectId,
          backtestId,
        },
      })

      const readBacktestData = createBacktestResponse.parse(responseReadBacktest?.structuredContent)

      backtestDone = readBacktestData.backtest?.status === 'Completed.'
      backtestHasErrors = readBacktestData.backtest?.status === 'Runtime Error' || readBacktestData.success !== true

      await new Promise((resolve) => setTimeout(resolve, 5000))
    }

    expect(backtestDone).toBe(true)
    expect(backtestHasErrors).toBe(false)
  }, 120000)
})

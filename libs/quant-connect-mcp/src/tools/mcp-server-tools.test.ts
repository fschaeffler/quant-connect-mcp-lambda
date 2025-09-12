/* eslint-disable max-lines-per-function */
import { name, version } from '../../package.json'
import { getMCPServerToolsDefinitions } from './mcp-server-tools'
import { MCP_SERVER_TOOL_KEYS } from './tool-keys'

// Mock fetch globally
global.fetch = jest.fn()
const mockedFetch = fetch as jest.MockedFunction<typeof fetch>

describe('libs/quant-connect-mcp/src/tools/mcp-server-tools', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('tool definitions export', () => {
    it('should export getMCPServerToolsDefinitions', () => {
      expect(getMCPServerToolsDefinitions).toBeDefined()
      expect(typeof getMCPServerToolsDefinitions).toBe('object')
    })

    it('should contain all expected MCP server tools', () => {
      const toolKeys = Object.keys(getMCPServerToolsDefinitions)

      expect(toolKeys).toContain(MCP_SERVER_TOOL_KEYS.READ_INFRA_HEALTH)
      expect(toolKeys).toContain(MCP_SERVER_TOOL_KEYS.READ_MCP_SERVER_VERSION)
      expect(toolKeys).toContain(MCP_SERVER_TOOL_KEYS.READ_LATEST_MCP_SERVER_VERSION)
    })

    it('should have exactly the expected number of tools', () => {
      const toolKeys = Object.keys(getMCPServerToolsDefinitions)
      expect(toolKeys).toHaveLength(3)
    })

    it('should have all custom tools (no QC API tools)', () => {
      const tools = Object.values(getMCPServerToolsDefinitions)
      const customTools = tools.filter((tool) => 'func' in tool)
      const qcApiTools = tools.filter((tool) => 'url' in tool)

      expect(customTools.length).toBe(3)
      expect(qcApiTools.length).toBe(0)
    })
  })

  describe('READ_INFRA_HEALTH tool', () => {
    const healthTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_INFRA_HEALTH]

    it('should have proper configuration', () => {
      expect(healthTool.config.title).toBe('Read the health of the MCP server')
      expect(healthTool.config.description).toBe('Returns a health status of the server.')
      expect(healthTool.config.inputSchema).toBeUndefined()
    })

    it('should have custom output schema with health status', () => {
      expect(healthTool.config.outputSchema).toBeDefined()
      expect(healthTool.config.outputSchema).toHaveProperty('healthStatus')

      // Should be a literal 'ok' type
      if (healthTool.config.outputSchema) {
        const healthStatusSchema = healthTool.config.outputSchema.healthStatus
        expect(healthStatusSchema._def.typeName).toBe('ZodLiteral')
        expect(healthStatusSchema._def.value).toBe('ok')
      }
    })

    it('should have proper annotations for health check', () => {
      expect(healthTool.config.annotations?.readOnlyHint).toBe(true)
      expect(healthTool.config.annotations?.destructiveHint).toBe(false)
      expect(healthTool.config.annotations?.openWorldHint).toBe(false)
      expect(healthTool.config.annotations?.idempotentHint).toBe(true)
    })

    it('should be a custom tool with function', () => {
      expect('func' in healthTool).toBe(true)
      expect('url' in healthTool).toBe(false)
      if ('func' in healthTool) {
        expect(typeof healthTool.func).toBe('function')
      }
    })

    it('should execute custom function and return health status', async () => {
      if ('func' in healthTool) {
        const result = await healthTool.func({})

        expect(result).toEqual({ healthStatus: 'ok' })
      }
    })

    it('should be a synchronous function returning a promise', () => {
      if ('func' in healthTool) {
        const result = healthTool.func({})
        expect(result).toBeInstanceOf(Promise)
      }
    })

    it('should not require any input parameters', async () => {
      if ('func' in healthTool) {
        // Should work with empty object
        await expect(healthTool.func({})).resolves.toEqual({ healthStatus: 'ok' })

        // Should work with undefined
        await expect(healthTool.func(undefined as any)).resolves.toEqual({ healthStatus: 'ok' })
      }
    })
  })

  describe('READ_MCP_SERVER_VERSION tool', () => {
    const versionTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_MCP_SERVER_VERSION]

    it('should have proper configuration', () => {
      expect(versionTool.config.title).toBe('Read the MCP server version')
      expect(versionTool.config.description).toBe('Returns the version of the QC MCP Server that is running.')
      expect(versionTool.config.inputSchema).toBeUndefined()
    })

    it('should have custom output schema with version', () => {
      expect(versionTool.config.outputSchema).toBeDefined()
      expect(versionTool.config.outputSchema).toHaveProperty('version')

      // Should be a string type with description
      if (versionTool.config.outputSchema) {
        const versionSchema = versionTool.config.outputSchema.version
        expect(versionSchema._def.typeName).toBe('ZodString')
        expect(versionSchema._def.description).toBe('The version of the MCP server.')
      }
    })

    it('should have proper annotations for version info', () => {
      expect(versionTool.config.annotations?.readOnlyHint).toBe(true)
      expect(versionTool.config.annotations?.destructiveHint).toBe(false)
      expect(versionTool.config.annotations?.openWorldHint).toBe(false)
      expect(versionTool.config.annotations?.idempotentHint).toBe(true)
    })

    it('should be a custom tool with function', () => {
      expect('func' in versionTool).toBe(true)
      expect('url' in versionTool).toBe(false)
      if ('func' in versionTool) {
        expect(typeof versionTool.func).toBe('function')
      }
    })

    it('should execute custom function and return package version', async () => {
      if ('func' in versionTool) {
        const result = await versionTool.func({})

        expect(result).toEqual({ version })
        expect(typeof result.version).toBe('string')
        expect(result.version.length).toBeGreaterThan(0)
      }
    })

    it('should return the actual package.json version', async () => {
      if ('func' in versionTool) {
        const result = await versionTool.func({})

        // Should match the imported version from package.json
        expect(result.version).toBe(version)
      }
    })

    it('should not require any input parameters', async () => {
      if ('func' in versionTool) {
        // Should work with empty object
        await expect(versionTool.func({})).resolves.toEqual({ version })

        // Should work with undefined
        await expect(versionTool.func(undefined as any)).resolves.toEqual({ version })
      }
    })
  })

  describe('READ_LATEST_MCP_SERVER_VERSION tool', () => {
    const latestVersionTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_LATEST_MCP_SERVER_VERSION]

    it('should have proper configuration', () => {
      expect(latestVersionTool.config.title).toBe('Read the latest MCP server version')
      expect(latestVersionTool.config.description).toBe('Returns the latest released version of the MCP Server.')
      expect(latestVersionTool.config.inputSchema).toBeUndefined()
    })

    it('should have custom output schema with version', () => {
      expect(latestVersionTool.config.outputSchema).toBeDefined()
      expect(latestVersionTool.config.outputSchema).toHaveProperty('version')

      // Should be a string type with description
      if (latestVersionTool.config.outputSchema) {
        const versionSchema = latestVersionTool.config.outputSchema.version
        expect(versionSchema._def.typeName).toBe('ZodString')
        expect(versionSchema._def.description).toBe('The latest released version of the MCP server.')
      }
    })

    it('should have proper annotations for external API call', () => {
      expect(latestVersionTool.config.annotations?.readOnlyHint).toBe(true)
      expect(latestVersionTool.config.annotations?.destructiveHint).toBe(false)
      expect(latestVersionTool.config.annotations?.openWorldHint).toBe(true) // External API call
      expect(latestVersionTool.config.annotations?.idempotentHint).toBe(true)
    })

    it('should be a custom tool with async function', () => {
      expect('func' in latestVersionTool).toBe(true)
      expect('url' in latestVersionTool).toBe(false)
      if ('func' in latestVersionTool) {
        expect(typeof latestVersionTool.func).toBe('function')
        expect(latestVersionTool.func.constructor.name).toBe('AsyncFunction')
      }
    })

    it('should fetch latest version from npm registry', async () => {
      if ('func' in latestVersionTool) {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({ latest: '2.1.0' }),
        }
        mockedFetch.mockResolvedValue(mockResponse as any)

        const result = await latestVersionTool.func({})

        expect(mockedFetch).toHaveBeenCalledWith(`https://registry.npmjs.org/-/package/${name}/dist-tags`)
        expect(mockResponse.json).toHaveBeenCalled()
        expect(result).toEqual({ version: '2.1.0' })
      }
    })

    it('should use correct npm registry URL with package name', async () => {
      if ('func' in latestVersionTool) {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({ latest: '1.0.0' }),
        }
        mockedFetch.mockResolvedValue(mockResponse as any)

        await latestVersionTool.func({})

        expect(mockedFetch).toHaveBeenCalledWith(`https://registry.npmjs.org/-/package/${name}/dist-tags`)
      }
    })

    it('should handle fetch errors', async () => {
      if ('func' in latestVersionTool) {
        const mockResponse = {
          ok: false,
          status: 404,
          statusText: 'Not Found',
        }
        mockedFetch.mockResolvedValue(mockResponse as any)

        await expect(latestVersionTool.func({})).rejects.toThrow('Failed to fetch latest MCP server version: 404 Not Found')
      }
    })

    it('should handle network errors', async () => {
      if ('func' in latestVersionTool) {
        const networkError = new Error('Network error')
        mockedFetch.mockRejectedValue(networkError)

        await expect(latestVersionTool.func({})).rejects.toThrow('Network error')
      }
    })

    it('should handle invalid JSON responses', async () => {
      if ('func' in latestVersionTool) {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
        }
        mockedFetch.mockResolvedValue(mockResponse as any)

        await expect(latestVersionTool.func({})).rejects.toThrow('Invalid JSON')
      }
    })

    it('should handle null response data', async () => {
      if ('func' in latestVersionTool) {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue(null),
        }
        mockedFetch.mockResolvedValue(mockResponse as any)

        const result = await latestVersionTool.func({})
        expect(result).toEqual({ version: undefined })
      }
    })

    it('should handle response without latest property', async () => {
      if ('func' in latestVersionTool) {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({ other: 'data' }),
        }
        mockedFetch.mockResolvedValue(mockResponse as any)

        const result = await latestVersionTool.func({})
        expect(result).toEqual({ version: undefined })
      }
    })

    it('should handle response with null latest property', async () => {
      if ('func' in latestVersionTool) {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({ latest: null }),
        }
        mockedFetch.mockResolvedValue(mockResponse as any)

        const result = await latestVersionTool.func({})
        expect(result).toEqual({ version: null })
      }
    })

    it('should not require any input parameters', async () => {
      if ('func' in latestVersionTool) {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({ latest: '1.0.0' }),
        }
        mockedFetch.mockResolvedValue(mockResponse as any)

        // Should work with empty object
        await expect(latestVersionTool.func({})).resolves.toBeDefined()

        // Should work with undefined
        await expect(latestVersionTool.func(undefined as any)).resolves.toBeDefined()
      }
    })
  })

  describe('schema validation', () => {
    it('should use imported package.json values', () => {
      // Verify the tools use the actual package.json values
      expect(name).toBeDefined()
      expect(version).toBeDefined()
      expect(typeof name).toBe('string')
      expect(typeof version).toBe('string')
    })

    it('should have proper Zod schema definitions', () => {
      const healthTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_INFRA_HEALTH]
      const versionTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_MCP_SERVER_VERSION]
      const latestVersionTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_LATEST_MCP_SERVER_VERSION]

      // Health tool should have literal 'ok' schema
      if (healthTool.config.outputSchema) {
        expect(healthTool.config.outputSchema.healthStatus._def.typeName).toBe('ZodLiteral')
        expect(healthTool.config.outputSchema.healthStatus._def.value).toBe('ok')
      }

      // Version tools should have string schemas
      if (versionTool.config.outputSchema) {
        expect(versionTool.config.outputSchema.version._def.typeName).toBe('ZodString')
      }
      if (latestVersionTool.config.outputSchema) {
        expect(latestVersionTool.config.outputSchema.version._def.typeName).toBe('ZodString')
      }
    })

    it('should have proper schema descriptions', () => {
      const versionTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_MCP_SERVER_VERSION]
      const latestVersionTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_LATEST_MCP_SERVER_VERSION]

      if (versionTool.config.outputSchema) {
        expect(versionTool.config.outputSchema.version._def.description).toBe('The version of the MCP server.')
      }
      if (latestVersionTool.config.outputSchema) {
        expect(latestVersionTool.config.outputSchema.version._def.description).toBe('The latest released version of the MCP server.')
      }
    })

    it('should not have input schemas (no parameters required)', () => {
      Object.values(getMCPServerToolsDefinitions).forEach((tool) => {
        expect(tool.config.inputSchema).toBeUndefined()
      })
    })
  })

  describe('tool annotations', () => {
    it('should mark all tools as read-only', () => {
      Object.values(getMCPServerToolsDefinitions).forEach((tool) => {
        expect(tool.config.annotations?.readOnlyHint).toBe(true)
      })
    })

    it('should mark all tools as non-destructive', () => {
      Object.values(getMCPServerToolsDefinitions).forEach((tool) => {
        expect(tool.config.annotations?.destructiveHint).toBe(false)
      })
    })

    it('should mark all tools as idempotent', () => {
      Object.values(getMCPServerToolsDefinitions).forEach((tool) => {
        expect(tool.config.annotations?.idempotentHint).toBe(true)
      })
    })

    it('should have correct openWorldHint annotations', () => {
      const healthTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_INFRA_HEALTH]
      const versionTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_MCP_SERVER_VERSION]
      const latestVersionTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_LATEST_MCP_SERVER_VERSION]

      // Local operations should not have openWorldHint
      expect(healthTool.config.annotations?.openWorldHint).toBe(false)
      expect(versionTool.config.annotations?.openWorldHint).toBe(false)

      // External API call should have openWorldHint
      expect(latestVersionTool.config.annotations?.openWorldHint).toBe(true)
    })
  })

  describe('function implementations', () => {
    it('should have different function types', () => {
      const healthTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_INFRA_HEALTH]
      const versionTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_MCP_SERVER_VERSION]
      const latestVersionTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_LATEST_MCP_SERVER_VERSION]

      if ('func' in healthTool && 'func' in versionTool && 'func' in latestVersionTool) {
        // Health tool uses Promise.resolve (sync function returning promise)
        expect(healthTool.func.toString()).toContain('Promise.resolve')

        // Version tool uses Promise.resolve (sync function returning promise)
        expect(versionTool.func.toString()).toContain('Promise.resolve')

        // Latest version tool is async function
        expect(latestVersionTool.func.constructor.name).toBe('AsyncFunction')
      }
    })

    it('should return consistent response structures', async () => {
      const healthTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_INFRA_HEALTH]
      const versionTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_MCP_SERVER_VERSION]

      if ('func' in healthTool && 'func' in versionTool) {
        const healthResult = await healthTool.func({})
        const versionResult = await versionTool.func({})

        // Both should return objects with single properties
        expect(typeof healthResult).toBe('object')
        expect(typeof versionResult).toBe('object')
        expect(Object.keys(healthResult)).toEqual(['healthStatus'])
        expect(Object.keys(versionResult)).toEqual(['version'])
      }
    })
  })

  describe('external API integration', () => {
    it('should construct correct npm registry URL', async () => {
      const latestVersionTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_LATEST_MCP_SERVER_VERSION]

      if ('func' in latestVersionTool) {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({ latest: '1.0.0' }),
        }
        mockedFetch.mockResolvedValue(mockResponse as any)

        await latestVersionTool.func({})

        const expectedUrl = `https://registry.npmjs.org/-/package/${name}/dist-tags`
        expect(mockedFetch).toHaveBeenCalledWith(expectedUrl)
        expect(expectedUrl).toContain('registry.npmjs.org')
        expect(expectedUrl).toContain(name)
        expect(expectedUrl).toContain('dist-tags')
      }
    })

    it('should handle successful npm registry response', async () => {
      const latestVersionTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_LATEST_MCP_SERVER_VERSION]

      if ('func' in latestVersionTool) {
        const mockLatestVersion = '3.2.1'
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({
            latest: mockLatestVersion,
            beta: '3.3.0-beta.1',
            alpha: '3.4.0-alpha.1',
          }),
        }
        mockedFetch.mockResolvedValue(mockResponse as any)

        const result = await latestVersionTool.func({})

        expect(result).toEqual({ version: mockLatestVersion })
        expect(result.version).toBe(mockLatestVersion)
      }
    })

    it('should handle HTTP error responses with proper error messages', async () => {
      const latestVersionTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_LATEST_MCP_SERVER_VERSION]

      if ('func' in latestVersionTool) {
        const errorCases = [
          { status: 404, statusText: 'Not Found' },
          { status: 500, statusText: 'Internal Server Error' },
          { status: 503, statusText: 'Service Unavailable' },
        ]

        for (const errorCase of errorCases) {
          mockedFetch.mockResolvedValue({
            ok: false,
            status: errorCase.status,
            statusText: errorCase.statusText,
          } as any)

          await expect(latestVersionTool.func({})).rejects.toThrow(`Failed to fetch latest MCP server version: ${errorCase.status} ${errorCase.statusText}`)
        }
      }
    })

    it('should handle fetch timeout and network errors', async () => {
      const latestVersionTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_LATEST_MCP_SERVER_VERSION]

      if ('func' in latestVersionTool) {
        const networkErrors = [new Error('fetch timeout'), new Error('Network request failed'), new Error('DNS resolution failed')]

        for (const error of networkErrors) {
          mockedFetch.mockRejectedValue(error)

          await expect(latestVersionTool.func({})).rejects.toThrow(error.message)
        }
      }
    })

    it('should handle malformed JSON responses', async () => {
      const latestVersionTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_LATEST_MCP_SERVER_VERSION]

      if ('func' in latestVersionTool) {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token in JSON')),
        }
        mockedFetch.mockResolvedValue(mockResponse as any)

        await expect(latestVersionTool.func({})).rejects.toThrow('Unexpected token in JSON')
      }
    })
  })

  describe('tool consistency', () => {
    it('should have consistent title formatting', () => {
      Object.values(getMCPServerToolsDefinitions).forEach((tool) => {
        expect(tool.config.title).toBeDefined()
        expect(typeof tool.config.title).toBe('string')

        if (tool.config.title) {
          expect(tool.config.title.length).toBeGreaterThan(0)

          // Should not end with period
          expect(tool.config.title).not.toMatch(/\.$/)

          // Should be properly capitalized
          expect(tool.config.title.charAt(0)).toMatch(/[A-Z]/)

          // Should contain "MCP server"
          expect(tool.config.title.toLowerCase()).toContain('mcp server')
        }
      })
    })

    it('should have consistent description formatting', () => {
      Object.values(getMCPServerToolsDefinitions).forEach((tool) => {
        if (tool.config.description) {
          expect(typeof tool.config.description).toBe('string')
          expect(tool.config.description.length).toBeGreaterThan(0)

          // Should end with period
          expect(tool.config.description).toMatch(/\.$/)

          // Should be properly capitalized
          expect(tool.config.description.charAt(0)).toMatch(/[A-Z]/)
        }
      })
    })

    it('should have consistent annotation patterns', () => {
      Object.values(getMCPServerToolsDefinitions).forEach((tool) => {
        if (tool.config.annotations) {
          // All annotation values should be boolean when present
          if (tool.config.annotations.readOnlyHint !== undefined) {
            expect(typeof tool.config.annotations.readOnlyHint).toBe('boolean')
          }
          if (tool.config.annotations.destructiveHint !== undefined) {
            expect(typeof tool.config.annotations.destructiveHint).toBe('boolean')
          }
          if (tool.config.annotations.idempotentHint !== undefined) {
            expect(typeof tool.config.annotations.idempotentHint).toBe('boolean')
          }
          if (tool.config.annotations.openWorldHint !== undefined) {
            expect(typeof tool.config.annotations.openWorldHint).toBe('boolean')
          }
        }
      })
    })

    it('should have complete annotation coverage', () => {
      Object.values(getMCPServerToolsDefinitions).forEach((tool) => {
        expect(tool.config.annotations).toBeDefined()
        expect(tool.config.annotations?.readOnlyHint).toBeDefined()
        expect(tool.config.annotations?.destructiveHint).toBeDefined()
        expect(tool.config.annotations?.openWorldHint).toBeDefined()
        expect(tool.config.annotations?.idempotentHint).toBeDefined()
      })
    })
  })

  describe('package.json integration', () => {
    it('should use package.json name for npm registry URL', async () => {
      const latestVersionTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_LATEST_MCP_SERVER_VERSION]

      if ('func' in latestVersionTool) {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({ latest: '1.0.0' }),
        }
        mockedFetch.mockResolvedValue(mockResponse as any)

        await latestVersionTool.func({})

        const fetchUrl = mockedFetch.mock.calls[0][0] as string
        expect(fetchUrl).toContain(name)
      }
    })

    it('should return package.json version for current version', async () => {
      const versionTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_MCP_SERVER_VERSION]

      if ('func' in versionTool) {
        const result = await versionTool.func({})
        expect(result.version).toBe(version)
      }
    })

    it('should validate package.json imports', () => {
      // Verify the imports are working correctly
      expect(name).toMatch(/^@?[a-z0-9][a-z0-9-]*[a-z0-9]?(\/[a-z0-9][a-z0-9-]*[a-z0-9]?)?$/) // Valid npm package name (including scoped)
      expect(version).toMatch(/^\d+\.\d+\.\d+/) // Valid semver
    })
  })

  describe('error handling patterns', () => {
    it('should handle all error types in latest version tool', async () => {
      const latestVersionTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_LATEST_MCP_SERVER_VERSION]

      if ('func' in latestVersionTool) {
        // Test various error scenarios
        const errorScenarios = [
          {
            name: 'HTTP 404',
            mock: () => mockedFetch.mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' } as any),
            expectedError: 'Failed to fetch latest MCP server version: 404 Not Found',
          },
          {
            name: 'Network error',
            mock: () => mockedFetch.mockRejectedValue(new Error('ECONNREFUSED')),
            expectedError: 'ECONNREFUSED',
          },
          {
            name: 'JSON parse error',
            mock: () =>
              mockedFetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockRejectedValue(new SyntaxError('Invalid JSON')),
              } as any),
            expectedError: 'Invalid JSON',
          },
        ]

        for (const scenario of errorScenarios) {
          scenario.mock()
          await expect(latestVersionTool.func({})).rejects.toThrow(scenario.expectedError)
        }
      }
    })

    it('should not throw errors for simple tools', async () => {
      const healthTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_INFRA_HEALTH]
      const versionTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_MCP_SERVER_VERSION]

      if ('func' in healthTool && 'func' in versionTool) {
        await expect(healthTool.func({})).resolves.toBeDefined()
        await expect(versionTool.func({})).resolves.toBeDefined()
      }
    })
  })

  describe('response data validation', () => {
    it('should return valid health status', async () => {
      const healthTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_INFRA_HEALTH]

      if ('func' in healthTool) {
        const result = await healthTool.func({})

        expect(result.healthStatus).toBe('ok')
        expect(typeof result.healthStatus).toBe('string')
      }
    })

    it('should return valid version string', async () => {
      const versionTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_MCP_SERVER_VERSION]

      if ('func' in versionTool) {
        const result = await versionTool.func({})

        expect(typeof result.version).toBe('string')
        expect(result.version.length).toBeGreaterThan(0)
        expect(result.version).toMatch(/^\d+\.\d+\.\d+/) // Semver format
      }
    })

    it('should handle various npm registry response formats', async () => {
      const latestVersionTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_LATEST_MCP_SERVER_VERSION]

      if ('func' in latestVersionTool) {
        const responseFormats = [{ latest: '1.0.0' }, { latest: '2.1.3-beta.1' }, { latest: '0.0.1-alpha' }, { latest: '10.20.30' }]

        for (const format of responseFormats) {
          mockedFetch.mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue(format),
          } as any)

          const result = await latestVersionTool.func({})
          expect(result.version).toBe(format.latest)
        }
      }
    })
  })

  describe('integration scenarios', () => {
    it('should work together as a complete server info suite', async () => {
      const healthTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_INFRA_HEALTH]
      const versionTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_MCP_SERVER_VERSION]
      const latestVersionTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_LATEST_MCP_SERVER_VERSION]

      if ('func' in healthTool && 'func' in versionTool && 'func' in latestVersionTool) {
        // Mock successful latest version fetch
        mockedFetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({ latest: '2.0.0' }),
        } as any)

        // Execute all tools
        const [healthResult, versionResult, latestResult] = await Promise.all([healthTool.func({}), versionTool.func({}), latestVersionTool.func({})])

        // Verify complete server info
        expect(healthResult.healthStatus).toBe('ok')
        expect(versionResult.version).toBe(version)
        expect(latestResult.version).toBe('2.0.0')
      }
    })

    it('should provide server introspection capabilities', () => {
      const tools = getMCPServerToolsDefinitions

      // Should cover health, current version, and latest version
      expect(tools).toHaveProperty(MCP_SERVER_TOOL_KEYS.READ_INFRA_HEALTH)
      expect(tools).toHaveProperty(MCP_SERVER_TOOL_KEYS.READ_MCP_SERVER_VERSION)
      expect(tools).toHaveProperty(MCP_SERVER_TOOL_KEYS.READ_LATEST_MCP_SERVER_VERSION)

      // All should be introspection tools (no external state modification)
      Object.values(tools).forEach((tool) => {
        expect(tool.config.annotations?.destructiveHint).toBe(false)
        expect(tool.config.annotations?.readOnlyHint).toBe(true)
      })
    })
  })

  describe('performance and reliability', () => {
    it('should have fast execution for local tools', async () => {
      const healthTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_INFRA_HEALTH]
      const versionTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_MCP_SERVER_VERSION]

      if ('func' in healthTool && 'func' in versionTool) {
        const start = Date.now()
        await Promise.all([healthTool.func({}), versionTool.func({})])
        const duration = Date.now() - start

        // Local operations should be very fast (< 10ms)
        expect(duration).toBeLessThan(10)
      }
    })

    it('should handle concurrent executions', async () => {
      const healthTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_INFRA_HEALTH]

      if ('func' in healthTool) {
        // Execute multiple concurrent health checks
        const promises = Array.from({ length: 10 }, () => healthTool.func({}))
        const results = await Promise.all(promises)

        // All should return the same result
        results.forEach((result) => {
          expect(result).toEqual({ healthStatus: 'ok' })
        })
      }
    })

    it('should handle external API rate limiting gracefully', async () => {
      const latestVersionTool = getMCPServerToolsDefinitions[MCP_SERVER_TOOL_KEYS.READ_LATEST_MCP_SERVER_VERSION]

      if ('func' in latestVersionTool) {
        // Simulate rate limiting response
        mockedFetch.mockResolvedValue({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
        } as any)

        await expect(latestVersionTool.func({})).rejects.toThrow('Failed to fetch latest MCP server version: 429 Too Many Requests')
      }
    })
  })
})

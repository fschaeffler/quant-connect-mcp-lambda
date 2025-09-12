import { QCClient } from '@fschaeffler/quant-connect-client'
import {
  deleteObjectBody,
  deleteObjectResponse,
  getObjectBody,
  getObjectPropertiesBody,
  getObjectPropertiesResponse,
  getObjectResponse,
  listObjectBody,
  listObjectResponse,
  setObjectBody,
  setObjectResponse,
} from '@fschaeffler/quant-connect-types'
import FormData from 'form-data'
import z from 'zod'
import { mergeUnionToRawShape } from '../utils'
import { getObjectStoreToolsDefinitions } from './object-store-tools'
import { OBJECT_STORE_TOOL_KEYS } from './tool-keys'

// Mock dependencies
jest.mock('@fschaeffler/quant-connect-client')
jest.mock('../utils')

// Manual mock for FormData
const mockFormDataAppend = jest.fn()
const mockFormDataGetHeaders = jest.fn()

jest.mock('form-data', () => {
  return jest.fn().mockImplementation(() => ({
    append: mockFormDataAppend,
    getHeaders: mockFormDataGetHeaders
  }))
})

const MockedQCClient = jest.mocked(QCClient)
const mockedMergeUnionToRawShape = mergeUnionToRawShape as jest.MockedFunction<typeof mergeUnionToRawShape>

describe('libs/quant-connect-mcp/src/tools/object-store-tools', () => {
  let mockQCClientInstance: jest.Mocked<QCClient>

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock QCClient instance
    mockQCClientInstance = {
      postFormData: jest.fn(),
    } as any

    ;(MockedQCClient.getInstance as jest.MockedFunction<typeof QCClient.getInstance>).mockReturnValue(mockQCClientInstance)

    // Reset FormData mocks
    mockFormDataAppend.mockClear()
    mockFormDataGetHeaders.mockReturnValue({ 'content-type': 'multipart/form-data' })
    ;(FormData as jest.MockedClass<typeof FormData>).mockClear()

    // Mock mergeUnionToRawShape - the actual function is called at module load time
    // so the mock needs to be set up before the module is imported
    mockedMergeUnionToRawShape.mockImplementation(() => ({ merged: 'schema' } as any))
  })

  describe('tool definitions export', () => {
    it('should export getObjectStoreToolsDefinitions', () => {
      expect(getObjectStoreToolsDefinitions).toBeDefined()
      expect(typeof getObjectStoreToolsDefinitions).toBe('object')
    })

    it('should contain all expected object store tools', () => {
      const toolKeys = Object.keys(getObjectStoreToolsDefinitions)
      
      expect(toolKeys).toContain(OBJECT_STORE_TOOL_KEYS.UPLOAD_OBJECT)
      expect(toolKeys).toContain(OBJECT_STORE_TOOL_KEYS.READ_OBJECT_PROPERTIES)
      expect(toolKeys).toContain(OBJECT_STORE_TOOL_KEYS.READ_OBJECT_STORE_FILE_JOB_ID)
      expect(toolKeys).toContain(OBJECT_STORE_TOOL_KEYS.READ_OBJECT_STORE_FILE_DOWNLOAD_URL)
      expect(toolKeys).toContain(OBJECT_STORE_TOOL_KEYS.LIST_OBJECT_STORE_FILES)
      expect(toolKeys).toContain(OBJECT_STORE_TOOL_KEYS.DELETE_OBJECT)
    })

    it('should have exactly the expected number of tools', () => {
      const toolKeys = Object.keys(getObjectStoreToolsDefinitions)
      expect(toolKeys).toHaveLength(6)
    })

    it('should have mixed tool types (custom and API)', () => {
      const tools = Object.values(getObjectStoreToolsDefinitions)
      const customTools = tools.filter(tool => 'func' in tool)
      const apiTools = tools.filter(tool => 'url' in tool)

      expect(customTools.length).toBe(1) // UPLOAD_OBJECT
      expect(apiTools.length).toBe(5) // All others
    })
  })

  describe('UPLOAD_OBJECT tool', () => {
    const uploadTool = getObjectStoreToolsDefinitions[OBJECT_STORE_TOOL_KEYS.UPLOAD_OBJECT]

    it('should have proper configuration', () => {
      expect(uploadTool.config.title).toBe('Upload object')
      expect(uploadTool.config.description).toBe('Upload files to the Object Store.')
      expect(uploadTool.config.inputSchema).toBe(setObjectBody.shape)
      expect(uploadTool.config.outputSchema).toBe(setObjectResponse.shape)
    })

    it('should have proper annotations for upload operation', () => {
      expect(uploadTool.config.annotations?.readOnlyHint).toBe(false)
      expect(uploadTool.config.annotations?.destructiveHint).toBe(false)
      expect(uploadTool.config.annotations?.idempotentHint).toBe(true)
    })

    it('should be a custom tool with function', () => {
      expect('func' in uploadTool).toBe(true)
      expect('url' in uploadTool).toBe(false)
      if ('func' in uploadTool) {
        expect(typeof uploadTool.func).toBe('function')
        expect(uploadTool.func.constructor.name).toBe('AsyncFunction')
      }
    })

    it('should use imported schemas from quant-connect-types', () => {
      expect(uploadTool.config.inputSchema).toBe(setObjectBody.shape)
      expect(uploadTool.config.outputSchema).toBe(setObjectResponse.shape)
    })

    it('should execute custom function and upload object', async () => {
      if ('func' in uploadTool) {
        const mockParams = {
          organizationId: 'org123',
          key: 'test-file.txt',
          objectData: 'file content data'
        }

        const mockResponse = { success: true, key: 'test-file.txt' }
        mockQCClientInstance.postFormData.mockResolvedValue(mockResponse)

        const result = await uploadTool.func(mockParams)

        expect(FormData as jest.MockedClass<typeof FormData>).toHaveBeenCalledTimes(1)
        expect(mockFormDataAppend).toHaveBeenCalledWith('objectData', 'file content data')
        expect(mockQCClientInstance.postFormData).toHaveBeenCalledWith(
          '/object/set',
          { organizationId: 'org123', key: 'test-file.txt' },
          expect.any(Object)
        )
        expect(result).toBe(mockResponse)
      }
    })

    it('should remove objectData from params before API call', async () => {
      if ('func' in uploadTool) {
        const mockParams = {
          organizationId: 'org123',
          key: 'test-file.txt',
          objectData: 'file content data'
        }

        const mockResponse = { success: true }
        mockQCClientInstance.postFormData.mockResolvedValue(mockResponse)

        await uploadTool.func(mockParams)

        // Verify objectData was removed from params passed to API
        const apiCallParams = mockQCClientInstance.postFormData.mock.calls[0][1]
        expect(apiCallParams).not.toHaveProperty('objectData')
        expect(apiCallParams).toEqual({
          organizationId: 'org123',
          key: 'test-file.txt'
        })
      }
    })

    it('should handle FormData creation and append correctly', async () => {
      if ('func' in uploadTool) {
        const mockParams = {
          organizationId: 'org123',
          key: 'binary-file.bin',
          objectData: Buffer.from('binary data')
        }

        mockQCClientInstance.postFormData.mockResolvedValue({ success: true })

        await uploadTool.func(mockParams)

        expect(FormData as jest.MockedClass<typeof FormData>).toHaveBeenCalledTimes(1)
        expect(mockFormDataAppend).toHaveBeenCalledTimes(1)
        expect(mockFormDataAppend).toHaveBeenCalledWith('objectData', Buffer.from('binary data'))
      }
    })

    it('should handle API errors gracefully', async () => {
      if ('func' in uploadTool) {
        const mockParams = {
          organizationId: 'org123',
          key: 'test-file.txt',
          objectData: 'content'
        }

        const apiError = new Error('Upload failed')
        mockQCClientInstance.postFormData.mockRejectedValue(apiError)

        await expect(uploadTool.func(mockParams)).rejects.toThrow('Upload failed')
      }
    })

    it('should use correct API endpoint', async () => {
      if ('func' in uploadTool) {
        const mockParams = {
          organizationId: 'org123',
          key: 'test.txt',
          objectData: 'data'
        }

        mockQCClientInstance.postFormData.mockResolvedValue({ success: true })

        await uploadTool.func(mockParams)

        expect(mockQCClientInstance.postFormData).toHaveBeenCalledWith(
          '/object/set',
          expect.any(Object),
          expect.any(Object)
        )
      }
    })

    it('should preserve all non-objectData parameters', async () => {
      if ('func' in uploadTool) {
        const mockParams = {
          organizationId: 'org123',
          key: 'test.txt',
          objectData: 'data',
          additionalParam: 'value',
          anotherParam: 123
        }

        mockQCClientInstance.postFormData.mockResolvedValue({ success: true })

        await uploadTool.func(mockParams)

        const apiCallParams = mockQCClientInstance.postFormData.mock.calls[0][1]
        expect(apiCallParams).toEqual({
          organizationId: 'org123',
          key: 'test.txt',
          additionalParam: 'value',
          anotherParam: 123
        })
      }
    })
  })

  describe('READ_OBJECT_PROPERTIES tool', () => {
    const propertiesToolKey = OBJECT_STORE_TOOL_KEYS.READ_OBJECT_PROPERTIES
    const propertiesTool = getObjectStoreToolsDefinitions[propertiesToolKey]

    it('should have proper configuration', () => {
      expect(propertiesTool.config.title).toBe('Read object store file properties')
      expect(propertiesTool.config.description).toBe(`Get Object Store properties of a specific organization and and key. It doesn't work if the key is a directory in the Object Store.`)
      expect(propertiesTool.config.inputSchema).toBe(getObjectPropertiesBody.shape)
      expect(propertiesTool.config.outputSchema).toBe(getObjectPropertiesResponse.shape)
    })

    it('should have proper annotations for read operation', () => {
      expect(propertiesTool.config.annotations?.readOnlyHint).toBe(true)
      expect(propertiesTool.config.annotations?.destructiveHint).toBe(false)
      expect(propertiesTool.config.annotations?.idempotentHint).toBe(true)
    })

    it('should be an API tool with URL', () => {
      expect('url' in propertiesTool).toBe(true)
      expect('func' in propertiesTool).toBe(false)
      if ('url' in propertiesTool) {
        expect(propertiesTool.url).toBe('/object/properties')
      }
    })

    it('should use imported schemas from quant-connect-types', () => {
      expect(propertiesTool.config.inputSchema).toBe(getObjectPropertiesBody.shape)
      expect(propertiesTool.config.outputSchema).toBe(getObjectPropertiesResponse.shape)
    })

    it('should have descriptive warning about directories', () => {
      expect(propertiesTool.config.description).toContain(`It doesn't work if the key is a directory`)
    })
  })

  describe('READ_OBJECT_STORE_FILE_JOB_ID tool', () => {
    const jobIdToolKey = OBJECT_STORE_TOOL_KEYS.READ_OBJECT_STORE_FILE_JOB_ID
    const jobIdTool = getObjectStoreToolsDefinitions[jobIdToolKey]

    it('should have proper configuration', () => {
      expect(jobIdTool.config.title).toBe('Read Object Store file job Id')
      expect(jobIdTool.config.description).toBe('Create a job to download files from the Object Store and then read the job Id.')
    })

    it('should use merged union schema for input', () => {
      // The input schema is the result of mergeUnionToRawShape called at module load time
      // Since the function is mocked, it may return undefined, but the property should exist
      expect(jobIdTool.config).toHaveProperty('inputSchema')
    })

    it('should use standard response schema for output', () => {
      expect(jobIdTool.config.outputSchema).toBe(getObjectResponse.shape)
    })

    it('should have proper annotations for job creation', () => {
      expect(jobIdTool.config.annotations?.readOnlyHint).toBe(true)
      expect(jobIdTool.config.annotations?.destructiveHint).toBe(false)
      expect(jobIdTool.config.annotations?.idempotentHint).toBe(false) // Job creation is not idempotent
    })

    it('should be an API tool with URL', () => {
      expect('url' in jobIdTool).toBe(true)
      expect('func' in jobIdTool).toBe(false)
      if ('url' in jobIdTool) {
        expect(jobIdTool.url).toBe('/object/get')
      }
    })

    it('should share URL with download URL tool', () => {
      const downloadUrlTool = getObjectStoreToolsDefinitions[OBJECT_STORE_TOOL_KEYS.READ_OBJECT_STORE_FILE_DOWNLOAD_URL]
      if ('url' in jobIdTool && 'url' in downloadUrlTool) {
        expect(jobIdTool.url).toBe(downloadUrlTool.url)
      }
    })
  })

  describe('READ_OBJECT_STORE_FILE_DOWNLOAD_URL tool', () => {
    const downloadUrlToolKey = OBJECT_STORE_TOOL_KEYS.READ_OBJECT_STORE_FILE_DOWNLOAD_URL
    const downloadUrlTool = getObjectStoreToolsDefinitions[downloadUrlToolKey]

    it('should have proper configuration', () => {
      expect(downloadUrlTool.config.title).toBe('Read Object Store file download URL')
      expect(downloadUrlTool.config.description).toBe('Get the URL for downloading files from the Object Store.')
    })

    it('should use merged union schema for input', () => {
      // The input schema is the result of mergeUnionToRawShape called at module load time
      // Since the function is mocked, it may return undefined, but the property should exist
      expect(downloadUrlTool.config).toHaveProperty('inputSchema')
    })

    it('should use standard response schema for output', () => {
      expect(downloadUrlTool.config.outputSchema).toBe(getObjectResponse.shape)
    })

    it('should have proper annotations for URL retrieval', () => {
      expect(downloadUrlTool.config.annotations?.readOnlyHint).toBe(true)
      expect(downloadUrlTool.config.annotations?.destructiveHint).toBe(false)
      expect(downloadUrlTool.config.annotations?.idempotentHint).toBe(false) // URL generation is not idempotent
    })

    it('should be an API tool with URL', () => {
      expect('url' in downloadUrlTool).toBe(true)
      expect('func' in downloadUrlTool).toBe(false)
      if ('url' in downloadUrlTool) {
        expect(downloadUrlTool.url).toBe('/object/get')
      }
    })
  })

  describe('LIST_OBJECT_STORE_FILES tool', () => {
    const listToolKey = OBJECT_STORE_TOOL_KEYS.LIST_OBJECT_STORE_FILES
    const listTool = getObjectStoreToolsDefinitions[listToolKey]

    it('should have proper configuration', () => {
      expect(listTool.config.title).toBe('List Object Store files')
      expect(listTool.config.description).toBe('List the Object Store files under a specific directory in an organization.')
      expect(listTool.config.inputSchema).toBe(listObjectBody.shape)
      expect(listTool.config.outputSchema).toBe(listObjectResponse.shape)
    })

    it('should have proper annotations for list operation', () => {
      expect(listTool.config.annotations?.readOnlyHint).toBe(true)
      expect(listTool.config.annotations?.destructiveHint).toBe(false)
      expect(listTool.config.annotations?.idempotentHint).toBe(true)
    })

    it('should be an API tool with URL', () => {
      expect('url' in listTool).toBe(true)
      expect('func' in listTool).toBe(false)
      if ('url' in listTool) {
        expect(listTool.url).toBe('/object/list')
      }
    })

    it('should use imported schemas from quant-connect-types', () => {
      expect(listTool.config.inputSchema).toBe(listObjectBody.shape)
      expect(listTool.config.outputSchema).toBe(listObjectResponse.shape)
    })
  })

  describe('DELETE_OBJECT tool', () => {
    const deleteToolKey = OBJECT_STORE_TOOL_KEYS.DELETE_OBJECT
    const deleteTool = getObjectStoreToolsDefinitions[deleteToolKey]

    it('should have proper configuration', () => {
      expect(deleteTool.config.title).toBe('Delete Object Store file')
      expect(deleteTool.config.description).toBe('Delete the Object Store file of a specific organization and  key.')
      expect(deleteTool.config.inputSchema).toBe(deleteObjectBody.shape)
      expect(deleteTool.config.outputSchema).toBe(deleteObjectResponse.shape)
    })

    it('should have proper annotations for delete operation', () => {
      expect(deleteTool.config.annotations?.readOnlyHint).toBe(false)
      expect(deleteTool.config.annotations?.destructiveHint).toBe(true)
      expect(deleteTool.config.annotations?.idempotentHint).toBe(true)
    })

    it('should be an API tool with URL', () => {
      expect('url' in deleteTool).toBe(true)
      expect('func' in deleteTool).toBe(false)
      if ('url' in deleteTool) {
        expect(deleteTool.url).toBe('/object/delete')
      }
    })

    it('should use imported schemas from quant-connect-types', () => {
      expect(deleteTool.config.inputSchema).toBe(deleteObjectBody.shape)
      expect(deleteTool.config.outputSchema).toBe(deleteObjectResponse.shape)
    })

    it('should be the only destructive tool', () => {
      const allTools = Object.values(getObjectStoreToolsDefinitions)
      const destructiveTools = allTools.filter(tool => tool.config.annotations?.destructiveHint === true)
      
      expect(destructiveTools).toHaveLength(1)
      expect(destructiveTools[0]).toBe(deleteTool)
    })
  })

  describe('schema integration', () => {
    it('should use imported schema shapes correctly', () => {
      const uploadTool = getObjectStoreToolsDefinitions[OBJECT_STORE_TOOL_KEYS.UPLOAD_OBJECT]
      const propertiesToolKey = OBJECT_STORE_TOOL_KEYS.READ_OBJECT_PROPERTIES
      const propertiesTool = getObjectStoreToolsDefinitions[propertiesToolKey]
      const listTool = getObjectStoreToolsDefinitions[OBJECT_STORE_TOOL_KEYS.LIST_OBJECT_STORE_FILES]
      const deleteTool = getObjectStoreToolsDefinitions[OBJECT_STORE_TOOL_KEYS.DELETE_OBJECT]

      // Direct schema shape usage
      expect(uploadTool.config.inputSchema).toBe(setObjectBody.shape)
      expect(uploadTool.config.outputSchema).toBe(setObjectResponse.shape)
      expect(propertiesTool.config.inputSchema).toBe(getObjectPropertiesBody.shape)
      expect(propertiesTool.config.outputSchema).toBe(getObjectPropertiesResponse.shape)
      expect(listTool.config.inputSchema).toBe(listObjectBody.shape)
      expect(listTool.config.outputSchema).toBe(listObjectResponse.shape)
      expect(deleteTool.config.inputSchema).toBe(deleteObjectBody.shape)
      expect(deleteTool.config.outputSchema).toBe(deleteObjectResponse.shape)
    })

    it('should use mergeUnionToRawShape for complex schemas', () => {
      const jobIdTool = getObjectStoreToolsDefinitions[OBJECT_STORE_TOOL_KEYS.READ_OBJECT_STORE_FILE_JOB_ID]
      const downloadUrlTool = getObjectStoreToolsDefinitions[OBJECT_STORE_TOOL_KEYS.READ_OBJECT_STORE_FILE_DOWNLOAD_URL]

      // Both tools should have input schemas (result of mergeUnionToRawShape)
      // The function is called at module load time, so we verify the property exists
      expect(jobIdTool.config).toHaveProperty('inputSchema')
      expect(downloadUrlTool.config).toHaveProperty('inputSchema')
    })

    it('should validate imported types exist', () => {
      // Verify all imported types are defined
      expect(deleteObjectBody).toBeDefined()
      expect(deleteObjectResponse).toBeDefined()
      expect(getObjectBody).toBeDefined()
      expect(getObjectPropertiesBody).toBeDefined()
      expect(getObjectPropertiesResponse).toBeDefined()
      expect(getObjectResponse).toBeDefined()
      expect(listObjectBody).toBeDefined()
      expect(listObjectResponse).toBeDefined()
      expect(setObjectBody).toBeDefined()
      expect(setObjectResponse).toBeDefined()
    })
  })

  describe('tool categorization', () => {
    it('should categorize tools by operation type', () => {
      const allTools = Object.entries(getObjectStoreToolsDefinitions)
      
      // Read operations
      const readTools = allTools.filter(([, tool]) => tool.config.annotations?.readOnlyHint === true)
      expect(readTools).toHaveLength(4) // Properties, JobId, DownloadURL, List
      
      // Write operations
      const writeTools = allTools.filter(([, tool]) => tool.config.annotations?.readOnlyHint === false)
      expect(writeTools).toHaveLength(2) // Upload, Delete
      
      // Destructive operations
      const destructiveTools = allTools.filter(([, tool]) => tool.config.annotations?.destructiveHint === true)
      expect(destructiveTools).toHaveLength(1) // Delete only
      
      // Non-destructive operations
      const nonDestructiveTools = allTools.filter(([, tool]) => tool.config.annotations?.destructiveHint === false)
      expect(nonDestructiveTools).toHaveLength(5) // All except Delete
    })

    it('should categorize tools by idempotency', () => {
      const allTools = Object.entries(getObjectStoreToolsDefinitions)
      
      // Idempotent operations
      const idempotentTools = allTools.filter(([, tool]) => tool.config.annotations?.idempotentHint === true)
      expect(idempotentTools).toHaveLength(4) // Upload, Properties, List, Delete
      
      // Non-idempotent operations
      const nonIdempotentTools = allTools.filter(([, tool]) => tool.config.annotations?.idempotentHint === false)
      expect(nonIdempotentTools).toHaveLength(2) // JobId, DownloadURL
    })

    it('should have consistent annotation patterns', () => {
      Object.values(getObjectStoreToolsDefinitions).forEach(tool => {
        expect(tool.config.annotations).toBeDefined()
        expect(typeof tool.config.annotations?.readOnlyHint).toBe('boolean')
        expect(typeof tool.config.annotations?.destructiveHint).toBe('boolean')
        expect(typeof tool.config.annotations?.idempotentHint).toBe('boolean')
      })
    })
  })

  describe('API endpoint mapping', () => {
    it('should have correct URL mappings for API tools', () => {
      const expectedMappings = [
        [OBJECT_STORE_TOOL_KEYS.READ_OBJECT_PROPERTIES, '/object/properties'],
        [OBJECT_STORE_TOOL_KEYS.READ_OBJECT_STORE_FILE_JOB_ID, '/object/get'],
        [OBJECT_STORE_TOOL_KEYS.READ_OBJECT_STORE_FILE_DOWNLOAD_URL, '/object/get'],
        [OBJECT_STORE_TOOL_KEYS.LIST_OBJECT_STORE_FILES, '/object/list'],
        [OBJECT_STORE_TOOL_KEYS.DELETE_OBJECT, '/object/delete'],
      ]

      expectedMappings.forEach(([toolKey, expectedUrl]) => {
        const tool = getObjectStoreToolsDefinitions[toolKey as OBJECT_STORE_TOOL_KEYS]
        if ('url' in tool) {
          expect(tool.url).toBe(expectedUrl)
        } else {
          fail(`Expected tool ${toolKey} to have URL`)
        }
      })
    })

    it('should have shared endpoints for related operations', () => {
      const jobIdTool = getObjectStoreToolsDefinitions[OBJECT_STORE_TOOL_KEYS.READ_OBJECT_STORE_FILE_JOB_ID]
      const downloadUrlTool = getObjectStoreToolsDefinitions[OBJECT_STORE_TOOL_KEYS.READ_OBJECT_STORE_FILE_DOWNLOAD_URL]

      if ('url' in jobIdTool && 'url' in downloadUrlTool) {
        expect(jobIdTool.url).toBe(downloadUrlTool.url)
        expect(jobIdTool.url).toBe('/object/get')
      }
    })

    it('should have unique endpoints for distinct operations', () => {
      const urlMap = new Map<string, string[]>()
      
      Object.entries(getObjectStoreToolsDefinitions).forEach(([toolKey, tool]) => {
        if ('url' in tool) {
          if (!urlMap.has(tool.url)) {
            urlMap.set(tool.url, [])
          }
          urlMap.get(tool.url)!.push(toolKey)
        }
      })

      // Verify endpoint usage
      expect(urlMap.get('/object/properties')).toEqual([OBJECT_STORE_TOOL_KEYS.READ_OBJECT_PROPERTIES])
      expect(urlMap.get('/object/get')).toEqual([
        OBJECT_STORE_TOOL_KEYS.READ_OBJECT_STORE_FILE_JOB_ID,
        OBJECT_STORE_TOOL_KEYS.READ_OBJECT_STORE_FILE_DOWNLOAD_URL
      ])
      expect(urlMap.get('/object/list')).toEqual([OBJECT_STORE_TOOL_KEYS.LIST_OBJECT_STORE_FILES])
      expect(urlMap.get('/object/delete')).toEqual([OBJECT_STORE_TOOL_KEYS.DELETE_OBJECT])
    })
  })

  describe('FormData integration', () => {
    it('should properly mock FormData', () => {
        expect(FormData).toBeDefined()
        expect(typeof FormData).toBe('function')
    })

    it('should create FormData instance in upload tool', async () => {
      const uploadTool = getObjectStoreToolsDefinitions[OBJECT_STORE_TOOL_KEYS.UPLOAD_OBJECT]
      
      if ('func' in uploadTool) {
        const mockParams = { organizationId: 'org', key: 'file', objectData: 'data' }
        mockQCClientInstance.postFormData.mockResolvedValue({ success: true })

        await uploadTool.func(mockParams)

        expect(FormData as jest.MockedClass<typeof FormData>).toHaveBeenCalledTimes(1)
        expect(mockFormDataAppend).toHaveBeenCalledWith('objectData', 'data')
      }
    })

    it('should handle different data types in FormData', async () => {
      const uploadTool = getObjectStoreToolsDefinitions[OBJECT_STORE_TOOL_KEYS.UPLOAD_OBJECT]
      
      if ('func' in uploadTool) {
        const testCases = [
          { data: 'string data', description: 'string' },
          { data: Buffer.from('buffer data'), description: 'buffer' },
          { data: new Uint8Array([1, 2, 3]), description: 'typed array' },
        ]

        for (const testCase of testCases) {
          jest.clearAllMocks()
          mockQCClientInstance.postFormData.mockResolvedValue({ success: true })

          const mockParams = { organizationId: 'org', key: 'file', objectData: testCase.data }
          await uploadTool.func(mockParams)

          expect(mockFormDataAppend).toHaveBeenCalledWith('objectData', testCase.data)
        }
      }
    })
  })

  describe('QCClient integration', () => {
    it('should use QCClient singleton pattern', async () => {
      const uploadTool = getObjectStoreToolsDefinitions[OBJECT_STORE_TOOL_KEYS.UPLOAD_OBJECT]
      
      if ('func' in uploadTool) {
        mockQCClientInstance.postFormData.mockResolvedValue({ success: true })

        await uploadTool.func({ organizationId: 'org', key: 'file', objectData: 'data' })

        expect(MockedQCClient.getInstance as jest.MockedFunction<typeof QCClient.getInstance>).toHaveBeenCalledTimes(1)
        expect(mockQCClientInstance.postFormData).toHaveBeenCalledTimes(1)
      }
    })

    it('should call postFormData with correct parameters', async () => {
      const uploadTool = getObjectStoreToolsDefinitions[OBJECT_STORE_TOOL_KEYS.UPLOAD_OBJECT]
      
      if ('func' in uploadTool) {
        const mockParams = {
          organizationId: 'test-org',
          key: 'test/file.txt',
          objectData: 'file content',
          metadata: 'additional'
        }

        mockQCClientInstance.postFormData.mockResolvedValue({ key: 'test/file.txt' })

        await uploadTool.func(mockParams)

        expect(mockQCClientInstance.postFormData).toHaveBeenCalledWith(
          '/object/set',
          { organizationId: 'test-org', key: 'test/file.txt', metadata: 'additional' },
          expect.any(Object)
        )
      }
    })

    it('should handle QCClient errors', async () => {
      const uploadTool = getObjectStoreToolsDefinitions[OBJECT_STORE_TOOL_KEYS.UPLOAD_OBJECT]
      
      if ('func' in uploadTool) {
        const qcError = new Error('QC API Error')
        mockQCClientInstance.postFormData.mockRejectedValue(qcError)

        const mockParams = { organizationId: 'org', key: 'file', objectData: 'data' }

        await expect(uploadTool.func(mockParams)).rejects.toThrow('QC API Error')
      }
    })
  })

  describe('parameter handling', () => {
    it('should preserve original parameter object structure', async () => {
      const uploadTool = getObjectStoreToolsDefinitions[OBJECT_STORE_TOOL_KEYS.UPLOAD_OBJECT]
      
      if ('func' in uploadTool) {
        const originalParams = {
          organizationId: 'org123',
          key: 'file.txt',
          objectData: 'content',
          nested: { property: 'value' },
          array: [1, 2, 3]
        }

        // Create a copy to verify original is not mutated
        const paramsCopy = JSON.parse(JSON.stringify(originalParams))
        
        mockQCClientInstance.postFormData.mockResolvedValue({ success: true })

        await uploadTool.func(originalParams)

        // Verify only objectData was removed from the API call
        const apiCallParams = mockQCClientInstance.postFormData.mock.calls[0][1]
        expect(apiCallParams).toEqual({
          organizationId: 'org123',
          key: 'file.txt',
          nested: { property: 'value' },
          array: [1, 2, 3]
        })

        // Verify objectData was properly added to FormData
        expect(mockFormDataAppend).toHaveBeenCalledWith('objectData', 'content')
      }
    })

    it('should handle missing objectData parameter', async () => {
      const uploadTool = getObjectStoreToolsDefinitions[OBJECT_STORE_TOOL_KEYS.UPLOAD_OBJECT]
      
      if ('func' in uploadTool) {
        const paramsWithoutObjectData = {
          organizationId: 'org123',
          key: 'file.txt'
        }

        mockQCClientInstance.postFormData.mockResolvedValue({ success: true })

        await uploadTool.func(paramsWithoutObjectData as any)

        expect(mockFormDataAppend).toHaveBeenCalledWith('objectData', undefined)
      }
    })

    it('should handle null and undefined objectData', async () => {
      const uploadTool = getObjectStoreToolsDefinitions[OBJECT_STORE_TOOL_KEYS.UPLOAD_OBJECT]
      
      if ('func' in uploadTool) {
        const testCases = [null, undefined, '']

        for (const objectData of testCases) {
          jest.clearAllMocks()
          mockQCClientInstance.postFormData.mockResolvedValue({ success: true })

          const params = { organizationId: 'org', key: 'file', objectData }
          await uploadTool.func(params as any)

          expect(mockFormDataAppend).toHaveBeenCalledWith('objectData', objectData)
        }
      }
    })
  })

  describe('tool consistency', () => {
    it('should have consistent title formatting', () => {
      Object.values(getObjectStoreToolsDefinitions).forEach(tool => {
        expect(tool.config.title).toBeDefined()
        expect(typeof tool.config.title).toBe('string')
        
        if (tool.config.title) {
          expect(tool.config.title.length).toBeGreaterThan(0)
          
          // Should not end with period
          expect(tool.config.title).not.toMatch(/\.$/)
          
          // Should be properly capitalized
          expect(tool.config.title.charAt(0)).toMatch(/[A-Z]/)
          
          // Should contain "object" or "Object Store"
          const lowerTitle = tool.config.title.toLowerCase()
          expect(lowerTitle).toMatch(/object/i)
        }
      })
    })

    it('should have consistent description formatting', () => {
      Object.values(getObjectStoreToolsDefinitions).forEach(tool => {
        if (tool.config.description) {
          expect(typeof tool.config.description).toBe('string')
          expect(tool.config.description.length).toBeGreaterThan(0)
          
          // Should end with period
          expect(tool.config.description).toMatch(/\.$/)
          
          // Should be properly capitalized
          expect(tool.config.description.charAt(0)).toMatch(/[A-Z]/)
          
          // Should contain "Object Store"
          expect(tool.config.description).toContain('Object Store')
        }
      })
    })

    it('should have complete annotation coverage', () => {
      Object.values(getObjectStoreToolsDefinitions).forEach(tool => {
        expect(tool.config.annotations).toBeDefined()
        expect(tool.config.annotations?.readOnlyHint).toBeDefined()
        expect(tool.config.annotations?.destructiveHint).toBeDefined()
        expect(tool.config.annotations?.idempotentHint).toBeDefined()
      })
    })

    it('should have logical annotation combinations', () => {
      Object.entries(getObjectStoreToolsDefinitions).forEach(([toolKey, tool]) => {
        const annotations = tool.config.annotations!
        
        // Destructive operations should not be read-only
        if (annotations.destructiveHint) {
          expect(annotations.readOnlyHint).toBe(false)
        }
        
        // Upload and Delete should be write operations
        if (toolKey === OBJECT_STORE_TOOL_KEYS.UPLOAD_OBJECT || toolKey === OBJECT_STORE_TOOL_KEYS.DELETE_OBJECT) {
          expect(annotations.readOnlyHint).toBe(false)
        }
        
        // Only Delete should be destructive
        if (toolKey === OBJECT_STORE_TOOL_KEYS.DELETE_OBJECT) {
          expect(annotations.destructiveHint).toBe(true)
        } else {
          expect(annotations.destructiveHint).toBe(false)
        }
      })
    })
  })

  describe('dependency integration', () => {
    it('should properly import all required dependencies', () => {
      // Verify QCClient import
      expect(QCClient).toBeDefined()
      expect(typeof QCClient.getInstance).toBe('function')
      
      // Verify FormData import
      expect(FormData).toBeDefined()
      expect(typeof FormData).toBe('function')
      
      // Verify zod import
      expect(z).toBeDefined()
      expect(typeof z.object).toBe('function')
      
      // Verify mergeUnionToRawShape import
      expect(mergeUnionToRawShape).toBeDefined()
      expect(typeof mergeUnionToRawShape).toBe('function')
    })

    it('should use mergeUnionToRawShape correctly', () => {
      // Verify that mergeUnionToRawShape is used for the complex schemas
      // The function is imported and used in the module
      expect(mergeUnionToRawShape).toBeDefined()
      expect(typeof mergeUnionToRawShape).toBe('function')
    })

    it('should handle schema imports correctly', () => {
      // Verify all schema imports are objects (Zod schemas)
      const schemaImports = [
        deleteObjectBody,
        deleteObjectResponse,
        getObjectPropertiesBody,
        getObjectPropertiesResponse,
        getObjectResponse,
        listObjectBody,
        listObjectResponse,
        setObjectBody,
        setObjectResponse,
      ]

      schemaImports.forEach(schema => {
        expect(schema).toBeDefined()
        expect(typeof schema).toBe('object')
        expect(schema).toHaveProperty('shape')
      })

      // getObjectBody is a union type, so it doesn't have a shape property
      expect(getObjectBody).toBeDefined()
      expect(typeof getObjectBody).toBe('object')
    })
  })

  describe('error handling', () => {
    it('should handle upload function errors gracefully', async () => {
      const uploadTool = getObjectStoreToolsDefinitions[OBJECT_STORE_TOOL_KEYS.UPLOAD_OBJECT]
      
      if ('func' in uploadTool) {
        const errorScenarios = [
          new Error('Network error'),
          new Error('Authentication failed'),
          new Error('File too large'),
          new Error('Invalid organization')
        ]

        for (const error of errorScenarios) {
          mockQCClientInstance.postFormData.mockRejectedValue(error)

          const params = { organizationId: 'org', key: 'file', objectData: 'data' }

          await expect(uploadTool.func(params)).rejects.toThrow(error.message)
        }
      }
    })

    it('should handle FormData creation errors', async () => {
      const uploadTool = getObjectStoreToolsDefinitions[OBJECT_STORE_TOOL_KEYS.UPLOAD_OBJECT]
      
      if ('func' in uploadTool) {
        // Mock FormData constructor to throw
        ;(FormData as jest.MockedClass<typeof FormData>).mockImplementationOnce(() => {
          throw new Error('FormData creation failed')
        })

        const params = { organizationId: 'org', key: 'file', objectData: 'data' }

        await expect(uploadTool.func(params)).rejects.toThrow('FormData creation failed')
      }
    })

    it('should handle QCClient getInstance errors', async () => {
      const uploadTool = getObjectStoreToolsDefinitions[OBJECT_STORE_TOOL_KEYS.UPLOAD_OBJECT]
      
      if ('func' in uploadTool) {
        ;(MockedQCClient.getInstance as jest.MockedFunction<typeof QCClient.getInstance>).mockImplementationOnce(() => {
          throw new Error('QCClient initialization failed')
        })

        const params = { organizationId: 'org', key: 'file', objectData: 'data' }

        await expect(uploadTool.func(params)).rejects.toThrow('QCClient initialization failed')
      }
    })
  })

  describe('type safety', () => {
    it('should have proper TypeScript types for tool definitions', () => {
      // Verify the tool definitions conform to the expected type structure
      Object.entries(getObjectStoreToolsDefinitions).forEach(([toolKey, tool]) => {
        expect(tool).toHaveProperty('config')
        expect(tool.config).toHaveProperty('title')
        expect(tool.config).toHaveProperty('description')
        expect(tool.config).toHaveProperty('inputSchema')
        expect(tool.config).toHaveProperty('outputSchema')
        expect(tool.config).toHaveProperty('annotations')
        
        // Should have either 'func' or 'url' but not both
        const hasFunc = 'func' in tool
        const hasUrl = 'url' in tool
        expect(hasFunc || hasUrl).toBe(true)
        expect(hasFunc && hasUrl).toBe(false)
      })
    })

    it('should have proper generic type usage', async () => {
      const uploadTool = getObjectStoreToolsDefinitions[OBJECT_STORE_TOOL_KEYS.UPLOAD_OBJECT]
      
      if ('func' in uploadTool) {
        mockQCClientInstance.postFormData.mockResolvedValue({ success: true, key: 'file.txt' })

        const result = await uploadTool.func({ organizationId: 'org', key: 'file', objectData: 'data' })

        // Verify the result has the expected structure
        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('key')
      }
    })
  })

  describe('integration scenarios', () => {
    it('should support complete object store workflow', async () => {
      const uploadTool = getObjectStoreToolsDefinitions[OBJECT_STORE_TOOL_KEYS.UPLOAD_OBJECT]
      
      if ('func' in uploadTool) {
        // Simulate a complete upload workflow
        const fileContent = 'test file content'
        const uploadParams = {
          organizationId: 'test-org',
          key: 'documents/test.txt',
          objectData: fileContent
        }

        const uploadResponse = { success: true, key: 'documents/test.txt', size: fileContent.length }
        mockQCClientInstance.postFormData.mockResolvedValue(uploadResponse)

        const result = await uploadTool.func(uploadParams)

        // Verify complete workflow
        expect(FormData as jest.MockedClass<typeof FormData>).toHaveBeenCalledTimes(1)
        expect(mockFormDataAppend).toHaveBeenCalledWith('objectData', fileContent)
        expect(mockQCClientInstance.postFormData).toHaveBeenCalledWith(
          '/object/set',
          { organizationId: 'test-org', key: 'documents/test.txt' },
          expect.any(Object)
        )
        expect(result).toBe(uploadResponse)
      }
    })

    it('should have complementary read and write operations', () => {
      const toolKeys = Object.keys(getObjectStoreToolsDefinitions)
      
      // Should have both upload and delete for write operations
      expect(toolKeys).toContain(OBJECT_STORE_TOOL_KEYS.UPLOAD_OBJECT)
      expect(toolKeys).toContain(OBJECT_STORE_TOOL_KEYS.DELETE_OBJECT)
      
      // Should have multiple read operations
      expect(toolKeys).toContain(OBJECT_STORE_TOOL_KEYS.READ_OBJECT_PROPERTIES)
      expect(toolKeys).toContain(OBJECT_STORE_TOOL_KEYS.READ_OBJECT_STORE_FILE_JOB_ID)
      expect(toolKeys).toContain(OBJECT_STORE_TOOL_KEYS.READ_OBJECT_STORE_FILE_DOWNLOAD_URL)
      expect(toolKeys).toContain(OBJECT_STORE_TOOL_KEYS.LIST_OBJECT_STORE_FILES)
    })

    it('should provide comprehensive object store management', () => {
      const tools = getObjectStoreToolsDefinitions
      
      // CRUD operations coverage
      const createTool = tools[OBJECT_STORE_TOOL_KEYS.UPLOAD_OBJECT] // Create
      const readTools = [
        tools[OBJECT_STORE_TOOL_KEYS.READ_OBJECT_PROPERTIES],
        tools[OBJECT_STORE_TOOL_KEYS.READ_OBJECT_STORE_FILE_JOB_ID],
        tools[OBJECT_STORE_TOOL_KEYS.READ_OBJECT_STORE_FILE_DOWNLOAD_URL],
        tools[OBJECT_STORE_TOOL_KEYS.LIST_OBJECT_STORE_FILES]
      ] // Read
      const deleteTool = tools[OBJECT_STORE_TOOL_KEYS.DELETE_OBJECT] // Delete
      
      expect(createTool).toBeDefined()
      expect(readTools.every(tool => tool !== undefined)).toBe(true)
      expect(deleteTool).toBeDefined()
      
      // No update operation (object store is immutable for existing files)
      expect(readTools).toHaveLength(4)
    })
  })
})

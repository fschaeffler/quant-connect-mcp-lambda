import axios from 'axios'
import crypto from 'crypto'
import FormData from 'form-data'
import { QCClient, QCClientGetInstanceParams } from './client'
import { fixDateStrings } from './date-time-parser'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Mock fixDateStrings
jest.mock('./date-time-parser')
const mockedFixDateStrings = fixDateStrings as jest.MockedFunction<typeof fixDateStrings>

// Mock crypto
jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn(() => ({
      digest: jest.fn(() => 'mocked-hash')
    }))
  })),
  randomBytes: jest.fn(() => Buffer.from('mocked-boundary', 'utf8'))
}))

describe('libs/quant-connect-client/src/client', () => {
  const mockAxiosInstance = {
    create: jest.fn(),
    post: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn()
      }
    }
  }

  const validParams: QCClientGetInstanceParams = {
    userId: 'test-user-123',
    apiToken: 'test-api-token-456'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset QCClient singleton
    ;(QCClient as any).instance = undefined
    
    // Setup default axios mock
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any)
    
    // Setup default fixDateStrings mock
    mockedFixDateStrings.mockImplementation((data) => data)
    
    // Mock Date.now for consistent timestamp testing
    jest.spyOn(Date, 'now').mockReturnValue(1640995200000) // 2022-01-01 00:00:00 UTC
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('getInstance', () => {
    it('should create new instance when called first time with params', () => {
      const client = QCClient.getInstance(validParams)
      
      expect(client).toBeInstanceOf(QCClient)
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://www.quantconnect.com/api/v2',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      })
    })

    it('should return same instance on subsequent calls', () => {
      const client1 = QCClient.getInstance(validParams)
      const client2 = QCClient.getInstance()
      
      expect(client1).toBe(client2)
      expect(mockedAxios.create).toHaveBeenCalledTimes(1)
    })

    it('should throw error when called first time without params', () => {
      expect(() => QCClient.getInstance()).toThrow(
        'userId and apiToken need be provided for initial instance retrieval'
      )
    })

    it('should ignore params on subsequent calls', () => {
      const client1 = QCClient.getInstance(validParams)
      const client2 = QCClient.getInstance({
        userId: 'different-user',
        apiToken: 'different-token'
      })
      
      expect(client1).toBe(client2)
      expect(mockedAxios.create).toHaveBeenCalledTimes(1)
    })
  })

  describe('isInitialized', () => {
    it('should return false when no instance exists', () => {
      expect(QCClient.isInitialized()).toBe(false)
    })

    it('should return true when instance exists', () => {
      QCClient.getInstance(validParams)
      expect(QCClient.isInitialized()).toBe(true)
    })
  })

  describe('constructor behavior', () => {
    it('should set up axios instance with correct configuration', () => {
      QCClient.getInstance(validParams)
      
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://www.quantconnect.com/api/v2',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      })
    })

    it('should set up request interceptor for authentication', () => {
      QCClient.getInstance(validParams)
      
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled()
      
      // Get the interceptor function
      const interceptorCall = mockAxiosInstance.interceptors.request.use.mock.calls.find(
        call => call[0].toString().includes('quantConnectHeaders')
      )
      expect(interceptorCall).toBeDefined()
    })

    it('should set up throttling interceptor when requestThrottleInMS is provided', () => {
      // Reset instance first
      ;(QCClient as any).instance = undefined
      
      const paramsWithThrottle = {
        ...validParams,
        requestThrottleInMS: 1000
      }
      
      QCClient.getInstance(paramsWithThrottle)
      
      // Should have 2 interceptors: throttling + auth
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalledTimes(2)
      
      // Check that the first interceptor is the throttling one
      const throttleInterceptorCall = mockAxiosInstance.interceptors.request.use.mock.calls[0]
      expect(throttleInterceptorCall[0].toString()).toContain('setTimeout')
    })

    it('should not set up throttling interceptor when requestThrottleInMS is not provided', () => {
      QCClient.getInstance(validParams)
      
      // Should have only 1 interceptor: auth
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalledTimes(1)
    })
  })

  describe('authentication headers', () => {
    it('should generate correct authentication headers', () => {
      const client = QCClient.getInstance(validParams)
      
      // Get the auth interceptor function
      const authInterceptorCall = mockAxiosInstance.interceptors.request.use.mock.calls.find(
        call => call[0].toString().includes('quantConnectHeaders')
      )
      const authInterceptor = authInterceptorCall![0]
      
      // Mock request config
      const mockConfig = {
        headers: {}
      }
      
      // Call the interceptor
      const result = authInterceptor(mockConfig)
      
      // Verify timestamp was set
      expect(result.headers.Timestamp).toBe('1640995200')
      
      // Verify Authorization header format
      expect(result.headers.Authorization).toMatch(/^Basic /)
      
      // Verify crypto.createHash was called correctly
      expect(crypto.createHash).toHaveBeenCalledWith('sha256')
    })

    it('should create different timestamps for different calls', () => {
      const client = QCClient.getInstance(validParams)
      
      // Change the mocked time
      jest.spyOn(Date, 'now').mockReturnValue(1640995260000) // +60 seconds
      
      const authInterceptorCall = mockAxiosInstance.interceptors.request.use.mock.calls.find(
        call => call[0].toString().includes('quantConnectHeaders')
      )
      const authInterceptor = authInterceptorCall![0]
      
      const mockConfig = { headers: {} }
      const result = authInterceptor(mockConfig)
      
      expect(result.headers.Timestamp).toBe('1640995260')
    })
  })

  describe('post method', () => {
    it('should make POST request and process response with fixDateStrings', async () => {
      const client = QCClient.getInstance(validParams)
      const mockResponse = { data: { id: 1, date: '2022-01-01' } }
      const mockProcessedData = { id: 1, date: new Date('2022-01-01') }
      
      mockAxiosInstance.post.mockResolvedValue(mockResponse)
      mockedFixDateStrings.mockReturnValue(mockProcessedData)
      
      const result = await client.post('/test', { param: 'value' })
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', { param: 'value' }, undefined)
      expect(mockedFixDateStrings).toHaveBeenCalledWith(mockResponse.data)
      expect(result).toBe(mockProcessedData)
    })

    it('should pass config to axios post', async () => {
      const client = QCClient.getInstance(validParams)
      const mockResponse = { data: { success: true } }
      const config = { timeout: 5000 }
      
      mockAxiosInstance.post.mockResolvedValue(mockResponse)
      
      await client.post('/test', { param: 'value' }, config)
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', { param: 'value' }, config)
    })

    it('should handle axios errors', async () => {
      const client = QCClient.getInstance(validParams)
      const error = new Error('Network error')
      
      mockAxiosInstance.post.mockRejectedValue(error)
      
      await expect(client.post('/test')).rejects.toThrow('Network error')
    })

    it('should work with generic types', async () => {
      const client = QCClient.getInstance(validParams)
      const mockResponse = { data: { id: 1, name: 'test' } }
      
      mockAxiosInstance.post.mockResolvedValue(mockResponse)
      mockedFixDateStrings.mockReturnValue(mockResponse.data)
      
      interface InputType { param: string }
      interface OutputType { id: number; name: string }
      
      const result = await client.post<InputType, OutputType>('/test', { param: 'value' })
      
      expect(result).toEqual({ id: 1, name: 'test' })
    })
  })

  describe('postWithRawResponse method', () => {
    it('should make POST request and return raw axios response', async () => {
      const client = QCClient.getInstance(validParams)
      const mockResponse = { 
        data: { id: 1, date: '2022-01-01' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {}
      }
      
      mockAxiosInstance.post.mockResolvedValue(mockResponse)
      
      const result = await client.postWithRawResponse('/test', { param: 'value' })
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', { param: 'value' }, undefined)
      expect(mockedFixDateStrings).not.toHaveBeenCalled()
      expect(result).toBe(mockResponse)
    })

    it('should pass config to axios post', async () => {
      const client = QCClient.getInstance(validParams)
      const mockResponse = { data: { success: true } }
      const config = { timeout: 5000 }
      
      mockAxiosInstance.post.mockResolvedValue(mockResponse)
      
      await client.postWithRawResponse('/test', { param: 'value' }, config)
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', { param: 'value' }, config)
    })
  })

  describe('postFormData method', () => {
    it('should make POST request with form data headers', async () => {
      const client = QCClient.getInstance(validParams)
      const mockResponse = { data: { success: true } }
      const formData = new FormData()
      const mockHeaders = { 'content-type': 'multipart/form-data; boundary=test' }
      
      formData.append('file', 'test content')
      jest.spyOn(formData, 'getHeaders').mockReturnValue(mockHeaders)
      
      mockAxiosInstance.post.mockResolvedValue(mockResponse)
      mockedFixDateStrings.mockReturnValue(mockResponse.data)
      
      const result = await client.postFormData('/upload', { name: 'test' }, formData)
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/upload', { name: 'test' }, {
        headers: mockHeaders
      })
      expect(result).toBe(mockResponse.data)
    })

    it('should merge form data headers with additional config correctly', async () => {
      const client = QCClient.getInstance(validParams)
      const mockResponse = { data: { success: true } }
      const formData = new FormData()
      const mockHeaders = { 'content-type': 'multipart/form-data; boundary=test' }
      const additionalConfig = {
        timeout: 5000,
        headers: { 'X-Custom': 'value' }
      }
      
      jest.spyOn(formData, 'getHeaders').mockReturnValue(mockHeaders)
      mockAxiosInstance.post.mockResolvedValue(mockResponse)
      mockedFixDateStrings.mockReturnValue(mockResponse.data)
      
      await client.postFormData('/upload', { name: 'test' }, formData, additionalConfig)
      
      // Should properly merge config headers with form data headers
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/upload', { name: 'test' }, {
        timeout: 5000,
        headers: {
          'X-Custom': 'value',
          'content-type': 'multipart/form-data; boundary=test'
        }
      })
    })
  })

  describe('throttling behavior', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should delay requests when throttling is enabled', async () => {
      const paramsWithThrottle = {
        ...validParams,
        requestThrottleInMS: 1000
      }
      
      QCClient.getInstance(paramsWithThrottle)
      
      // Get the throttling interceptor
      const throttleInterceptorCall = mockAxiosInstance.interceptors.request.use.mock.calls[0]
      const throttleInterceptor = throttleInterceptorCall[0]
      
      const mockConfig = { headers: {} }
      
      // Call the interceptor
      const promise = throttleInterceptor(mockConfig)
      
      // Fast-forward time
      jest.advanceTimersByTime(1000)
      
      const result = await promise
      expect(result).toBe(mockConfig)
    })
  })

  describe('error handling', () => {
    it('should propagate axios errors in post method', async () => {
      const client = QCClient.getInstance(validParams)
      const axiosError = {
        response: {
          status: 401,
          data: { error: 'Unauthorized' }
        },
        message: 'Request failed with status code 401'
      }
      
      mockAxiosInstance.post.mockRejectedValue(axiosError)
      
      await expect(client.post('/test')).rejects.toEqual(axiosError)
    })

    it('should propagate axios errors in postWithRawResponse method', async () => {
      const client = QCClient.getInstance(validParams)
      const axiosError = new Error('Network error')
      
      mockAxiosInstance.post.mockRejectedValue(axiosError)
      
      await expect(client.postWithRawResponse('/test')).rejects.toThrow('Network error')
    })

    it('should propagate axios errors in postFormData method', async () => {
      const client = QCClient.getInstance(validParams)
      const formData = new FormData()
      const axiosError = new Error('Upload failed')
      
      jest.spyOn(formData, 'getHeaders').mockReturnValue({})
      mockAxiosInstance.post.mockRejectedValue(axiosError)
      
      await expect(client.postFormData('/upload', {}, formData)).rejects.toThrow('Upload failed')
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete request flow with authentication', async () => {
      const client = QCClient.getInstance(validParams)
      const mockResponse = { data: { id: 1, created: '2022-01-01T00:00:00Z' } }
      const processedData = { id: 1, created: new Date('2022-01-01T00:00:00Z') }
      
      mockAxiosInstance.post.mockResolvedValue(mockResponse)
      mockedFixDateStrings.mockReturnValue(processedData)
      
      // Simulate the auth interceptor being called
      const authInterceptorCall = mockAxiosInstance.interceptors.request.use.mock.calls.find(
        call => call[0].toString().includes('quantConnectHeaders')
      )
      const authInterceptor = authInterceptorCall![0]
      
      const mockConfig = { headers: {} }
      authInterceptor(mockConfig)
      
      const result = await client.post('/projects/create', { name: 'Test Project' })
      
      expect(mockConfig.headers).toHaveProperty('Authorization')
      expect(mockConfig.headers).toHaveProperty('Timestamp')
      expect(result).toBe(processedData)
    })

    it('should work with real FormData object', async () => {
      const client = QCClient.getInstance(validParams)
      const mockResponse = { data: { fileId: 'abc123' } }
      const formData = new FormData()
      
      // Add real form data
      formData.append('name', 'test.txt')
      formData.append('content', 'Hello World')
      
      mockAxiosInstance.post.mockResolvedValue(mockResponse)
      mockedFixDateStrings.mockReturnValue(mockResponse.data)
      
      const result = await client.postFormData('/files/upload', { projectId: 123 }, formData)
      
      expect(result).toEqual({ fileId: 'abc123' })
      
      // Verify that form data headers were included
      const postCall = mockAxiosInstance.post.mock.calls[0]
      expect(postCall[2]).toHaveProperty('headers')
      expect(postCall[2].headers).toHaveProperty('content-type')
    })
  })

  describe('singleton pattern edge cases', () => {
    it('should maintain singleton across multiple modules', () => {
      // Simulate getting instance from different modules
      const client1 = QCClient.getInstance(validParams)
      const client2 = QCClient.getInstance()
      const client3 = QCClient.getInstance({ userId: 'ignored', apiToken: 'ignored' })
      
      expect(client1).toBe(client2)
      expect(client2).toBe(client3)
      expect(QCClient.isInitialized()).toBe(true)
    })

    it('should handle concurrent getInstance calls', () => {
      // Reset instance
      ;(QCClient as any).instance = undefined
      
      // Simulate concurrent calls
      const client1 = QCClient.getInstance(validParams)
      const client2 = QCClient.getInstance(validParams)
      
      expect(client1).toBe(client2)
      expect(mockedAxios.create).toHaveBeenCalledTimes(1)
    })
  })
})

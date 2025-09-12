import { SecretsManager } from '@aws-sdk/client-secrets-manager'
import { QCClient } from '@fschaeffler/quant-connect-client'
import { middyQCClient, MiddyQCClientParams } from './quant-connect-client'
import type { RequestEvent, ResponseEvent } from './types'
import type { Context } from 'aws-lambda'

// Mock AWS SDK SecretsManager
jest.mock('@aws-sdk/client-secrets-manager')
const MockedSecretsManager = SecretsManager as jest.MockedClass<typeof SecretsManager>

// Mock QCClient
jest.mock('@fschaeffler/quant-connect-client', () => ({
  QCClient: {
    isInitialized: jest.fn(),
    getInstance: jest.fn()
  }
}))
const MockedQCClient = QCClient as jest.Mocked<typeof QCClient>

describe('libs/middy/src/quant-connect-client', () => {
  const mockSecretsManagerInstance = {
    getSecretValue: jest.fn()
  }

  // Create mock request object for middleware
  const createMockRequest = () => ({
    event: {} as RequestEvent,
    context: {} as Context,
    response: {} as ResponseEvent,
    error: null,
    internal: {}
  })

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset environment variables
    delete process.env.QUANTCONNECT_USER_ID
    delete process.env.QUANTCONNECT_API_TOKEN
    
    // Setup SecretsManager mock
    MockedSecretsManager.mockImplementation(() => mockSecretsManagerInstance as any)
    
    // Setup QCClient mocks
    MockedQCClient.isInitialized.mockReturnValue(false)
    MockedQCClient.getInstance.mockReturnValue({} as any)
  })

  describe('middyQCClient middleware factory', () => {
    it('should return middleware object with before hook', () => {
      const middleware = middyQCClient()
      
      expect(middleware).toHaveProperty('before')
      expect(typeof middleware.before).toBe('function')
    })

    it('should use default parameters when none provided', () => {
      const middleware = middyQCClient()
      
      expect(middleware).toBeDefined()
      expect(typeof middleware.before).toBe('function')
    })

    it('should accept custom parameters', () => {
      const params: MiddyQCClientParams = {
        userId: 'custom-user',
        apiToken: 'custom-token',
        requestThrottleInMS: 1000
      }
      
      const middleware = middyQCClient(params)
      
      expect(middleware).toBeDefined()
      expect(typeof middleware.before).toBe('function')
    })

    it('should use environment variables as defaults', () => {
      process.env.QUANTCONNECT_USER_ID = 'env-user'
      process.env.QUANTCONNECT_API_TOKEN = 'env-token'
      
      const middleware = middyQCClient()
      
      expect(middleware).toBeDefined()
    })
  })

  describe('before hook behavior', () => {
    it('should skip initialization if QCClient is already initialized', async () => {
      MockedQCClient.isInitialized.mockReturnValue(true)
      
      const middleware = middyQCClient({
        userId: 'test-user',
        apiToken: 'test-token'
      })
      
      await middleware.before!(createMockRequest())
      
      expect(MockedQCClient.isInitialized).toHaveBeenCalledTimes(1)
      expect(MockedQCClient.getInstance).not.toHaveBeenCalled()
      expect(mockSecretsManagerInstance.getSecretValue).not.toHaveBeenCalled()
    })

    it('should initialize QCClient with provided credentials', async () => {
      const params = {
        userId: 'test-user',
        apiToken: 'test-token',
        requestThrottleInMS: 2000
      }
      
      const middleware = middyQCClient(params)
      await middleware.before!(createMockRequest())
      
      expect(MockedQCClient.getInstance).toHaveBeenCalledWith({
        userId: 'test-user',
        apiToken: 'test-token',
        requestThrottleInMS: 2000
      })
    })

    it('should use environment variables when no params provided', async () => {
      process.env.QUANTCONNECT_USER_ID = 'env-user'
      process.env.QUANTCONNECT_API_TOKEN = 'env-token'
      
      const middleware = middyQCClient()
      await middleware.before!(createMockRequest())
      
      expect(MockedQCClient.getInstance).toHaveBeenCalledWith({
        userId: 'env-user',
        apiToken: 'env-token',
        requestThrottleInMS: 5000 // default value
      })
    })

    it('should fetch userId from Secrets Manager when not provided', async () => {
      mockSecretsManagerInstance.getSecretValue.mockResolvedValueOnce({
        SecretString: 'secret-user-id'
      })
      
      const middleware = middyQCClient({
        apiToken: 'test-token'
      })
      await middleware.before!(createMockRequest())
      
      expect(mockSecretsManagerInstance.getSecretValue).toHaveBeenCalledWith({
        SecretId: 'quant-connect-mcp/user-id'
      })
      expect(MockedQCClient.getInstance).toHaveBeenCalledWith({
        userId: 'secret-user-id',
        apiToken: 'test-token',
        requestThrottleInMS: 5000
      })
    })

    it('should fetch apiToken from Secrets Manager when not provided', async () => {
      mockSecretsManagerInstance.getSecretValue.mockResolvedValueOnce({
        SecretString: 'secret-api-token'
      })
      
      const middleware = middyQCClient({
        userId: 'test-user'
      })
      await middleware.before!(createMockRequest())
      
      expect(mockSecretsManagerInstance.getSecretValue).toHaveBeenCalledWith({
        SecretId: 'quant-connect-mcp/api-token'
      })
      expect(MockedQCClient.getInstance).toHaveBeenCalledWith({
        userId: 'test-user',
        apiToken: 'secret-api-token',
        requestThrottleInMS: 5000
      })
    })

    it('should fetch both credentials from Secrets Manager when neither provided', async () => {
      mockSecretsManagerInstance.getSecretValue
        .mockResolvedValueOnce({ SecretString: 'secret-user-id' })
        .mockResolvedValueOnce({ SecretString: 'secret-api-token' })
      
      const middleware = middyQCClient()
      await middleware.before!(createMockRequest())
      
      expect(mockSecretsManagerInstance.getSecretValue).toHaveBeenCalledTimes(2)
      expect(mockSecretsManagerInstance.getSecretValue).toHaveBeenCalledWith({
        SecretId: 'quant-connect-mcp/user-id'
      })
      expect(mockSecretsManagerInstance.getSecretValue).toHaveBeenCalledWith({
        SecretId: 'quant-connect-mcp/api-token'
      })
      expect(MockedQCClient.getInstance).toHaveBeenCalledWith({
        userId: 'secret-user-id',
        apiToken: 'secret-api-token',
        requestThrottleInMS: 5000
      })
    })

    it('should use custom requestThrottleInMS value', async () => {
      const middleware = middyQCClient({
        userId: 'test-user',
        apiToken: 'test-token',
        requestThrottleInMS: 10000
      })
      await middleware.before!(createMockRequest())
      
      expect(MockedQCClient.getInstance).toHaveBeenCalledWith({
        userId: 'test-user',
        apiToken: 'test-token',
        requestThrottleInMS: 10000
      })
    })

    it('should use default requestThrottleInMS when not specified', async () => {
      const middleware = middyQCClient({
        userId: 'test-user',
        apiToken: 'test-token'
      })
      await middleware.before!(createMockRequest())
      
      expect(MockedQCClient.getInstance).toHaveBeenCalledWith({
        userId: 'test-user',
        apiToken: 'test-token',
        requestThrottleInMS: 5000
      })
    })
  })

  describe('getSecretFromSecretsManager function', () => {
    // Note: This function is not exported, but we can test it indirectly through the middleware
    
    it('should handle missing SecretString in response', async () => {
      mockSecretsManagerInstance.getSecretValue.mockResolvedValue({
        SecretString: undefined
      })
      
      const middleware = middyQCClient()
      
      await expect(middleware.before!(createMockRequest())).rejects.toThrow('SecretString is undefined for quant-connect-mcp/user-id')
    })

    it('should handle empty SecretString in response', async () => {
      mockSecretsManagerInstance.getSecretValue.mockResolvedValue({
        SecretString: ''
      })
      
      const middleware = middyQCClient()
      
      await expect(middleware.before!(createMockRequest())).rejects.toThrow('SecretString is undefined for quant-connect-mcp/user-id')
    })

    it('should handle SecretsManager API errors', async () => {
      const awsError = new Error('AccessDeniedException: User is not authorized')
      mockSecretsManagerInstance.getSecretValue.mockRejectedValue(awsError)
      
      const middleware = middyQCClient()
      
      await expect(middleware.before!(createMockRequest())).rejects.toThrow('AccessDeniedException: User is not authorized')
    })

    it('should handle network errors from SecretsManager', async () => {
      const networkError = new Error('NetworkingError: Unable to connect')
      mockSecretsManagerInstance.getSecretValue.mockRejectedValue(networkError)
      
      const middleware = middyQCClient()
      
      await expect(middleware.before!(createMockRequest())).rejects.toThrow('NetworkingError: Unable to connect')
    })
  })

  describe('environment variable handling', () => {
    it('should prioritize explicit params over environment variables', async () => {
      process.env.QUANTCONNECT_USER_ID = 'env-user'
      process.env.QUANTCONNECT_API_TOKEN = 'env-token'
      
      const middleware = middyQCClient({
        userId: 'param-user',
        apiToken: 'param-token'
      })
      await middleware.before!(createMockRequest())
      
      expect(MockedQCClient.getInstance).toHaveBeenCalledWith({
        userId: 'param-user',
        apiToken: 'param-token',
        requestThrottleInMS: 5000
      })
    })

    it('should fall back to Secrets Manager when env vars are undefined', async () => {
      // When env vars are undefined, they get assigned as undefined to the parameters
      // but the ?? operator checks for nullish values, so it will call Secrets Manager
      delete process.env.QUANTCONNECT_USER_ID
      delete process.env.QUANTCONNECT_API_TOKEN
      
      mockSecretsManagerInstance.getSecretValue
        .mockResolvedValueOnce({ SecretString: 'secret-user' })
        .mockResolvedValueOnce({ SecretString: 'secret-token' })
      
      const middleware = middyQCClient()
      await middleware.before!(createMockRequest())
      
      expect(mockSecretsManagerInstance.getSecretValue).toHaveBeenCalledTimes(2)
      expect(MockedQCClient.getInstance).toHaveBeenCalledWith({
        userId: 'secret-user',
        apiToken: 'secret-token',
        requestThrottleInMS: 5000
      })
    })

    it('should NOT fall back to Secrets Manager when env vars are empty strings', async () => {
      // Empty strings are truthy, so ?? operator won't call Secrets Manager
      process.env.QUANTCONNECT_USER_ID = ''
      process.env.QUANTCONNECT_API_TOKEN = ''
      
      const middleware = middyQCClient()
      await middleware.before!(createMockRequest())
      
      // Should not call Secrets Manager because empty strings are truthy
      expect(mockSecretsManagerInstance.getSecretValue).not.toHaveBeenCalled()
      expect(MockedQCClient.getInstance).toHaveBeenCalledWith({
        userId: '',
        apiToken: '',
        requestThrottleInMS: 5000
      })
    })
  })

  describe('middleware integration scenarios', () => {
    it('should work in typical Lambda middleware chain', async () => {
      const middleware = middyQCClient({
        userId: 'lambda-user',
        apiToken: 'lambda-token',
        requestThrottleInMS: 1000
      })
      
      // Simulate middleware execution
      await middleware.before!(createMockRequest())
      
      expect(MockedQCClient.isInitialized).toHaveBeenCalled()
      expect(MockedQCClient.getInstance).toHaveBeenCalledWith({
        userId: 'lambda-user',
        apiToken: 'lambda-token',
        requestThrottleInMS: 1000
      })
    })

    it('should handle multiple middleware instances', async () => {
      // First middleware call
      const middleware1 = middyQCClient({ userId: 'user1', apiToken: 'token1' })
      await middleware1.before!(createMockRequest())
      
      // Second middleware call - should skip initialization
      MockedQCClient.isInitialized.mockReturnValue(true)
      const middleware2 = middyQCClient({ userId: 'user2', apiToken: 'token2' })
      await middleware2.before!(createMockRequest())
      
      expect(MockedQCClient.getInstance).toHaveBeenCalledTimes(1)
      expect(MockedQCClient.getInstance).toHaveBeenCalledWith({
        userId: 'user1',
        apiToken: 'token1',
        requestThrottleInMS: 5000
      })
    })

    it('should handle concurrent middleware initialization attempts', async () => {
      const middleware1 = middyQCClient({ userId: 'user1', apiToken: 'token1' })
      const middleware2 = middyQCClient({ userId: 'user2', apiToken: 'token2' })
      
      // Simulate concurrent calls
      await Promise.all([
        middleware1.before!(createMockRequest()),
        middleware2.before!(createMockRequest())
      ])
      
      // QCClient should handle singleton pattern correctly
      expect(MockedQCClient.isInitialized).toHaveBeenCalled()
      expect(MockedQCClient.getInstance).toHaveBeenCalled()
    })
  })

  describe('error handling and edge cases', () => {
    it('should handle QCClient.getInstance throwing an error', async () => {
      const qcError = new Error('Invalid credentials')
      MockedQCClient.getInstance.mockImplementation(() => {
        throw qcError
      })
      
      const middleware = middyQCClient({
        userId: 'test-user',
        apiToken: 'test-token'
      })
      
      await expect(middleware.before!(createMockRequest())).rejects.toThrow('Invalid credentials')
    })

    it('should handle SecretsManager timeout', async () => {
      const timeoutError = new Error('TimeoutError: Request timed out')
      mockSecretsManagerInstance.getSecretValue.mockRejectedValue(timeoutError)
      
      // Force secrets manager call by not providing credentials
      const middleware = middyQCClient({ userId: undefined, apiToken: undefined })
      
      await expect(middleware.before!(createMockRequest())).rejects.toThrow('TimeoutError: Request timed out')
    })

    it('should handle malformed secret responses', async () => {
      mockSecretsManagerInstance.getSecretValue.mockResolvedValue({
        // Missing SecretString property entirely
      } as any)
      
      // Force secrets manager call by not providing credentials
      const middleware = middyQCClient({ userId: undefined, apiToken: undefined })
      
      await expect(middleware.before!(createMockRequest())).rejects.toThrow('SecretString is undefined for quant-connect-mcp/user-id')
    })

    it('should handle null secret responses', async () => {
      mockSecretsManagerInstance.getSecretValue.mockResolvedValue(null as any)
      
      const middleware = middyQCClient()
      
      await expect(middleware.before!(createMockRequest())).rejects.toThrow()
    })
  })

  describe('parameter validation and types', () => {
    it('should accept all valid MiddyQCClientParams', () => {
      const validParams: MiddyQCClientParams = {
        userId: 'test-user',
        apiToken: 'test-token',
        requestThrottleInMS: 3000
      }
      
      expect(() => middyQCClient(validParams)).not.toThrow()
    })

    it('should accept partial MiddyQCClientParams', () => {
      const partialParams: MiddyQCClientParams = {
        userId: 'test-user'
      }
      
      expect(() => middyQCClient(partialParams)).not.toThrow()
    })

    it('should accept empty params object', () => {
      expect(() => middyQCClient({})).not.toThrow()
    })

    it('should work with undefined params', () => {
      expect(() => middyQCClient()).not.toThrow()
    })

    it('should handle zero requestThrottleInMS', async () => {
      const middleware = middyQCClient({
        userId: 'test-user',
        apiToken: 'test-token',
        requestThrottleInMS: 0
      })
      await middleware.before!(createMockRequest())
      
      expect(MockedQCClient.getInstance).toHaveBeenCalledWith({
        userId: 'test-user',
        apiToken: 'test-token',
        requestThrottleInMS: 0
      })
    })

    it('should handle negative requestThrottleInMS', async () => {
      const middleware = middyQCClient({
        userId: 'test-user',
        apiToken: 'test-token',
        requestThrottleInMS: -1000
      })
      await middleware.before!(createMockRequest())
      
      expect(MockedQCClient.getInstance).toHaveBeenCalledWith({
        userId: 'test-user',
        apiToken: 'test-token',
        requestThrottleInMS: -1000
      })
    })
  })

  describe('AWS SDK integration', () => {
    it('should create SecretsManager client for each secret request', async () => {
      const middleware = middyQCClient()
      
      mockSecretsManagerInstance.getSecretValue
        .mockResolvedValueOnce({ SecretString: 'user' })
        .mockResolvedValueOnce({ SecretString: 'token' })
      
      await middleware.before!(createMockRequest())
      
      // SecretsManager should be instantiated
      expect(MockedSecretsManager).toHaveBeenCalled()
    })

    it('should handle AWS SDK configuration errors', async () => {
      MockedSecretsManager.mockImplementation(() => {
        throw new Error('AWS configuration error')
      })
      
      const middleware = middyQCClient()
      
      await expect(middleware.before!(createMockRequest())).rejects.toThrow('AWS configuration error')
    })
  })
})

/**
 * Tests for SecureLogger to ensure sensitive data is properly filtered
 */

import { SecureLogger } from './secure-logger'

describe('SecureLogger', () => {
  let consoleSpy: jest.SpyInstance

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation()
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  describe('sensitive field filtering', () => {
    it('should redact authorization headers', () => {
      const data = {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature',
          'X-API-Key': 'abc123def456',
          'Content-Type': 'application/json',
        },
      }

      SecureLogger.info('Test', data)

      expect(consoleSpy).toHaveBeenCalledWith('Test', {
        headers: {
          'Authorization': '[REDACTED]',
          'X-API-Key': '[REDACTED]',
          'Content-Type': 'application/json',
        },
      })
    })

    it('should redact QuantConnect credentials', () => {
      const data = {
        body: {
          userId: '12345',
          algorithmId: 'algo123',
          projectId: 'proj456',
          organizationId: 'org789',
          apiKey: 'qc_api_key_12345',
        },
      }

      SecureLogger.info('QuantConnect request', data)

      expect(consoleSpy).toHaveBeenCalledWith('QuantConnect request', {
        body: {
          userId: '[REDACTED]',
          algorithmId: '[REDACTED]',
          projectId: '[REDACTED]',
          organizationId: '[REDACTED]',
          apiKey: '[REDACTED]',
        },
      })
    })

    it('should redact financial data', () => {
      const data = {
        account: '987654321',
        balance: 50000.00,
        equity: 48500.75,
        cash: 1500.25,
        holdings: [
          { symbol: 'AAPL', quantity: 100 },
          { symbol: 'GOOGL', quantity: 50 },
        ],
        position: { symbol: 'TSLA', quantity: 75 },
      }

      SecureLogger.info('Portfolio data', data)

      expect(consoleSpy).toHaveBeenCalledWith('Portfolio data', {
        account: '[REDACTED]',
        balance: '[REDACTED]',
        equity: '[REDACTED]',
        cash: '[REDACTED]',
        holdings: '[REDACTED]',
        position: '[REDACTED]',
      })
    })

    it('should redact PII data', () => {
      const data = {
        email: 'user@example.com',
        phone: '+1-555-123-4567',
        address: '123 Main St, City, State 12345',
        creditCard: '1234-5678-9012-3456',
      }

      SecureLogger.info('User data', data)

      expect(consoleSpy).toHaveBeenCalledWith('User data', {
        email: '[REDACTED]',
        phone: '[REDACTED]',
        address: '[REDACTED]',
        creditCard: '[REDACTED]',
      })
    })
  })

  describe('sensitive value filtering', () => {
    it('should redact JWT tokens', () => {
      const data = {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        normalField: 'safe_value',
      }

      SecureLogger.info('JWT test', data)

      expect(consoleSpy).toHaveBeenCalledWith('JWT test', {
        token: '[REDACTED]',
        normalField: 'safe_value',
      })
    })

    it('should redact long hex strings (API keys)', () => {
      const data = {
        apiKey: 'abcdef1234567890abcdef1234567890abcdef12',
        shortHex: 'abc123',
        normalField: 'normal_value',
      }

      SecureLogger.info('API key test', data)

      expect(consoleSpy).toHaveBeenCalledWith('API key test', {
        apiKey: '[REDACTED]',
        shortHex: 'abc123',
        normalField: 'normal_value',
      })
    })

    it('should redact email addresses in values', () => {
      const data = {
        userInput: 'user@example.com',
        message: 'Contact us at support@company.com',
        normalText: 'Hello world',
      }

      SecureLogger.info('Email test', data)

      expect(consoleSpy).toHaveBeenCalledWith('Email test', {
        userInput: '[REDACTED]',
        message: 'Contact us at support@company.com', // Not caught by value pattern, only field pattern
        normalText: 'Hello world',
      })
    })

    it('should handle long strings', () => {
      const longString = 'a'.repeat(150)
      const data = {
        description: longString, // Non-sensitive field with long content
        shortField: 'short',
        password: 'x'.repeat(200), // This should be redacted as it's a sensitive field
      }

      SecureLogger.info('Long string test', data)

      expect(consoleSpy).toHaveBeenCalledWith('Long string test', {
        description: longString, // Not redacted as it's not a sensitive field
        shortField: 'short',
        password: '[REDACTED_LONG_STRING:200chars]', // Redacted because it's a sensitive field
      })
    })
  })

  describe('nested objects and arrays', () => {
    it('should handle nested objects', () => {
      const data = {
        request: {
          headers: {
            'Authorization': 'Bearer token123',
            'Content-Type': 'application/json',
          },
          body: {
            user: {
              password: 'secret123',
              name: 'John Doe',
            },
          },
        },
        metadata: {
          timestamp: '2023-01-01T00:00:00Z',
        },
      }

      SecureLogger.info('Nested test', data)

      expect(consoleSpy).toHaveBeenCalledWith('Nested test', {
        request: {
          headers: {
            'Authorization': '[REDACTED]',
            'Content-Type': 'application/json',
          },
          body: {
            user: {
              password: '[REDACTED]',
              name: 'John Doe',
            },
          },
        },
        metadata: {
          timestamp: '2023-01-01T00:00:00Z',
        },
      })
    })

    it('should handle arrays', () => {
      const data = {
        users: [
          { name: 'John', apiKey: 'key123' },
          { name: 'Jane', apiKey: 'key456' },
        ],
        tokens: ['token1', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature'],
      }

      SecureLogger.info('Array test', data)

      expect(consoleSpy).toHaveBeenCalledWith('Array test', {
        users: [
          { name: 'John', apiKey: '[REDACTED]' },
          { name: 'Jane', apiKey: '[REDACTED]' },
        ],
        tokens: ['token1', '[REDACTED]'],
      })
    })
  })

  describe('edge cases', () => {
    it('should handle null and undefined values', () => {
      const data = {
        nullValue: null,
        undefinedValue: undefined,
        apiKey: 'secret123',
      }

      SecureLogger.info('Null/undefined test', data)

      expect(consoleSpy).toHaveBeenCalledWith('Null/undefined test', {
        nullValue: null,
        undefinedValue: undefined,
        apiKey: '[REDACTED]',
      })
    })

    it('should handle primitives', () => {
      SecureLogger.info('Number test', 123)
      SecureLogger.info('String test', 'hello')
      SecureLogger.info('Boolean test', true)

      expect(consoleSpy).toHaveBeenCalledWith('Number test', 123)
      expect(consoleSpy).toHaveBeenCalledWith('String test', 'hello')
      expect(consoleSpy).toHaveBeenCalledWith('Boolean test', true)
    })

    it('should prevent infinite recursion', () => {
      const circular: any = { name: 'test' }
      circular.self = circular

      expect(() => {
        SecureLogger.info('Circular test', circular)
      }).not.toThrow()
    })
  })

  describe('logging methods', () => {
    it('should support different log levels', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation()
      const errorSpy = jest.spyOn(console, 'error').mockImplementation()
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation()

      const data = { apiKey: 'secret' }

      SecureLogger.warn('Warning', data)
      SecureLogger.error('Error', data)
      SecureLogger.debug('Debug', data)

      expect(warnSpy).toHaveBeenCalledWith('Warning', { apiKey: '[REDACTED]' })
      expect(errorSpy).toHaveBeenCalledWith('Error', { apiKey: '[REDACTED]' })
      expect(debugSpy).toHaveBeenCalledWith('Debug', { apiKey: '[REDACTED]' })

      warnSpy.mockRestore()
      errorSpy.mockRestore()
      debugSpy.mockRestore()
    })
  })

  describe('filterSensitive method', () => {
    it('should allow manual filtering', () => {
      const sensitiveData = {
        apiKey: 'secret123',
        normalData: 'safe',
        user: {
          password: 'password123',
          name: 'John',
        },
      }

      const filtered = SecureLogger.filterSensitive(sensitiveData)

      expect(filtered).toEqual({
        apiKey: '[REDACTED]',
        normalData: 'safe',
        user: {
          password: '[REDACTED]',
          name: 'John',
        },
      })
    })
  })

  describe('real-world QuantConnect scenarios', () => {
    it('should handle typical QuantConnect MCP request', () => {
      const mcpRequest = {
        headers: {
          'Authorization': 'Bearer qc_token_12345',
          'Content-Type': 'application/json',
          'User-Agent': 'QuantConnect-MCP/1.0',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'create_compile',
            arguments: {
              projectId: 'project_123456',
              userId: 'user_789012',
              organizationId: 'org_345678',
            },
          },
          id: 1,
        }),
        isBase64Encoded: false,
      }

      SecureLogger.info('MCP request received', mcpRequest)

      const expectedCall = consoleSpy.mock.calls[0]
      const loggedData = expectedCall[1]

      expect(loggedData.headers.Authorization).toBe('[REDACTED]')
      expect(loggedData.headers['Content-Type']).toBe('application/json')
      expect(loggedData.body).toContain('project_123456') // Body content should be preserved as it's not a sensitive field
      expect(loggedData.isBase64Encoded).toBe(false)
    })
  })
})
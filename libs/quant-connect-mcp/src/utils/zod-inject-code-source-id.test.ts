import { z, ZodString } from 'zod'
import { injectCodeSourceId } from './zod-inject-code-source-id'
import { MCP_SERVER_IDENTIFIER } from '../configs'

describe('libs/quant-connect-mcp/src/utils/zod-inject-code-source-id', () => {
  describe('injectCodeSourceId', () => {
    it('should return undefined when schema is undefined', () => {
      const result = injectCodeSourceId(undefined)
      expect(result).toBeUndefined()
    })

    it('should handle undefined schema without throwing', () => {
      expect(() => {
        injectCodeSourceId(undefined)
      }).not.toThrow()
    })

    it('should handle null schema gracefully', () => {
      expect(() => {
        injectCodeSourceId(null as any)
      }).not.toThrow()
    })

    it('should not modify schema without codeSourceId property', () => {
      const schema = {
        projectId: z.number(),
        name: z.string(),
      }

      const originalSchema = { ...schema }
      injectCodeSourceId(schema)

      expect(schema).toEqual(originalSchema)
    })

    it('should not modify schema when codeSourceId is not ZodString', () => {
      const schema = {
        projectId: z.number(),
        codeSourceId: z.number(), // Not a ZodString
        name: z.string(),
      }

      const originalCodeSourceId = schema.codeSourceId
      injectCodeSourceId(schema)

      expect(schema.codeSourceId).toBe(originalCodeSourceId)
    })

    it('should inject default value when codeSourceId is ZodString', () => {
      const schema = {
        projectId: z.number(),
        codeSourceId: z.string(),
        name: z.string(),
      }

      // Verify initial state
      expect(schema.codeSourceId).toBeInstanceOf(ZodString)
      
      injectCodeSourceId(schema)

      // Should now be a ZodDefault with the correct default value
      expect(schema.codeSourceId._def.typeName).toBe('ZodDefault')
      
      // Test the default value by parsing an empty object
      const zodObject = z.object({ codeSourceId: schema.codeSourceId })
      const result = zodObject.parse({})
      expect(result.codeSourceId).toBe(MCP_SERVER_IDENTIFIER)
    })

    it('should not modify ZodDefault (already has default)', () => {
      const schema = {
        projectId: z.number(),
        codeSourceId: z.string().default('existing-default'),
        name: z.string(),
      }

      const originalCodeSourceId = schema.codeSourceId
      injectCodeSourceId(schema)

      // ZodDefault is not instanceof ZodString, so it won't be modified
      expect(schema.codeSourceId).toBe(originalCodeSourceId)
      
      const zodObject = z.object({ codeSourceId: schema.codeSourceId })
      const result = zodObject.parse({})
      expect(result.codeSourceId).toBe('existing-default')
    })

    it('should not modify optional nullable codeSourceId (not base ZodString)', () => {
      // This matches the actual schema structure from QuantConnect types
      const schema = {
        projectId: z.number(),
        codeSourceId: z.string().optional().nullable(),
        name: z.string(),
      }

      const originalCodeSourceId = schema.codeSourceId
      injectCodeSourceId(schema)

      // ZodOptional wrapping ZodNullable wrapping ZodString is not instanceof ZodString
      expect(schema.codeSourceId).toBe(originalCodeSourceId)
      
      // Should remain optional/nullable without default
      const zodObject = z.object(schema)
      const result = zodObject.parse({ 
        projectId: 123,
        name: 'test.py' 
      })
      
      expect(result.codeSourceId).toBeUndefined()
    })

    it('should work with complex schema structures', () => {
      const schema = {
        projectId: z.number(),
        codeSourceId: z.string(),
        metadata: z.object({
          version: z.string(),
          tags: z.array(z.string()),
        }),
        optional: z.string().optional(),
      }

      injectCodeSourceId(schema)

      // Only codeSourceId should be modified
      const zodObject = z.object({ codeSourceId: schema.codeSourceId })
      const result = zodObject.parse({})
      expect(result.codeSourceId).toBe(MCP_SERVER_IDENTIFIER)
      
      // Other fields should remain unchanged
      expect(schema.metadata._def.typeName).toBe('ZodObject')
      expect(schema.optional._def.typeName).toBe('ZodOptional')
    })

    it('should handle multiple calls without side effects', () => {
      const schema = {
        projectId: z.number(),
        codeSourceId: z.string(),
        name: z.string(),
      }

      // Call multiple times
      injectCodeSourceId(schema)
      const zodObject1 = z.object({ codeSourceId: schema.codeSourceId })
      const result1 = zodObject1.parse({})
      
      injectCodeSourceId(schema)
      const zodObject2 = z.object({ codeSourceId: schema.codeSourceId })
      const result2 = zodObject2.parse({})

      // Should be consistent
      expect(result1.codeSourceId).toBe(result2.codeSourceId)
      expect(result1.codeSourceId).toBe(MCP_SERVER_IDENTIFIER)
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle empty schema object', () => {
      const schema = {}
      expect(() => {
        injectCodeSourceId(schema)
      }).not.toThrow()
    })

    it('should verify MCP_SERVER_IDENTIFIER constant exists', () => {
      expect(MCP_SERVER_IDENTIFIER).toBeDefined()
      expect(typeof MCP_SERVER_IDENTIFIER).toBe('string')
      expect(MCP_SERVER_IDENTIFIER.length).toBeGreaterThan(0)
    })

    it('should handle schemas with non-ZodTypeAny properties gracefully', () => {
      const schema = {
        someRandomProperty: 'not a zod type',
        anotherProperty: 42,
      } as any

      expect(() => {
        injectCodeSourceId(schema)
      }).not.toThrow()
    })

    it('should not modify schema with inherited properties (hasOwnProperty check)', () => {
      const baseSchema = {
        codeSourceId: z.string(),
        projectId: z.number(),
      }

      // Create schema that inherits from base
      const extendedSchema = Object.create(baseSchema)
      extendedSchema.name = z.string()
      extendedSchema.age = z.number()

      const originalCodeSourceId = extendedSchema.codeSourceId
      injectCodeSourceId(extendedSchema)

      // Should NOT modify because hasOwnProperty returns false for inherited properties
      expect(extendedSchema.codeSourceId).toBe(originalCodeSourceId)
      expect(extendedSchema.codeSourceId._def.typeName).toBe('ZodString')
    })

    it('should handle schema with circular references safely', () => {
      const schema: any = {
        codeSourceId: z.string(),
        name: z.string(),
      }
      
      // Create a circular reference
      schema.self = schema

      expect(() => {
        injectCodeSourceId(schema)
      }).not.toThrow()

      // Should still inject the default
      const zodObject = z.object({ codeSourceId: schema.codeSourceId })
      const result = zodObject.parse({})
      expect(result.codeSourceId).toBe(MCP_SERVER_IDENTIFIER)
    })
  })

  describe('real-world usage scenarios', () => {
    it('should not modify actual QuantConnect API schema shapes (they use optional/nullable)', () => {
      // Simulate a real schema shape from QuantConnect types
      const createFileBodyShape = {
        projectId: z.number(),
        name: z.string(),
        content: z.string().optional().nullable(),
        codeSourceId: z.string().optional().nullable(), // This is not a base ZodString
      }

      const originalCodeSourceId = createFileBodyShape.codeSourceId
      injectCodeSourceId(createFileBodyShape)

      // Should not modify because optional().nullable() is not instanceof ZodString
      expect(createFileBodyShape.codeSourceId).toBe(originalCodeSourceId)

      const zodObject = z.object(createFileBodyShape)
      const result = zodObject.parse({
        projectId: 123,
        name: 'main.py'
      })

      expect(result.codeSourceId).toBeUndefined() // No default was injected
      expect(result.projectId).toBe(123)
      expect(result.name).toBe('main.py')
    })

    it('should allow explicit codeSourceId to override default', () => {
      const schema = {
        projectId: z.number(),
        codeSourceId: z.string(),
        name: z.string(),
      }

      injectCodeSourceId(schema)

      const zodObject = z.object(schema)

      // Explicit codeSourceId should override default
      const result = zodObject.parse({
        projectId: 123,
        codeSourceId: 'custom-source-id',
        name: 'test.py',
      })

      expect(result.codeSourceId).toBe('custom-source-id')
    })

    it('should document middleware chain context behavior', () => {
      // Simulate how this function is used in the actual middleware
      const toolDefinition = {
        config: {
          inputSchema: {
            projectId: z.number(),
            codeSourceId: z.string().optional().nullable(), // Not a base ZodString
            name: z.string(),
          }
        },
        injectCodeSourceId: true
      }

      const originalSchema = toolDefinition.config.inputSchema.codeSourceId
      // This is how it's called in tools/index.ts
      injectCodeSourceId(toolDefinition.config.inputSchema)

      // Should not modify because it's optional().nullable(), not base ZodString
      expect(toolDefinition.config.inputSchema.codeSourceId).toBe(originalSchema)

      const zodObject = z.object(toolDefinition.config.inputSchema)
      const result = zodObject.parse({
        projectId: 456,
        name: 'algorithm.py'
      })

      expect(result.codeSourceId).toBeUndefined() // No default injected
    })
  })

  describe('type safety and validation', () => {
    it('should maintain type safety with generic constraints', () => {
      const schema = {
        codeSourceId: z.string(),
        projectId: z.number(),
      }

      // Should work with properly typed schema
      expect(() => {
        injectCodeSourceId(schema)
      }).not.toThrow()

      // Verify the result is properly typed
      expect(schema.codeSourceId).toBeDefined()
      expect(schema.codeSourceId._def.typeName).toBe('ZodDefault')
    })

    it('should handle ZodString variations correctly', () => {
      const variations = [
        z.string(),
        z.string().min(1),
        z.string().max(100),
        z.string().email(),
        z.string().optional(),
        z.string().nullable(),
        z.string().optional().nullable(),
      ]

      variations.forEach((zodString, index) => {
        const schema = {
          codeSourceId: zodString,
          testField: z.number(),
        }

        // Only the base ZodString should be modified
        if (zodString instanceof ZodString) {
          injectCodeSourceId(schema)
          expect(schema.codeSourceId._def.typeName).toBe('ZodDefault')
        } else {
          const originalCodeSourceId = schema.codeSourceId
          injectCodeSourceId(schema)
          // Should not modify non-base ZodString types
          expect(schema.codeSourceId).toBe(originalCodeSourceId)
        }
      })
    })

    it('should preserve schema immutability where appropriate', () => {
      const schema = {
        projectId: z.number(),
        name: z.string(),
        // No codeSourceId field
      }

      const originalKeys = Object.keys(schema)
      injectCodeSourceId(schema)
      const newKeys = Object.keys(schema)

      // Should not add new properties
      expect(newKeys).toEqual(originalKeys)
    })
  })
})

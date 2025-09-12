import { z, ZodObject, ZodOptional, ZodDefault, ZodUnion } from 'zod'
import { mergeObjectsToRawShape, mergeUnionToRawShape } from './zod-objects-merge'

describe('libs/quant-connect-mcp/src/utils/zod-objects-merge', () => {
  describe('mergeObjectsToRawShape', () => {
    it('should merge single object to raw shape', () => {
      const obj1 = z.object({
        name: z.string(),
        age: z.number(),
      })

      const result = mergeObjectsToRawShape([obj1])

      expect(Object.keys(result)).toEqual(['name', 'age'])
      expect(result.name).toBe(obj1.shape.name)
      expect(result.age).toBe(obj1.shape.age)
    })

    it('should merge multiple objects with different properties', () => {
      const obj1 = z.object({
        name: z.string(),
        age: z.number(),
      })

      const obj2 = z.object({
        email: z.string(),
        active: z.boolean(),
      })

      const result = mergeObjectsToRawShape([obj1, obj2])

      expect(Object.keys(result).sort()).toEqual(['active', 'age', 'email', 'name'])
      // All properties should be optional since they don't appear in both objects
      expect(result.name._def.typeName).toBe('ZodOptional')
      expect(result.age._def.typeName).toBe('ZodOptional')
      expect(result.email._def.typeName).toBe('ZodOptional')
      expect(result.active._def.typeName).toBe('ZodOptional')
    })

    it('should merge objects with overlapping properties', () => {
      const obj1 = z.object({
        id: z.string(),
        name: z.string(),
      })

      const obj2 = z.object({
        id: z.number(), // Different type for same property
        email: z.string(),
      })

      const result = mergeObjectsToRawShape([obj1, obj2])

      expect(Object.keys(result).sort()).toEqual(['email', 'id', 'name'])
      
      // id should be a union of string and number
      expect(result.id._def.typeName).toBe('ZodUnion')
      // name and email are only in one object each, so should be optional
      expect(result.name._def.typeName).toBe('ZodOptional')
      expect(result.email._def.typeName).toBe('ZodOptional')
    })

    it('should handle required vs optional properties correctly', () => {
      const obj1 = z.object({
        required: z.string(),
        optional: z.string().optional(),
      })

      const obj2 = z.object({
        required: z.string(), // Required in both
        optional: z.string(), // Required in obj2, optional in obj1
      })

      const result = mergeObjectsToRawShape([obj1, obj2])

      // required should be a union even though both are strings (algorithm always unions)
      expect(result.required._def.typeName).toBe('ZodUnion')
      
      // optional should become optional (not required in all objects)
      expect(result.optional._def.typeName).toBe('ZodOptional')
    })

    it('should handle properties with default values', () => {
      const obj1 = z.object({
        name: z.string(),
        count: z.number().default(0),
      })

      const obj2 = z.object({
        name: z.string(),
        active: z.boolean(),
      })

      const result = mergeObjectsToRawShape([obj1, obj2])

      // count should become optional since it's not in obj2
      expect(result.count._def.typeName).toBe('ZodOptional')
      
      // name should be a union even though both are strings (algorithm always unions)
      expect(result.name._def.typeName).toBe('ZodUnion')
    })

    it('should handle empty objects array', () => {
      const result = mergeObjectsToRawShape([])

      expect(result).toEqual({})
      expect(Object.keys(result)).toHaveLength(0)
    })

    it('should handle objects with no properties', () => {
      const emptyObj = z.object({})
      const result = mergeObjectsToRawShape([emptyObj])

      expect(result).toEqual({})
      expect(Object.keys(result)).toHaveLength(0)
    })

    it('should handle complex nested schemas', () => {
      const obj1 = z.object({
        user: z.object({
          name: z.string(),
          age: z.number(),
        }),
        tags: z.array(z.string()),
      })

      const obj2 = z.object({
        user: z.object({
          name: z.string(),
          email: z.string(),
        }),
        metadata: z.record(z.string()),
      })

      const result = mergeObjectsToRawShape([obj1, obj2])

      expect(Object.keys(result).sort()).toEqual(['metadata', 'tags', 'user'])
      
      // user should be a union of the two object types
      expect(result.user._def.typeName).toBe('ZodUnion')
      
      // tags and metadata should be optional (not present in both)
      expect(result.tags._def.typeName).toBe('ZodOptional')
      expect(result.metadata._def.typeName).toBe('ZodOptional')
    })

    it('should handle three or more objects', () => {
      const obj1 = z.object({ a: z.string() })
      const obj2 = z.object({ b: z.number() })
      const obj3 = z.object({ c: z.boolean() })

      const result = mergeObjectsToRawShape([obj1, obj2, obj3])

      expect(Object.keys(result).sort()).toEqual(['a', 'b', 'c'])
      
      // All should be optional since none appear in all objects
      expect(result.a._def.typeName).toBe('ZodOptional')
      expect(result.b._def.typeName).toBe('ZodOptional')
      expect(result.c._def.typeName).toBe('ZodOptional')
    })

    it('should handle identical schemas', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      })

      const result = mergeObjectsToRawShape([schema, schema, schema])

      expect(Object.keys(result)).toEqual(['name', 'age'])
      
      // Should be unions even for identical schemas (algorithm always unions multiple inputs)
      expect(result.name._def.typeName).toBe('ZodUnion')
      expect(result.age._def.typeName).toBe('ZodUnion')
    })
  })

  describe('mergeUnionToRawShape', () => {
    it('should merge union of objects to raw shape', () => {
      const obj1 = z.object({
        type: z.literal('user'),
        name: z.string(),
        age: z.number(),
      })

      const obj2 = z.object({
        type: z.literal('admin'),
        name: z.string(),
        permissions: z.array(z.string()),
      })

      const union = z.union([obj1, obj2])
      const result = mergeUnionToRawShape(union)

      expect(Object.keys(result).sort()).toEqual(['age', 'name', 'permissions', 'type'])
      
      // name should be a union even though both are strings
      expect(result.name._def.typeName).toBe('ZodUnion')
      
      // type should be a union of literals
      expect(result.type._def.typeName).toBe('ZodUnion')
      
      // age and permissions should be optional (not in both)
      expect(result.age._def.typeName).toBe('ZodOptional')
      expect(result.permissions._def.typeName).toBe('ZodOptional')
    })

    it('should handle union with single object', () => {
      const obj = z.object({
        name: z.string(),
        age: z.number(),
      })

      const union = z.union([obj, z.object({})])
      const result = mergeUnionToRawShape(union)

      expect(Object.keys(result).sort()).toEqual(['age', 'name'])
      // Should be optional since not present in empty object
      expect(result.name._def.typeName).toBe('ZodOptional')
      expect(result.age._def.typeName).toBe('ZodOptional')
    })

    it('should handle union with no object members', () => {
      const union = z.union([z.string(), z.number(), z.boolean()])
      const result = mergeUnionToRawShape(union)

      expect(result).toEqual({})
      expect(Object.keys(result)).toHaveLength(0)
    })

    it('should handle union with mixed types (objects and primitives)', () => {
      const obj1 = z.object({
        name: z.string(),
        value: z.number(),
      })

      const obj2 = z.object({
        name: z.string(),
        active: z.boolean(),
      })

      const union = z.union([obj1, z.string(), obj2, z.number()])
      const result = mergeUnionToRawShape(union)

      expect(Object.keys(result).sort()).toEqual(['active', 'name', 'value'])
      
      // name should be a union even though both are strings
      expect(result.name._def.typeName).toBe('ZodUnion')
      
      // value and active should be optional
      expect(result.value._def.typeName).toBe('ZodOptional')
      expect(result.active._def.typeName).toBe('ZodOptional')
    })

    it('should handle complex union with nested objects', () => {
      const createRequest = z.object({
        action: z.literal('create'),
        data: z.object({
          name: z.string(),
          content: z.string(),
        }),
      })

      const updateRequest = z.object({
        action: z.literal('update'),
        data: z.object({
          id: z.number(),
          content: z.string(),
        }),
      })

      const union = z.union([createRequest, updateRequest])
      const result = mergeUnionToRawShape(union)

      expect(Object.keys(result).sort()).toEqual(['action', 'data'])
      
      // action should be union of literals
      expect(result.action._def.typeName).toBe('ZodUnion')
      
      // data should be union of objects
      expect(result.data._def.typeName).toBe('ZodUnion')
    })

    it('should throw error for unsupported Zod version', () => {
      // Create a mock union that doesn't have the expected internal structure
      const mockUnion = {
        _def: {
          // Missing options property
        }
      } as any

      expect(() => {
        mergeUnionToRawShape(mockUnion)
      }).toThrow('Unsupported Zod version: cannot access union options safely.')
    })

    it('should throw error for union without _def property', () => {
      const mockUnion = {} as any

      expect(() => {
        mergeUnionToRawShape(mockUnion)
      }).toThrow('Unsupported Zod version: cannot access union options safely.')
    })

    it('should handle union with undefined options', () => {
      const mockUnion = {
        _def: {
          options: undefined
        }
      } as any

      expect(() => {
        mergeUnionToRawShape(mockUnion)
      }).toThrow('Unsupported Zod version: cannot access union options safely.')
    })
  })

  describe('helper functions (through integration)', () => {
    describe('unwrap function behavior', () => {
      it('should unwrap optional types correctly', () => {
        const obj1 = z.object({
          optional: z.string().optional(),
          required: z.string(),
        })

        const obj2 = z.object({
          optional: z.string(), // Required in obj2
          required: z.string(),
        })

        const result = mergeObjectsToRawShape([obj1, obj2])

        // optional should become optional since it's optional in obj1
        expect(result.optional._def.typeName).toBe('ZodOptional')
        
        // required should be a union (algorithm always unions)
        expect(result.required._def.typeName).toBe('ZodUnion')
      })

      it('should unwrap default types correctly', () => {
        const obj1 = z.object({
          withDefault: z.string().default('test'),
          normal: z.string(),
        })

        const obj2 = z.object({
          withDefault: z.string(),
          normal: z.string(),
        })

        const result = mergeObjectsToRawShape([obj1, obj2])

        // withDefault should become optional (has default in obj1)
        expect(result.withDefault._def.typeName).toBe('ZodOptional')
        
        // normal should be a union (algorithm always unions)
        expect(result.normal._def.typeName).toBe('ZodUnion')
      })

      it('should handle nested optional/default unwrapping', () => {
        const obj1 = z.object({
          nested: z.string().optional().default('test'),
        })

        const obj2 = z.object({
          nested: z.string(),
        })

        const result = mergeObjectsToRawShape([obj1, obj2])

        // Should unwrap all the way to the base string type for union
        expect(result.nested._def.typeName).toBe('ZodOptional')
      })
    })

    describe('isOptional function behavior', () => {
      it('should detect optional types through merging', () => {
        const obj1 = z.object({
          maybeOptional: z.string().optional(),
          definitelyRequired: z.string(),
        })

        const obj2 = z.object({
          maybeOptional: z.string().optional(),
          definitelyRequired: z.string(),
        })

        const result = mergeObjectsToRawShape([obj1, obj2])

        // Both optional in both objects = optional result
        expect(result.maybeOptional._def.typeName).toBe('ZodOptional')
        
        // Required in both = union result (algorithm always unions)
        expect(result.definitelyRequired._def.typeName).toBe('ZodUnion')
      })

      it('should detect default types as optional through merging', () => {
        const obj1 = z.object({
          withDefault: z.number().default(42),
        })

        const obj2 = z.object({
          withDefault: z.number().default(100),
        })

        const result = mergeObjectsToRawShape([obj1, obj2])

        // Both have defaults = treated as optional
        expect(result.withDefault._def.typeName).toBe('ZodOptional')
      })
    })
  })

  describe('integration scenarios', () => {
    it('should handle real-world QuantConnect schema merging', () => {
      // Simulate actual QuantConnect request/response schemas
      const createFileRequest = z.object({
        projectId: z.number(),
        name: z.string(),
        content: z.string().optional(),
        codeSourceId: z.string().optional().nullable(),
      })

      const updateFileRequest = z.object({
        projectId: z.number(),
        name: z.string(),
        newContent: z.string(),
        codeSourceId: z.string().optional().nullable(),
      })

      const result = mergeObjectsToRawShape([createFileRequest, updateFileRequest])

      expect(Object.keys(result).sort()).toEqual(['codeSourceId', 'content', 'name', 'newContent', 'projectId'])
      
      // Common required fields should be unions
      expect(result.projectId._def.typeName).toBe('ZodUnion')
      expect(result.name._def.typeName).toBe('ZodUnion')
      
      // Fields not in both should be optional
      expect(result.content._def.typeName).toBe('ZodOptional')
      expect(result.newContent._def.typeName).toBe('ZodOptional')
      
      // codeSourceId should be a union (algorithm always creates unions)
      expect(result.codeSourceId._def.typeName).toBe('ZodUnion')
    })

    it('should work with updateFileBody union from QuantConnect types', () => {
      // Simulate the actual updateFileBody union structure
      const updateNameRequest = z.object({
        projectId: z.number(),
        name: z.string(),
        newName: z.string(),
        codeSourceId: z.string().optional().nullable(),
      })

      const updateContentRequest = z.object({
        projectId: z.number(),
        name: z.string(),
        content: z.string(),
        codeSourceId: z.string().optional().nullable(),
      })

      const updateFileBodyUnion = z.union([updateNameRequest, updateContentRequest])
      const result = mergeUnionToRawShape(updateFileBodyUnion)

      expect(Object.keys(result).sort()).toEqual(['codeSourceId', 'content', 'name', 'newName', 'projectId'])
      
      // Common fields should be unions
      expect(result.projectId._def.typeName).toBe('ZodUnion')
      expect(result.name._def.typeName).toBe('ZodUnion')
      expect(result.codeSourceId._def.typeName).toBe('ZodUnion')
      
      // Unique fields should be optional
      expect(result.content._def.typeName).toBe('ZodOptional')
      expect(result.newName._def.typeName).toBe('ZodOptional')
    })

    it('should create valid schemas that can be used for validation', () => {
      const obj1 = z.object({
        id: z.string(),
        name: z.string(),
        optional: z.number().optional(),
      })

      const obj2 = z.object({
        id: z.string(),
        email: z.string(),
        optional: z.number(),
      })

      const result = mergeObjectsToRawShape([obj1, obj2])
      const mergedSchema = z.object(result)

      // Test validation with data matching obj1
      const data1 = { id: 'test', name: 'John', optional: 42 }
      expect(() => mergedSchema.parse(data1)).not.toThrow()

      // Test validation with data matching obj2
      const data2 = { id: 'test', email: 'john@example.com', optional: 42 }
      expect(() => mergedSchema.parse(data2)).not.toThrow()

      // Test validation with minimal data
      const minimalData = { id: 'test' }
      expect(() => mergedSchema.parse(minimalData)).not.toThrow()
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle objects with different property counts', () => {
      const smallObj = z.object({
        id: z.string(),
      })

      const largeObj = z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        age: z.number(),
        active: z.boolean(),
      })

      const result = mergeObjectsToRawShape([smallObj, largeObj])

      expect(Object.keys(result)).toHaveLength(5)
      
      // id should be a union (algorithm always unions)
      expect(result.id._def.typeName).toBe('ZodUnion')
      
      // Others should be optional (only in largeObj)
      expect(result.name._def.typeName).toBe('ZodOptional')
      expect(result.email._def.typeName).toBe('ZodOptional')
      expect(result.age._def.typeName).toBe('ZodOptional')
      expect(result.active._def.typeName).toBe('ZodOptional')
    })

    it('should handle objects with conflicting types correctly', () => {
      const obj1 = z.object({
        value: z.string(),
      })

      const obj2 = z.object({
        value: z.number(),
      })

      const obj3 = z.object({
        value: z.boolean(),
      })

      const result = mergeObjectsToRawShape([obj1, obj2, obj3])

      // Should create a three-way union
      expect(result.value._def.typeName).toBe('ZodUnion')
      
      // Test that the union works
      const schema = z.object(result)
      expect(() => schema.parse({ value: 'string' })).not.toThrow()
      expect(() => schema.parse({ value: 42 })).not.toThrow()
      expect(() => schema.parse({ value: true })).not.toThrow()
    })

    it('should handle malformed union objects gracefully', () => {
      // Test with union that has null options
      const mockUnion = {
        _def: {
          options: null
        }
      } as any

      expect(() => {
        mergeUnionToRawShape(mockUnion)
      }).toThrow('Unsupported Zod version: cannot access union options safely.')
    })

    it('should handle union with empty options array', () => {
      const mockUnion = {
        _def: {
          options: []
        }
      } as any

      const result = mergeUnionToRawShape(mockUnion)
      expect(result).toEqual({})
    })

    it('should filter non-object types from union options', () => {
      // Mock a union with mixed types
      const obj = z.object({ name: z.string() })
      const mockUnion = {
        _def: {
          options: [
            obj,
            z.string(),
            z.number(),
            z.object({ age: z.number() }),
            z.boolean()
          ]
        }
      } as any

      const result = mergeUnionToRawShape(mockUnion)

      // Should only process the object types
      expect(Object.keys(result).sort()).toEqual(['age', 'name'])
      expect(result.name._def.typeName).toBe('ZodOptional')
      expect(result.age._def.typeName).toBe('ZodOptional')
    })
  })

  describe('performance and memory', () => {
    it('should handle large numbers of objects efficiently', () => {
      const objects = Array.from({ length: 50 }, (_, i) => 
        z.object({
          [`field${i}`]: z.string(),
          common: z.number(),
        })
      )

      const start = Date.now()
      const result = mergeObjectsToRawShape(objects)
      const duration = Date.now() - start

      // Should complete reasonably quickly (< 100ms for 50 objects)
      expect(duration).toBeLessThan(100)
      
      // Should have all fields
      expect(Object.keys(result)).toHaveLength(51) // 50 unique fields + 1 common
      
      // Common field should be a union (algorithm always unions)
      expect(result.common._def.typeName).toBe('ZodUnion')
    })

    it('should handle objects with many properties', () => {
      const largeSchema: any = {}
      for (let i = 0; i < 100; i++) {
        largeSchema[`prop${i}`] = z.string()
      }

      const obj = z.object(largeSchema)
      const result = mergeObjectsToRawShape([obj])

      expect(Object.keys(result)).toHaveLength(100)
      
      // All should remain as original types
      Object.values(result).forEach(field => {
        expect(field._def.typeName).toBe('ZodString')
      })
    })
  })

  describe('type preservation and validation', () => {
    it('should preserve original type references when possible', () => {
      const stringType = z.string()
      const numberType = z.number()
      
      const obj = z.object({
        str: stringType,
        num: numberType,
      })

      const result = mergeObjectsToRawShape([obj])

      // Should preserve exact references for single object
      expect(result.str).toBe(stringType)
      expect(result.num).toBe(numberType)
    })

    it('should create proper unions for conflicting types', () => {
      const obj1 = z.object({
        flexible: z.string(),
      })

      const obj2 = z.object({
        flexible: z.number(),
      })

      const result = mergeObjectsToRawShape([obj1, obj2])
      const schema = z.object(result)

      // Should accept both string and number
      expect(() => schema.parse({ flexible: 'test' })).not.toThrow()
      expect(() => schema.parse({ flexible: 42 })).not.toThrow()
      
      // Should reject other types
      expect(() => schema.parse({ flexible: true })).toThrow()
    })

    it('should maintain schema validation behavior', () => {
      const strictObj = z.object({
        email: z.string().email(),
        age: z.number().min(0).max(150),
      })

      const result = mergeObjectsToRawShape([strictObj])
      const schema = z.object(result)

      // Should maintain validation rules
      expect(() => schema.parse({ email: 'valid@email.com', age: 25 })).not.toThrow()
      expect(() => schema.parse({ email: 'invalid-email', age: 25 })).toThrow()
      expect(() => schema.parse({ email: 'valid@email.com', age: -5 })).toThrow()
    })
  })
})

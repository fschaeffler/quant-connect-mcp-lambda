import { z, ZodDefault, ZodObject, ZodOptional, ZodRawShape, ZodTypeAny, ZodUnion } from 'zod'

/** unwrap Optional/Default so we can union the inner types */
const unwrap = (t: ZodTypeAny): ZodTypeAny => (t instanceof ZodOptional || t instanceof ZodDefault ? unwrap(t._def.innerType) : t)

const isOptional = (t: ZodTypeAny) => t instanceof ZodOptional || t instanceof ZodDefault

/** Merge multiple ZodObject shapes into one ZodRawShape */
export const mergeObjectsToRawShape = (objects: readonly ZodObject<any>[]): ZodRawShape => {
  const allKeys = new Set<string>()
  for (const o of objects) {
    for (const k of Object.keys(o.shape)) {
      allKeys.add(k)
    }
  }

  const result: ZodRawShape = {}

  for (const key of allKeys) {
    const presentTypes = objects.map((o) => o.shape[key]).filter((t): t is ZodTypeAny => !!t)

    // Build union of inner types
    const inner = presentTypes.map(unwrap)
    const unionInner = inner.length === 1 ? inner[0] : z.union(inner as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]])

    // Required only if every object has it and it's required in each
    const requiredInAll = presentTypes.length === objects.length && presentTypes.every((t) => !isOptional(t))

    result[key] = requiredInAll ? unionInner : unionInner.optional()
  }

  return result
}

/** Optional: accept a ZodUnion and extract object members (uses private union internals defensively) */
export const mergeUnionToRawShape = (union: ZodUnion<any>): ZodRawShape => {
  const options = (union as any)?._def?.options as ZodTypeAny[] | undefined
  if (!options) {
    throw new Error('Unsupported Zod version: cannot access union options safely.')
  }
  const objectMembers = options.filter((m): m is ZodObject<any> => m instanceof ZodObject)
  if (objectMembers.length === 0) {
    return {}
  }
  return mergeObjectsToRawShape(objectMembers)
}

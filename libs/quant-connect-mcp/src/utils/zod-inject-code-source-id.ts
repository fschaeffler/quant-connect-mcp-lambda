import { ZodRawShape, ZodString } from 'zod'
import { MCP_SERVER_IDENTIFIER } from '../configs'

export const injectCodeSourceId = <T extends ZodRawShape>(schema: T | undefined) => {
  if (typeof schema === 'undefined' || schema === null) {
    return
  }

  if (Object.prototype.hasOwnProperty.call(schema, 'codeSourceId') && (schema as any).codeSourceId instanceof ZodString) {
    ;(schema as any).codeSourceId = (schema as any).codeSourceId.default(MCP_SERVER_IDENTIFIER)
  }
}

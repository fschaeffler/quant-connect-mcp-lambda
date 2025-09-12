import { middyMCP, middyQCClient } from '@fschaeffler/mcp-middy'
import { QCMCPServer } from '@fschaeffler/quant-connect-mcp'
import middy from '@middy/core'
import httpErrorHandler from '@middy/http-error-handler'

export const handler = middy()
  .use(middyQCClient())
  .use(middyMCP({ server: QCMCPServer.getInstance() }))
  .use(httpErrorHandler())

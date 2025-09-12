import { SecretsManager } from '@aws-sdk/client-secrets-manager'
import { QCClient } from '@fschaeffler/quant-connect-client'
import type middy from '@middy/core'
import type { Context } from 'aws-lambda'
import type { RequestEvent, ResponseEvent } from './types'

export interface MiddyQCClientParams {
  userId?: string
  apiToken?: string
  requestThrottleInMS?: number
}

const getSecretFromSecretsManager = async (secretId: string): Promise<string> => {
  const client = new SecretsManager()
  const secretValue = await client.getSecretValue({ SecretId: secretId })

  if (!secretValue.SecretString) {
    throw new Error(`SecretString is undefined for ${secretId}`)
  }

  return secretValue.SecretString
}

export const middyQCClient = ({
  userId = process.env.QUANTCONNECT_USER_ID,
  apiToken = process.env.QUANTCONNECT_API_TOKEN,
  requestThrottleInMS = 5000,
}: MiddyQCClientParams = {}): middy.MiddlewareObj<RequestEvent, ResponseEvent, Error, Context> => ({
  before: async () => {
    if (QCClient.isInitialized()) {
      return
    }

    QCClient.getInstance({
      userId: userId ?? (await getSecretFromSecretsManager('quant-connect-mcp/user-id')),
      apiToken: apiToken ?? (await getSecretFromSecretsManager('quant-connect-mcp/api-token')),
      requestThrottleInMS,
    })
  },
})

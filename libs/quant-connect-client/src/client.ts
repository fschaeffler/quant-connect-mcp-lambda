import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'
import crypto from 'crypto'
import FormData from 'form-data'
import { fixDateStrings } from './date-time-parser'

export interface QCClientGetInstanceParams {
  userId: string
  apiToken: string
  requestThrottleInMS?: number
}

export class QCClient {
  private client: AxiosInstance
  private userId: string
  private apiToken: string
  private requestThrottleInMS?: number

  private static instance: QCClient

  private constructor({ userId, apiToken, requestThrottleInMS }: QCClientGetInstanceParams) {
    this.userId = userId
    this.apiToken = apiToken
    this.requestThrottleInMS = requestThrottleInMS

    this.client = axios.create({
      baseURL: 'https://www.quantconnect.com/api/v2',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    })

    if (this.requestThrottleInMS) {
      this.client.interceptors.request.use(async (value: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
        await new Promise((resolve) => setTimeout(() => resolve(undefined), this.requestThrottleInMS)) // delay to avoid getting dirty write errors
        return value
      })
    }

    this.client.interceptors.request.use((value: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
      const quantConnectHeaders = this.getAuthHeaders()

      for (const key in quantConnectHeaders) {
        value.headers[key] = quantConnectHeaders[key]
      }

      return value
    })
  }

  private getAuthHeaders(): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const timestampedToken = `${this.apiToken}:${timestamp}`
    const hashedToken = crypto.createHash('sha256').update(timestampedToken, 'utf8').digest('hex')

    const authString = `${this.userId}:${hashedToken}`
    const authBase64 = Buffer.from(authString, 'utf8').toString('base64')

    return {
      Authorization: `Basic ${authBase64}`,
      Timestamp: timestamp,
    }
  }

  public static isInitialized(): boolean {
    return !!this.instance
  }

  public static getInstance(params?: QCClientGetInstanceParams): QCClient {
    if (!this.instance) {
      if (!params) {
        throw new Error('userId and apiToken need be provided for initial instance retrieval')
      }

      this.instance = new QCClient(params)
    }

    return this.instance
  }

  public async post<TInput, TOutput>(url: string, params?: TInput, config?: AxiosRequestConfig<TInput>): Promise<TOutput> {
    const { data: rawData } = await this.client.post<TOutput>(url, params, config)
    const data = fixDateStrings(rawData)
    return data
  }

  public async postWithRawResponse<TInput, TOutput>(url: string, params?: TInput, config?: AxiosRequestConfig<TInput>) {
    return await this.client.post<TOutput>(url, params, config)
  }

  public async postFormData<TInput, TOutput>(url: string, data: TInput, formData: FormData, config?: AxiosRequestConfig<TInput>): Promise<TOutput> {
    return this.post<TInput, TOutput>(url, data, {
      ...config,
      headers: {
        ...config?.headers,
        ...formData.getHeaders(),
      },
    })
  }
}

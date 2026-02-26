/**
 * TradeSafe Escrow Service
 *
 * Handles integration with TradeSafe escrow API for secure marketplace payments.
 * Uses GraphQL API with OAuth 2.0 Client Credentials authentication.
 *
 * @see https://docs.tradesafe.co.za/
 */

import { createHmac, timingSafeEqual } from 'crypto'

// Environment-aware logging - only verbose in development
const isDev = process.env.NODE_ENV === 'development'
const log = {
  info: (message: string, data?: unknown) => {
    if (isDev) console.log(`[TradeSafe] ${message}`, data || '')
  },
  error: (message: string, data?: unknown) => {
    console.error(`[TradeSafe] ${message}`, data || '')
  },
  audit: (message: string, data?: unknown) => {
    // Audit logs always print for payment tracking
    console.log(`[PAYMENT_AUDIT] ${message}`, data ? JSON.stringify(data) : '')
  }
}

export interface TradeSafeConfig {
  clientId: string
  clientSecret: string
  environment: 'sandbox' | 'production'
}

export interface TradeSafeToken {
  id: string
  name: string
  bankAccount?: {
    accountNumber: string
    accountType: string
    bank: string
    bankName: string
  } | null
}

export interface TokenCreateInput {
  givenName: string
  familyName: string
  email: string
  mobile: string
  idNumber?: string
  // Banking details (can only be set once)
  bankAccount?: {
    accountNumber: string
    accountType: 'CHEQUE' | 'SAVINGS'
    bank: string
  }
}

export interface TransactionCreateInput {
  title: string
  description: string
  value: number // Amount in ZAR
  buyerToken: string
  sellerToken: string
  agentToken?: string // Platform token for fees
  agentFeePercent?: number // Platform fee percentage
  daysToDeliver?: number
  daysToInspect?: number
  reference?: string // External reference (e.g., gigId)
}

export interface Transaction {
  id: string
  title: string
  description: string
  state: TransactionState
  createdAt: string
  allocations: Allocation[]
  parties: Party[]
  reference?: string // External reference we set during creation (e.g., gigId)
}

export interface Allocation {
  id: string
  title: string
  value: number
  state: AllocationState
}

export interface Party {
  id: string
  name: string
  role: 'BUYER' | 'SELLER' | 'AGENT'
  token: string
}

export type TransactionState =
  | 'CREATED'
  | 'FUNDS_DEPOSITED'
  | 'FUNDS_RECEIVED'
  | 'INITIATED'
  | 'COMPLETED'
  | 'CANCELLED'

export type AllocationState =
  | 'CREATED'
  | 'FUNDS_DEPOSITED'
  | 'FUNDS_RECEIVED'
  | 'INITIATED'
  | 'IN_TRANSIT'
  | 'DELIVERY_COMPLETE'
  | 'ACCEPTED'
  | 'CANCELLED'

export interface CheckoutLinkOptions {
  transactionId: string
  embed?: boolean
}

export class TradeSafeService {
  private config: TradeSafeConfig
  private accessToken: string | null = null
  private tokenExpiresAt: number = 0

  // API endpoints
  private readonly AUTH_URL = 'https://auth.tradesafe.co.za/oauth/token'
  private readonly SANDBOX_API = 'https://api-developer.tradesafe.dev/graphql'
  private readonly PRODUCTION_API = 'https://api.tradesafe.co.za/graphql'

  constructor(config?: Partial<TradeSafeConfig>) {
    this.config = {
      clientId: config?.clientId || process.env.TRADESAFE_CLIENT_ID || '',
      clientSecret: config?.clientSecret || process.env.TRADESAFE_CLIENT_SECRET || '',
      environment: config?.environment || (process.env.TRADESAFE_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox'
    }

    // Debug logging for environment variable injection
    log.info('Config loaded', {
      clientId: this.config.clientId ? `${this.config.clientId.substring(0, 8)}...` : 'NOT SET',
      environment: this.config.environment
    })

    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error('TradeSafe client ID and secret are required')
    }
  }

  /**
   * Get the API endpoint based on environment
   */
  private get apiUrl(): string {
    return this.config.environment === 'production' ? this.PRODUCTION_API : this.SANDBOX_API
  }

  /**
   * Check if running in sandbox mode
   */
  isSandbox(): boolean {
    return this.config.environment === 'sandbox'
  }

  /**
   * Authenticate with TradeSafe OAuth 2.0
   * Uses Client Credentials grant type
   */
  private async authenticate(): Promise<string> {
    // Return cached token if still valid (with 5 min buffer)
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 300000) {
      return this.accessToken
    }

    log.info('Authenticating...')

    const response = await fetch(this.AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret
      })
    })

    if (!response.ok) {
      const error = await response.text()
      log.error('Auth error', { status: response.status, statusText: response.statusText })
      throw new Error(`TradeSafe authentication failed: ${response.statusText}`)
    }

    const data = await response.json()
    this.accessToken = data.access_token
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000)

    log.info('Authenticated successfully')
    return this.accessToken!
  }

  /**
   * Execute a GraphQL query/mutation
   */
  private async graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const token = await this.authenticate()

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, variables })
    })

    if (!response.ok) {
      const error = await response.text()
      log.error('GraphQL error', error)
      throw new Error(`TradeSafe API error: ${response.statusText}`)
    }

    const result = await response.json()

    if (result.errors) {
      const errorDetails = result.errors.map((e: { message?: string; extensions?: unknown; path?: string[] }) => ({
        message: e.message,
        extensions: e.extensions,
        path: e.path
      }))
      log.error('GraphQL errors', errorDetails)
      throw new Error(`TradeSafe GraphQL error: ${result.errors[0]?.message || 'Unknown error'}`)
    }

    return result.data
  }

  /**
   * Get the API owner's profile token
   * Used for platform/agent role
   */
  async getApiProfile(): Promise<string> {
    const query = `
      query apiProfile {
        apiProfile {
          token
        }
      }
    `

    const data = await this.graphql<{ apiProfile: { token: string } }>(query)
    return data.apiProfile.token
  }

  /**
   * Create a token for a user (buyer or seller)
   * Tokens represent parties in transactions
   */
  async createToken(input: TokenCreateInput): Promise<TradeSafeToken> {
    const mutation = `
      mutation tokenCreate($input: TokenInput!) {
        tokenCreate(input: $input) {
          id
          name
          bankAccount {
            accountNumber
            accountType
            bank
            bankName
          }
        }
      }
    `

    const variables = {
      input: {
        user: {
          givenName: input.givenName,
          familyName: input.familyName,
          email: input.email,
          mobile: input.mobile,
          idNumber: input.idNumber
        },
        ...(input.bankAccount && {
          bankAccount: {
            accountNumber: input.bankAccount.accountNumber,
            accountType: input.bankAccount.accountType,
            bank: input.bankAccount.bank
          }
        })
      }
    }

    log.info('createToken request', { email: input.email, hasBank: !!input.bankAccount })

    const data = await this.graphql<{ tokenCreate: TradeSafeToken }>(mutation, variables)

    log.info('createToken response', { id: data.tokenCreate.id, name: data.tokenCreate.name })

    return data.tokenCreate
  }

  /**
   * Get a token by ID
   */
  async getToken(tokenId: string): Promise<TradeSafeToken | null> {
    const query = `
      query token($id: ID!) {
        token(id: $id) {
          id
          name
          bankAccount {
            accountNumber
            accountType
            bank
            bankName
          }
        }
      }
    `

    try {
      const data = await this.graphql<{ token: TradeSafeToken }>(query, { id: tokenId })
      return data.token
    } catch {
      return null
    }
  }

  /**
   * Create an escrow transaction
   * This is the main function for creating a gig payment
   */
  async createTransaction(input: TransactionCreateInput): Promise<Transaction> {
    const mutation = `
      mutation transactionCreate($input: CreateTransactionInput!) {
        transactionCreate(input: $input) {
          id
          title
          description
          state
          createdAt
          allocations {
            id
            title
            value
            state
          }
          parties {
            id
            name
            role
          }
        }
      }
    `

    const parties: Array<{
      token: string
      role: string
      fee?: number
      feeType?: string
      feeAllocation?: string
    }> = [
      { token: input.buyerToken, role: 'BUYER' },
      { token: input.sellerToken, role: 'SELLER' }
    ]

    // Add platform as agent if fee is specified
    if (input.agentToken && input.agentFeePercent) {
      parties.push({
        token: input.agentToken,
        role: 'AGENT',
        fee: input.agentFeePercent,
        feeType: 'PERCENT',
        feeAllocation: 'SELLER' // Fee comes from seller's portion
      })
    }

    const variables = {
      input: {
        title: input.title,
        description: input.description,
        industry: 'GENERAL_GOODS_SERVICES',
        currency: 'ZAR',
        feeAllocation: input.agentToken ? 'AGENT' : 'SELLER',
        reference: input.reference,
        allocations: {
          create: [{
            title: input.title,
            description: input.description,
            value: input.value,
            daysToDeliver: input.daysToDeliver || 7,
            daysToInspect: input.daysToInspect || 7
          }]
        },
        parties: {
          create: parties
        }
      }
    }

    log.info('createTransaction request', {
      value: input.value,
      reference: input.reference,
      hasAgent: !!input.agentToken,
      agentFeePercent: input.agentFeePercent
    })

    const data = await this.graphql<{ transactionCreate: Transaction }>(mutation, variables)

    log.audit('Transaction created', {
      id: data.transactionCreate.id,
      state: data.transactionCreate.state,
      value: input.value
    })

    return data.transactionCreate
  }

  /**
   * Get a transaction by ID
   */
  async getTransaction(transactionId: string): Promise<Transaction | null> {
    const query = `
      query transaction($id: ID!) {
        transaction(id: $id) {
          id
          title
          description
          state
          createdAt
          allocations {
            id
            title
            value
            state
          }
          parties {
            id
            name
            role
          }
        }
      }
    `

    try {
      const data = await this.graphql<{ transaction: Transaction }>(query, { id: transactionId })
      return data.transaction
    } catch {
      return null
    }
  }

  /**
   * Generate a checkout link for the buyer to pay
   * Link is valid for 15 minutes
   */
  async getCheckoutLink(options: CheckoutLinkOptions): Promise<string> {
    const mutation = `
      mutation checkoutLink($transactionId: ID!, $embed: Boolean) {
        checkoutLink(transactionId: $transactionId, embed: $embed)
      }
    `

    const variables = {
      transactionId: options.transactionId,
      embed: options.embed || false
    }

    const data = await this.graphql<{ checkoutLink: string }>(mutation, variables)

    log.info('Checkout link generated', { transactionId: options.transactionId })

    return data.checkoutLink
  }

  /**
   * Start delivery process (called when worker marks gig complete)
   * Transitions allocation to INITIATED state
   */
  async startDelivery(allocationId: string): Promise<Allocation> {
    const mutation = `
      mutation allocationStartDelivery($id: ID!) {
        allocationStartDelivery(id: $id) {
          id
          title
          state
        }
      }
    `

    const data = await this.graphql<{ allocationStartDelivery: Allocation }>(mutation, { id: allocationId })

    log.audit('Delivery started', { allocationId, state: data.allocationStartDelivery.state })

    return data.allocationStartDelivery
  }

  /**
   * Complete delivery (triggers 24h auto-accept countdown)
   * Use this when worker confirms delivery is complete
   *
   * WARNING: completeDelivery and acceptDelivery are MUTUALLY EXCLUSIVE.
   * If you call completeDelivery, you CANNOT call acceptDelivery afterwards.
   * - completeDelivery: Sends email/SMS to buyer with 24h countdown
   * - acceptDelivery: Immediate payout, no email
   */
  async completeDelivery(allocationId: string): Promise<Allocation> {
    const mutation = `
      mutation allocationCompleteDelivery($id: ID!) {
        allocationCompleteDelivery(id: $id) {
          id
          title
          state
        }
      }
    `

    const data = await this.graphql<{ allocationCompleteDelivery: Allocation }>(mutation, { id: allocationId })

    log.audit('Delivery completed', { allocationId, state: data.allocationCompleteDelivery.state })

    return data.allocationCompleteDelivery
  }

  /**
   * Accept delivery (called when employer confirms work is done)
   * Triggers immediate payout to seller - no email sent to buyer.
   *
   * WARNING: CANNOT use if completeDelivery was already called.
   * For platform-initiated acceptance (buyer already approved in app),
   * use: startDelivery() → acceptDelivery() (skips email)
   */
  async acceptDelivery(allocationId: string): Promise<Allocation> {
    const mutation = `
      mutation allocationAcceptDelivery($id: ID!) {
        allocationAcceptDelivery(id: $id) {
          id
          title
          state
        }
      }
    `

    const data = await this.graphql<{ allocationAcceptDelivery: Allocation }>(mutation, { id: allocationId })

    log.audit('Delivery accepted', { allocationId, state: data.allocationAcceptDelivery.state })

    return data.allocationAcceptDelivery
  }

  /**
   * Cancel a transaction (refunds buyer if funds deposited)
   */
  async cancelTransaction(transactionId: string, reason: string): Promise<Transaction> {
    const mutation = `
      mutation transactionCancel($id: ID!, $comment: String!) {
        transactionCancel(id: $id, comment: $comment) {
          id
          state
        }
      }
    `

    const data = await this.graphql<{ transactionCancel: Transaction }>(mutation, {
      id: transactionId,
      comment: reason
    })

    log.audit('Transaction cancelled', { transactionId, state: data.transactionCancel.state })

    return data.transactionCancel
  }

  /**
   * Validate webhook signature using HMAC-SHA256
   * TradeSafe sends webhooks with x-tradesafe-signature header
   */
  validateWebhook(payload: string, signature: string): boolean {
    if (!signature) {
      log.error('Webhook validation failed: No signature provided')
      return false
    }

    try {
      // Compute HMAC-SHA256 of the payload using client secret
      const expectedSignature = createHmac('sha256', this.config.clientSecret)
        .update(payload)
        .digest('hex')

      // Use timing-safe comparison to prevent timing attacks
      const signatureBuffer = Buffer.from(signature, 'hex')
      const expectedBuffer = Buffer.from(expectedSignature, 'hex')

      if (signatureBuffer.length !== expectedBuffer.length) {
        log.error('Webhook validation failed: Signature length mismatch')
        return false
      }

      const isValid = timingSafeEqual(signatureBuffer, expectedBuffer)

      if (!isValid) {
        log.error('Webhook validation failed: Signature mismatch')
      }

      return isValid
    } catch (error) {
      log.error('Webhook validation error:', error)
      return false
    }
  }

  /**
   * Parse webhook payload
   */
  parseWebhook(payload: string): {
    event: string
    transactionId: string
    allocationId?: string
    state: string
  } | null {
    try {
      const data = JSON.parse(payload)
      return {
        event: data.event || data.type,
        transactionId: data.transaction?.id || data.transactionId,
        allocationId: data.allocation?.id || data.allocationId,
        state: data.transaction?.state || data.state
      }
    } catch {
      log.error('Failed to parse webhook payload')
      return null
    }
  }
}

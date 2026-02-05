/**
 * TradeSafe Escrow Service
 *
 * Handles integration with TradeSafe escrow API for secure marketplace payments.
 * Uses GraphQL API with OAuth 2.0 Client Credentials authentication.
 *
 * @see https://docs.tradesafe.co.za/
 */

export interface TradeSafeConfig {
  clientId: string
  clientSecret: string
  environment: 'sandbox' | 'production'
}

export interface TradeSafeToken {
  id: string
  name: string
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
  paymentMethods?: Array<'EFT' | 'INSTANT_EFT' | 'CARD' | 'SNAP' | 'PJN'>
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

    console.log('TradeSafe: Authenticating...')

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
      console.error('TradeSafe auth error:', error)
      throw new Error(`TradeSafe authentication failed: ${response.statusText}`)
    }

    const data = await response.json()
    this.accessToken = data.access_token
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000)

    console.log('TradeSafe: Authenticated successfully')
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
      console.error('TradeSafe GraphQL error:', error)
      throw new Error(`TradeSafe API error: ${response.statusText}`)
    }

    const result = await response.json()

    if (result.errors) {
      console.error('TradeSafe GraphQL errors:', result.errors)
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

    const data = await this.graphql<{ tokenCreate: TradeSafeToken }>(mutation, variables)
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
      mutation transactionCreate($input: TransactionInput!) {
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

    const data = await this.graphql<{ transactionCreate: Transaction }>(mutation, variables)

    console.log('TradeSafe transaction created:', {
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
      mutation checkoutLink($transactionId: ID!, $embed: Boolean, $paymentMethods: [PaymentMethod!]) {
        checkoutLink(transactionId: $transactionId, embed: $embed, paymentMethods: $paymentMethods)
      }
    `

    const variables = {
      transactionId: options.transactionId,
      embed: options.embed || false,
      paymentMethods: options.paymentMethods || ['EFT', 'INSTANT_EFT', 'CARD']
    }

    const data = await this.graphql<{ checkoutLink: string }>(mutation, variables)

    console.log('TradeSafe checkout link generated:', {
      transactionId: options.transactionId,
      embed: options.embed
    })

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

    console.log('TradeSafe delivery started:', {
      allocationId,
      state: data.allocationStartDelivery.state
    })

    return data.allocationStartDelivery
  }

  /**
   * Complete delivery (triggers 24h auto-accept countdown)
   * Use this when worker confirms delivery is complete
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

    console.log('TradeSafe delivery completed:', {
      allocationId,
      state: data.allocationCompleteDelivery.state
    })

    return data.allocationCompleteDelivery
  }

  /**
   * Accept delivery (called when employer confirms work is done)
   * Triggers immediate payout to seller
   * Note: Cannot use if completeDelivery was already called
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

    console.log('TradeSafe delivery accepted:', {
      allocationId,
      state: data.allocationAcceptDelivery.state
    })

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

    console.log('TradeSafe transaction cancelled:', {
      transactionId,
      state: data.transactionCancel.state,
      reason
    })

    return data.transactionCancel
  }

  /**
   * Validate webhook signature
   * TradeSafe sends webhooks for transaction state changes
   */
  validateWebhook(payload: string, signature: string): boolean {
    // TradeSafe webhook validation
    // TODO: Implement based on TradeSafe webhook documentation
    console.log('TradeSafe webhook validation:', { signature: signature?.substring(0, 20) })
    return true // Placeholder - implement actual validation
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
      console.error('Failed to parse TradeSafe webhook:', payload)
      return null
    }
  }
}

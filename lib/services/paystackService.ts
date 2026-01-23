import crypto from 'crypto'

/**
 * Paystack Payment Gateway Service
 *
 * Handles integration with Paystack payment gateway for South African payments.
 * Supports payment initialization, verification, and webhook validation.
 *
 * @see https://paystack.com/docs/api/
 */

export interface PaystackConfig {
  secretKey: string
  publicKey: string
}

export interface PaystackInitializeParams {
  email: string
  amount: number // In ZAR (e.g., 100.00) - will be converted to kobo
  reference: string // Unique transaction reference
  callbackUrl?: string // Where customer returns after payment
  metadata?: {
    gigId?: string
    employerId?: string
    workerId?: string
    itemName?: string
    custom_fields?: Array<{
      display_name: string
      variable_name: string
      value: string
    }>
    [key: string]: unknown
  }
  channels?: Array<'card' | 'bank' | 'ussd' | 'qr' | 'mobile_money' | 'bank_transfer' | 'eft'>
  currency?: string // Default: ZAR for South Africa
}

export interface PaystackInitializeResponse {
  status: boolean
  message: string
  data: {
    authorization_url: string
    access_code: string
    reference: string
  }
}

export interface PaystackVerifyResponse {
  status: boolean
  message: string
  data: {
    id: number
    domain: string
    status: 'success' | 'failed' | 'abandoned' | 'pending'
    reference: string
    amount: number // In kobo
    message: string | null
    gateway_response: string
    paid_at: string | null
    created_at: string
    channel: string
    currency: string
    ip_address: string
    metadata: Record<string, unknown>
    fees: number // In kobo
    customer: {
      id: number
      email: string
      customer_code: string
      first_name: string | null
      last_name: string | null
      phone: string | null
    }
    authorization: {
      authorization_code: string
      bin: string
      last4: string
      exp_month: string
      exp_year: string
      channel: string
      card_type: string
      bank: string
      country_code: string
      brand: string
      reusable: boolean
      signature: string
      account_name: string | null
    }
    plan: unknown | null
    split: unknown | null
    order_id: unknown | null
    paidAt: string
    createdAt: string
    requested_amount: number
    transaction_date: string
    plan_object: unknown | null
    subaccount: unknown | null
  }
}

export interface PaystackWebhookEvent {
  event: 'charge.success' | 'charge.failed' | 'transfer.success' | 'transfer.failed' | string
  data: {
    id: number
    domain: string
    status: 'success' | 'failed' | 'abandoned' | 'pending'
    reference: string
    amount: number // In kobo
    message: string | null
    gateway_response: string
    paid_at: string | null
    created_at: string
    channel: string
    currency: string
    ip_address: string
    metadata: {
      gigId?: string
      employerId?: string
      workerId?: string
      itemName?: string
      [key: string]: unknown
    }
    fees: number
    customer: {
      id: number
      email: string
      customer_code: string
      first_name: string | null
      last_name: string | null
      phone: string | null
    }
  }
}

export class PaystackService {
  private config: PaystackConfig
  private baseUrl = 'https://api.paystack.co'

  constructor(config?: PaystackConfig) {
    this.config = config || {
      secretKey: process.env.PAYSTACK_SECRET_KEY || '',
      publicKey: process.env.PAYSTACK_PUBLIC_KEY || ''
    }

    if (!this.config.secretKey) {
      throw new Error('Paystack secret key is required')
    }
  }

  /**
   * Convert ZAR amount to kobo (cents)
   * Paystack expects amounts in the smallest currency unit
   * 1 ZAR = 100 kobo
   */
  static toKobo(amountInZar: number): number {
    return Math.round(amountInZar * 100)
  }

  /**
   * Convert kobo to ZAR
   */
  static toZar(amountInKobo: number): number {
    return amountInKobo / 100
  }

  /**
   * Format amount for display (2 decimal places)
   */
  static formatAmount(amount: number): string {
    return amount.toFixed(2)
  }

  /**
   * Generate a unique payment reference
   */
  static generateReference(prefix: string = 'KSG'): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 8)
    return `${prefix}_${timestamp}_${random}`.toUpperCase()
  }

  /**
   * Initialize a transaction
   * Returns a checkout URL to redirect the customer to
   *
   * @see https://paystack.com/docs/api/transaction/#initialize
   */
  async initializeTransaction(params: PaystackInitializeParams): Promise<PaystackInitializeResponse> {
    const payload = {
      email: params.email,
      amount: PaystackService.toKobo(params.amount),
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
      channels: params.channels,
      currency: params.currency || 'ZAR'
    }

    console.log('Paystack initialize request:', {
      reference: params.reference,
      amountZar: params.amount,
      amountKobo: payload.amount,
      email: params.email
    })

    const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Paystack initialize error:', errorData)
      throw new Error(`Paystack initialization failed: ${errorData.message || response.statusText}`)
    }

    const data: PaystackInitializeResponse = await response.json()

    console.log('Paystack initialize response:', {
      status: data.status,
      reference: data.data?.reference,
      hasAuthUrl: !!data.data?.authorization_url
    })

    return data
  }

  /**
   * Verify a transaction by reference
   *
   * @see https://paystack.com/docs/api/transaction/#verify
   */
  async verifyTransaction(reference: string): Promise<PaystackVerifyResponse> {
    console.log('Paystack verify request:', { reference })

    const response = await fetch(`${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config.secretKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Paystack verify error:', errorData)
      throw new Error(`Paystack verification failed: ${errorData.message || response.statusText}`)
    }

    const data: PaystackVerifyResponse = await response.json()

    console.log('Paystack verify response:', {
      status: data.status,
      transactionStatus: data.data?.status,
      reference: data.data?.reference,
      amountKobo: data.data?.amount,
      amountZar: data.data?.amount ? PaystackService.toZar(data.data.amount) : null
    })

    return data
  }

  /**
   * Validate webhook signature
   * Paystack signs webhooks with HMAC SHA512 using your secret key
   *
   * @see https://paystack.com/docs/payments/webhooks/#verify-event-origin
   */
  validateWebhookSignature(payload: string, signature: string): boolean {
    const hash = crypto
      .createHmac('sha512', this.config.secretKey)
      .update(payload)
      .digest('hex')

    const isValid = hash === signature

    console.log('Paystack webhook signature validation:', {
      isValid,
      receivedSignature: signature?.substring(0, 20) + '...',
      calculatedSignature: hash.substring(0, 20) + '...'
    })

    return isValid
  }

  /**
   * Parse and validate webhook event
   */
  parseWebhookEvent(payload: string, signature: string): {
    isValid: boolean
    event?: PaystackWebhookEvent
    error?: string
  } {
    // Validate signature
    if (!this.validateWebhookSignature(payload, signature)) {
      return {
        isValid: false,
        error: 'Invalid webhook signature'
      }
    }

    try {
      const event: PaystackWebhookEvent = JSON.parse(payload)
      return {
        isValid: true,
        event
      }
    } catch {
      return {
        isValid: false,
        error: 'Failed to parse webhook payload'
      }
    }
  }

  /**
   * Check if a transaction was successful
   */
  static isPaymentSuccessful(status: string): boolean {
    return status === 'success'
  }

  /**
   * Check if the service is in test mode
   */
  isTestMode(): boolean {
    return this.config.secretKey.startsWith('sk_test_')
  }

  /**
   * Get public key (for frontend use)
   */
  getPublicKey(): string {
    return this.config.publicKey
  }
}

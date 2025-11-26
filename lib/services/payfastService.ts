import crypto from 'crypto'
import { PayFastConfig } from '@/types/payment'

/**
 * PayFast Payment Gateway Service
 *
 * Handles integration with PayFast payment gateway for South African payments.
 * Supports payment creation, signature generation, and ITN validation.
 *
 * @see https://developers.payfast.co.za/
 */

interface PayFastPaymentData {
  // Merchant details
  merchant_id: string
  merchant_key: string

  // Transaction details
  amount: number // In ZAR (e.g., 100.00)
  item_name: string
  item_description?: string

  // Customer details
  name_first?: string
  name_last?: string
  email_address?: string
  cell_number?: string

  // Transaction options
  m_payment_id: string // Unique payment ID for this transaction

  // URLs
  return_url?: string // Where customer returns after payment
  cancel_url?: string // Where customer is sent if they cancel
  notify_url: string // ITN (Instant Transaction Notification) webhook URL

  // Custom fields (optional - passed back with ITN)
  custom_str1?: string
  custom_str2?: string
  custom_str3?: string
  custom_int1?: number
  custom_int2?: number
}

interface PayFastITNData {
  // PayFast adds these
  m_payment_id: string
  pf_payment_id: string
  payment_status: 'COMPLETE' | 'FAILED' | 'PENDING' | 'CANCELLED'
  item_name: string
  item_description?: string
  amount_gross: string
  amount_fee: string
  amount_net: string

  // Custom fields if provided
  custom_str1?: string
  custom_str2?: string
  custom_str3?: string
  custom_int1?: string
  custom_int2?: string

  // Customer details
  name_first?: string
  name_last?: string
  email_address?: string

  // Merchant details
  merchant_id: string

  // Signature for verification
  signature: string
}

export class PayFastService {
  private config: PayFastConfig
  private baseUrl: string

  constructor(config?: PayFastConfig) {
    // Use provided config or load from environment
    this.config = config || {
      merchantId: process.env.PAYFAST_MERCHANT_ID || '',
      merchantKey: process.env.PAYFAST_MERCHANT_KEY || '',
      passphrase: process.env.PAYFAST_PASSPHRASE || '',
      sandbox: process.env.PAYFAST_MODE !== 'live'
    }

    // Validate configuration
    if (!this.config.merchantId || !this.config.merchantKey) {
      throw new Error('PayFast merchant credentials are required')
    }

    // Set base URL based on mode
    this.baseUrl = this.config.sandbox
      ? 'https://sandbox.payfast.co.za'
      : 'https://www.payfast.co.za'
  }

  /**
   * Generate MD5 signature for PayFast payment data
   *
   * CRITICAL: The signature generation follows PayFast's exact specification:
   * 1. Build parameter string in specific order (payment) or alphabetical (ITN)
   * 2. Use plain text values (NOT URL-encoded)
   * 3. Append passphrase if configured
   * 4. Generate MD5 hash
   */
  private generateSignature(data: Record<string, string | number | undefined>, includePassphrase: boolean = true, useAlphabetical: boolean = false): string {
    // Remove signature if present and filter out undefined values
    const filteredData: Record<string, string | number> = {}
    Object.entries(data).forEach(([key, value]) => {
      // Filter out signature, undefined, empty strings, and the string 'undefined'
      if (key !== 'signature' &&
          value !== undefined &&
          value !== '' &&
          value !== 'undefined') {
        filteredData[key] = value
      }
    })

    // PayFast expects fields in a specific order as per their documentation
    // Based on https://developers.payfast.co.za/docs#step_1_form_fields
    const fieldOrder = [
      'merchant_id',
      'merchant_key',
      'return_url',
      'cancel_url',
      'notify_url',
      'name_first',
      'name_last',
      'email_address',
      'cell_number',
      'm_payment_id',
      'amount',
      'item_name',
      'item_description',
      'custom_int1',
      'custom_int2',
      'custom_int3',
      'custom_int4',
      'custom_int5',
      'custom_str1',
      'custom_str2',
      'custom_str3',
      'custom_str4',
      'custom_str5',
      'email_confirmation',
      'confirmation_address',
      'payment_method',
      'subscription_type',
      'billing_date',
      'recurring_amount',
      'frequency',
      'cycles'
    ]

    // Sort keys according to PayFast's field order, or alphabetically for ITN
    const sortedKeys = useAlphabetical
      ? Object.keys(filteredData).sort((a, b) => a.localeCompare(b))
      : Object.keys(filteredData).sort((a, b) => {
          const aIndex = fieldOrder.indexOf(a)
          const bIndex = fieldOrder.indexOf(b)

          // If both are in the field order list, sort by their position
          if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex
          }
          // If only a is in the list, it comes first
          if (aIndex !== -1) return -1
          // If only b is in the list, it comes first
          if (bIndex !== -1) return 1
          // If neither is in the list, sort alphabetically
          return a.localeCompare(b)
        })

    // Build parameter string
    // NOTE: PayFast expects plain text values (NOT URL encoded) in the signature string
    // The form will URL encode when POSTing, but signature must be from plain text
    const paramString = sortedKeys
      .map(key => {
        const value = filteredData[key]
        return `${key}=${value.toString().trim()}`
      })
      .join('&')

    // Append passphrase if configured and should be included
    // IMPORTANT: Empty passphrase should not be appended (learned from 2025 production issue)
    // NOTE: Passphrase is also plain text, not URL encoded
    let signatureString = paramString
    if (includePassphrase && this.config.passphrase && this.config.passphrase.trim() !== '') {
      signatureString += `&passphrase=${this.config.passphrase.trim()}`
    }

    // Generate MD5 hash (lowercase as per PayFast spec)
    const signature = crypto.createHash('md5').update(signatureString).digest('hex').toLowerCase()

    // Log signature generation for debugging (can be removed after successful production test)
    console.log('PayFast signature generated:', {
      mode: this.config.sandbox ? 'sandbox' : 'live',
      signatureHash: signature,
      fieldCount: sortedKeys.length
    })

    return signature
  }

  /**
   * Create PayFast payment data with signature
   */
  createPayment(paymentData: Omit<PayFastPaymentData, 'merchant_id' | 'merchant_key'>): PayFastPaymentData & { signature: string } {
    // Build data object, filtering out undefined/null values
    const rawData: PayFastPaymentData = {
      merchant_id: this.config.merchantId,
      merchant_key: this.config.merchantKey,
      ...paymentData,
      // Format amount to 2 decimal places
      amount: Number(paymentData.amount.toFixed(2))
    }

    // Filter out undefined, null, and empty string values
    const data = Object.entries(rawData).reduce<Partial<PayFastPaymentData>>((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (acc as any)[key] = value
      }
      return acc
    }, {}) as PayFastPaymentData

    // Generate signature
    const signature = this.generateSignature(data as unknown as Record<string, string | number | undefined>)

    return {
      ...data,
      signature
    }
  }

  /**
   * Escape HTML entities for form values
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }
    return text.toString().replace(/[&<>"']/g, (m) => map[m])
  }

  /**
   * Generate payment form HTML for redirect
   */
  generatePaymentForm(paymentData: PayFastPaymentData & { signature: string }, autoSubmit: boolean = true): string {
    const endpoint = `${this.baseUrl}/eng/process`

    const fields = Object.entries(paymentData)
      .map(([key, value]) => {
        if (value !== undefined && value !== '') {
          return `    <input type="hidden" name="${this.escapeHtml(key)}" value="${this.escapeHtml(value.toString())}" />`
        }
        return ''
      })
      .filter(Boolean)
      .join('\n')

    const autoSubmitScript = autoSubmit
      ? `<script>document.getElementById('payfast-form').submit();</script>`
      : ''

    return `
<!DOCTYPE html>
<html>
<head>
  <title>Redirecting to PayFast...</title>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
    .loader { border: 5px solid #f3f3f3; border-top: 5px solid #3498db;
              border-radius: 50%; width: 50px; height: 50px;
              animation: spin 1s linear infinite; margin: 20px auto; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <h2>Redirecting to PayFast...</h2>
  <div class="loader"></div>
  <p>Please wait while we redirect you to the payment page.</p>
  <form id="payfast-form" method="POST" action="${endpoint}">
${fields}
    <noscript>
      <button type="submit">Continue to Payment</button>
    </noscript>
  </form>
  ${autoSubmitScript}
</body>
</html>
`
  }

  /**
   * Validate ITN (Instant Transaction Notification) from PayFast
   *
   * CRITICAL SECURITY: This validates that the ITN is genuine and from PayFast
   *
   * Validation steps:
   * 1. Verify signature matches
   * 2. Verify source IP is from PayFast (optional but recommended)
   * 3. Perform server confirmation with PayFast (optional)
   */
  async validateITN(itnData: PayFastITNData, sourceIp?: string): Promise<{
    isValid: boolean
    error?: string
    data?: PayFastITNData
  }> {
    try {
      // 1. Verify signature
      // NOTE: ITN uses alphabetical sorting (different from payment creation)
      const receivedSignature = itnData.signature
      const calculatedSignature = this.generateSignature(itnData as unknown as Record<string, string | number>, true, true)

      if (receivedSignature !== calculatedSignature) {
        return {
          isValid: false,
          error: 'Invalid signature - ITN may be fraudulent'
        }
      }

      // 2. Verify PayFast source IP (optional but recommended for production)
      if (sourceIp && !this.config.sandbox) {
        const validIPs = [
          '197.97.145.144', // PayFast production IP range
          '41.74.179.194',
          '41.74.179.195',
          '41.74.179.196',
          '41.74.179.197',
          '41.74.179.198',
          '41.74.179.199'
        ]

        if (!validIPs.includes(sourceIp)) {
          return {
            isValid: false,
            error: `Invalid source IP: ${sourceIp}. ITN must come from PayFast servers.`
          }
        }
      }

      // 3. Server confirmation (optional - validates with PayFast servers)
      // For production, consider adding this extra validation step
      // const isValidFromServer = await this.confirmPaymentWithPayFast(itnData)

      return {
        isValid: true,
        data: itnData
      }
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'ITN validation failed'
      }
    }
  }

  /**
   * Optional: Confirm payment with PayFast servers
   * Makes a server-to-server request to validate the transaction
   */
  private async confirmPaymentWithPayFast(itnData: PayFastITNData): Promise<boolean> {
    try {
      const validationUrl = `${this.baseUrl}/eng/query/validate`

      // Build query string
      const params = new URLSearchParams()
      Object.entries(itnData).forEach(([key, value]) => {
        if (key !== 'signature' && value !== undefined) {
          params.append(key, value.toString())
        }
      })

      const response = await fetch(validationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      })

      const result = await response.text()
      return result.trim() === 'VALID'
    } catch (error) {
      console.error('PayFast server confirmation failed:', error)
      return false
    }
  }

  /**
   * Parse amount from PayFast ITN
   * PayFast sends amounts as strings, need to convert to numbers
   */
  static parseAmount(amountString: string): number {
    return parseFloat(amountString)
  }

  /**
   * Format amount for PayFast (2 decimal places)
   */
  static formatAmount(amount: number): string {
    return amount.toFixed(2)
  }

  /**
   * Get payment URL for the environment
   */
  getPaymentUrl(): string {
    return `${this.baseUrl}/eng/process`
  }

  /**
   * Check if payment is successful
   */
  static isPaymentComplete(paymentStatus: string): boolean {
    return paymentStatus === 'COMPLETE'
  }

  /**
   * Get sandbox credentials for testing
   * @see https://developers.payfast.co.za/documentation/#checkout-page
   */
  static getSandboxCredentials(): Pick<PayFastConfig, 'merchantId' | 'merchantKey'> {
    return {
      merchantId: '10000100',
      merchantKey: '46f0cd694581a'
    }
  }
}

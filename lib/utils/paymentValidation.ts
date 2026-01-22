/**
 * Payment Input Validation and Sanitization Utilities
 * Prevents XSS, validates input constraints, normalizes payment data
 */

/**
 * Sanitize text input for payment fields (bank names, account holder names, etc.)
 * Removes HTML tags, dangerous characters, and limits length
 */
export function sanitizePaymentText(input: string, maxLength: number = 100): string {
  if (!input) return ''

  return input
    .trim()
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers (onclick, onerror, etc.)
    .replace(/[<>'"]/g, '') // Remove potentially dangerous characters
    .slice(0, maxLength)
}

/**
 * Validate and sanitize bank account holder name
 */
export function validateAccountHolder(name: string): {
  isValid: boolean
  sanitized: string
  message?: string
} {
  const trimmed = name.trim()

  if (!trimmed) {
    return {
      isValid: false,
      sanitized: '',
      message: 'Account holder name is required'
    }
  }

  if (trimmed.length < 2) {
    return {
      isValid: false,
      sanitized: sanitizePaymentText(trimmed, 100),
      message: 'Account holder name must be at least 2 characters'
    }
  }

  if (trimmed.length > 100) {
    return {
      isValid: false,
      sanitized: sanitizePaymentText(trimmed, 100),
      message: 'Account holder name cannot exceed 100 characters'
    }
  }

  // Only allow letters, spaces, hyphens, and apostrophes
  if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
    return {
      isValid: false,
      sanitized: sanitizePaymentText(trimmed, 100),
      message: 'Account holder name can only contain letters, spaces, hyphens, and apostrophes'
    }
  }

  return {
    isValid: true,
    sanitized: sanitizePaymentText(trimmed, 100)
  }
}

/**
 * Validate and sanitize bank name
 */
export function validateBankName(bankName: string): {
  isValid: boolean
  sanitized: string
  message?: string
} {
  const trimmed = bankName.trim()

  if (!trimmed) {
    return {
      isValid: false,
      sanitized: '',
      message: 'Bank name is required'
    }
  }

  if (trimmed.length > 100) {
    return {
      isValid: false,
      sanitized: sanitizePaymentText(trimmed, 100),
      message: 'Bank name cannot exceed 100 characters'
    }
  }

  return {
    isValid: true,
    sanitized: sanitizePaymentText(trimmed, 100)
  }
}

/**
 * Validate account number
 */
export function validateAccountNumber(accountNumber: string): {
  isValid: boolean
  message?: string
} {
  if (!accountNumber) {
    return {
      isValid: false,
      message: 'Account number is required'
    }
  }

  // Remove any spaces or hyphens
  const cleaned = accountNumber.replace(/[\s-]/g, '')

  if (!/^\d{9,11}$/.test(cleaned)) {
    return {
      isValid: false,
      message: 'Account number must be 9-11 digits'
    }
  }

  return { isValid: true }
}

/**
 * Validate branch code
 */
export function validateBranchCode(branchCode: string): {
  isValid: boolean
  message?: string
} {
  if (!branchCode) {
    return {
      isValid: false,
      message: 'Branch code is required'
    }
  }

  const cleaned = branchCode.replace(/[\s-]/g, '')

  if (!/^\d{6}$/.test(cleaned)) {
    return {
      isValid: false,
      message: 'Branch code must be 6 digits'
    }
  }

  return { isValid: true }
}

/**
 * Withdrawal amount constraints
 */
export const WITHDRAWAL_LIMITS = {
  MIN: 50,
  MAX_DAILY: 50000, // R50,000 per day
  MAX_SINGLE: 20000 // R20,000 per transaction
} as const

/**
 * Validate withdrawal amount
 */
export function validateWithdrawalAmount(
  amount: number,
  availableBalance: number,
  dailyWithdrawn: number = 0
): {
  isValid: boolean
  message?: string
} {
  if (!amount || isNaN(amount)) {
    return {
      isValid: false,
      message: 'Please enter a valid amount'
    }
  }

  if (amount < WITHDRAWAL_LIMITS.MIN) {
    return {
      isValid: false,
      message: `Minimum withdrawal amount is R${WITHDRAWAL_LIMITS.MIN}`
    }
  }

  if (amount > WITHDRAWAL_LIMITS.MAX_SINGLE) {
    return {
      isValid: false,
      message: `Maximum withdrawal per transaction is R${WITHDRAWAL_LIMITS.MAX_SINGLE.toLocaleString()}`
    }
  }

  if (dailyWithdrawn + amount > WITHDRAWAL_LIMITS.MAX_DAILY) {
    const remaining = WITHDRAWAL_LIMITS.MAX_DAILY - dailyWithdrawn
    return {
      isValid: false,
      message: `Daily withdrawal limit exceeded. You can withdraw up to R${remaining.toLocaleString()} more today`
    }
  }

  if (amount > availableBalance) {
    return {
      isValid: false,
      message: 'Amount exceeds available balance'
    }
  }

  return { isValid: true }
}

import { FeeConfigService, DEFAULT_FEE_CONFIG } from '@/lib/services/feeConfigService'

/**
 * Payment limits interface for type safety
 */
export interface PaymentLimits {
  MIN: number
  MAX_SINGLE: number
  LARGE_AMOUNT_THRESHOLD: number
}

/**
 * Default payment amount constraints (fallback values)
 * These are used when config cannot be loaded
 */
export const PAYMENT_LIMITS: PaymentLimits = {
  MIN: DEFAULT_FEE_CONFIG.minimumGigAmount,
  MAX_SINGLE: DEFAULT_FEE_CONFIG.maximumPaymentAmount,
  LARGE_AMOUNT_THRESHOLD: DEFAULT_FEE_CONFIG.largePaymentThreshold
}

/**
 * Get payment limits from Firebase feeConfigs collection
 * Returns configured limits or defaults if config unavailable
 */
export async function getPaymentLimits(): Promise<PaymentLimits> {
  try {
    const config = await FeeConfigService.getActiveFeeConfig()
    return {
      MIN: config.minimumGigAmount ?? PAYMENT_LIMITS.MIN,
      MAX_SINGLE: config.maximumPaymentAmount ?? PAYMENT_LIMITS.MAX_SINGLE,
      LARGE_AMOUNT_THRESHOLD: config.largePaymentThreshold ?? PAYMENT_LIMITS.LARGE_AMOUNT_THRESHOLD
    }
  } catch {
    // Return defaults if config service fails
    return PAYMENT_LIMITS
  }
}

/**
 * Validate payment amount
 * @param amount - The payment amount to validate
 * @param limits - Optional pre-fetched limits (use getPaymentLimits() to fetch)
 */
export function validatePaymentAmount(
  amount: number,
  limits: PaymentLimits = PAYMENT_LIMITS
): {
  isValid: boolean
  requiresConfirmation: boolean
  message?: string
} {
  if (!amount || isNaN(amount)) {
    return {
      isValid: false,
      requiresConfirmation: false,
      message: 'Please enter a valid amount'
    }
  }

  if (amount < limits.MIN) {
    return {
      isValid: false,
      requiresConfirmation: false,
      message: `Minimum payment amount is R${limits.MIN}`
    }
  }

  if (amount > limits.MAX_SINGLE) {
    return {
      isValid: false,
      requiresConfirmation: false,
      message: `Maximum payment per transaction is R${limits.MAX_SINGLE.toLocaleString()}`
    }
  }

  const requiresConfirmation = amount >= limits.LARGE_AMOUNT_THRESHOLD

  return {
    isValid: true,
    requiresConfirmation
  }
}

/**
 * Async version of validatePaymentAmount that fetches limits from config
 */
export async function validatePaymentAmountAsync(amount: number): Promise<{
  isValid: boolean
  requiresConfirmation: boolean
  message?: string
  limits: PaymentLimits
}> {
  const limits = await getPaymentLimits()
  const result = validatePaymentAmount(amount, limits)
  return { ...result, limits }
}

/**
 * Mask card number for display (show only last 4 digits)
 */
export function maskCardNumber(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\s/g, '')
  if (cleaned.length < 4) return '****'
  return '•••• •••• •••• ' + cleaned.slice(-4)
}

/**
 * Validate card number format (basic Luhn algorithm check)
 */
export function validateCardNumber(cardNumber: string): {
  isValid: boolean
  message?: string
} {
  const cleaned = cardNumber.replace(/\s/g, '')

  if (!/^\d{13,19}$/.test(cleaned)) {
    return {
      isValid: false,
      message: 'Card number must be 13-19 digits'
    }
  }

  // Luhn algorithm
  let sum = 0
  let isEven = false

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned.charAt(i), 10)

    if (isEven) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }

    sum += digit
    isEven = !isEven
  }

  if (sum % 10 !== 0) {
    return {
      isValid: false,
      message: 'Invalid card number'
    }
  }

  return { isValid: true }
}

/**
 * Check if payment method (card) is expiring soon
 */
export function isCardExpiringSoon(expiryMonth: number, expiryYear: number): boolean {
  const now = new Date()

  // Convert 2-digit year to full year for comparison
  const fullYear = expiryYear < 100 ? 2000 + expiryYear : expiryYear
  const expiryDate = new Date(fullYear, expiryMonth - 1)
  const thresholdDate = new Date(now.getFullYear(), now.getMonth() + 2) // 2 months from now

  return expiryDate <= thresholdDate
}

/**
 * Check if card is expired
 */
export function isCardExpired(expiryMonth: number, expiryYear: number): boolean {
  const now = new Date()
  const fullYear = expiryYear < 100 ? 2000 + expiryYear : expiryYear
  const expiryDate = new Date(fullYear, expiryMonth)

  return expiryDate < now
}

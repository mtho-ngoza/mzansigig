/**
 * Dispute Validation and Sanitization Utilities
 * Prevents XSS, validates input constraints, normalizes data
 */

/**
 * Sanitize dispute reason to prevent XSS attacks
 * Removes HTML tags, dangerous characters, and limits length
 */
export function sanitizeDisputeReason(input: string, maxLength: number): string {
  if (!input) return ''

  return input
    .trim()
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers (onclick, onerror, etc.)
    .slice(0, maxLength)
}

/**
 * Dispute reason text field length constraints
 */
export const DISPUTE_TEXT_LIMITS = {
  REASON_MAX: 1000,
  REASON_MIN: 10
} as const

/**
 * Validate dispute reason meets requirements
 */
export function validateDisputeReason(reason: string): {
  isValid: boolean
  message?: string
} {
  const trimmed = reason.trim()

  if (!trimmed) {
    return {
      isValid: false,
      message: 'Dispute reason is required'
    }
  }

  if (trimmed.length < DISPUTE_TEXT_LIMITS.REASON_MIN) {
    return {
      isValid: false,
      message: `Dispute reason must be at least ${DISPUTE_TEXT_LIMITS.REASON_MIN} characters`
    }
  }

  if (trimmed.length > DISPUTE_TEXT_LIMITS.REASON_MAX) {
    return {
      isValid: false,
      message: `Dispute reason cannot exceed ${DISPUTE_TEXT_LIMITS.REASON_MAX} characters`
    }
  }

  return { isValid: true }
}

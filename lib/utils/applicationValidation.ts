/**
 * Application Validation and Sanitization Utilities
 * Prevents XSS, validates input constraints, normalizes data
 */

/**
 * Sanitize application message to prevent XSS attacks
 * Removes HTML tags, dangerous characters, and limits length
 */
export function sanitizeApplicationMessage(input: string, maxLength: number): string {
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
 * Validate proposed rate is within reasonable limits
 */
export function validateProposedRate(rate: number, gigBudget: number): {
  isValid: boolean
  warning?: string
  message?: string
} {
  const MIN_RATE = 100
  const MAX_RATE = 1000000

  if (rate < MIN_RATE) {
    return {
      isValid: false,
      message: `Proposed rate must be at least R${MIN_RATE}`
    }
  }

  if (rate > MAX_RATE) {
    return {
      isValid: false,
      message: `Proposed rate cannot exceed R${MAX_RATE.toLocaleString()}`
    }
  }

  // Warn if rate is significantly different from gig budget
  if (rate > gigBudget * 1.5) {
    return {
      isValid: true,
      warning: `Your proposed rate is ${Math.round((rate / gigBudget - 1) * 100)}% higher than the client's budget. This may reduce your chances.`
    }
  }

  if (rate < gigBudget * 0.5 && rate > MIN_RATE) {
    return {
      isValid: true,
      warning: `Your proposed rate is ${Math.round((1 - rate / gigBudget) * 100)}% lower than the client's budget. Consider your worth.`
    }
  }

  return { isValid: true }
}

/**
 * Application text field length constraints
 */
export const APPLICATION_TEXT_LIMITS = {
  MESSAGE_MAX: 1000,
  MESSAGE_MIN: 10
} as const

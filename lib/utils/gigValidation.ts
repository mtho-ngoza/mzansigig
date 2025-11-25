/**
 * Gig Validation and Sanitization Utilities
 * Prevents XSS, validates input constraints, normalizes data
 */

/**
 * Sanitize text input to prevent XSS attacks
 * Removes HTML tags, dangerous characters, and limits length
 */
export function sanitizeGigText(input: string, maxLength: number): string {
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
 * Normalize and deduplicate skills array
 * Converts to lowercase, trims, removes duplicates
 */
export function normalizeSkills(skills: string[]): string[] {
  const normalized = skills
    .map(skill => skill.trim().toLowerCase())
    .filter(skill => skill.length > 0)

  // Remove duplicates while preserving first occurrence
  return [...new Set(normalized)]
}

/**
 * Validate deadline is reasonable
 * Must be in future but not more than 1 year away
 */
export function validateDeadline(deadline: Date): {
  isValid: boolean
  message?: string
} {
  const now = new Date()
  const oneYearFromNow = new Date()
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)

  if (deadline <= now) {
    return {
      isValid: false,
      message: 'Deadline must be in the future'
    }
  }

  if (deadline > oneYearFromNow) {
    return {
      isValid: false,
      message: 'Deadline cannot be more than 1 year from now'
    }
  }

  return { isValid: true }
}

/**
 * Budget constraints for gig creation
 */
export const BUDGET_LIMITS = {
  MIN: 100,
  MAX: 1000000,
  WARNING_THRESHOLD: 50000
} as const

/**
 * Validate budget is within reasonable limits
 * Returns validation result with warnings for very high budgets
 *
 * SECURITY: Prevents:
 * - Negative budgets
 * - Excessively high budgets
 * - Invalid numeric values (NaN, Infinity)
 * - Non-integer budgets (must be whole Rands)
 */
export function validateBudget(budget: number): {
  isValid: boolean
  warning?: string
  message?: string
} {
  // Check for non-numeric values
  if (typeof budget !== 'number' || isNaN(budget)) {
    return {
      isValid: false,
      message: 'Budget must be a valid number'
    }
  }

  // Check for infinite values
  if (!isFinite(budget)) {
    return {
      isValid: false,
      message: 'Budget must be a finite number'
    }
  }

  // Check for negative or zero budgets
  if (budget <= 0) {
    return {
      isValid: false,
      message: 'Budget must be a positive number'
    }
  }

  // Check for decimal values (budgets should be whole Rands)
  if (!Number.isInteger(budget)) {
    return {
      isValid: false,
      message: 'Budget must be a whole number (no cents)'
    }
  }

  // Check minimum budget
  if (budget < BUDGET_LIMITS.MIN) {
    return {
      isValid: false,
      message: `Budget must be at least R${BUDGET_LIMITS.MIN}`
    }
  }

  // Check maximum budget
  if (budget > BUDGET_LIMITS.MAX) {
    return {
      isValid: false,
      message: `Budget cannot exceed R${BUDGET_LIMITS.MAX.toLocaleString()}`
    }
  }

  // Warning for high budgets
  if (budget > BUDGET_LIMITS.WARNING_THRESHOLD) {
    return {
      isValid: true,
      warning: `High budget detected. Please confirm amount of R${budget.toLocaleString()} is correct.`
    }
  }

  return { isValid: true }
}

/**
 * Parse and validate budget string input
 * Sanitizes input and converts to number
 */
export function parseBudgetInput(input: string): {
  value: number | null
  error?: string
} {
  if (!input || typeof input !== 'string') {
    return { value: null, error: 'Budget is required' }
  }

  // Remove any non-numeric characters except decimal point
  const sanitized = input.trim().replace(/[^0-9.]/g, '')

  if (!sanitized) {
    return { value: null, error: 'Budget must contain numbers' }
  }

  const parsed = parseFloat(sanitized)

  // Round to nearest integer (no cents allowed)
  const rounded = Math.round(parsed)

  const validation = validateBudget(rounded)
  if (!validation.isValid) {
    return { value: null, error: validation.message }
  }

  return { value: rounded, error: validation.warning }
}

/**
 * Validate deadline aligns with duration
 * Warns if deadline seems misaligned with expected work duration
 */
export function validateDeadlineVsDuration(
  deadline: Date,
  duration: string
): {
  isWarning: boolean
  message?: string
} {
  const now = new Date()
  const daysUntilDeadline = Math.ceil(
    (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )

  // Map durations to expected days
  const durationDays: Record<string, number> = {
    '1 day': 1,
    '2-3 days': 3,
    '1 week': 7,
    '2 weeks': 14,
    '1 month': 30,
    '2-3 months': 75,
    '3-6 months': 135,
    '6+ months': 180,
    'Ongoing': 365
  }

  const expectedDays = durationDays[duration]
  if (!expectedDays) return { isWarning: false }

  // Warn if deadline is much shorter than duration
  if (daysUntilDeadline < expectedDays * 0.3) {
    return {
      isWarning: true,
      message: `Deadline seems tight for a ${duration} gig. Applications close in ${daysUntilDeadline} days but work takes ${duration}.`
    }
  }

  // Warn if deadline is much longer than duration
  if (daysUntilDeadline > expectedDays * 3 && duration !== 'Ongoing') {
    return {
      isWarning: true,
      message: `Deadline seems far for a ${duration} gig. Consider setting an earlier application deadline.`
    }
  }

  return { isWarning: false }
}

/**
 * Validate max applicants is reasonable
 */
export function validateMaxApplicants(maxApplicants: number): {
  isValid: boolean
  message?: string
} {
  if (maxApplicants < 1) {
    return {
      isValid: false,
      message: 'Max applicants must be at least 1'
    }
  }

  if (maxApplicants > 100) {
    return {
      isValid: false,
      message: 'Max applicants cannot exceed 100'
    }
  }

  return { isValid: true }
}

/**
 * Text field length constraints
 */
export const GIG_TEXT_LIMITS = {
  TITLE_MAX: 100,
  DESCRIPTION_MAX: 2000,
  OTHER_CATEGORY_MAX: 100,
  TITLE_MIN: 10,
  DESCRIPTION_MIN: 30
} as const

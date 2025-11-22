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
 * Validate budget is within reasonable limits
 * Returns validation result with warnings for very high budgets
 */
export function validateBudget(budget: number): {
  isValid: boolean
  warning?: string
  message?: string
} {
  const MIN_BUDGET = 100
  const WARNING_THRESHOLD = 50000
  const MAX_BUDGET = 1000000

  if (budget < MIN_BUDGET) {
    return {
      isValid: false,
      message: `Budget must be at least R${MIN_BUDGET}`
    }
  }

  if (budget > MAX_BUDGET) {
    return {
      isValid: false,
      message: `Budget cannot exceed R${MAX_BUDGET.toLocaleString()}`
    }
  }

  if (budget > WARNING_THRESHOLD) {
    return {
      isValid: true,
      warning: `High budget detected. Please confirm amount of R${budget.toLocaleString()} is correct.`
    }
  }

  return { isValid: true }
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

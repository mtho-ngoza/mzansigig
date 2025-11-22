/**
 * Profile validation utilities for input sanitization and validation
 * Prevents XSS, validates data integrity, and enforces limits
 */

// Length limits for text inputs
export const VALIDATION_LIMITS = {
  BIO_MAX_LENGTH: 500,
  SKILL_MAX_LENGTH: 50,
  CERTIFICATION_MAX_LENGTH: 100,
  PORTFOLIO_TITLE_MAX_LENGTH: 100,
  PORTFOLIO_DESCRIPTION_MAX_LENGTH: 1000,
  PHONE_MAX_LENGTH: 15,
  URL_MAX_LENGTH: 500,
} as const

// Quantity limits for arrays
export const QUANTITY_LIMITS = {
  MAX_SKILLS: 20,
  MAX_CERTIFICATIONS: 10,
  MAX_PORTFOLIO_ITEMS: 20,
  MAX_LANGUAGES: 11, // All SA languages
} as const

// Rate limits
export const RATE_LIMITS = {
  MIN_HOURLY_RATE: 50,
  MAX_HOURLY_RATE: 5000,
} as const

/**
 * Sanitize text input to prevent XSS attacks
 * Removes HTML tags and potentially dangerous characters
 */
export function sanitizeText(input: string): string {
  if (!input) return ''

  return input
    .trim()
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script-related content
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    // Limit to reasonable characters (allow accented characters for multilingual support)
    .replace(/[<>]/g, '')
}

/**
 * Validate and sanitize an array of strings (skills, certifications, etc.)
 */
export function sanitizeStringArray(
  items: string[],
  maxLength: number,
  maxItems: number
): string[] {
  return items
    .map(item => sanitizeText(item))
    .filter(item => item.length > 0 && item.length <= maxLength)
    .slice(0, maxItems)
}

/**
 * Validate South African phone number format
 * Accepts: +27123456789 or +27 12 345 6789 or similar variations
 */
export function validatePhoneNumber(phone: string): {
  isValid: boolean
  message?: string
} {
  if (!phone) return { isValid: false, message: 'Phone number is required' }

  // Remove spaces and dashes for validation
  const cleaned = phone.replace(/[\s-]/g, '')

  // Check if it starts with +27 and has 11 total digits
  if (!/^\+27\d{9}$/.test(cleaned)) {
    return {
      isValid: false,
      message: 'Please enter a valid South African phone number (e.g., +27 82 123 4567)',
    }
  }

  return { isValid: true }
}

/**
 * Validate URL format and prevent malicious URLs
 */
export function validateUrl(url: string): {
  isValid: boolean
  message?: string
} {
  if (!url) return { isValid: true } // URLs are optional

  // Check length
  if (url.length > VALIDATION_LIMITS.URL_MAX_LENGTH) {
    return {
      isValid: false,
      message: `URL must be less than ${VALIDATION_LIMITS.URL_MAX_LENGTH} characters`,
    }
  }

  // Must start with http:// or https://
  if (!/^https?:\/\/.+/.test(url)) {
    return {
      isValid: false,
      message: 'URL must start with http:// or https://',
    }
  }

  // Prevent javascript: and data: URLs
  if (/^(javascript|data|vbscript):/i.test(url)) {
    return {
      isValid: false,
      message: 'Invalid URL protocol',
    }
  }

  return { isValid: true }
}

/**
 * Validate hourly rate
 */
export function validateHourlyRate(rate: number | string): {
  isValid: boolean
  message?: string
} {
  const numRate = typeof rate === 'string' ? parseFloat(rate) : rate

  if (isNaN(numRate)) {
    return { isValid: false, message: 'Please enter a valid rate' }
  }

  if (numRate < RATE_LIMITS.MIN_HOURLY_RATE) {
    return {
      isValid: false,
      message: `Hourly rate must be at least R${RATE_LIMITS.MIN_HOURLY_RATE}`,
    }
  }

  if (numRate > RATE_LIMITS.MAX_HOURLY_RATE) {
    return {
      isValid: false,
      message: `Hourly rate cannot exceed R${RATE_LIMITS.MAX_HOURLY_RATE}`,
    }
  }

  return { isValid: true }
}

/**
 * Enforce text length limit
 */
export function enforceLength(text: string, maxLength: number): string {
  if (!text) return ''
  return text.slice(0, maxLength)
}

/**
 * Check if adding an item would exceed quantity limit
 */
export function canAddItem(currentCount: number, maxCount: number): {
  canAdd: boolean
  message?: string
} {
  if (currentCount >= maxCount) {
    return {
      canAdd: false,
      message: `Maximum of ${maxCount} items allowed`,
    }
  }
  return { canAdd: true }
}

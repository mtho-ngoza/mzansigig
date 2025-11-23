/**
 * Review Validation and Sanitization Utilities
 * Prevents XSS, validates input constraints, normalizes review data
 */

/**
 * Sanitize review comment to prevent XSS attacks
 * Removes HTML tags, dangerous characters, and limits length
 */
export function sanitizeReviewComment(input: string, maxLength: number = 1000): string {
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
 * Review comment length constraints
 */
export const REVIEW_TEXT_LIMITS = {
  COMMENT_MAX: 1000,
  COMMENT_MIN: 20
} as const

/**
 * Validate review comment meets requirements
 */
export function validateReviewComment(comment: string): {
  isValid: boolean
  message?: string
} {
  const trimmed = comment.trim()

  if (!trimmed) {
    return {
      isValid: false,
      message: 'Please provide a review comment'
    }
  }

  if (trimmed.length < REVIEW_TEXT_LIMITS.COMMENT_MIN) {
    return {
      isValid: false,
      message: `Review must be at least ${REVIEW_TEXT_LIMITS.COMMENT_MIN} characters`
    }
  }

  if (trimmed.length > REVIEW_TEXT_LIMITS.COMMENT_MAX) {
    return {
      isValid: false,
      message: `Review must not exceed ${REVIEW_TEXT_LIMITS.COMMENT_MAX} characters`
    }
  }

  return { isValid: true }
}

/**
 * Validate review rating
 */
export function validateRating(rating: number): {
  isValid: boolean
  message?: string
} {
  if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return {
      isValid: false,
      message: 'Rating must be between 1 and 5'
    }
  }

  return { isValid: true }
}

/**
 * Check if review deadline has passed
 */
export function isReviewOverdue(deadline: Date): boolean {
  return new Date() > deadline
}

/**
 * Calculate days remaining until review deadline
 */
export function getDaysUntilDeadline(deadline: Date): number {
  const now = new Date()
  const diff = deadline.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * Basic profanity filter
 * Returns true if text contains inappropriate content
 */
export function containsProfanity(text: string): boolean {
  // Basic profanity list (can be expanded)
  const profanityList = [
    'fuck', 'shit', 'ass', 'bitch', 'damn', 'crap',
    'piss', 'cock', 'dick', 'bastard', 'slut', 'whore'
  ]

  const lowerText = text.toLowerCase()

  return profanityList.some(word => {
    // Match whole words only
    const regex = new RegExp(`\\b${word}\\b`, 'i')
    return regex.test(lowerText)
  })
}

/**
 * Check if review comment appears to be spam
 * Returns true if comment is likely spam
 */
export function isLikelySpam(comment: string): boolean {
  const lowerComment = comment.toLowerCase()

  // Check for spam indicators
  const spamIndicators = [
    /click here/i,
    /visit.*website/i,
    /http[s]?:\/\//i, // URLs
    /www\./i,
    /\d{10,}/i, // Long number sequences (phone numbers)
    /buy now/i,
    /limited offer/i,
    /act now/i
  ]

  // Check for excessive repetition
  const words = comment.split(/\s+/)
  const uniqueWords = new Set(words.map(w => w.toLowerCase()))
  const repetitionRatio = words.length / uniqueWords.size

  if (repetitionRatio > 3) {
    return true // Too much repetition
  }

  return spamIndicators.some(pattern => pattern.test(lowerComment))
}

/**
 * Validate entire review submission
 */
export function validateReviewSubmission(
  rating: number,
  comment: string,
  deadline: Date
): {
  isValid: boolean
  errors: {
    rating?: string
    comment?: string
    deadline?: string
    spam?: string
    profanity?: string
  }
} {
  const errors: {
    rating?: string
    comment?: string
    deadline?: string
    spam?: string
    profanity?: string
  } = {}

  // Validate rating
  const ratingValidation = validateRating(rating)
  if (!ratingValidation.isValid) {
    errors.rating = ratingValidation.message
  }

  // Validate comment
  const commentValidation = validateReviewComment(comment)
  if (!commentValidation.isValid) {
    errors.comment = commentValidation.message
  }

  // Check deadline
  if (isReviewOverdue(deadline)) {
    errors.deadline = 'Review deadline has passed'
  }

  // Check for spam
  if (isLikelySpam(comment)) {
    errors.spam = 'Review appears to contain spam or promotional content'
  }

  // Check for profanity
  if (containsProfanity(comment)) {
    errors.profanity = 'Review contains inappropriate language'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

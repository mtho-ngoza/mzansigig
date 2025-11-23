/**
 * Message Validation and Sanitization Utilities
 * Prevents XSS, validates input constraints, normalizes message data
 */

/**
 * Message content length constraints
 */
export const MESSAGE_LIMITS = {
  CONTENT_MAX: 5000,
  CONTENT_MIN: 1,
  USERNAME_MAX: 100,
} as const

/**
 * Sanitize message content to prevent XSS attacks
 * Removes HTML tags, dangerous characters, and limits length
 */
export function sanitizeMessageContent(input: string, maxLength: number = MESSAGE_LIMITS.CONTENT_MAX): string {
  if (!input) return ''

  let sanitized = input.trim()

  // Remove script tags and their content (with multiline support)
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  // Remove all HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '')

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '')

  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/on\w+\s*=/gi, '')

  // Remove data: URLs
  sanitized = sanitized.replace(/data:/gi, '')

  return sanitized.slice(0, maxLength)
}

/**
 * Validate message content meets requirements
 */
export function validateMessageContent(content: string): {
  isValid: boolean
  message?: string
} {
  // Check for whitespace-only content before trimming
  if (/^\s*$/.test(content)) {
    return {
      isValid: false,
      message: 'Message cannot contain only whitespace'
    }
  }

  const trimmed = content.trim()

  if (!trimmed) {
    return {
      isValid: false,
      message: 'Message cannot be empty'
    }
  }

  if (trimmed.length < MESSAGE_LIMITS.CONTENT_MIN) {
    return {
      isValid: false,
      message: 'Message is too short'
    }
  }

  if (trimmed.length > MESSAGE_LIMITS.CONTENT_MAX) {
    return {
      isValid: false,
      message: `Message must not exceed ${MESSAGE_LIMITS.CONTENT_MAX} characters`
    }
  }

  return { isValid: true }
}

/**
 * Sanitize username to prevent XSS
 */
export function sanitizeUsername(username: string): string {
  if (!username) return 'Unknown User'

  return username
    .trim()
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .slice(0, MESSAGE_LIMITS.USERNAME_MAX)
}

/**
 * Sanitize filename to prevent path traversal and XSS
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return 'unnamed_file'

  return filename
    .trim()
    .replace(/[<>:"\/\\|?*\x00-\x1f]/g, '_') // Replace unsafe characters
    .replace(/\.{2,}/g, '_') // Replace multiple dots (path traversal)
    .replace(/^\.+/, '') // Remove leading dots
    .slice(0, 255) // Limit filename length
}

/**
 * Validate file extension against whitelist
 */
export function validateFileExtension(filename: string): {
  isValid: boolean
  message?: string
} {
  const allowedExtensions = [
    // Images
    'jpg', 'jpeg', 'png', 'gif', 'webp',
    // Documents
    'pdf', 'doc', 'docx', 'txt',
    // Other
    'zip'
  ]

  // Check if filename has a dot
  if (!filename.includes('.')) {
    return {
      isValid: false,
      message: 'File must have an extension'
    }
  }

  const extension = filename.split('.').pop()?.toLowerCase()

  if (!extension) {
    return {
      isValid: false,
      message: 'File must have an extension'
    }
  }

  if (!allowedExtensions.includes(extension)) {
    return {
      isValid: false,
      message: `File type .${extension} is not allowed. Allowed types: ${allowedExtensions.join(', ')}`
    }
  }

  return { isValid: true }
}

/**
 * Basic profanity filter for messages
 */
export function containsProfanity(text: string): boolean {
  const profanityList = [
    'fuck', 'shit', 'ass', 'bitch', 'damn', 'crap',
    'piss', 'cock', 'dick', 'bastard', 'slut', 'whore'
  ]

  const lowerText = text.toLowerCase()

  return profanityList.some(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'i')
    return regex.test(lowerText)
  })
}

/**
 * Check if message appears to be spam
 */
export function isLikelySpam(content: string): boolean {
  const lowerContent = content.toLowerCase()

  // Check for spam indicators
  const spamIndicators = [
    /click here/i,
    /visit.*website/i,
    /http[s]?:\/\//i, // URLs
    /www\./i,
    /\d{10,}/i, // Long number sequences (phone numbers)
    /buy now/i,
    /limited offer/i,
    /act now/i,
    /make money/i,
    /work from home/i,
  ]

  // Check for excessive repetition
  const words = content.split(/\s+/)
  const uniqueWords = new Set(words.map(w => w.toLowerCase()))
  const repetitionRatio = words.length / uniqueWords.size

  if (repetitionRatio > 3) {
    return true // Too much repetition
  }

  // Check for excessive caps
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length
  if (capsRatio > 0.7 && content.length > 20) {
    return true // Too many caps
  }

  return spamIndicators.some(pattern => pattern.test(lowerContent))
}

/**
 * Validate entire message submission
 */
export function validateMessageSubmission(
  content: string
): {
  isValid: boolean
  errors: {
    content?: string
    spam?: string
    profanity?: string
  }
} {
  const errors: {
    content?: string
    spam?: string
    profanity?: string
  } = {}

  // Validate content
  const contentValidation = validateMessageContent(content)
  if (!contentValidation.isValid) {
    errors.content = contentValidation.message
  }

  // Check for spam
  if (isLikelySpam(content)) {
    errors.spam = 'Message appears to contain spam or promotional content'
  }

  // Check for profanity
  if (containsProfanity(content)) {
    errors.profanity = 'Message contains inappropriate language'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Rate limiter for message sending
 * Tracks message timestamps per user
 */
class MessageRateLimiter {
  private messageTimes: Map<string, number[]> = new Map()
  private readonly maxMessages: number
  private readonly timeWindowMs: number

  constructor(maxMessages: number = 10, timeWindowMinutes: number = 1) {
    this.maxMessages = maxMessages
    this.timeWindowMs = timeWindowMinutes * 60 * 1000
  }

  /**
   * Check if user can send a message
   */
  canSendMessage(userId: string): {
    allowed: boolean
    retryAfterMs?: number
  } {
    const now = Date.now()
    const userTimes = this.messageTimes.get(userId) || []

    // Remove timestamps outside the time window
    const recentTimes = userTimes.filter(time => now - time < this.timeWindowMs)

    if (recentTimes.length >= this.maxMessages) {
      const oldestTime = Math.min(...recentTimes)
      const retryAfterMs = this.timeWindowMs - (now - oldestTime)

      return {
        allowed: false,
        retryAfterMs: Math.max(0, retryAfterMs)
      }
    }

    return { allowed: true }
  }

  /**
   * Record a message send for rate limiting
   */
  recordMessage(userId: string): void {
    const now = Date.now()
    const userTimes = this.messageTimes.get(userId) || []

    // Add new timestamp
    userTimes.push(now)

    // Keep only recent timestamps
    const recentTimes = userTimes.filter(time => now - time < this.timeWindowMs)
    this.messageTimes.set(userId, recentTimes)
  }

  /**
   * Clear rate limit history for a user
   */
  clearUser(userId: string): void {
    this.messageTimes.delete(userId)
  }

  /**
   * Get remaining messages allowed in current window
   */
  getRemainingMessages(userId: string): number {
    const now = Date.now()
    const userTimes = this.messageTimes.get(userId) || []
    const recentTimes = userTimes.filter(time => now - time < this.timeWindowMs)

    return Math.max(0, this.maxMessages - recentTimes.length)
  }
}

// Export singleton instance
export const messageRateLimiter = new MessageRateLimiter(10, 1) // 10 messages per minute

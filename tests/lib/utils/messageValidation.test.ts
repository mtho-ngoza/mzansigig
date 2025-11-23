import {
  sanitizeMessageContent,
  sanitizeUsername,
  sanitizeFilename,
  validateMessageContent,
  validateFileExtension,
  validateMessageSubmission,
  containsProfanity,
  isLikelySpam,
  messageRateLimiter,
  MESSAGE_LIMITS
} from '@/lib/utils/messageValidation'

describe('messageValidation', () => {
  describe('sanitizeMessageContent', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello'
      const result = sanitizeMessageContent(input)
      expect(result).toBe('Hello')
    })

    it('should remove javascript: protocol', () => {
      const input = 'Click javascript:alert("xss") here'
      const result = sanitizeMessageContent(input)
      // The protocol is removed, leaving safe text
      expect(result).not.toContain('javascript:')
      expect(result).toContain('Click')
    })

    it('should remove event handlers', () => {
      const input = 'Text onclick=alert("xss") here'
      const result = sanitizeMessageContent(input)
      // The event handler pattern is removed, leaving safe text
      expect(result).not.toContain('onclick=')
      expect(result).toContain('Text')
    })

    it('should limit length to maxLength', () => {
      const input = 'a'.repeat(6000)
      const result = sanitizeMessageContent(input, 100)
      expect(result.length).toBe(100)
    })

    it('should trim whitespace', () => {
      const input = '   Hello World   '
      const result = sanitizeMessageContent(input)
      expect(result).toBe('Hello World')
    })
  })

  describe('validateMessageContent', () => {
    it('should reject empty content', () => {
      const result = validateMessageContent('')
      expect(result.isValid).toBe(false)
      expect(result.message).toBeDefined()
    })

    it('should reject whitespace-only content', () => {
      const result = validateMessageContent('   \n\t   ')
      expect(result.isValid).toBe(false)
      expect(result.message).toContain('whitespace')
    })

    it('should accept valid content', () => {
      const result = validateMessageContent('Hello, this is a valid message!')
      expect(result.isValid).toBe(true)
    })

    it('should reject content exceeding max length', () => {
      const longContent = 'a'.repeat(MESSAGE_LIMITS.CONTENT_MAX + 1)
      const result = validateMessageContent(longContent)
      expect(result.isValid).toBe(false)
      expect(result.message).toContain('must not exceed')
    })
  })

  describe('sanitizeUsername', () => {
    it('should remove HTML tags from username', () => {
      const input = '<script>alert("xss")</script>John'
      const result = sanitizeUsername(input)
      // The dangerous tags are removed
      expect(result).not.toContain('<script>')
      expect(result).not.toContain('</script>')
      expect(result).toContain('John')
    })

    it('should limit username length', () => {
      const input = 'a'.repeat(200)
      const result = sanitizeUsername(input)
      expect(result.length).toBe(MESSAGE_LIMITS.USERNAME_MAX)
    })

    it('should return default for empty username', () => {
      const result = sanitizeUsername('')
      expect(result).toBe('Unknown User')
    })
  })

  describe('sanitizeFilename', () => {
    it('should remove unsafe characters', () => {
      const input = 'file<name>.pdf'
      const result = sanitizeFilename(input)
      expect(result).toBe('file_name_.pdf')
    })

    it('should replace path traversal attempts', () => {
      const input = '../../../etc/passwd'
      const result = sanitizeFilename(input)
      expect(result).not.toContain('..')
    })

    it('should remove leading dots', () => {
      const input = '...filename.txt'
      const result = sanitizeFilename(input)
      expect(result).not.toMatch(/^\./)
    })
  })

  describe('validateFileExtension', () => {
    it('should accept valid image extensions', () => {
      expect(validateFileExtension('photo.jpg').isValid).toBe(true)
      expect(validateFileExtension('image.png').isValid).toBe(true)
    })

    it('should accept valid document extensions', () => {
      expect(validateFileExtension('doc.pdf').isValid).toBe(true)
      expect(validateFileExtension('file.docx').isValid).toBe(true)
    })

    it('should reject invalid extensions', () => {
      const result = validateFileExtension('malware.exe')
      expect(result.isValid).toBe(false)
      expect(result.message).toContain('not allowed')
    })

    it('should reject files without extension', () => {
      const result = validateFileExtension('filename')
      expect(result.isValid).toBe(false)
      expect(result.message).toContain('must have an extension')
    })
  })

  describe('containsProfanity', () => {
    it('should detect common profanity', () => {
      expect(containsProfanity('This is shit')).toBe(true)
      expect(containsProfanity('You are a bitch')).toBe(true)
    })

    it('should only match whole words', () => {
      expect(containsProfanity('assessment')).toBe(false) // contains 'ass' but not as whole word
    })

    it('should be case insensitive', () => {
      expect(containsProfanity('SHIT')).toBe(true)
      expect(containsProfanity('ShIt')).toBe(true)
    })

    it('should not detect profanity in clean text', () => {
      expect(containsProfanity('Hello, how are you?')).toBe(false)
    })
  })

  describe('isLikelySpam', () => {
    it('should detect URLs', () => {
      expect(isLikelySpam('Visit http://spam.com now!')).toBe(true)
      expect(isLikelySpam('Check www.spam.com')).toBe(true)
    })

    it('should detect spam keywords', () => {
      expect(isLikelySpam('Click here to buy now!')).toBe(true)
      expect(isLikelySpam('Limited offer! Act now!')).toBe(true)
    })

    it('should detect excessive repetition', () => {
      const repetitiveText = 'hello hello hello hello hello hello hello hello'
      expect(isLikelySpam(repetitiveText)).toBe(true)
    })

    it('should detect excessive caps', () => {
      const capsText = 'BUY NOW THIS IS AMAZING DEAL'
      expect(isLikelySpam(capsText)).toBe(true)
    })

    it('should not flag normal messages', () => {
      expect(isLikelySpam('Hello, I am interested in this gig')).toBe(false)
    })
  })

  describe('validateMessageSubmission', () => {
    it('should validate all aspects', () => {
      const result = validateMessageSubmission('Hello, this is a valid message')
      expect(result.isValid).toBe(true)
      expect(Object.keys(result.errors)).toHaveLength(0)
    })

    it('should detect empty content', () => {
      const result = validateMessageSubmission('')
      expect(result.isValid).toBe(false)
      expect(result.errors.content).toBeDefined()
    })

    it('should detect spam', () => {
      const result = validateMessageSubmission('Visit http://spam.com now!')
      expect(result.isValid).toBe(false)
      expect(result.errors.spam).toBeDefined()
    })

    it('should detect profanity', () => {
      const result = validateMessageSubmission('This is shit')
      expect(result.isValid).toBe(false)
      expect(result.errors.profanity).toBeDefined()
    })
  })

  describe('messageRateLimiter', () => {
    beforeEach(() => {
      // Clear rate limiter state between tests
      messageRateLimiter.clearUser('test-user')
    })

    it('should allow messages under limit', () => {
      const userId = 'test-user'

      // Should allow first message
      const check1 = messageRateLimiter.canSendMessage(userId)
      expect(check1.allowed).toBe(true)

      messageRateLimiter.recordMessage(userId)

      // Should allow second message
      const check2 = messageRateLimiter.canSendMessage(userId)
      expect(check2.allowed).toBe(true)
    })

    it('should block messages over rate limit', () => {
      const userId = 'test-user'

      // Send 10 messages (the limit)
      for (let i = 0; i < 10; i++) {
        messageRateLimiter.recordMessage(userId)
      }

      // 11th message should be blocked
      const check = messageRateLimiter.canSendMessage(userId)
      expect(check.allowed).toBe(false)
      expect(check.retryAfterMs).toBeGreaterThan(0)
    })

    it('should track remaining messages', () => {
      const userId = 'test-user'

      // Initially should have 10 remaining
      expect(messageRateLimiter.getRemainingMessages(userId)).toBe(10)

      // After 3 messages
      for (let i = 0; i < 3; i++) {
        messageRateLimiter.recordMessage(userId)
      }
      expect(messageRateLimiter.getRemainingMessages(userId)).toBe(7)
    })

    it('should isolate users', () => {
      const user1 = 'user-1'
      const user2 = 'user-2'

      // User 1 sends 10 messages
      for (let i = 0; i < 10; i++) {
        messageRateLimiter.recordMessage(user1)
      }

      // User 1 should be blocked
      expect(messageRateLimiter.canSendMessage(user1).allowed).toBe(false)

      // User 2 should still be allowed
      expect(messageRateLimiter.canSendMessage(user2).allowed).toBe(true)
    })
  })
})

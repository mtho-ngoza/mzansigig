/**
 * Tests for gig validation utilities
 * Ensures budget validation and input sanitization work correctly
 */

import {
  validateBudget,
  parseBudgetInput,
  BUDGET_LIMITS,
  sanitizeGigText,
  normalizeSkills,
  validateDeadline,
  validateDeadlineVsDuration,
  validateMaxApplicants,
  GIG_TEXT_LIMITS
} from '@/lib/utils/gigValidation'

describe('gigValidation', () => {
  describe('validateBudget', () => {
    it('should accept valid budgets within range', () => {
      const validBudgets = [100, 500, 1000, 5000, 50000, 1000000]
      validBudgets.forEach(budget => {
        const result = validateBudget(budget)
        expect(result.isValid).toBe(true)
      })
    })

    it('should reject negative budgets', () => {
      const result = validateBudget(-100)
      expect(result.isValid).toBe(false)
      expect(result.message).toContain('positive')
    })

    it('should reject zero budget', () => {
      const result = validateBudget(0)
      expect(result.isValid).toBe(false)
      expect(result.message).toContain('positive')
    })

    it('should reject budgets below minimum', () => {
      const result = validateBudget(50)
      expect(result.isValid).toBe(false)
      expect(result.message).toContain(`at least R${BUDGET_LIMITS.MIN}`)
    })

    it('should reject budgets above maximum', () => {
      const result = validateBudget(2000000)
      expect(result.isValid).toBe(false)
      expect(result.message).toContain('cannot exceed')
    })

    it('should reject NaN values', () => {
      const result = validateBudget(NaN)
      expect(result.isValid).toBe(false)
      expect(result.message).toContain('valid number')
    })

    it('should reject Infinity', () => {
      const result = validateBudget(Infinity)
      expect(result.isValid).toBe(false)
      expect(result.message).toContain('finite')
    })

    it('should reject negative Infinity', () => {
      const result = validateBudget(-Infinity)
      expect(result.isValid).toBe(false)
      expect(result.message).toContain('finite')
    })

    it('should reject decimal values (cents not allowed)', () => {
      const result = validateBudget(100.50)
      expect(result.isValid).toBe(false)
      expect(result.message).toContain('whole number')
    })

    it('should warn for high budgets', () => {
      const result = validateBudget(75000)
      expect(result.isValid).toBe(true)
      expect(result.warning).toBeDefined()
      expect(result.warning).toContain('High budget')
    })

    it('should accept budgets at exactly minimum', () => {
      const result = validateBudget(BUDGET_LIMITS.MIN)
      expect(result.isValid).toBe(true)
    })

    it('should accept budgets at exactly maximum', () => {
      const result = validateBudget(BUDGET_LIMITS.MAX)
      expect(result.isValid).toBe(true)
    })

    it('should reject non-number types', () => {
      // @ts-expect-error Testing invalid input
      const result = validateBudget('1000')
      expect(result.isValid).toBe(false)
    })
  })

  describe('parseBudgetInput', () => {
    it('should parse valid budget string', () => {
      const result = parseBudgetInput('1000')
      expect(result.value).toBe(1000)
      expect(result.error).toBeUndefined()
    })

    it('should parse budget with currency symbol', () => {
      const result = parseBudgetInput('R1000')
      expect(result.value).toBe(1000)
    })

    it('should parse budget with commas', () => {
      const result = parseBudgetInput('1,000')
      expect(result.value).toBe(1000)
    })

    it('should parse budget with spaces', () => {
      const result = parseBudgetInput('1 000')
      expect(result.value).toBe(1000)
    })

    it('should round decimal values', () => {
      const result = parseBudgetInput('1000.75')
      expect(result.value).toBe(1001) // Rounded up
    })

    it('should handle whitespace', () => {
      const result = parseBudgetInput('  1000  ')
      expect(result.value).toBe(1000)
    })

    it('should reject empty input', () => {
      const result = parseBudgetInput('')
      expect(result.value).toBeNull()
      expect(result.error).toContain('required')
    })

    it('should reject non-numeric input', () => {
      const result = parseBudgetInput('abc')
      expect(result.value).toBeNull()
      expect(result.error).toBeDefined()
    })

    it('should reject input with only symbols', () => {
      const result = parseBudgetInput('R$')
      expect(result.value).toBeNull()
      expect(result.error).toContain('numbers')
    })

    it('should return error for invalid range', () => {
      const result = parseBudgetInput('50')
      expect(result.value).toBeNull()
      expect(result.error).toContain('at least')
    })

    it('should return warning for high budgets', () => {
      const result = parseBudgetInput('75000')
      expect(result.value).toBe(75000)
      expect(result.error).toContain('High budget')
    })
  })

  describe('sanitizeGigText', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Test'
      const result = sanitizeGigText(input, 100)
      expect(result).not.toContain('<script>')
      expect(result).toContain('Test')
    })

    it('should remove javascript: protocol', () => {
      const input = 'Test javascript:alert() content'
      const result = sanitizeGigText(input, 100)
      expect(result).not.toContain('javascript:')
    })

    it('should remove event handlers', () => {
      const input = 'Test onclick=alert() content'
      const result = sanitizeGigText(input, 100)
      expect(result).not.toContain('onclick=')
    })

    it('should limit length', () => {
      const input = 'a'.repeat(200)
      const result = sanitizeGigText(input, 100)
      expect(result.length).toBe(100)
    })

    it('should trim whitespace', () => {
      const input = '   Test   '
      const result = sanitizeGigText(input, 100)
      expect(result).toBe('Test')
    })
  })

  describe('normalizeSkills', () => {
    it('should convert to lowercase', () => {
      const skills = ['JavaScript', 'PYTHON', 'React']
      const result = normalizeSkills(skills)
      expect(result).toEqual(['javascript', 'python', 'react'])
    })

    it('should remove duplicates', () => {
      const skills = ['javascript', 'JavaScript', 'JAVASCRIPT']
      const result = normalizeSkills(skills)
      expect(result).toEqual(['javascript'])
    })

    it('should trim whitespace', () => {
      const skills = ['  javascript  ', ' python ']
      const result = normalizeSkills(skills)
      expect(result).toEqual(['javascript', 'python'])
    })

    it('should filter empty strings', () => {
      const skills = ['javascript', '', '  ', 'python']
      const result = normalizeSkills(skills)
      expect(result).toEqual(['javascript', 'python'])
    })
  })

  describe('validateDeadline', () => {
    it('should accept future deadlines', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const result = validateDeadline(tomorrow)
      expect(result.isValid).toBe(true)
    })

    it('should reject past deadlines', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const result = validateDeadline(yesterday)
      expect(result.isValid).toBe(false)
      expect(result.message).toContain('future')
    })

    it('should reject deadlines more than 1 year away', () => {
      const twoYearsFromNow = new Date()
      twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2)
      const result = validateDeadline(twoYearsFromNow)
      expect(result.isValid).toBe(false)
      expect(result.message).toContain('1 year')
    })
  })

  describe('validateMaxApplicants', () => {
    it('should accept valid numbers', () => {
      const validCounts = [1, 10, 50, 100]
      validCounts.forEach(count => {
        const result = validateMaxApplicants(count)
        expect(result.isValid).toBe(true)
      })
    })

    it('should reject zero', () => {
      const result = validateMaxApplicants(0)
      expect(result.isValid).toBe(false)
      expect(result.message).toContain('at least 1')
    })

    it('should reject negative numbers', () => {
      const result = validateMaxApplicants(-5)
      expect(result.isValid).toBe(false)
    })

    it('should reject numbers over 100', () => {
      const result = validateMaxApplicants(150)
      expect(result.isValid).toBe(false)
      expect(result.message).toContain('cannot exceed 100')
    })
  })

  describe('validateDeadlineVsDuration', () => {
    it('should warn if deadline is too short for duration', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const result = validateDeadlineVsDuration(tomorrow, '1 month')
      expect(result.isWarning).toBe(true)
      expect(result.message).toContain('tight')
    })

    it('should not warn for aligned deadlines', () => {
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      const result = validateDeadlineVsDuration(nextMonth, '1 month')
      expect(result.isWarning).toBe(false)
    })
  })
})

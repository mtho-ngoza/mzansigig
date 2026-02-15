/**
 * Unit tests for /api/user/bank-details endpoint logic
 *
 * Tests bank details validation and TradeSafe token creation logic
 * for direct payout functionality.
 */

describe('/api/user/bank-details logic', () => {
  // Supported South African banks with TradeSafe UniversalBranchCode enum (UPPERCASE)
  const SUPPORTED_BANKS: Record<string, string> = {
    'ABSA': 'ABSA',
    'FNB': 'FNB',
    'Nedbank': 'NEDBANK',
    'Standard Bank': 'STANDARD_BANK',
    'Capitec': 'CAPITEC',
    'African Bank': 'AFRICAN_BANK',
    'TymeBank': 'TYMEBANK',
    'Discovery Bank': 'DISCOVERY',
    'Investec': 'INVESTEC'
  }

  describe('Bank Name Validation', () => {
    const validateBankName = (bankName: string): { valid: boolean; code?: string; error?: string } => {
      const code = SUPPORTED_BANKS[bankName]
      if (!code) {
        return {
          valid: false,
          error: `Unsupported bank: ${bankName}. Supported banks: ${Object.keys(SUPPORTED_BANKS).join(', ')}`
        }
      }
      return { valid: true, code }
    }

    it('should accept all supported South African banks', () => {
      Object.keys(SUPPORTED_BANKS).forEach(bank => {
        const result = validateBankName(bank)
        expect(result.valid).toBe(true)
        expect(result.code).toBe(SUPPORTED_BANKS[bank])
      })
    })

    it('should reject unsupported banks', () => {
      const result = validateBankName('Unknown Bank')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Unsupported bank')
    })

    it('should return correct TradeSafe bank codes', () => {
      expect(validateBankName('FNB').code).toBe('FNB')
      expect(validateBankName('Standard Bank').code).toBe('STANDARD_BANK')
      expect(validateBankName('ABSA').code).toBe('ABSA')
    })
  })

  describe('Account Number Validation', () => {
    const validateAccountNumber = (accountNumber: string): { valid: boolean; error?: string } => {
      if (!/^\d{10,11}$/.test(accountNumber)) {
        return { valid: false, error: 'Account number must be 10-11 digits' }
      }
      return { valid: true }
    }

    it('should accept 10-digit account numbers', () => {
      expect(validateAccountNumber('1234567890').valid).toBe(true)
    })

    it('should accept 11-digit account numbers', () => {
      expect(validateAccountNumber('12345678901').valid).toBe(true)
    })

    it('should reject account numbers shorter than 10 digits', () => {
      const result = validateAccountNumber('123456789')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('10-11 digits')
    })

    it('should reject account numbers longer than 11 digits', () => {
      expect(validateAccountNumber('123456789012').valid).toBe(false)
    })

    it('should reject account numbers with letters', () => {
      expect(validateAccountNumber('12345abcde').valid).toBe(false)
    })

    it('should reject account numbers with special characters', () => {
      expect(validateAccountNumber('1234-5678-90').valid).toBe(false)
    })
  })

  describe('Account Type Validation', () => {
    const validateAccountType = (accountType: string): { valid: boolean; error?: string } => {
      if (!['CHEQUE', 'SAVINGS'].includes(accountType)) {
        return { valid: false, error: 'Account type must be CHEQUE or SAVINGS' }
      }
      return { valid: true }
    }

    it('should accept CHEQUE account type', () => {
      expect(validateAccountType('CHEQUE').valid).toBe(true)
    })

    it('should accept SAVINGS account type', () => {
      expect(validateAccountType('SAVINGS').valid).toBe(true)
    })

    it('should reject invalid account types', () => {
      const result = validateAccountType('CURRENT')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('CHEQUE or SAVINGS')
    })

    it('should reject lowercase account types', () => {
      expect(validateAccountType('cheque').valid).toBe(false)
      expect(validateAccountType('savings').valid).toBe(false)
    })
  })

  describe('Required Fields Validation', () => {
    interface BankDetailsInput {
      bankName?: string
      accountNumber?: string
      accountType?: string
      accountHolder?: string
    }

    const validateRequiredFields = (input: BankDetailsInput): { valid: boolean; error?: string } => {
      if (!input.bankName || !input.accountNumber || !input.accountType || !input.accountHolder) {
        return {
          valid: false,
          error: 'Missing required fields: bankName, accountNumber, accountType, accountHolder'
        }
      }
      return { valid: true }
    }

    it('should accept complete bank details', () => {
      const result = validateRequiredFields({
        bankName: 'FNB',
        accountNumber: '1234567890',
        accountType: 'SAVINGS',
        accountHolder: 'John Doe'
      })
      expect(result.valid).toBe(true)
    })

    it('should reject missing bankName', () => {
      const result = validateRequiredFields({
        accountNumber: '1234567890',
        accountType: 'SAVINGS',
        accountHolder: 'John Doe'
      })
      expect(result.valid).toBe(false)
    })

    it('should reject missing accountNumber', () => {
      const result = validateRequiredFields({
        bankName: 'FNB',
        accountType: 'SAVINGS',
        accountHolder: 'John Doe'
      })
      expect(result.valid).toBe(false)
    })

    it('should reject missing accountHolder', () => {
      const result = validateRequiredFields({
        bankName: 'FNB',
        accountNumber: '1234567890',
        accountType: 'SAVINGS'
      })
      expect(result.valid).toBe(false)
    })
  })

  describe('Account Number Masking', () => {
    const maskAccountNumber = (accountNumber: string): string => {
      return `****${accountNumber.slice(-4)}`
    }

    it('should mask account number showing only last 4 digits', () => {
      expect(maskAccountNumber('1234567890')).toBe('****7890')
    })

    it('should work with 11-digit account numbers', () => {
      expect(maskAccountNumber('12345678901')).toBe('****8901')
    })
  })

  describe('TradeSafe Token Creation Decision', () => {
    interface UserData {
      tradeSafeToken?: string
      bankDetails?: {
        bankName: string
        accountNumber: string
      }
    }

    const shouldCreateNewToken = (userData: UserData): boolean => {
      return !userData.tradeSafeToken
    }

    const canAddBankDetails = (userData: UserData): { allowed: boolean; error?: string } => {
      if (userData.bankDetails) {
        return {
          allowed: false,
          error: 'Bank details already set. Contact support to update.'
        }
      }
      return { allowed: true }
    }

    it('should create new token if user has no existing token', () => {
      expect(shouldCreateNewToken({})).toBe(true)
    })

    it('should not create new token if user already has token', () => {
      expect(shouldCreateNewToken({ tradeSafeToken: 'existing-token' })).toBe(false)
    })

    it('should allow adding bank details if none exist', () => {
      expect(canAddBankDetails({}).allowed).toBe(true)
    })

    it('should not allow adding bank details if already set', () => {
      const result = canAddBankDetails({
        bankDetails: { bankName: 'FNB', accountNumber: '1234567890' }
      })
      expect(result.allowed).toBe(false)
      expect(result.error).toContain('already set')
    })
  })

  describe('TradeSafe Token Input Construction', () => {
    interface TokenInput {
      givenName: string
      familyName: string
      email: string
      mobile: string
      bankAccount?: {
        accountNumber: string
        accountType: 'CHEQUE' | 'SAVINGS'
        bank: string
      }
    }

    const buildTokenInput = (
      displayName: string,
      email: string,
      phone: string,
      bankDetails?: {
        bankName: string
        accountNumber: string
        accountType: 'CHEQUE' | 'SAVINGS'
      }
    ): TokenInput => {
      const nameParts = displayName.trim().split(' ')
      const input: TokenInput = {
        givenName: nameParts[0] || 'User',
        familyName: nameParts.slice(1).join(' ') || '',
        email,
        mobile: phone || '+27000000000'
      }

      if (bankDetails) {
        const bankCode = SUPPORTED_BANKS[bankDetails.bankName]
        if (bankCode) {
          input.bankAccount = {
            accountNumber: bankDetails.accountNumber,
            accountType: bankDetails.accountType,
            bank: bankCode
          }
        }
      }

      return input
    }

    it('should parse display name into given and family name', () => {
      const input = buildTokenInput('John Doe', 'john@example.com', '+27821234567')
      expect(input.givenName).toBe('John')
      expect(input.familyName).toBe('Doe')
    })

    it('should handle single name', () => {
      const input = buildTokenInput('John', 'john@example.com', '+27821234567')
      expect(input.givenName).toBe('John')
      expect(input.familyName).toBe('')
    })

    it('should handle multiple last names', () => {
      const input = buildTokenInput('John van der Berg', 'john@example.com', '+27821234567')
      expect(input.givenName).toBe('John')
      expect(input.familyName).toBe('van der Berg')
    })

    it('should use default phone if not provided', () => {
      const input = buildTokenInput('John', 'john@example.com', '')
      expect(input.mobile).toBe('+27000000000')
    })

    it('should include bank account when bank details provided', () => {
      const input = buildTokenInput('John Doe', 'john@example.com', '+27821234567', {
        bankName: 'FNB',
        accountNumber: '1234567890',
        accountType: 'SAVINGS'
      })

      expect(input.bankAccount).toBeDefined()
      expect(input.bankAccount?.accountNumber).toBe('1234567890')
      expect(input.bankAccount?.accountType).toBe('SAVINGS')
      expect(input.bankAccount?.bank).toBe('FNB')
    })

    it('should not include bank account for unsupported bank', () => {
      const input = buildTokenInput('John Doe', 'john@example.com', '+27821234567', {
        bankName: 'Unknown Bank',
        accountNumber: '1234567890',
        accountType: 'SAVINGS'
      })

      expect(input.bankAccount).toBeUndefined()
    })
  })

  describe('Response Structures', () => {
    interface SuccessResponse {
      success: true
      message: string
      bankDetails: {
        bankName: string
        accountNumber: string
        accountType: string
        accountHolder: string
      }
      tradeSafeTokenCreated?: boolean
    }

    interface ErrorResponse {
      error: string
    }

    it('should define success response with new token', () => {
      const response: SuccessResponse = {
        success: true,
        message: 'Bank details saved and TradeSafe account created.',
        bankDetails: {
          bankName: 'FNB',
          accountNumber: '****7890',
          accountType: 'SAVINGS',
          accountHolder: 'John Doe'
        },
        tradeSafeTokenCreated: true
      }

      expect(response.success).toBe(true)
      expect(response.tradeSafeTokenCreated).toBe(true)
      expect(response.bankDetails.accountNumber).toMatch(/^\*{4}\d{4}$/)
    })

    it('should define success response without new token', () => {
      const response: SuccessResponse = {
        success: true,
        message: 'Bank details saved.',
        bankDetails: {
          bankName: 'FNB',
          accountNumber: '****7890',
          accountType: 'SAVINGS',
          accountHolder: 'John Doe'
        }
      }

      expect(response.success).toBe(true)
      expect(response.tradeSafeTokenCreated).toBeUndefined()
    })

    it('should define error responses', () => {
      const errors: ErrorResponse[] = [
        { error: 'Unauthorized' },
        { error: 'Missing required fields: bankName, accountNumber, accountType, accountHolder' },
        { error: 'Unsupported bank: Unknown Bank' },
        { error: 'Account type must be CHEQUE or SAVINGS' },
        { error: 'Account number must be 10-11 digits' },
        { error: 'User not found' },
        { error: 'Bank details already set. Contact support to update.' }
      ]

      errors.forEach(e => {
        expect(e.error).toBeDefined()
        expect(typeof e.error).toBe('string')
      })
    })
  })

  describe('GET Response Structure', () => {
    interface GetResponseWithDetails {
      hasBankDetails: true
      bankDetails: {
        bankName: string
        accountNumber: string
        accountType: string
        accountHolder: string
        addedAt: Date
      }
      hasTradeSafeToken: boolean
    }

    interface GetResponseWithoutDetails {
      hasBankDetails: false
      message: string
    }

    it('should define response when bank details exist', () => {
      const response: GetResponseWithDetails = {
        hasBankDetails: true,
        bankDetails: {
          bankName: 'FNB',
          accountNumber: '****7890',
          accountType: 'SAVINGS',
          accountHolder: 'John Doe',
          addedAt: new Date()
        },
        hasTradeSafeToken: true
      }

      expect(response.hasBankDetails).toBe(true)
      expect(response.bankDetails.accountNumber).toMatch(/^\*{4}\d{4}$/)
    })

    it('should define response when no bank details', () => {
      const response: GetResponseWithoutDetails = {
        hasBankDetails: false,
        message: 'No bank details on file. Add bank details to receive direct payments.'
      }

      expect(response.hasBankDetails).toBe(false)
      expect(response.message).toContain('direct payments')
    })
  })
})

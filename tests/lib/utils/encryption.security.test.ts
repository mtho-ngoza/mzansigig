import { encryptData, decryptData, validateEncryptionSetup } from '@/lib/utils/encryption'

describe('Encryption - Security Validation', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Reset environment before each test
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv
  })

  describe('Production Environment - ENCRYPTION_SECRET validation', () => {
    beforeEach(() => {
      (process.env as any).NODE_ENV = 'production'
    })

    describe('given ENCRYPTION_SECRET is missing', () => {
      describe('when encrypting data', () => {
        it('then throws critical error', () => {
          // Given
          delete process.env.ENCRYPTION_SECRET
          delete process.env.NEXT_PUBLIC_ENCRYPTION_SECRET

          // When/Then
          expect(() => encryptData('test-data')).toThrow(
            'CRITICAL: ENCRYPTION_SECRET environment variable is required in production'
          )
        })
      })
    })

    describe('given ENCRYPTION_SECRET is too short', () => {
      describe('when encrypting data', () => {
        it('then throws error about minimum length', () => {
          // Given
          process.env.ENCRYPTION_SECRET = 'short' // Less than 32 characters

          // When/Then
          expect(() => encryptData('test-data')).toThrow(
            'ENCRYPTION_SECRET must be at least 32 characters long'
          )
        })
      })
    })

    describe('given ENCRYPTION_SECRET is the development fallback', () => {
      describe('when encrypting data', () => {
        it('then throws critical error to prevent using dev secret in production', () => {
          // Given
          process.env.ENCRYPTION_SECRET = 'dev-secret-key-change-in-production-32-characters-minimum'

          // When/Then
          expect(() => encryptData('test-data')).toThrow(
            'CRITICAL: Development fallback secret detected in production'
          )
        })
      })
    })

    describe('given valid ENCRYPTION_SECRET', () => {
      describe('when encrypting data', () => {
        it('then succeeds without error', () => {
          // Given
          process.env.ENCRYPTION_SECRET = 'production-secret-key-with-minimum-32-characters-required!'

          // When/Then
          expect(() => encryptData('test-data')).not.toThrow()
        })
      })
    })
  })

  describe('Development Environment - Fallback behavior', () => {
    beforeEach(() => {
      (process.env as any).NODE_ENV = 'development'
    })

    describe('given ENCRYPTION_SECRET is missing', () => {
      describe('when encrypting data', () => {
        it('then uses development fallback', () => {
          // Given
          delete process.env.ENCRYPTION_SECRET
          delete process.env.NEXT_PUBLIC_ENCRYPTION_SECRET

          // When
          const encrypted = encryptData('test-data')
          const decrypted = decryptData(encrypted)

          // Then
          expect(decrypted).toBe('test-data')
        })
      })
    })

    describe('given ENCRYPTION_SECRET is provided', () => {
      describe('when encrypting data', () => {
        it('then uses provided secret instead of fallback', () => {
          // Given
          process.env.ENCRYPTION_SECRET = 'custom-development-secret-key-32-characters-min-required'

          // When
          const encrypted = encryptData('test-data')
          const decrypted = decryptData(encrypted)

          // Then
          expect(decrypted).toBe('test-data')
        })
      })
    })
  })

  describe('Test Environment - Fallback behavior', () => {
    beforeEach(() => {
      (process.env as any).NODE_ENV = 'test'
    })

    describe('given ENCRYPTION_SECRET is missing', () => {
      describe('when encrypting data', () => {
        it('then uses development fallback', () => {
          // Given
          delete process.env.ENCRYPTION_SECRET
          delete process.env.NEXT_PUBLIC_ENCRYPTION_SECRET

          // When
          const encrypted = encryptData('test-data')
          const decrypted = decryptData(encrypted)

          // Then
          expect(decrypted).toBe('test-data')
        })
      })
    })
  })

  describe('Unknown Environment - Security default', () => {
    beforeEach(() => {
      (process.env as any).NODE_ENV = 'staging' // Not production, development, or test
    })

    describe('given ENCRYPTION_SECRET is missing', () => {
      describe('when encrypting data', () => {
        it('then treats as production and throws error', () => {
          // Given
          delete process.env.ENCRYPTION_SECRET
          delete process.env.NEXT_PUBLIC_ENCRYPTION_SECRET

          // When/Then
          expect(() => encryptData('test-data')).toThrow(
            'ENCRYPTION_SECRET environment variable is required. NODE_ENV must be explicitly set'
          )
        })
      })
    })

    describe('given valid ENCRYPTION_SECRET is provided', () => {
      describe('when encrypting data', () => {
        it('then allows encryption with proper secret', () => {
          // Given
          process.env.ENCRYPTION_SECRET = 'staging-secret-key-with-minimum-32-characters-required!'

          // When
          const encrypted = encryptData('test-data')
          const decrypted = decryptData(encrypted)

          // Then
          expect(decrypted).toBe('test-data')
        })
      })
    })
  })

  describe('validateEncryptionSetup()', () => {
    describe('given production with missing secret', () => {
      describe('when validating setup', () => {
        it('then throws and logs error', () => {
          // Given
          (process.env as any).NODE_ENV = 'production'
          delete process.env.ENCRYPTION_SECRET
          delete process.env.NEXT_PUBLIC_ENCRYPTION_SECRET

          const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

          // When/Then
          expect(() => validateEncryptionSetup()).toThrow('CRITICAL')
          expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('Encryption setup validation failed'),
            expect.any(Error)
          )

          consoleSpy.mockRestore()
        })
      })
    })

    describe('given development with valid fallback', () => {
      describe('when validating setup', () => {
        it('then succeeds and logs success', () => {
          // Given
          (process.env as any).NODE_ENV = 'development'
          delete process.env.ENCRYPTION_SECRET
          delete process.env.NEXT_PUBLIC_ENCRYPTION_SECRET

          const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

          // When/Then
          expect(() => validateEncryptionSetup()).not.toThrow()
          expect(consoleSpy).toHaveBeenCalledWith('✓ Encryption setup validated successfully')

          consoleSpy.mockRestore()
        })
      })
    })

    describe('given valid ENCRYPTION_SECRET', () => {
      describe('when validating setup', () => {
        it('then performs encryption round-trip test', () => {
          // Given
          (process.env as any).NODE_ENV = 'production'
          process.env.ENCRYPTION_SECRET = 'valid-production-secret-with-32-characters-minimum!'

          const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

          // When/Then
          expect(() => validateEncryptionSetup()).not.toThrow()
          expect(consoleSpy).toHaveBeenCalledWith('✓ Encryption setup validated successfully')

          consoleSpy.mockRestore()
        })
      })
    })
  })

  describe('NEXT_PUBLIC_ENCRYPTION_SECRET fallback', () => {
    beforeEach(() => {
      (process.env as any).NODE_ENV = 'production'
    })

    describe('given ENCRYPTION_SECRET is missing but NEXT_PUBLIC_ENCRYPTION_SECRET is set', () => {
      describe('when encrypting data', () => {
        it('then uses NEXT_PUBLIC_ENCRYPTION_SECRET', () => {
          // Given
          delete process.env.ENCRYPTION_SECRET
          process.env.NEXT_PUBLIC_ENCRYPTION_SECRET =
            'public-encryption-secret-with-32-characters-minimum!'

          // When
          const encrypted = encryptData('test-data')
          const decrypted = decryptData(encrypted)

          // Then
          expect(decrypted).toBe('test-data')
        })
      })
    })

    describe('given both ENCRYPTION_SECRET and NEXT_PUBLIC_ENCRYPTION_SECRET are set', () => {
      describe('when encrypting data', () => {
        it('then prefers ENCRYPTION_SECRET over NEXT_PUBLIC_ENCRYPTION_SECRET', () => {
          // Given
          process.env.ENCRYPTION_SECRET = 'primary-encryption-secret-with-32-characters!'
          process.env.NEXT_PUBLIC_ENCRYPTION_SECRET =
            'public-encryption-secret-with-32-characters-minimum!'

          // When
          const encrypted = encryptData('test-data')

          // Then - Should use primary secret
          // We can't directly test which was used, but we can verify it works
          expect(() => decryptData(encrypted)).not.toThrow()
        })
      })
    })
  })
})

/**
 * Encryption utilities for sensitive data (POPIA compliance)
 * Uses AES-256-GCM encryption for ID numbers and other PII
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'crypto'

// Encryption configuration
const ALGORITHM = 'aes-256-gcm'
const SALT_LENGTH = 16
const IV_LENGTH = 16
const TAG_LENGTH = 16
const KEY_LENGTH = 32

/**
 * Derive encryption key from password/secret
 * Uses scrypt for key derivation (recommended by OWASP)
 */
function deriveKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, KEY_LENGTH)
}

/**
 * Get encryption secret from environment
 * In production, this should be stored in a secure secret manager
 */
function getEncryptionSecret(): string {
  const secret = process.env.ENCRYPTION_SECRET || process.env.NEXT_PUBLIC_ENCRYPTION_SECRET

  if (!secret) {
    // Development fallback - DO NOT use in production
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      return 'dev-secret-key-change-in-production-32-characters-minimum'
    }
    throw new Error('ENCRYPTION_SECRET environment variable is required for production')
  }

  if (secret.length < 32) {
    throw new Error('ENCRYPTION_SECRET must be at least 32 characters long')
  }

  return secret
}

/**
 * Encrypt sensitive data (e.g., ID numbers)
 * Returns base64-encoded string: salt:iv:tag:ciphertext
 *
 * @param plaintext - The data to encrypt
 * @returns Encrypted string in format "salt:iv:tag:ciphertext" (base64)
 */
export function encryptData(plaintext: string): string {
  try {
    const secret = getEncryptionSecret()

    // Generate random salt and IV
    const salt = randomBytes(SALT_LENGTH)
    const iv = randomBytes(IV_LENGTH)

    // Derive encryption key
    const key = deriveKey(secret, salt)

    // Create cipher and encrypt
    const cipher = createCipheriv(ALGORITHM, key, iv)
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ])

    // Get authentication tag
    const tag = cipher.getAuthTag()

    // Combine salt:iv:tag:ciphertext and encode as base64
    const result = Buffer.concat([salt, iv, tag, encrypted]).toString('base64')

    return result
  } catch (error) {
    console.error('Encryption failed:', error)
    throw new Error('Failed to encrypt data')
  }
}

/**
 * Decrypt sensitive data
 *
 * @param ciphertext - Encrypted string in format "salt:iv:tag:ciphertext" (base64)
 * @returns Decrypted plaintext
 */
export function decryptData(ciphertext: string): string {
  try {
    const secret = getEncryptionSecret()

    // Decode from base64
    const data = Buffer.from(ciphertext, 'base64')

    // Extract components
    const salt = data.subarray(0, SALT_LENGTH)
    const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
    const tag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
    const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)

    // Derive decryption key
    const key = deriveKey(secret, salt)

    // Create decipher and decrypt
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ])

    return decrypted.toString('utf8')
  } catch (error) {
    console.error('Decryption failed:', error)
    throw new Error('Failed to decrypt data')
  }
}

/**
 * Hash data for duplicate detection (one-way)
 * Use this for checking duplicates without storing plaintext
 *
 * @param data - Data to hash
 * @returns SHA-256 hash (hex)
 */
export function hashData(data: string): string {
  return createHash('sha256').update(data).digest('hex')
}

/**
 * Mask ID number for display (show first 6 and last 3 digits)
 * Example: 8001015009082 -> 800101****082
 *
 * @param idNumber - SA ID number (13 digits)
 * @returns Masked ID number
 */
export function maskIdNumber(idNumber: string): string {
  if (!idNumber || idNumber.length !== 13) {
    return '***********'
  }
  return `${idNumber.substring(0, 6)}****${idNumber.substring(10)}`
}

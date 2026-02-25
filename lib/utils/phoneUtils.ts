/**
 * Phone number utilities for South African phone numbers
 */

/**
 * Normalize South African phone number to international format (+27...)
 * TradeSafe API and other services require phone numbers in international format
 *
 * @param phone - Phone number in any format (local or international)
 * @returns Phone number in +27XXXXXXXXX format
 *
 * @example
 * normalizePhoneNumber('0821234567')    // Returns '+27821234567'
 * normalizePhoneNumber('+27821234567')  // Returns '+27821234567'
 * normalizePhoneNumber('27821234567')   // Returns '+27821234567'
 * normalizePhoneNumber(null)            // Returns '+27000000000'
 */
export function normalizePhoneNumber(phone: string | undefined | null): string {
  if (!phone) return '+27000000000'

  // Remove all non-digit characters except leading +
  const cleaned = phone.replace(/[^\d+]/g, '')

  // If already in international format, return as-is
  if (cleaned.startsWith('+27')) {
    return cleaned
  }

  // If starts with 27 (without +), add +
  if (cleaned.startsWith('27') && cleaned.length >= 11) {
    return '+' + cleaned
  }

  // If starts with 0, replace with +27
  if (cleaned.startsWith('0')) {
    return '+27' + cleaned.substring(1)
  }

  // Otherwise, assume it's missing country code
  return '+27' + cleaned
}

/**
 * Validate if a phone number is a valid South African mobile number
 *
 * @param phone - Phone number to validate
 * @returns True if valid SA mobile number
 */
export function isValidSAMobile(phone: string | undefined | null): boolean {
  if (!phone) return false

  const normalized = normalizePhoneNumber(phone)

  // SA mobile numbers: +27 followed by 6, 7, or 8, then 8 more digits
  return /^\+27[678]\d{8}$/.test(normalized)
}

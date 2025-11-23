/**
 * Text Sanitization Utilities for Display
 * Sanitizes user-generated content before rendering in the UI
 */

/**
 * Sanitize text for safe display in the UI
 * Removes HTML tags and dangerous content to prevent XSS
 * Use this for displaying user-generated text that was stored without sanitization
 */
export function sanitizeForDisplay(text: string | undefined): string {
  if (!text) return ''

  return text
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim()
}

/**
 * Escape HTML entities to prevent XSS
 * Use this as an alternative to sanitizeForDisplay when you want to preserve the original text but make it safe
 */
export function escapeHtml(text: string | undefined): string {
  if (!text) return ''

  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

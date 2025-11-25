/**
 * Text Sanitization Utilities for Display
 * Sanitizes user-generated content before rendering in the UI
 *
 * SECURITY: These functions protect against XSS attacks by removing/escaping
 * potentially dangerous HTML and JavaScript content from user input.
 */

/**
 * Sanitize text for safe display in the UI
 * Removes HTML tags and dangerous content to prevent XSS attacks
 *
 * This function:
 * - Removes all HTML tags (including <script>, <iframe>, <object>, etc.)
 * - Removes javascript: and data: protocols
 * - Removes event handlers (onclick, onerror, etc.)
 * - Removes dangerous characters that could break out of context
 *
 * Use this for displaying user-generated text in plain text contexts.
 *
 * @param text - The text to sanitize
 * @returns Sanitized text safe for display
 */
export function sanitizeForDisplay(text: string | undefined): string {
  if (!text) return ''

  return text
    // Remove script tags and their content (case-insensitive, including multiline)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove style tags and their content
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove iframe tags
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    // Remove object/embed tags
    .replace(/<(object|embed)[^>]*>.*?<\/\1>/gi, '')
    // Remove all remaining HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove dangerous protocols
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=/gi, '')
    // Remove HTML entities that could be used for obfuscation
    .replace(/&lt;script/gi, '')
    .replace(/&lt;iframe/gi, '')
    // Trim whitespace
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

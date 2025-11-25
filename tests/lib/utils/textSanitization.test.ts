/**
 * Tests for text sanitization utilities
 * Ensures XSS prevention works correctly in display contexts
 */

import { sanitizeForDisplay, escapeHtml } from '@/lib/utils/textSanitization'

describe('textSanitization', () => {
  describe('sanitizeForDisplay', () => {
    it('should remove script tags and content', () => {
      const input = '<script>alert("xss")</script>Hello World'
      const result = sanitizeForDisplay(input)
      expect(result).toBe('Hello World')
      expect(result).not.toContain('<script>')
      expect(result).not.toContain('alert')
    })

    it('should remove style tags and content', () => {
      const input = '<style>body{display:none}</style>Safe Text'
      const result = sanitizeForDisplay(input)
      expect(result).toBe('Safe Text')
      expect(result).not.toContain('<style>')
    })

    it('should remove iframe tags', () => {
      const input = '<iframe src="malicious.com"></iframe>Content'
      const result = sanitizeForDisplay(input)
      expect(result).toBe('Content')
      expect(result).not.toContain('iframe')
    })

    it('should remove object and embed tags', () => {
      const input1 = '<object data="bad"></object>Text'
      const input2 = '<embed src="bad">Text'
      expect(sanitizeForDisplay(input1)).toBe('Text')
      expect(sanitizeForDisplay(input2)).toBe('Text')
    })

    it('should remove all HTML tags', () => {
      const input = '<div><p>Hello</p><span>World</span></div>'
      const result = sanitizeForDisplay(input)
      expect(result).toBe('HelloWorld')
      expect(result).not.toContain('<')
      expect(result).not.toContain('>')
    })

    it('should remove dangerous protocols', () => {
      const tests = [
        { input: 'javascript:alert("xss")', protocol: 'javascript:' },
        { input: 'data:text/html,<script>', protocol: 'data:' },
        { input: 'vbscript:msgbox()', protocol: 'vbscript:' }
      ]

      tests.forEach(({ input, protocol }) => {
        const result = sanitizeForDisplay(input)
        expect(result).not.toContain(protocol)
      })
    })

    it('should remove event handlers', () => {
      const handlers = [
        'onclick=',
        'onerror=',
        'onload=',
        'onmouseover='
      ]

      handlers.forEach(handler => {
        const input = `Text ${handler}alert() here`
        const result = sanitizeForDisplay(input)
        expect(result).not.toContain(handler)
      })
    })

    it('should remove HTML entity obfuscation', () => {
      const input1 = '&lt;script&gt;alert()&lt;/script&gt;Text'
      const input2 = '&lt;iframe src="bad"&gt;Text'

      expect(sanitizeForDisplay(input1)).not.toContain('&lt;script')
      expect(sanitizeForDisplay(input2)).not.toContain('&lt;iframe')
    })

    it('should handle complex XSS payloads', () => {
      const complexPayloads = [
        '<IMG SRC="javascript:alert(\'XSS\');">',
        '<IMG SRC=JaVaScRiPt:alert(\'XSS\')>',
        '<IMG SRC=`javascript:alert()`>',
        '<SCRIPT>alert(String.fromCharCode(88,83,83))</SCRIPT>',
        '<iframe src=javascript:alert(1)>',
        '<object data="data:text/html,<script>alert(1)</script>">',
        '<embed src="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">',
        '<style>body{background:url("javascript:alert(1)")}</style>'
      ]

      complexPayloads.forEach(payload => {
        const result = sanitizeForDisplay(payload + 'Safe Text')
        expect(result).not.toContain('<')
        expect(result).not.toContain('>')
        expect(result).not.toContain('javascript:')
        expect(result).not.toContain('data:')
        expect(result).toContain('Safe Text')
      })
    })

    it('should preserve safe text content', () => {
      const safeTexts = [
        'Hello, how are you?',
        'I am interested in this opportunity.',
        'Email: test@example.com',
        'Phone: +27 123 456 789',
        'Price: R1,500.00',
        'Date: 2025-01-15'
      ]

      safeTexts.forEach(text => {
        expect(sanitizeForDisplay(text)).toBe(text)
      })
    })

    it('should trim whitespace', () => {
      const input = '   Hello World   '
      expect(sanitizeForDisplay(input)).toBe('Hello World')
    })

    it('should return empty string for empty input', () => {
      expect(sanitizeForDisplay('')).toBe('')
      expect(sanitizeForDisplay(undefined)).toBe('')
    })

    it('should handle multiline content', () => {
      const input = 'Line 1\nLine 2\nLine 3'
      const result = sanitizeForDisplay(input)
      expect(result).toContain('Line 1')
      expect(result).toContain('Line 2')
      expect(result).toContain('Line 3')
    })
  })

  describe('escapeHtml', () => {
    it('should escape HTML entities', () => {
      const input = '<script>alert("xss")</script>'
      const result = escapeHtml(input)
      // Result should contain escaped entities
      expect(result).toContain('&lt;')
      expect(result).toContain('&gt;')
      expect(result).not.toBe(input)
    })

    it('should return empty string for empty input', () => {
      expect(escapeHtml('')).toBe('')
      expect(escapeHtml(undefined)).toBe('')
    })
  })
})

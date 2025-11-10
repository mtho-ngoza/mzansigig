import { OCRService } from '@/lib/services/ocrService'

// Mock fetch for API calls
global.fetch = jest.fn()

describe('OCRService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('extractDocumentText', () => {
    it('should return success=false when OCR API returns no text', async () => {
      // Mock API returning no text detected
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          extractedText: '',
          confidence: 0,
          error: 'No text detected in document. Please ensure the image is clear and well-lit.'
        })
      })

      const result = await OCRService.extractDocumentText('https://example.com/test.jpg', 'test-user-123')

      expect(result.success).toBe(false)
      expect(result.extractedText).toBe('')
      expect(result.confidence).toBe(0)
      expect(result.error).toContain('No text detected')
    })

    it('should return success=true when OCR extracts text successfully', async () => {
      const mockText = `REPUBLIC OF SOUTH AFRICA
IDENTITY DOCUMENT
SURNAME: MTHOBISI
NAMES: JOHN
ID: 9001015001083
Date of Birth: 01 JAN 1990`

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          extractedText: mockText,
          confidence: 95
        })
      })

      const result = await OCRService.extractDocumentText('https://example.com/test.jpg', 'test-user-123')

      expect(result.success).toBe(true)
      expect(result.extractedText).toBe(mockText)
      expect(result.confidence).toBe(95)
      expect(result.extractedData?.idNumber).toBe('9001015001083')
      expect(result.extractedData?.names).toContain('MTHOBISI')
    })

    it('should return error when API route fails', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      })

      const result = await OCRService.extractDocumentText('https://example.com/test.jpg', 'test-user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })
  })

  describe('parseSAIdText', () => {
    it('should extract ID number from text', () => {
      const text = 'ID: 9001015001083'
      // Access private method via any for testing
      const result = (OCRService as any).parseSAIdText(text)

      expect(result.idNumber).toBe('9001015001083')
    })

    it('should extract names from text', () => {
      const text = `SURNAME: SMITH
NAMES: JOHN DAVID`
      const result = (OCRService as any).parseSAIdText(text)

      expect(result.names).toContain('SMITH')
      expect(result.names).toContain('JOHN DAVID')
    })
  })

  describe('compareNames', () => {
    it('should return match=true for exact name matches', () => {
      const extractedNames = ['SMITH', 'JOHN']
      const result = OCRService.compareNames(extractedNames, 'John', 'Smith')

      expect(result.match).toBe(true)
      expect(result.confidence).toBeGreaterThanOrEqual(80)
    })

    it('should return match=false when names do not match', () => {
      const extractedNames = ['JONES', 'MARY']
      const result = OCRService.compareNames(extractedNames, 'John', 'Smith')

      expect(result.match).toBe(false)
      expect(result.confidence).toBeLessThan(80)
      expect(result.issues.length).toBeGreaterThan(0)
    })

    it('should return match=false when no names extracted', () => {
      const result = OCRService.compareNames([], 'John', 'Smith')

      expect(result.match).toBe(false)
      expect(result.confidence).toBe(0)
      expect(result.issues).toContain('No names could be extracted from document')
    })
  })

  describe('validateIdNumber', () => {
    it('should return match=true for matching ID numbers', () => {
      const result = OCRService.validateIdNumber('9001015001083', '9001015001083')

      expect(result.match).toBe(true)
      expect(result.extractedId).toBe('9001015001083')
      expect(result.issues).toHaveLength(0)
    })

    it('should return match=false for non-matching ID numbers', () => {
      const result = OCRService.validateIdNumber('9001015001083', '8001015001083')

      expect(result.match).toBe(false)
      expect(result.issues.length).toBeGreaterThan(0)
    })

    it('should return match=false when ID not extracted', () => {
      const result = OCRService.validateIdNumber(undefined, '9001015001083')

      expect(result.match).toBe(false)
      expect(result.issues).toContain('No ID number could be extracted from document')
    })
  })
})

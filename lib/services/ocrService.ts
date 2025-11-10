// OCR Service for document text extraction
export interface OCRResult {
  success: boolean
  extractedText: string
  confidence: number
  error?: string
  extractedData?: {
    names?: string[]
    idNumber?: string
    dateOfBirth?: string
    gender?: string
  }
}

export class OCRService {
  /**
   * Extract text from document using Google Vision API via server-side API route
   * Cost: ~$0.015 per document (very affordable for verification)
   */
  static async extractDocumentText(imageUrl: string, userId: string): Promise<OCRResult> {
    try {
      console.log('Starting OCR extraction via Google Vision API...')

      // Call server-side API route for secure OCR processing
      const response = await fetch('/api/ocr/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl, userId })
      })

      if (!response.ok) {
        throw new Error(`OCR API error: ${response.statusText}`)
      }

      const data = await response.json()

      // If Vision API failed or returned no results
      if (!data.success) {
        console.error('Vision API failed:', data.error)
        return {
          success: false,
          extractedText: '',
          confidence: 0,
          error: data.error || 'Failed to extract text from document'
        }
      }

      // Parse the extracted text for SA ID specific data
      const extractedData = this.parseSAIdText(data.extractedText)

      console.log('✅ OCR Success! Extracted', data.extractedText, 'characters')

      return {
        success: true,
        extractedText: data.extractedText,
        confidence: data.confidence,
        extractedData
      }

    } catch (error) {
      console.error('OCR extraction failed:', error)
      return {
        success: false,
        extractedText: '',
        confidence: 0,
        error: error instanceof Error ? error.message : 'OCR processing failed'
      }
    }
  }

  /**
   * Parse extracted text to find SA ID specific information
   */
  private static parseSAIdText(text: string): OCRResult['extractedData'] {
    const result: OCRResult['extractedData'] = {}

    // Extract ID number (13 digits)
    const idMatches = text.match(/\b\d{13}\b/g)
    if (idMatches) {
      result.idNumber = idMatches[0]
    }

    // Extract names (look for common SA ID patterns)
    // Match everything up to newline or end, excluding newlines from capture
    // Use word boundaries to avoid matching "NAME" within "SURNAME"
    const surnameMatch = text.match(/\b(?:SURNAME|FAMILYNAME)[\s:]+([^\n\r]+)/i)
    const namesMatch = text.match(/\b(?:NAMES?|GIVEN\s*NAMES?)[\s:]+([^\n\r]+)/i)

    const names = []
    if (surnameMatch) {
      // Clean up newlines and extra whitespace
      const surname = surnameMatch[1].trim().replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ')
      if (surname && surname.length > 1) {
        names.push(surname)
      }
    }
    if (namesMatch) {
      // Clean up newlines and extra whitespace
      const givenNames = namesMatch[1].trim().replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ')
      if (givenNames && givenNames.length > 1) {
        names.push(givenNames)
      }
    }

    // Also look for standalone name patterns
    const namePatterns = [
      /^([A-Z]{2,})\s+([A-Z]{2,}(?:\s+[A-Z]{2,})*)$/m, // "SMITH JOHN DAVID"
      /([A-Z]{3,})\s*$/m // Names at end of line
    ]

    for (const pattern of namePatterns) {
      const match = text.match(pattern)
      if (match) {
        names.push(match[1], ...match.slice(2).filter(Boolean))
        break
      }
    }

    if (names.length > 0) {
      result.names = [...new Set(names)] // Remove duplicates
    }

    // Extract date of birth
    const dobPatterns = [
      /(?:DOB|Date\s*of\s*Birth)[\s:]*(\d{1,2})\s*(?:\/|-|\s)(\d{1,2})\s*(?:\/|-|\s)(\d{4})/i,
      /(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{4})/i
    ]

    for (const pattern of dobPatterns) {
      const match = text.match(pattern)
      if (match) {
        result.dateOfBirth = match[0].trim()
        break
      }
    }

    // Extract gender
    const genderMatch = text.match(/(?:Gender|Sex)[\s:]*([MF])/i)
    if (genderMatch) {
      result.gender = genderMatch[1].toUpperCase() === 'M' ? 'Male' : 'Female'
    }

    return result
  }

  /**
   * Compare extracted names with profile names
   */
  static compareNames(extractedNames: string[], profileFirstName: string, profileLastName: string): {
    match: boolean
    confidence: number
    matchedNames: string[]
    issues: string[]
  } {
    const issues: string[] = []
    const matchedNames: string[] = []

    if (!extractedNames || extractedNames.length === 0) {
      return {
        match: false,
        confidence: 0,
        matchedNames: [],
        issues: ['No names could be extracted from document']
      }
    }

    const profileNames = [profileFirstName.toUpperCase(), profileLastName.toUpperCase()]
    const extractedUpper = extractedNames.map(name => name.toUpperCase())

    let matchScore = 0
    const totalChecks = profileNames.length

    // Check each profile name against extracted names
    for (const profileName of profileNames) {
      let found = false

      for (const extractedName of extractedUpper) {
        // Exact match
        if (extractedName === profileName) {
          matchedNames.push(extractedName)
          matchScore += 1
          found = true
          break
        }

        // Partial match (name contains profile name or vice versa)
        if (extractedName.includes(profileName) || profileName.includes(extractedName)) {
          if (Math.abs(extractedName.length - profileName.length) <= 2) {
            matchedNames.push(extractedName)
            matchScore += 0.8
            found = true
            break
          }
        }
      }

      if (!found) {
        issues.push(`Profile name "${profileName}" not found in document`)
      }
    }

    const confidence = Math.round((matchScore / totalChecks) * 100)
    const match = confidence >= 80 // Require 80% confidence

    return {
      match,
      confidence,
      matchedNames,
      issues
    }
  }

  /**
   * Validate extracted ID number against profile ID number
   */
  static validateIdNumber(extractedId: string | undefined, profileId: string): {
    match: boolean
    extractedId?: string
    issues: string[]
  } {
    const issues: string[] = []

    if (!extractedId) {
      return {
        match: false,
        issues: ['No ID number could be extracted from document']
      }
    }

    const cleanExtracted = extractedId.replace(/\s/g, '')
    const cleanProfile = profileId.replace(/\s/g, '')

    if (cleanExtracted !== cleanProfile) {
      issues.push(`ID number mismatch: document shows "${cleanExtracted}", profile shows "${cleanProfile}"`)
      return {
        match: false,
        extractedId: cleanExtracted,
        issues
      }
    }

    return {
      match: true,
      extractedId: cleanExtracted,
      issues: []
    }
  }
}
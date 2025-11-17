import { DocumentStorageService } from './documentStorageService'
import { SecurityService } from './securityService'
import { getAuth } from 'firebase/auth'
import { OCRService } from './ocrService'

export interface SimpleVerificationResult {
  isValid: boolean
  confidence: number
  issues: string[]
  matches: {
    idNumber: boolean
    name: boolean
    hasRequiredData: boolean
  }
  recommendations: string[]
  ocrResults?: {
    extractedText: string
    extractedNames: string[]
    extractedId?: string
    nameMatchConfidence: number
  }
}

export class SimpleIdVerification {
  /**
   * Validate SA ID number using mathematical algorithm
   * No external APIs - purely algorithmic validation
   */
  static validateSAIdNumber(idNumber: string): {
    isValid: boolean
    dateOfBirth?: Date
    age?: number
    gender?: 'Male' | 'Female'
    citizenship?: 'Citizen' | 'Permanent Resident'
    errors: string[]
  } {
    const errors: string[] = []

    // Remove spaces and validate format
    const cleanId = idNumber.replace(/\s/g, '')
    if (!/^\d{13}$/.test(cleanId)) {
      errors.push('ID number must be exactly 13 digits')
      return { isValid: false, errors }
    }

    // Extract date components (YYMMDD)
    const year = parseInt(cleanId.substring(0, 2))
    const month = parseInt(cleanId.substring(2, 4))
    const day = parseInt(cleanId.substring(4, 6))

    // Determine full year
    const currentYear = new Date().getFullYear()
    const fullYear = year + (year <= (currentYear % 100) ? 2000 : 1900)

    // Validate date
    const dateOfBirth = new Date(fullYear, month - 1, day)
    if (dateOfBirth.getFullYear() !== fullYear ||
        dateOfBirth.getMonth() !== month - 1 ||
        dateOfBirth.getDate() !== day) {
      errors.push('Invalid date of birth in ID number')
    }

    // Check reasonable age limits
    const age = Math.floor((Date.now() - dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    if (age < 16 || age > 120) {
      errors.push(`Age ${age} is outside reasonable limits (16-120 years)`)
    }

    // Gender (position 7: 0-4 female, 5-9 male)
    const genderDigit = parseInt(cleanId.substring(6, 7))
    const gender = genderDigit < 5 ? 'Female' : 'Male'

    // Citizenship (position 11: 0=citizen, 1=permanent resident)
    const citizenshipDigit = parseInt(cleanId.substring(10, 11))
    const citizenship = citizenshipDigit === 0 ? 'Citizen' : 'Permanent Resident'

    // SA ID number checksum validation (South African algorithm)
    const digits = cleanId.substring(0, 12).split('').map(Number)
    const checkDigit = parseInt(cleanId.charAt(12))

    // Sum digits at odd positions (1st, 3rd, 5th, etc.)
    let sumOdd = 0
    for (let i = 0; i < 12; i += 2) {
      sumOdd += digits[i]
    }

    // Concatenate digits at even positions (2nd, 4th, 6th, etc.)
    let evenDigits = ''
    for (let i = 1; i < 12; i += 2) {
      evenDigits += digits[i]
    }

    // Multiply concatenated even digits by 2
    const evenNumber = parseInt(evenDigits) * 2

    // Sum the digits of the result
    let sumEvenProcessed = 0
    const evenStr = evenNumber.toString()
    for (let i = 0; i < evenStr.length; i++) {
      sumEvenProcessed += parseInt(evenStr.charAt(i))
    }

    // Calculate check digit
    const totalSum = sumOdd + sumEvenProcessed
    const calculatedCheckDigit = (10 - (totalSum % 10)) % 10

    if (calculatedCheckDigit !== checkDigit) {
      errors.push('ID number checksum validation failed')
    }

    return {
      isValid: errors.length === 0,
      dateOfBirth: errors.length === 0 ? dateOfBirth : undefined,
      age: errors.length === 0 ? age : undefined,
      gender: errors.length === 0 ? gender : undefined,
      citizenship: errors.length === 0 ? citizenship : undefined,
      errors
    }
  }

  /**
   * Cross-reference document with user profile
   */
  static async verifyDocumentAgainstProfile(
    documentId: string
  ): Promise<SimpleVerificationResult> {
    try {
      const document = await DocumentStorageService.getDocument(documentId)
      if (!document) {
        return {
          isValid: false,
          confidence: 0,
          issues: ['Document not found'],
          matches: { idNumber: false, name: false, hasRequiredData: false },
          recommendations: ['Please re-upload the document']
        }
      }

      const auth = getAuth()
      const currentUser = auth.currentUser
      if (!currentUser) {
        return {
          isValid: false,
          confidence: 0,
          issues: ['User not authenticated'],
          matches: {
            idNumber: false,
            name: false,
            hasRequiredData: false
          },
          recommendations: ['Please log in again']
        }
      }
      const user = await SecurityService.getUser(currentUser.uid)
      if (!user) {
        return {
          isValid: false,
          confidence: 0,
          issues: ['User profile not found'],
          matches: { idNumber: false, name: false, hasRequiredData: false },
          recommendations: ['User must complete profile setup']
        }
      }

      const result: SimpleVerificationResult = {
        isValid: true,
        confidence: 0,
        issues: [],
        matches: {
          idNumber: false,
          name: false,
          hasRequiredData: false
        },
        recommendations: []
      }

      // STRICT document format validation - reject fake documents
      const invalidFormats = [
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'text/plain',
        'application/rtf',
        'text/rtf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint'
      ]

      if (invalidFormats.includes(document.mimeType)) {
        result.issues.push(`Invalid document format: Word documents, text files, and spreadsheets are not accepted. Please upload a photo or scan of the original physical document.`)
        result.recommendations.push('Take a clear photo of your physical ID document using your phone camera')
        return result
      }

      // Check file extension for additional validation
      const fileExtension = document.fileName.toLowerCase().split('.').pop()
      const suspiciousExtensions = ['doc', 'docx', 'txt', 'rtf', 'xls', 'xlsx', 'ppt', 'pptx']
      if (suspiciousExtensions.includes(fileExtension || '')) {
        result.issues.push(`File extension .${fileExtension} is not allowed. Only photos (JPG, PNG) or PDF scans of original documents are accepted.`)
        result.recommendations.push('Use your phone camera to take a photo of the physical document')
        return result
      }

      // Valid formats for ID documents
      const validFormats = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
      if (!validFormats.includes(document.mimeType)) {
        result.issues.push(`Unsupported file format: ${document.mimeType}. Please upload JPG, PNG, or PDF only.`)
        result.recommendations.push('Convert or retake the photo in a supported format')
        return result
      }

      // Check if user has ID number
      if (!user.idNumber) {
        result.issues.push('User has not provided ID number in profile')
        result.recommendations.push('User must add ID number to profile before verification')
      } else {
        result.matches.hasRequiredData = true

        // Validate the user's ID number
        const idValidation = this.validateSAIdNumber(user.idNumber)
        if (!idValidation.isValid) {
          result.issues.push(`Invalid ID number: ${idValidation.errors.join(', ')}`)
          result.recommendations.push('User must provide a valid SA ID number')
        } else {
          // ID number format is valid, but actual match will be verified via OCR
          // Confidence will be added after OCR verification
        }

        // Strict name and ID cross-reference validation
        // Since we can't do OCR, we need to validate what we CAN check

        if (!user.firstName || !user.lastName) {
          result.issues.push('User profile missing first name or last name')
          result.recommendations.push('Complete user profile with full name before verification')
        } else {
          // Name verification will be done via OCR
          // Confidence will be added after OCR verification
        }

        // CRITICAL: Cross-reference ID number from profile with document type
        if (document.type === 'sa_id') {
          // The ID number in user profile should match the document being verified
          // This will be verified via OCR
          // Confidence will be added after OCR verification

          // Additional validation: ensure ID number belongs to expected age/gender ranges
          if (idValidation.age && idValidation.age < 16) {
            result.issues.push('ID number indicates person under 16 years old - not eligible for platform')
            result.recommendations.push('Verify you have entered the correct ID number')
          }

          // Warning for very old ages (might be typos)
          if (idValidation.age && idValidation.age > 80) {
            result.issues.push('ID number indicates unusually old age - please verify ID number is correct')
            result.recommendations.push('Double-check that you entered your ID number correctly')
          }
        } else {
          // For other document types, we need to be more strict
          result.issues.push('Currently only SA ID documents can be automatically verified')
          result.recommendations.push('Please upload your South African ID document for verification')
        }
      }

      // Document type specific checks
      if (document.type === 'sa_id') {
        // SA ID is primary verification document
        // Confidence will be added after OCR verification
      }

      // Stricter file quality checks
      const fileSizeMB = document.fileSize / (1024 * 1024)
      if (fileSizeMB < 0.05) {
        result.issues.push('File size too small (less than 50KB) - likely not a genuine document photo')
        result.recommendations.push('Take a higher quality photo of the physical document')
      } else if (fileSizeMB > 15) {
        result.issues.push('File size too large (over 15MB)')
        result.recommendations.push('Compress image to under 15MB')
      } else {
        // File size OK - confidence will be added after OCR verification
      }

      // Additional suspicious file checks
      if (document.fileName.toLowerCase().includes('untitled') ||
          document.fileName.toLowerCase().includes('document') ||
          document.fileName.toLowerCase().includes('test')) {
        result.issues.push('Suspicious filename detected - please ensure you are uploading a genuine document')
        result.recommendations.push('Rename your file to something more descriptive')
      }

      // For SA ID documents, add extra strictness for image quality (but allow PDFs)
      if (document.type === 'sa_id') {
        // Allow PDFs but prefer photos for better OCR
        if (document.mimeType === 'application/pdf') {
          // PDFs are allowed but may have lower OCR accuracy
          result.recommendations.push('For best results, use a clear photo (JPG/PNG) instead of PDF')
        } else if (!['image/jpeg', 'image/jpg', 'image/png'].includes(document.mimeType)) {
          result.issues.push('Invalid file format. SA ID documents must be photos (JPG/PNG) or PDF scans')
          result.recommendations.push('Use your phone camera to photograph the physical ID card or upload a PDF scan')
        }

        if (fileSizeMB < 0.2 && document.mimeType !== 'application/pdf') {
          result.issues.push('ID photo too small - take a closer, clearer photo')
          result.recommendations.push('Ensure the ID fills most of the frame and is clearly readable')
        }
      }

      // OCR TEXT EXTRACTION AND VERIFICATION
      try {
        console.log('Starting OCR extraction for document:', documentId)
        const ocrResult = await OCRService.extractDocumentText(document.fileUrl, document.userId)

        if (ocrResult.success && ocrResult.extractedData) {
          result.ocrResults = {
            extractedText: ocrResult.extractedText,
            extractedNames: ocrResult.extractedData.names || [],
            extractedId: ocrResult.extractedData.idNumber,
            nameMatchConfidence: 0
          }

          // Base confidence for successful OCR
          result.confidence += 30 // OCR successfully extracted text

          // 1. Verify ID number match
          const idCheck = OCRService.validateIdNumber(ocrResult.extractedData.idNumber, user?.idNumber || '')
          if (!idCheck.match) {
            result.issues.push(...idCheck.issues)
            result.matches.idNumber = false
            result.confidence -= 30
          } else {
            result.matches.idNumber = true
            result.confidence += 25 // ID number matches
            console.log('✓ ID number verified via OCR')
          }

          // 2. Verify name match
          if (ocrResult.extractedData.names && user?.firstName && user?.lastName) {
            const nameCheck = OCRService.compareNames(
              ocrResult.extractedData.names,
              user.firstName,
              user.lastName
            )

            result.ocrResults.nameMatchConfidence = nameCheck.confidence
            result.matches.name = nameCheck.match

            if (nameCheck.match) {
              result.confidence += 30 // Names match
              console.log(`✓ Name verified via OCR (${nameCheck.confidence}% confidence)`)
            } else {
              result.issues.push(...nameCheck.issues)
              result.confidence -= 20
              console.log(`✗ Name verification failed (${nameCheck.confidence}% confidence)`)
            }
          } else {
            result.issues.push('Could not extract names from document for verification')
            result.recommendations.push('Ensure document image is clear and names are visible')
            result.confidence -= 15
          }

          // 3. Overall OCR confidence check
          if (ocrResult.confidence < 70) {
            result.issues.push(`Document text quality too low (${ocrResult.confidence}% confidence)`)
            result.recommendations.push('Take a clearer photo with better lighting and focus')
            result.confidence -= 10
          } else {
            result.confidence += 15 // Good OCR quality
          }

        } else {
          // OCR failed completely
          result.issues.push('Could not extract text from document')
          result.recommendations.push('Please take a clearer photo of the document with good lighting')
          result.confidence -= 15
          console.log('✗ OCR extraction failed:', ocrResult.error)
        }

      } catch (ocrError) {
        console.error('OCR processing error:', ocrError)
        result.issues.push('Document text processing failed')
        result.recommendations.push('Please try uploading a different photo of your document')
        result.confidence -= 10
      }

      // Overall validation - WITH OCR verification
      const hasValidIdNumber = result.matches.idNumber && Boolean(user?.idNumber)
      const hasValidNameMatch = result.matches.name
      const hasBasicInfo = result.matches.hasRequiredData
      const noFormatIssues = !result.issues.some(issue =>
        issue.includes('Invalid document format') ||
        issue.includes('File extension') ||
        issue.includes('Suspicious filename')
      )

      // OCR-based verification requires both ID and name matches
      result.isValid = (
        result.issues.length === 0 &&
        result.confidence >= 75 &&
        hasValidIdNumber &&
        hasValidNameMatch &&  // Now requires name match via OCR
        hasBasicInfo &&
        noFormatIssues
      )

      // Add success confirmation for OCR verification
      if (result.isValid && result.ocrResults) {
        result.recommendations.push(
          `✅ Verified via OCR: Name "${result.ocrResults.extractedNames.join(' ')}" ` +
          `and ID "${result.ocrResults.extractedId}" match your profile.`
        )
      }

      if (!result.isValid && result.issues.length === 0) {
        result.issues.push('Verification confidence too low for automatic approval')
        result.recommendations.push('Document requires manual review due to insufficient confidence score')
      }

      return result
    } catch (error) {
      console.error('Error verifying document against profile:', error)
      return {
        isValid: false,
        confidence: 0,
        issues: ['Verification system error'],
        matches: { idNumber: false, name: false, hasRequiredData: false },
        recommendations: ['Please try again or contact support']
      }
    }
  }

  /**
   * Process document verification and update status
   */
  static async processDocumentVerification(documentId: string): Promise<{
    success: boolean
    status: 'verified' | 'rejected' | 'pending'
    message: string
    details?: SimpleVerificationResult
  }> {
    try {
      const auth = getAuth()
      const currentUser = auth.currentUser
      if (!currentUser) {
        return {
          success: false,
          status: 'rejected',
          message: 'User not authenticated'
        }
      }

      const verificationResult = await this.verifyDocumentAgainstProfile(documentId)

      let status: 'verified' | 'rejected' | 'pending' = 'pending'
      let message = ''

      if (verificationResult.isValid && verificationResult.confidence >= 75) {
        status = 'verified'
        message = 'Document successfully verified automatically via OCR'

        // Update user verification status
        const document = await DocumentStorageService.getDocument(documentId)
        if (document) {
          await SecurityService.updateUserVerificationLevel(
            currentUser.uid,
            document.verificationLevel
          )
          await SecurityService.updateTrustScore(
            currentUser.uid,
            'document_verified',
            15,
            `${document.type} document verified`
          )
        }
      } else if (verificationResult.issues.some(issue =>
        issue.includes('checksum') ||
        issue.includes('Invalid ID number') ||
        issue.includes('file size too small') ||
        issue.includes('Could not extract text from document') ||
        issue.includes('Invalid document format') ||
        issue.includes('File extension')
      )) {
        // Reject documents with critical failures
        status = 'rejected'
        message = `Document rejected: ${verificationResult.issues.join(', ')}`
      } else {
        // Documents that don't meet verification threshold go to manual review
        status = 'pending'
        message = `Document pending manual review (confidence: ${verificationResult.confidence}%)`
      }

      // Update document status with verification attempt details
      await DocumentStorageService.updateDocumentStatus(
        documentId,
        status,
        message,
        'system',
        {
          confidence: verificationResult.confidence,
          issues: verificationResult.issues,
          ocrExtractedText: verificationResult.ocrResults?.extractedText
        }
      )

      return {
        success: true,
        status,
        message,
        details: verificationResult
      }
    } catch (error) {
      console.error('Error processing document verification:', error)

      // Update document status to pending for manual review
      await DocumentStorageService.updateDocumentStatus(
        documentId,
        'pending',
        'Automatic verification failed - requires manual review',
        'system'
      )

      return {
        success: false,
        status: 'pending',
        message: 'Verification failed - document will be manually reviewed'
      }
    }
  }

  /**
   * Get verification summary for user
   */
  static async getUserVerificationSummary(userId: string): Promise<{
    totalDocuments: number
    verified: number
    pending: number
    rejected: number
    verificationLevel?: 'basic' | 'enhanced' | 'premium'
    nextSteps: string[]
  }> {
    try {
      const documents = await DocumentStorageService.getUserDocuments(userId)
      const user = await SecurityService.getUser(userId)

      const summary = documents.reduce(
        (acc, doc) => {
          acc.totalDocuments++
          if (doc.status === 'verified') acc.verified++
          else if (doc.status === 'rejected') acc.rejected++
          else acc.pending++
          return acc
        },
        { totalDocuments: 0, verified: 0, pending: 0, rejected: 0 }
      )

      const nextSteps: string[] = []

      if (!user?.idNumber) {
        nextSteps.push('Add ID number to your profile')
      }

      if (summary.rejected > 0) {
        nextSteps.push('Re-upload rejected documents with clearer images')
      }

      if (summary.pending > 0) {
        nextSteps.push('Wait for manual review of pending documents')
      }

      if (summary.verified === 0 && documents.length === 0) {
        nextSteps.push('Upload your first identity document to start verification')
      }

      return {
        ...summary,
        verificationLevel: user?.verificationLevel,
        nextSteps
      }
    } catch (error) {
      console.error('Error getting user verification summary:', error)
      return {
        totalDocuments: 0,
        verified: 0,
        pending: 0,
        rejected: 0,
        nextSteps: ['Error loading verification status']
      }
    }
  }
}
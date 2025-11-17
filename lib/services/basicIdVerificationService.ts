import { db } from '@/lib/firebase'
import { getAuth } from 'firebase/auth'
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
  limit
} from 'firebase/firestore'
import { VerificationDocument } from '@/types/auth'
import { DocumentStorageService } from './documentStorageService'
import { SecurityService } from './securityService'

export interface BasicVerificationResult {
  id: string
  documentId: string
  userId: string
  documentType: VerificationDocument['type']
  status: 'processing' | 'verified' | 'rejected' | 'requires_manual_review'
  verificationScore: number
  extractedData: {
    idNumber?: string
    fullName?: string
    dateOfBirth?: string
    gender?: string
    citizenship?: string
    validationChecks?: {
      idNumberFormat: boolean
      idNumberChecksum: boolean
      ageValidation: boolean
      genderValidation: boolean
    }
  }
  verificationChecks: {
    documentFormat: {
      passed: boolean
      score: number
      checks: {
        fileType: boolean
        fileSize: boolean
        imageQuality?: boolean
      }
    }
    idNumberValidation: {
      passed: boolean
      score: number
      checks: {
        format: boolean
        checksum: boolean
        dateOfBirth: boolean
        gender: boolean
        citizenship: boolean
      }
    }
    userCrossReference: {
      passed: boolean
      score: number
      matches: {
        name?: boolean
        phone?: boolean
        providedIdNumber?: boolean
      }
    }
  }
  flags: string[]
  notes?: string
  reviewedBy?: string
  reviewedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export class BasicIdVerificationService {
  /**
   * Free SA ID Number validation using standard algorithms
   * No external API calls - uses mathematical validation only
   */
  static validateSAIdNumber(idNumber: string): {
    isValid: boolean
    dateOfBirth?: Date
    gender?: 'Male' | 'Female'
    citizenship?: 'Citizen' | 'Permanent Resident'
    errors: string[]
  } {
    const errors: string[] = []

    // Basic format check
    if (!/^\d{13}$/.test(idNumber)) {
      errors.push('ID number must be exactly 13 digits')
      return { isValid: false, errors }
    }

    // Extract date components (YYMMDD)
    const year = parseInt(idNumber.substring(0, 2))
    const month = parseInt(idNumber.substring(2, 4))
    const day = parseInt(idNumber.substring(4, 6))

    // Determine century (SA ID logic)
    const currentYear = new Date().getFullYear()
    const currentCentury = Math.floor(currentYear / 100) * 100
    const fullYear = year + (year <= (currentYear % 100) ? currentCentury : currentCentury - 100)

    // Validate date
    const dateOfBirth = new Date(fullYear, month - 1, day)
    if (dateOfBirth.getFullYear() !== fullYear ||
        dateOfBirth.getMonth() !== month - 1 ||
        dateOfBirth.getDate() !== day) {
      errors.push('Invalid date of birth in ID number')
    }

    // Check if date is in future
    if (dateOfBirth > new Date()) {
      errors.push('Date of birth cannot be in the future')
    }

    // Validate age (must be at least 16 for most services)
    const age = Math.floor((Date.now() - dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    if (age < 16) {
      errors.push('Person must be at least 16 years old')
    }

    // Gender determination (digit 7)
    const genderDigit = parseInt(idNumber.substring(6, 7))
    const gender = genderDigit < 5 ? 'Female' : 'Male'

    // Citizenship (digit 11: 0=Citizen, 1=Permanent Resident)
    const citizenshipDigit = parseInt(idNumber.substring(10, 11))
    const citizenship = citizenshipDigit === 0 ? 'Citizen' : 'Permanent Resident'

    // Luhn algorithm checksum validation
    const checksumValid = this.validateIdChecksum(idNumber)
    if (!checksumValid) {
      errors.push('Invalid ID number checksum')
    }

    return {
      isValid: errors.length === 0,
      dateOfBirth: errors.length === 0 ? dateOfBirth : undefined,
      gender: errors.length === 0 ? gender : undefined,
      citizenship: errors.length === 0 ? citizenship : undefined,
      errors
    }
  }

  private static validateIdChecksum(idNumber: string): boolean {
    const digits = idNumber.split('').map(Number)
    const checkDigit = digits.pop()!

    let sum = 0
    let alternate = false

    // Process from right to left (excluding check digit)
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = digits[i]
      if (alternate) {
        digit *= 2
        if (digit > 9) digit -= 9
      }
      sum += digit
      alternate = !alternate
    }

    const calculatedCheckDigit = (10 - (sum % 10)) % 10
    return calculatedCheckDigit === checkDigit
  }

  /**
   * Basic document analysis without external OCR APIs
   * Uses file metadata and basic validation
   */
  static async analyzeDocument(document: VerificationDocument): Promise<{
    quality: number
    extractable: boolean
    fileAnalysis: {
      validFormat: boolean
      appropriateSize: boolean
      notCorrupted: boolean
    }
  }> {
    const analysis = {
      quality: 0,
      extractable: false,
      fileAnalysis: {
        validFormat: false,
        appropriateSize: false,
        notCorrupted: true // Assume not corrupted if uploaded successfully
      }
    }

    // Check file format
    const validFormats = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    analysis.fileAnalysis.validFormat = validFormats.includes(document.mimeType)
    if (analysis.fileAnalysis.validFormat) analysis.quality += 25

    // Check file size (between 100KB and 10MB is reasonable)
    const sizeMB = document.fileSize / (1024 * 1024)
    analysis.fileAnalysis.appropriateSize = sizeMB >= 0.1 && sizeMB <= 10
    if (analysis.fileAnalysis.appropriateSize) analysis.quality += 25

    // Basic quality indicators
    if (document.fileName.toLowerCase().includes('id') ||
        document.fileName.toLowerCase().includes('identity')) {
      analysis.quality += 15
    }

    // Document type specific checks
    if (document.type === 'sa_id') {
      analysis.quality += 20 // SA ID is primary verification document
      analysis.extractable = true
    }

    if (analysis.quality >= 70) {
      analysis.extractable = true
    }

    return analysis
  }

  /**
   * Process document verification using free validation methods
   */
  static async processDocumentVerification(documentId: string): Promise<BasicVerificationResult> {
    try {
      const document = await DocumentStorageService.getDocument(documentId)
      if (!document) {
        throw new Error('Document not found')
      }

      // Get current user data for cross-referencing
      const auth = getAuth()
      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error('User not authenticated')
      }
      const user = await SecurityService.getUser(currentUser.uid)

      const result: Omit<BasicVerificationResult, 'id' | 'createdAt' | 'updatedAt'> = {
        documentId,
        userId: currentUser.uid,
        documentType: document.type,
        status: 'processing',
        verificationScore: 0,
        extractedData: {},
        verificationChecks: {
          documentFormat: {
            passed: false,
            score: 0,
            checks: { fileType: false, fileSize: false }
          },
          idNumberValidation: {
            passed: false,
            score: 0,
            checks: {
              format: false,
              checksum: false,
              dateOfBirth: false,
              gender: false,
              citizenship: false
            }
          },
          userCrossReference: {
            passed: false,
            score: 0,
            matches: {}
          }
        },
        flags: []
      }

      // 1. Document Format Validation
      const docAnalysis = await this.analyzeDocument(document)
      result.verificationChecks.documentFormat = {
        passed: docAnalysis.quality >= 70,
        score: docAnalysis.quality,
        checks: {
          fileType: docAnalysis.fileAnalysis.validFormat,
          fileSize: docAnalysis.fileAnalysis.appropriateSize,
          imageQuality: docAnalysis.fileAnalysis.notCorrupted
        }
      }

      // 2. ID Number Validation (if provided or extractable)
      const idNumberToValidate = user?.idNumber

      if (document.type === 'sa_id' && idNumberToValidate) {
        const idValidation = this.validateSAIdNumber(idNumberToValidate)

        result.extractedData = {
          idNumber: idNumberToValidate,
          dateOfBirth: idValidation.dateOfBirth?.toISOString().split('T')[0],
          gender: idValidation.gender,
          citizenship: idValidation.citizenship,
          validationChecks: {
            idNumberFormat: idValidation.isValid,
            idNumberChecksum: !idValidation.errors.includes('Invalid ID number checksum'),
            ageValidation: !idValidation.errors.some(e => e.includes('age')),
            genderValidation: idValidation.gender !== undefined
          }
        }

        result.verificationChecks.idNumberValidation = {
          passed: idValidation.isValid,
          score: idValidation.isValid ? 100 : 30,
          checks: {
            format: !/^\d{13}$/.test(idNumberToValidate) === false,
            checksum: !idValidation.errors.includes('Invalid ID number checksum'),
            dateOfBirth: !idValidation.errors.includes('Invalid date of birth'),
            gender: idValidation.gender !== undefined,
            citizenship: idValidation.citizenship !== undefined
          }
        }

        // Add flags for any validation errors
        result.flags.push(...idValidation.errors)
      }

      // 3. User Cross-Reference
      if (user) {
        const matches = {
          providedIdNumber: user.idNumber === idNumberToValidate,
          name: false,
          phone: !!user.phone
        }

        // Basic name matching (case insensitive)
        if (result.extractedData.fullName && user.firstName && user.lastName) {
          const extractedName = result.extractedData.fullName.toLowerCase()
          matches.name = extractedName.includes(user.firstName.toLowerCase()) &&
                        extractedName.includes(user.lastName.toLowerCase())
        }

        const matchScore = (
          (matches.providedIdNumber ? 50 : 0) +
          (matches.name ? 30 : 0) +
          (matches.phone ? 20 : 0)
        )

        result.verificationChecks.userCrossReference = {
          passed: matchScore >= 70,
          score: matchScore,
          matches
        }
      }

      // 4. Calculate Overall Score
      const weights = {
        documentFormat: 0.3,
        idNumberValidation: 0.4,
        userCrossReference: 0.3
      }

      result.verificationScore = Math.round(
        result.verificationChecks.documentFormat.score * weights.documentFormat +
        result.verificationChecks.idNumberValidation.score * weights.idNumberValidation +
        result.verificationChecks.userCrossReference.score * weights.userCrossReference
      )

      // 5. Determine Status
      if (result.verificationScore >= 85 && result.flags.length === 0) {
        result.status = 'verified'
      } else if (result.verificationScore < 50 || result.flags.some(f => f.includes('checksum'))) {
        result.status = 'rejected'
      } else {
        result.status = 'requires_manual_review'
      }

      // Save result
      const resultDoc = doc(collection(db, 'verification-results'))
      const finalResult: BasicVerificationResult = {
        ...result,
        id: resultDoc.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await setDoc(resultDoc, {
        ...finalResult,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      // Update document status
      let documentStatus: 'pending' | 'verified' | 'rejected' = 'pending'
      if (finalResult.status === 'verified') {
        documentStatus = 'verified'
        await this.onVerificationSuccess(finalResult.userId, document)
      } else if (finalResult.status === 'rejected') {
        documentStatus = 'rejected'
      }

      await DocumentStorageService.updateDocumentStatus(
        documentId,
        documentStatus,
        result.flags.join('; ') || undefined,
        'system'
      )

      return finalResult
    } catch (error) {
      console.error('Error processing document verification:', error)
      throw new Error('Failed to process document verification')
    }
  }

  private static async onVerificationSuccess(userId: string, document: VerificationDocument): Promise<void> {
    try {
      await SecurityService.updateUserVerificationLevel(userId, document.verificationLevel)
      await SecurityService.updateTrustScore(
        userId,
        'document_verified',
        15,
        `${document.type} document verified (basic validation)`
      )
    } catch (error) {
      console.error('Error handling verification success:', error)
    }
  }

  /**
   * Manual review methods
   */
  static async manualReview(
    verificationId: string,
    reviewerId: string,
    decision: 'verified' | 'rejected',
    notes?: string
  ): Promise<void> {
    try {
      const result = await getDoc(doc(db, 'verification-results', verificationId))
      if (!result.exists()) {
        throw new Error('Verification result not found')
      }

      const data = result.data() as BasicVerificationResult

      await updateDoc(doc(db, 'verification-results', verificationId), {
        status: decision,
        notes: notes || data.notes,
        reviewedBy: reviewerId,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      await DocumentStorageService.updateDocumentStatus(
        data.documentId,
        decision,
        notes,
        reviewerId
      )

      if (decision === 'verified') {
        const document = await DocumentStorageService.getDocument(data.documentId)
        if (document) {
          await this.onVerificationSuccess(data.userId, document)
        }
      }
    } catch (error) {
      console.error('Error performing manual review:', error)
      throw new Error('Failed to complete manual review')
    }
  }

  /**
   * Get verification results
   */
  static async getVerificationResult(documentId: string): Promise<BasicVerificationResult | null> {
    try {
      const q = query(
        collection(db, 'verification-results'),
        where('documentId', '==', documentId),
        orderBy('createdAt', 'desc'),
        limit(1)
      )

      const querySnapshot = await getDocs(q)
      if (querySnapshot.empty) return null

      const doc = querySnapshot.docs[0]
      const data = doc.data()

      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        reviewedAt: data.reviewedAt?.toDate()
      } as BasicVerificationResult
    } catch (error) {
      console.error('Error getting verification result:', error)
      return null
    }
  }

  static async getDocumentsRequiringReview(): Promise<BasicVerificationResult[]> {
    try {
      const q = query(
        collection(db, 'verification-results'),
        where('status', '==', 'requires_manual_review'),
        orderBy('createdAt', 'desc')
      )

      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          reviewedAt: data.reviewedAt?.toDate()
        } as BasicVerificationResult
      })
    } catch (error) {
      console.error('Error getting documents requiring review:', error)
      return []
    }
  }
}
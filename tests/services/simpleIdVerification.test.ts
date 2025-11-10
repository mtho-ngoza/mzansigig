import { SimpleIdVerification } from '@/lib/services/simpleIdVerification'
import { OCRService } from '@/lib/services/ocrService'
import { DocumentStorageService } from '@/lib/services/documentStorageService'
import { SecurityService } from '@/lib/services/securityService'

// Mock dependencies
jest.mock('@/lib/services/ocrService')
jest.mock('@/lib/services/documentStorageService')
jest.mock('@/lib/services/securityService')
jest.mock('firebase/auth')

describe('SimpleIdVerification', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('validateSAIdNumber', () => {
    it('should validate a correct SA ID number', () => {
      const result = SimpleIdVerification.validateSAIdNumber('9001015001083')

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.dateOfBirth).toBeDefined()
      expect(result.gender).toBeDefined()
    })

    it('should reject invalid SA ID number format', () => {
      const result = SimpleIdVerification.validateSAIdNumber('123')

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('ID number must be exactly 13 digits')
    })

    it('should reject SA ID with invalid checksum', () => {
      const result = SimpleIdVerification.validateSAIdNumber('9001015001084')

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('ID number checksum validation failed')
    })
  })

  describe('verifyDocumentAgainstProfile - OCR Failure Cases', () => {
    const mockDocumentId = 'doc_test_123'
    const mockUserId = 'user_test_123'
    const mockDocument = {
      id: mockDocumentId,
      userId: mockUserId,
      type: 'sa_id',
      verificationLevel: 'basic',
      status: 'pending',
      fileName: 'id_photo.jpg', // Changed from 'test_id.jpg' to avoid suspicious filename detection
      fileUrl: 'https://example.com/id_photo.jpg',
      fileSize: 1024000, // 1MB
      mimeType: 'image/jpeg',
      submittedAt: new Date()
    }

    const mockUser = {
      id: mockUserId,
      firstName: 'John',
      lastName: 'Smith',
      idNumber: '9001015001083',
      email: 'john@example.com',
      userType: 'job_seeker' as const
    }

    beforeEach(() => {
      // Mock auth
      const mockAuth = {
        currentUser: { uid: mockUserId }
      }
      ;(require('firebase/auth').getAuth as jest.Mock).mockReturnValue(mockAuth)

      // Mock document and user fetching
      ;(DocumentStorageService.getDocument as jest.Mock).mockResolvedValue(mockDocument)
      ;(SecurityService.getUser as jest.Mock).mockResolvedValue(mockUser)
    })

    it('should REJECT document when OCR completely fails (no text detected)', async () => {
      // Mock OCR failure
      ;(OCRService.extractDocumentText as jest.Mock).mockResolvedValue({
        success: false,
        extractedText: '',
        confidence: 0,
        error: 'No text detected in document. Please ensure the image is clear and well-lit.'
      })

      // Reset other OCR mocks to prevent test interference
      ;(OCRService.compareNames as jest.Mock).mockReset()
      ;(OCRService.validateIdNumber as jest.Mock).mockReset()

      const result = await SimpleIdVerification.verifyDocumentAgainstProfile(mockDocumentId)

      // CRITICAL: Must NOT be valid when OCR fails
      expect(result.isValid).toBe(false)
      expect(result.confidence).toBeLessThan(75)
      expect(result.issues).toContain('Could not extract text from document')
      expect(result.matches.name).toBe(false)
      expect(result.matches.idNumber).toBe(false)
    })

    it('should REJECT document when OCR extracts insufficient data (like "ZA" only)', async () => {
      // Mock OCR extracting only "ZA" - not enough for verification
      ;(OCRService.extractDocumentText as jest.Mock).mockResolvedValue({
        success: true,
        extractedText: 'ZA',
        confidence: 90,
        extractedData: {
          // No names extracted
          names: undefined,
          // No ID number extracted
          idNumber: undefined
        }
      })

      // Mock validation failures for missing data
      ;(OCRService.compareNames as jest.Mock).mockReturnValue({
        match: false,
        confidence: 0,
        matchedNames: [],
        issues: ['No names could be extracted from document']
      })

      ;(OCRService.validateIdNumber as jest.Mock).mockReturnValue({
        match: false,
        extractedId: undefined,
        issues: ['No ID number could be extracted from document']
      })

      const result = await SimpleIdVerification.verifyDocumentAgainstProfile(mockDocumentId)

      // CRITICAL: Must NOT be valid when insufficient data extracted
      expect(result.isValid).toBe(false)
      expect(result.confidence).toBeLessThan(75)
      expect(result.issues.length).toBeGreaterThan(0)
      expect(result.issues).toContain('No ID number could be extracted from document')
      expect(result.matches.name).toBe(false)
      expect(result.matches.idNumber).toBe(false)
    })

    it('should REJECT document when OCR succeeds but names do not match', async () => {
      // Mock OCR success but wrong names
      ;(OCRService.extractDocumentText as jest.Mock).mockResolvedValue({
        success: true,
        extractedText: 'SURNAME: JONES NAMES: MARY ID: 9001015001083',
        confidence: 95,
        extractedData: {
          names: ['JONES', 'MARY'],
          idNumber: '9001015001083'
        }
      })

      // Mock name comparison failure
      ;(OCRService.compareNames as jest.Mock).mockReturnValue({
        match: false,
        confidence: 0,
        matchedNames: [],
        issues: ['Profile name "JOHN" not found in document', 'Profile name "SMITH" not found in document']
      })

      // Mock ID validation success
      ;(OCRService.validateIdNumber as jest.Mock).mockReturnValue({
        match: true,
        extractedId: '9001015001083',
        issues: []
      })

      const result = await SimpleIdVerification.verifyDocumentAgainstProfile(mockDocumentId)

      // CRITICAL: Must NOT be valid when names don't match
      expect(result.isValid).toBe(false)
      expect(result.matches.name).toBe(false)
      expect(result.issues.length).toBeGreaterThan(0)
    })

    it('should REJECT document when OCR succeeds but ID number does not match', async () => {
      // Mock OCR success but wrong ID
      ;(OCRService.extractDocumentText as jest.Mock).mockResolvedValue({
        success: true,
        extractedText: 'SURNAME: SMITH NAMES: JOHN ID: 8001015001080',
        confidence: 95,
        extractedData: {
          names: ['SMITH', 'JOHN'],
          idNumber: '8001015001080'
        }
      })

      // Mock name comparison success
      ;(OCRService.compareNames as jest.Mock).mockReturnValue({
        match: true,
        confidence: 100,
        matchedNames: ['SMITH', 'JOHN'],
        issues: []
      })

      // Mock ID validation failure
      ;(OCRService.validateIdNumber as jest.Mock).mockReturnValue({
        match: false,
        extractedId: '8001015001080',
        issues: ['ID number mismatch: document shows "8001015001080", profile shows "9001015001083"']
      })

      const result = await SimpleIdVerification.verifyDocumentAgainstProfile(mockDocumentId)

      // CRITICAL: Must NOT be valid when ID doesn't match
      expect(result.isValid).toBe(false)
      expect(result.matches.idNumber).toBe(false)
      expect(result.issues).toContain('ID number mismatch: document shows "8001015001080", profile shows "9001015001083"')
    })

    it('should APPROVE document when OCR succeeds and all data matches', async () => {
      // Mock successful OCR with matching data
      ;(OCRService.extractDocumentText as jest.Mock).mockResolvedValue({
        success: true,
        extractedText: 'REPUBLIC OF SOUTH AFRICA\nSURNAME: SMITH\nNAMES: JOHN\nID: 9001015001083',
        confidence: 95,
        extractedData: {
          names: ['SMITH', 'JOHN'],
          idNumber: '9001015001083'
        }
      })

      // Mock name comparison success
      ;(OCRService.compareNames as jest.Mock).mockReturnValue({
        match: true,
        confidence: 100,
        matchedNames: ['SMITH', 'JOHN'],
        issues: []
      })

      // Mock ID validation success
      ;(OCRService.validateIdNumber as jest.Mock).mockReturnValue({
        match: true,
        extractedId: '9001015001083',
        issues: []
      })

      const result = await SimpleIdVerification.verifyDocumentAgainstProfile(mockDocumentId)

      // Debug: Print result for debugging
      if (!result.isValid) {
        console.log('❌ Verification result:', JSON.stringify(result, null, 2))
      }

      // Should be valid when everything matches
      expect(result.isValid).toBe(true)
      expect(result.confidence).toBeGreaterThanOrEqual(75)
      expect(result.matches.name).toBe(true)
      expect(result.matches.idNumber).toBe(true)
      expect(result.issues).toHaveLength(0)
    })
  })

  describe('processDocumentVerification', () => {
    const mockDocumentId = 'doc_test_123'
    const mockUserId = 'user_test_123'

    beforeEach(() => {
      const mockAuth = {
        currentUser: { uid: mockUserId }
      }
      ;(require('firebase/auth').getAuth as jest.Mock).mockReturnValue(mockAuth)

      ;(DocumentStorageService.updateDocumentStatus as jest.Mock).mockResolvedValue(undefined)
      ;(SecurityService.updateUserVerificationLevel as jest.Mock).mockResolvedValue(undefined)
      ;(SecurityService.updateTrustScore as jest.Mock).mockResolvedValue(undefined)
    })

    it('should mark document as REJECTED when OCR fails', async () => {
      // Mock verification failure
      jest.spyOn(SimpleIdVerification, 'verifyDocumentAgainstProfile').mockResolvedValue({
        isValid: false,
        confidence: 20,
        issues: ['Could not extract text from document'],
        matches: { idNumber: false, name: false, hasRequiredData: true },
        recommendations: ['Please take a clearer photo of the document with good lighting']
      })

      const result = await SimpleIdVerification.processDocumentVerification(mockDocumentId)

      // CRITICAL: Status must be 'rejected' or 'pending', NOT 'verified'
      expect(result.status).not.toBe('verified')
      expect(result.success).toBe(true) // Processing succeeded
      expect(DocumentStorageService.updateDocumentStatus).toHaveBeenCalledWith(
        mockDocumentId,
        expect.not.stringMatching('verified'),
        expect.any(String), // message parameter
        'system',
        expect.objectContaining({
          confidence: expect.any(Number),
          issues: expect.any(Array)
        })
      )
    })

    it('should mark document as VERIFIED when OCR succeeds and data matches', async () => {
      const mockDocument = {
        id: mockDocumentId,
        type: 'sa_id',
        verificationLevel: 'basic' as const
      }
      ;(DocumentStorageService.getDocument as jest.Mock).mockResolvedValue(mockDocument)

      // Mock successful verification
      jest.spyOn(SimpleIdVerification, 'verifyDocumentAgainstProfile').mockResolvedValue({
        isValid: true,
        confidence: 95,
        issues: [],
        matches: { idNumber: true, name: true, hasRequiredData: true },
        recommendations: ['✅ Verified via OCR']
      })

      const result = await SimpleIdVerification.processDocumentVerification(mockDocumentId)

      expect(result.status).toBe('verified')
      expect(result.success).toBe(true)
      expect(SecurityService.updateUserVerificationLevel).toHaveBeenCalledWith(mockUserId, 'basic')
      expect(SecurityService.updateTrustScore).toHaveBeenCalled()
    })

    it('should handle errors gracefully and set status to pending', async () => {
      // Mock verification throwing an error
      jest.spyOn(SimpleIdVerification, 'verifyDocumentAgainstProfile').mockRejectedValue(
        new Error('OCR service unavailable')
      )

      const result = await SimpleIdVerification.processDocumentVerification(mockDocumentId)

      expect(result.success).toBe(false)
      expect(result.status).toBe('pending')
      expect(result.message).toContain('manual')
      expect(DocumentStorageService.updateDocumentStatus).toHaveBeenCalledWith(
        mockDocumentId,
        'pending',
        'Automatic verification failed - requires manual review',
        'system'
      )
    })
  })

  describe('getUserVerificationSummary', () => {
    const mockUserId = 'user_test_123'

    it('should return summary with verified, pending, and rejected counts', async () => {
      const mockDocuments = [
        { id: '1', status: 'verified', type: 'sa_id', verificationLevel: 'basic' },
        { id: '2', status: 'verified', type: 'sa_id', verificationLevel: 'basic' },
        { id: '3', status: 'pending', type: 'passport', verificationLevel: 'basic' },
        { id: '4', status: 'rejected', type: 'sa_id', verificationLevel: 'basic' }
      ]
      const mockUser = {
        id: mockUserId,
        idNumber: '9001015001083',
        verificationLevel: 'basic' as const
      }

      ;(DocumentStorageService.getUserDocuments as jest.Mock).mockResolvedValue(mockDocuments)
      ;(SecurityService.getUser as jest.Mock).mockResolvedValue(mockUser)

      const summary = await SimpleIdVerification.getUserVerificationSummary(mockUserId)

      expect(summary.totalDocuments).toBe(4)
      expect(summary.verified).toBe(2)
      expect(summary.pending).toBe(1)
      expect(summary.rejected).toBe(1)
      expect(summary.verificationLevel).toBe('basic')
    })

    it('should include next steps when user has no ID number', async () => {
      const mockUser = {
        id: mockUserId,
        idNumber: undefined,
        verificationLevel: undefined
      }

      ;(DocumentStorageService.getUserDocuments as jest.Mock).mockResolvedValue([])
      ;(SecurityService.getUser as jest.Mock).mockResolvedValue(mockUser)

      const summary = await SimpleIdVerification.getUserVerificationSummary(mockUserId)

      expect(summary.nextSteps).toContain('Add ID number to your profile')
    })

    it('should include next steps for rejected documents', async () => {
      const mockDocuments = [
        { id: '1', status: 'rejected', type: 'sa_id', verificationLevel: 'basic' }
      ]
      const mockUser = {
        id: mockUserId,
        idNumber: '9001015001083'
      }

      ;(DocumentStorageService.getUserDocuments as jest.Mock).mockResolvedValue(mockDocuments)
      ;(SecurityService.getUser as jest.Mock).mockResolvedValue(mockUser)

      const summary = await SimpleIdVerification.getUserVerificationSummary(mockUserId)

      expect(summary.nextSteps).toContain('Re-upload rejected documents with clearer images')
    })

    it('should include next steps for pending documents', async () => {
      const mockDocuments = [
        { id: '1', status: 'pending', type: 'sa_id', verificationLevel: 'basic' }
      ]
      const mockUser = {
        id: mockUserId,
        idNumber: '9001015001083'
      }

      ;(DocumentStorageService.getUserDocuments as jest.Mock).mockResolvedValue(mockDocuments)
      ;(SecurityService.getUser as jest.Mock).mockResolvedValue(mockUser)

      const summary = await SimpleIdVerification.getUserVerificationSummary(mockUserId)

      expect(summary.nextSteps).toContain('Wait for manual review of pending documents')
    })

    it('should prompt to upload first document when user has none', async () => {
      const mockUser = {
        id: mockUserId,
        idNumber: '9001015001083'
      }

      ;(DocumentStorageService.getUserDocuments as jest.Mock).mockResolvedValue([])
      ;(SecurityService.getUser as jest.Mock).mockResolvedValue(mockUser)

      const summary = await SimpleIdVerification.getUserVerificationSummary(mockUserId)

      expect(summary.nextSteps).toContain('Upload your first identity document to start verification')
      expect(summary.totalDocuments).toBe(0)
    })

    it('should handle errors and return empty summary', async () => {
      ;(DocumentStorageService.getUserDocuments as jest.Mock).mockRejectedValue(
        new Error('Database error')
      )

      const summary = await SimpleIdVerification.getUserVerificationSummary(mockUserId)

      expect(summary.totalDocuments).toBe(0)
      expect(summary.verified).toBe(0)
      expect(summary.pending).toBe(0)
      expect(summary.rejected).toBe(0)
      expect(summary.nextSteps).toEqual(['Error loading verification status'])
    })
  })
})

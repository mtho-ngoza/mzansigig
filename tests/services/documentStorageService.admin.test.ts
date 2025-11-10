import { DocumentStorageService } from '@/lib/services/documentStorageService'
import { VerificationDocument } from '@/types/auth'

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  db: {},
  storage: {}
}))

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  setDoc: jest.fn(),
  deleteDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  serverTimestamp: jest.fn(() => ({ _seconds: Date.now() / 1000 }))
}))

// Mock Firebase Storage functions
jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn(),
  getMetadata: jest.fn(),
  updateMetadata: jest.fn()
}))

// Mock SecurityService
jest.mock('@/lib/services/securityService', () => ({
  SecurityService: {
    updateUserVerificationLevel: jest.fn(),
    updateTrustScore: jest.fn()
  }
}))

import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where
} from 'firebase/firestore'

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage'

import { SecurityService } from '@/lib/services/securityService'

describe('DocumentStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset all mocks before each test
    ;(SecurityService.updateUserVerificationLevel as jest.Mock).mockReset()
    ;(SecurityService.updateTrustScore as jest.Mock).mockReset()
  })

  describe('uploadDocument', () => {
    it('should successfully upload a document', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(mockFile, 'size', { value: 1024 })

      const mockDocumentData = {
        userId: 'user1',
        type: 'sa_id' as const,
        status: 'draft' as const,
        fileName: 'test.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        verificationLevel: 'basic' as const
      }

      ;(uploadBytes as jest.Mock).mockResolvedValueOnce({ ref: {} })
      ;(getDownloadURL as jest.Mock).mockResolvedValueOnce('https://example.com/test.jpg')
      ;(setDoc as jest.Mock).mockResolvedValueOnce(undefined)

      const result = await DocumentStorageService.uploadDocument('user1', mockFile, mockDocumentData)

      expect(result).toBeDefined()
      expect(result.userId).toBe('user1')
      expect(result.fileUrl).toBe('https://example.com/test.jpg')
      expect(uploadBytes).toHaveBeenCalled()
      expect(getDownloadURL).toHaveBeenCalled()
      expect(setDoc).toHaveBeenCalled()
    })

    it('should reject files larger than 10MB', async () => {
      const mockFile = new File(['test'], 'large.jpg', { type: 'image/jpeg' })
      Object.defineProperty(mockFile, 'size', { value: 11 * 1024 * 1024 })

      const mockDocumentData = {
        userId: 'user1',
        type: 'sa_id' as const,
        status: 'draft' as const,
        fileName: 'large.jpg',
        fileSize: 11 * 1024 * 1024,
        mimeType: 'image/jpeg',
        verificationLevel: 'basic' as const
      }

      await expect(
        DocumentStorageService.uploadDocument('user1', mockFile, mockDocumentData)
      ).rejects.toThrow('File size must be less than 10MB')
    })

    it('should reject unsupported file types', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      Object.defineProperty(mockFile, 'size', { value: 1024 })

      const mockDocumentData = {
        userId: 'user1',
        type: 'sa_id' as const,
        status: 'draft' as const,
        fileName: 'test.txt',
        fileSize: 1024,
        mimeType: 'text/plain',
        verificationLevel: 'basic' as const
      }

      await expect(
        DocumentStorageService.uploadDocument('user1', mockFile, mockDocumentData)
      ).rejects.toThrow('Only JPEG, PNG, and PDF files are allowed')
    })

    it('should reject files with invalid names', async () => {
      const mockFile = new File(['test'], '', { type: 'image/jpeg' })
      Object.defineProperty(mockFile, 'size', { value: 1024 })
      Object.defineProperty(mockFile, 'name', { value: '' })

      const mockDocumentData = {
        userId: 'user1',
        type: 'sa_id' as const,
        status: 'draft' as const,
        fileName: '',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        verificationLevel: 'basic' as const
      }

      await expect(
        DocumentStorageService.uploadDocument('user1', mockFile, mockDocumentData)
      ).rejects.toThrow('Invalid file name')
    })

    it('should throw error when upload fails', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(mockFile, 'size', { value: 1024 })

      const mockDocumentData = {
        userId: 'user1',
        type: 'sa_id' as const,
        status: 'draft' as const,
        fileName: 'test.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        verificationLevel: 'basic' as const
      }

      ;(uploadBytes as jest.Mock).mockRejectedValueOnce(new Error('Upload failed'))

      await expect(
        DocumentStorageService.uploadDocument('user1', mockFile, mockDocumentData)
      ).rejects.toThrow('Failed to upload document')
    })
  })

  describe('deleteDocument', () => {
    it('should delete document successfully', async () => {
      const mockDocument = {
        id: 'doc123',
        userId: 'user1',
        type: 'sa_id',
        status: 'draft',
        fileName: 'test.jpg',
        fileUrl: 'https://example.com/test.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        verificationLevel: 'basic',
        submittedAt: new Date()
      }

      jest.spyOn(DocumentStorageService, 'getDocument').mockResolvedValueOnce(mockDocument as any)
      ;(getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ userId: 'user1', storagePath: 'path/to/file.jpg' })
      })
      ;(deleteObject as jest.Mock).mockResolvedValueOnce(undefined)
      ;(deleteDoc as jest.Mock).mockResolvedValueOnce(undefined)

      await DocumentStorageService.deleteDocument('doc123', 'user1')

      expect(deleteObject).toHaveBeenCalled()
      expect(deleteDoc).toHaveBeenCalled()
    })

    it('should throw error if document not found', async () => {
      jest.spyOn(DocumentStorageService, 'getDocument').mockResolvedValueOnce(null)

      await expect(
        DocumentStorageService.deleteDocument('doc123', 'user1')
      ).rejects.toThrow('Document not found')
    })

    it('should throw error if user is unauthorized', async () => {
      const mockDocument = {
        id: 'doc123',
        userId: 'user2',
        type: 'sa_id',
        status: 'draft',
        fileName: 'test.jpg',
        fileUrl: 'https://example.com/test.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        verificationLevel: 'basic',
        submittedAt: new Date()
      }

      jest.spyOn(DocumentStorageService, 'getDocument').mockResolvedValueOnce(mockDocument as any)
      ;(getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ userId: 'user2' })
      })

      await expect(
        DocumentStorageService.deleteDocument('doc123', 'user1')
      ).rejects.toThrow('Unauthorized')
    })
  })

  describe('getUserStorageUsage', () => {
    it('should calculate total storage usage', async () => {
      const mockDocuments = [
        { fileSize: 1024 },
        { fileSize: 2048 },
        { fileSize: 512 }
      ]

      jest.spyOn(DocumentStorageService, 'getUserDocuments').mockResolvedValueOnce(mockDocuments as any)

      const result = await DocumentStorageService.getUserStorageUsage('user1')

      expect(result.totalFiles).toBe(3)
      expect(result.totalSize).toBe(3584)
    })

    it('should return zeros on error', async () => {
      jest.spyOn(DocumentStorageService, 'getUserDocuments').mockRejectedValueOnce(new Error('Failed'))

      const result = await DocumentStorageService.getUserStorageUsage('user1')

      expect(result.totalFiles).toBe(0)
      expect(result.totalSize).toBe(0)
    })
  })

  describe('getSecureDocumentUrl', () => {
    it('should return document URL for authorized user', async () => {
      const mockDocument = {
        id: 'doc123',
        userId: 'user1',
        fileUrl: 'https://example.com/test.jpg'
      }

      jest.spyOn(DocumentStorageService, 'getDocument').mockResolvedValueOnce(mockDocument as any)
      ;(getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ userId: 'user1' })
      })

      const result = await DocumentStorageService.getSecureDocumentUrl('doc123', 'user1')

      expect(result).toBe('https://example.com/test.jpg')
    })

    it('should return null if document not found', async () => {
      jest.spyOn(DocumentStorageService, 'getDocument').mockResolvedValueOnce(null)

      const result = await DocumentStorageService.getSecureDocumentUrl('doc123', 'user1')

      expect(result).toBeNull()
    })

    it('should return null for unauthorized access', async () => {
      const mockDocument = {
        id: 'doc123',
        userId: 'user2',
        fileUrl: 'https://example.com/test.jpg'
      }

      jest.spyOn(DocumentStorageService, 'getDocument').mockResolvedValueOnce(mockDocument as any)
      ;(getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ userId: 'user2' })
      })

      const result = await DocumentStorageService.getSecureDocumentUrl('doc123', 'user1')

      expect(result).toBeNull()
    })
  })

  describe('replaceDocument', () => {
    it('should delete old document and upload new one', async () => {
      const mockFile = new File(['test'], 'new.jpg', { type: 'image/jpeg' })
      Object.defineProperty(mockFile, 'size', { value: 1024 })

      const mockDocumentData = {
        userId: 'user1',
        type: 'sa_id' as const,
        status: 'draft' as const,
        fileName: 'new.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        verificationLevel: 'basic' as const
      }

      const mockNewDocument = {
        id: 'doc_new',
        fileUrl: 'https://example.com/new.jpg',
        ...mockDocumentData,
        submittedAt: new Date()
      }

      jest.spyOn(DocumentStorageService, 'deleteDocument').mockResolvedValueOnce(undefined)
      jest.spyOn(DocumentStorageService, 'uploadDocument').mockResolvedValueOnce(mockNewDocument as any)

      const result = await DocumentStorageService.replaceDocument('user1', 'doc_old', mockFile, mockDocumentData)

      expect(DocumentStorageService.deleteDocument).toHaveBeenCalledWith('doc_old', 'user1')
      expect(DocumentStorageService.uploadDocument).toHaveBeenCalledWith('user1', mockFile, mockDocumentData)
      expect(result.id).toBe('doc_new')
    })
  })

  describe('getDocument', () => {
    it('should fetch a single document by ID', async () => {
      const mockDocData = {
        id: 'doc123',
        userId: 'user1',
        type: 'sa_id',
        status: 'pending',
        fileName: 'id.jpg',
        fileUrl: 'https://example.com/id.jpg',
        fileSize: 1000,
        mimeType: 'image/jpeg',
        verificationLevel: 'basic',
        submittedAt: { toDate: () => new Date('2025-01-01') }
      }

      ;(getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => true,
        id: 'doc123',
        data: () => mockDocData
      })

      const result = await DocumentStorageService.getDocument('doc123')

      expect(result).toBeDefined()
      expect(result?.id).toBe('doc123')
      expect(result?.userId).toBe('user1')
      expect(result?.type).toBe('sa_id')
    })

    it('should return null if document does not exist', async () => {
      ;(getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => false
      })

      const result = await DocumentStorageService.getDocument('nonexistent')

      expect(result).toBeNull()
    })

    it('should return null and log error on failure', async () => {
      ;(getDoc as jest.Mock).mockRejectedValueOnce(new Error('Firestore error'))

      const result = await DocumentStorageService.getDocument('doc123')

      expect(result).toBeNull()
    })
  })

  describe('getUserDocuments', () => {
    it('should fetch all documents for a user', async () => {
      const mockDocs = [
        {
          id: 'doc1',
          data: () => ({
            userId: 'user1',
            type: 'sa_id',
            status: 'verified',
            fileName: 'id.jpg',
            fileUrl: 'https://example.com/id.jpg',
            fileSize: 1000,
            mimeType: 'image/jpeg',
            verificationLevel: 'basic',
            submittedAt: { toDate: () => new Date('2025-01-01') }
          })
        }
      ]

      ;(getDocs as jest.Mock).mockResolvedValueOnce({
        docs: mockDocs
      })

      const result = await DocumentStorageService.getUserDocuments('user1')

      expect(result).toHaveLength(1)
      expect(result[0].userId).toBe('user1')
      expect(where).toHaveBeenCalledWith('userId', '==', 'user1')
    })

    it('should fetch documents filtered by verification level', async () => {
      const mockDocs = [
        {
          id: 'doc1',
          data: () => ({
            userId: 'user1',
            type: 'sa_id',
            status: 'verified',
            fileName: 'id.jpg',
            fileUrl: 'https://example.com/id.jpg',
            fileSize: 1000,
            mimeType: 'image/jpeg',
            verificationLevel: 'enhanced',
            submittedAt: { toDate: () => new Date('2025-01-01') }
          })
        }
      ]

      ;(getDocs as jest.Mock).mockResolvedValueOnce({
        docs: mockDocs
      })

      const result = await DocumentStorageService.getUserDocuments('user1', 'enhanced')

      expect(result).toHaveLength(1)
      expect(result[0].verificationLevel).toBe('enhanced')
    })

    it('should throw error when fetching fails', async () => {
      ;(getDocs as jest.Mock).mockRejectedValueOnce(new Error('Firestore error'))

      await expect(
        DocumentStorageService.getUserDocuments('user1')
      ).rejects.toThrow('Failed to load documents')
    })
  })

  describe('updateDocumentStatus', () => {
    it('should update document status to verified', async () => {
      ;(updateDoc as jest.Mock).mockResolvedValueOnce(undefined)

      await DocumentStorageService.updateDocumentStatus('doc123', 'verified', 'Approved', 'admin1')

      expect(updateDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          status: 'verified',
          notes: 'Approved',
          reviewedBy: 'admin1'
        })
      )
    })

    it('should update document status to rejected', async () => {
      ;(updateDoc as jest.Mock).mockResolvedValueOnce(undefined)

      await DocumentStorageService.updateDocumentStatus('doc123', 'rejected', 'Invalid', 'admin1')

      expect(updateDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          status: 'rejected',
          notes: 'Invalid',
          reviewedBy: 'admin1'
        })
      )
    })

    it('should include verification attempt if provided', async () => {
      ;(updateDoc as jest.Mock).mockResolvedValueOnce(undefined)

      const verificationAttempt = {
        confidence: 85,
        issues: ['Minor issue'],
        ocrExtractedText: 'Sample text'
      }

      await DocumentStorageService.updateDocumentStatus(
        'doc123',
        'verified',
        undefined,
        undefined,
        verificationAttempt
      )

      expect(updateDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          verificationAttempt: expect.objectContaining({
            confidence: 85,
            issues: ['Minor issue'],
            ocrExtractedText: 'Sample text'
          })
        })
      )
    })

    it('should throw error when update fails', async () => {
      ;(updateDoc as jest.Mock).mockRejectedValueOnce(new Error('Firestore error'))

      await expect(
        DocumentStorageService.updateDocumentStatus('doc123', 'verified')
      ).rejects.toThrow('Failed to update document status')
    })
  })

  describe('getAllDocumentsForAdmin', () => {
    it('should fetch all documents when no status filter is provided', async () => {
      const mockDocs = [
        {
          id: 'doc1',
          data: () => ({
            userId: 'user1',
            type: 'sa_id',
            status: 'pending',
            fileName: 'id.jpg',
            fileUrl: 'https://example.com/id.jpg',
            fileSize: 1000,
            mimeType: 'image/jpeg',
            verificationLevel: 'basic',
            submittedAt: { toDate: () => new Date('2025-01-01') }
          })
        },
        {
          id: 'doc2',
          data: () => ({
            userId: 'user2',
            type: 'passport',
            status: 'verified',
            fileName: 'passport.jpg',
            fileUrl: 'https://example.com/passport.jpg',
            fileSize: 2000,
            mimeType: 'image/jpeg',
            verificationLevel: 'enhanced',
            submittedAt: { toDate: () => new Date('2025-01-02') },
            verifiedAt: { toDate: () => new Date('2025-01-03') }
          })
        }
      ]

      ;(getDocs as jest.Mock).mockResolvedValueOnce({
        docs: mockDocs
      })

      const result = await DocumentStorageService.getAllDocumentsForAdmin()

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('doc1')
      expect(result[0].status).toBe('pending')
      expect(result[1].id).toBe('doc2')
      expect(result[1].status).toBe('verified')
    })

    it('should fetch documents filtered by status', async () => {
      const mockDocs = [
        {
          id: 'doc1',
          data: () => ({
            userId: 'user1',
            type: 'sa_id',
            status: 'pending',
            fileName: 'id.jpg',
            fileUrl: 'https://example.com/id.jpg',
            fileSize: 1000,
            mimeType: 'image/jpeg',
            verificationLevel: 'basic',
            submittedAt: { toDate: () => new Date('2025-01-01') }
          })
        }
      ]

      ;(getDocs as jest.Mock).mockResolvedValueOnce({
        docs: mockDocs
      })

      const result = await DocumentStorageService.getAllDocumentsForAdmin('pending')

      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('pending')
      expect(where).toHaveBeenCalledWith('status', '==', 'pending')
    })

    it('should handle documents with verification attempts', async () => {
      const mockDocs = [
        {
          id: 'doc1',
          data: () => ({
            userId: 'user1',
            type: 'sa_id',
            status: 'pending',
            fileName: 'id.jpg',
            fileUrl: 'https://example.com/id.jpg',
            fileSize: 1000,
            mimeType: 'image/jpeg',
            verificationLevel: 'basic',
            submittedAt: { toDate: () => new Date('2025-01-01') },
            verificationAttempt: {
              confidence: 65,
              issues: ['Name mismatch'],
              ocrExtractedText: 'JOHN SMITH',
              attemptedAt: { toDate: () => new Date('2025-01-01T10:00:00') }
            }
          })
        }
      ]

      ;(getDocs as jest.Mock).mockResolvedValueOnce({
        docs: mockDocs
      })

      const result = await DocumentStorageService.getAllDocumentsForAdmin()

      expect(result[0].verificationAttempt).toBeDefined()
      expect(result[0].verificationAttempt?.confidence).toBe(65)
      expect(result[0].verificationAttempt?.issues).toContain('Name mismatch')
      expect(result[0].verificationAttempt?.ocrExtractedText).toBe('JOHN SMITH')
    })

    it('should throw error when fetching fails', async () => {
      ;(getDocs as jest.Mock).mockRejectedValueOnce(new Error('Firestore error'))

      await expect(
        DocumentStorageService.getAllDocumentsForAdmin()
      ).rejects.toThrow('Failed to load documents')
    })
  })

  describe('getPendingDocuments', () => {
    it('should fetch only pending documents', async () => {
      const mockDocs = [
        {
          id: 'doc1',
          data: () => ({
            userId: 'user1',
            type: 'sa_id',
            status: 'pending',
            fileName: 'id.jpg',
            fileUrl: 'https://example.com/id.jpg',
            fileSize: 1000,
            mimeType: 'image/jpeg',
            verificationLevel: 'basic',
            submittedAt: { toDate: () => new Date('2025-01-01') }
          })
        }
      ]

      ;(getDocs as jest.Mock).mockResolvedValueOnce({
        docs: mockDocs
      })

      const result = await DocumentStorageService.getPendingDocuments()

      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('pending')
      expect(where).toHaveBeenCalledWith('status', '==', 'pending')
    })

    it('should throw error when fetching fails', async () => {
      ;(getDocs as jest.Mock).mockRejectedValueOnce(new Error('Firestore error'))

      await expect(
        DocumentStorageService.getPendingDocuments()
      ).rejects.toThrow('Failed to load pending documents')
    })
  })

  describe('adminApproveDocument', () => {
    it('should update document status to verified with admin details', async () => {
      const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>

      // Mock document exists
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          userId: 'user123',
          verificationLevel: 'basic',
          status: 'pending',
          type: 'sa_id'
        })
      } as any)

      ;(updateDoc as jest.Mock).mockResolvedValue(undefined)
      ;(SecurityService.updateUserVerificationLevel as jest.Mock).mockResolvedValue(undefined)
      ;(SecurityService.updateTrustScore as jest.Mock).mockResolvedValue(undefined)

      await DocumentStorageService.adminApproveDocument('doc123', 'admin456', 'Looks good')

      // First call updates the document
      expect(updateDoc).toHaveBeenNthCalledWith(
        1,
        undefined, // doc ref (mocked)
        expect.objectContaining({
          status: 'verified',
          reviewedBy: 'admin456',
          notes: 'Looks good'
        })
      )

      // Second call updates the user
      expect(updateDoc).toHaveBeenNthCalledWith(
        2,
        undefined, // user ref (mocked)
        expect.objectContaining({
          isVerified: true,
          verificationLevel: 'basic'
        })
      )

      // Verify security service was called
      expect(SecurityService.updateUserVerificationLevel).toHaveBeenCalledWith('user123', 'basic')
      expect(SecurityService.updateTrustScore).toHaveBeenCalledWith(
        'user123',
        'document_verified',
        15,
        'sa_id document manually approved by admin'
      )
    })

    it('should update user verification status to match document level', async () => {
      const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          userId: 'user123',
          verificationLevel: 'enhanced',
          status: 'pending',
          type: 'sa_id'
        })
      } as any)

      ;(updateDoc as jest.Mock).mockResolvedValue(undefined)
      ;(SecurityService.updateUserVerificationLevel as jest.Mock).mockResolvedValue(undefined)
      ;(SecurityService.updateTrustScore as jest.Mock).mockResolvedValue(undefined)

      await DocumentStorageService.adminApproveDocument('doc123', 'admin456')

      // Verify user verification level matches document
      expect(updateDoc).toHaveBeenNthCalledWith(
        2,
        undefined,
        expect.objectContaining({
          isVerified: true,
          verificationLevel: 'enhanced'
        })
      )
    })

    it('should update premium level users correctly', async () => {
      const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          userId: 'user123',
          verificationLevel: 'premium',
          status: 'pending',
          type: 'passport'
        })
      } as any)

      ;(updateDoc as jest.Mock).mockResolvedValue(undefined)
      ;(SecurityService.updateUserVerificationLevel as jest.Mock).mockResolvedValue(undefined)
      ;(SecurityService.updateTrustScore as jest.Mock).mockResolvedValue(undefined)

      await DocumentStorageService.adminApproveDocument('doc123', 'admin456')

      expect(updateDoc).toHaveBeenNthCalledWith(
        2,
        undefined,
        expect.objectContaining({
          isVerified: true,
          verificationLevel: 'premium'
        })
      )

      // Verify trust score update for premium
      expect(SecurityService.updateTrustScore).toHaveBeenCalledWith(
        'user123',
        'document_verified',
        15,
        'passport document manually approved by admin'
      )
    })

    it('should use default notes if none provided', async () => {
      const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          userId: 'user123',
          verificationLevel: 'basic',
          status: 'pending',
          type: 'sa_id'
        })
      } as any)

      ;(updateDoc as jest.Mock).mockResolvedValue(undefined)
      ;(SecurityService.updateUserVerificationLevel as jest.Mock).mockResolvedValue(undefined)
      ;(SecurityService.updateTrustScore as jest.Mock).mockResolvedValue(undefined)

      await DocumentStorageService.adminApproveDocument('doc123', 'admin456')

      expect(updateDoc).toHaveBeenNthCalledWith(
        1,
        undefined,
        expect.objectContaining({
          notes: 'Manually approved by admin'
        })
      )
    })

    it('should throw error if document not found', async () => {
      const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>

      mockGetDoc.mockResolvedValueOnce({
        exists: () => false
      } as any)

      await expect(
        DocumentStorageService.adminApproveDocument('doc123', 'admin456')
      ).rejects.toThrow('Failed to approve document')
    })

    it('should throw error when update fails', async () => {
      const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>

      mockGetDoc.mockRejectedValueOnce(new Error('Firestore error'))

      await expect(
        DocumentStorageService.adminApproveDocument('doc123', 'admin456')
      ).rejects.toThrow('Failed to approve document')
    })

    it('should handle errors in user update gracefully', async () => {
      const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          userId: 'user123',
          verificationLevel: 'basic',
          status: 'pending',
          type: 'sa_id'
        })
      } as any)

      ;(updateDoc as jest.Mock)
        .mockResolvedValueOnce(undefined) // Document update succeeds
        .mockRejectedValueOnce(new Error('User update failed')) // User update fails

      ;(SecurityService.updateUserVerificationLevel as jest.Mock).mockResolvedValue(undefined)
      ;(SecurityService.updateTrustScore as jest.Mock).mockResolvedValue(undefined)

      await expect(
        DocumentStorageService.adminApproveDocument('doc123', 'admin456')
      ).rejects.toThrow('Failed to approve document')
    })
  })

  describe('adminRejectDocument', () => {
    it('should update document status to rejected with reason', async () => {
      ;(updateDoc as jest.Mock).mockResolvedValueOnce(undefined)

      await DocumentStorageService.adminRejectDocument(
        'doc123',
        'admin456',
        'Document is blurry and unreadable'
      )

      expect(updateDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          status: 'rejected',
          reviewedBy: 'admin456',
          notes: 'Document is blurry and unreadable'
        })
      )
    })

    it('should set rejectedAt timestamp', async () => {
      ;(updateDoc as jest.Mock).mockResolvedValueOnce(undefined)

      await DocumentStorageService.adminRejectDocument(
        'doc123',
        'admin456',
        'Invalid document'
      )

      expect(updateDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          rejectedAt: expect.anything()
        })
      )
    })

    it('should throw error when update fails', async () => {
      ;(updateDoc as jest.Mock).mockRejectedValueOnce(new Error('Firestore error'))

      await expect(
        DocumentStorageService.adminRejectDocument('doc123', 'admin456', 'reason')
      ).rejects.toThrow('Failed to reject document')
    })

    it('should require a rejection reason', async () => {
      ;(updateDoc as jest.Mock).mockResolvedValueOnce(undefined)

      await DocumentStorageService.adminRejectDocument('doc123', 'admin456', 'Must provide reason')

      expect(updateDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          notes: 'Must provide reason'
        })
      )
    })
  })
})

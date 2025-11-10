import { storage, db } from '@/lib/firebase'
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  getMetadata,
  updateMetadata
} from 'firebase/storage'
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore'
import { VerificationDocument } from '@/types/auth'
import { SecurityService } from './securityService'

export class DocumentStorageService {
  private static getStoragePath(
    userId: string,
    verificationLevel: string,
    documentType: string,
    fileName: string
  ): string {
    const timestamp = Date.now()
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    return `verificationDocuments/${userId}/${verificationLevel}/${documentType}/${timestamp}_${sanitizedFileName}`
  }

  static async uploadDocument(
    userId: string,
    file: File,
    documentData: Omit<VerificationDocument, 'id' | 'fileUrl' | 'submittedAt'>
  ): Promise<VerificationDocument> {
    try {
      this.validateFile(file)

      const storagePath = this.getStoragePath(
        userId,
        documentData.verificationLevel,
        documentData.type,
        file.name
      )
      const storageRef = ref(storage, storagePath)

      const metadata = {
        contentType: file.type,
        customMetadata: {
          userId,
          documentType: documentData.type,
          verificationLevel: documentData.verificationLevel,
          originalName: file.name,
          uploadedBy: userId,
          uploadedAt: new Date().toISOString()
        }
      }

      const uploadResult = await uploadBytes(storageRef, file, metadata)

      const downloadURL = await getDownloadURL(uploadResult.ref)

      const documentId = `doc_${userId}_${documentData.type}_${Date.now()}`
      const document: VerificationDocument = {
        ...documentData,
        id: documentId,
        userId,
        fileUrl: downloadURL,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        submittedAt: new Date()
      }

      await setDoc(doc(db, 'verificationDocuments', documentId), {
        ...document,
        storagePath,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      return document
    } catch (error) {
      console.error('Error uploading document:', error)
      // Re-throw validation errors as-is, wrap other errors
      if (error instanceof Error &&
          (error.message.includes('File size') ||
           error.message.includes('file') ||
           error.message.includes('allowed'))) {
        throw error
      }
      throw new Error('Failed to upload document. Please try again.')
    }
  }

  static async getUserDocuments(
    userId: string,
    verificationLevel?: string
  ): Promise<VerificationDocument[]> {
    try {
      let q = query(
        collection(db, 'verificationDocuments'),
        where('userId', '==', userId)
      )

      if (verificationLevel) {
        q = query(q, where('verificationLevel', '==', verificationLevel))
      }

      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          ...data,
          submittedAt: data.submittedAt?.toDate() || new Date(),
          verifiedAt: data.verifiedAt?.toDate(),
          rejectedAt: data.rejectedAt?.toDate()
        } as VerificationDocument
      })
    } catch (error: unknown) {
      // If the error is due to missing permissions on an empty collection, return empty array
      // This is expected when user has no documents yet
      const errorObj = error as { code?: string; message?: string }
      if (errorObj?.code === 'permission-denied' || errorObj?.message?.includes('Missing or insufficient permissions')) {
        return []
      }

      console.error('Error getting user documents:', error)
      throw new Error('Failed to load documents.')
    }
  }

  static async getDocument(documentId: string): Promise<VerificationDocument | null> {
    try {
      const docRef = doc(db, 'verificationDocuments', documentId)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return null
      }

      const data = docSnap.data()
      return {
        ...data,
        submittedAt: data.submittedAt?.toDate() || new Date(),
        verifiedAt: data.verifiedAt?.toDate(),
        rejectedAt: data.rejectedAt?.toDate()
      } as VerificationDocument
    } catch (error) {
      console.error('Error getting document:', error)
      return null
    }
  }

  static async updateDocumentStatus(
    documentId: string,
    status: 'pending' | 'verified' | 'rejected',
    notes?: string,
    reviewedBy?: string,
    verificationAttempt?: {
      confidence: number
      issues: string[]
      ocrExtractedText?: string
    }
  ): Promise<void> {
    try {
      const updateData: Record<string, unknown> = {
        status,
        updatedAt: serverTimestamp()
      }

      if (status === 'verified') {
        updateData.verifiedAt = serverTimestamp()
      } else if (status === 'rejected') {
        updateData.rejectedAt = serverTimestamp()
      }

      if (notes) {
        updateData.notes = notes
      }

      if (reviewedBy) {
        updateData.reviewedBy = reviewedBy
      }

      if (verificationAttempt) {
        updateData.verificationAttempt = {
          ...verificationAttempt,
          attemptedAt: serverTimestamp()
        }
      }

      await updateDoc(doc(db, 'verificationDocuments', documentId), updateData)
    } catch (error) {
      console.error('Error updating document status:', error)
      throw new Error('Failed to update document status.')
    }
  }

  static async deleteDocument(documentId: string, userId: string): Promise<void> {
    try {
      const document = await this.getDocument(documentId)
      if (!document) {
        throw new Error('Document not found')
      }

      const docRef = doc(db, 'verificationDocuments', documentId)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data()

          if (data.userId !== userId) {
          throw new Error('Unauthorized: Cannot delete document belonging to another user')
        }

        if (data.storagePath) {
          try {
            const storageRef = ref(storage, data.storagePath)
            await deleteObject(storageRef)
          } catch (storageError) {
            console.warn('Error deleting from storage (file may not exist):', storageError)
          }
        }
      }

      await deleteDoc(docRef)
    } catch (error) {
      console.error('Error deleting document:', error)
      // Re-throw specific errors as-is, wrap other errors
      if (error instanceof Error &&
          (error.message.includes('not found') ||
           error.message.includes('Unauthorized'))) {
        throw error
      }
      throw new Error('Failed to delete document.')
    }
  }

  static async replaceDocument(
    userId: string,
    oldDocumentId: string,
    newFile: File,
    newDocumentData: Omit<VerificationDocument, 'id' | 'fileUrl' | 'submittedAt'>
  ): Promise<VerificationDocument> {
    try {
      await this.deleteDocument(oldDocumentId, userId)

      return await this.uploadDocument(userId, newFile, newDocumentData)
    } catch (error) {
      console.error('Error replacing document:', error)
      throw new Error('Failed to replace document.')
    }
  }

  private static validateFile(file: File): void {
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      throw new Error('File size must be less than 10MB')
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/pdf'
    ]

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only JPEG, PNG, and PDF files are allowed')
    }

    if (!file.name || file.name.length > 255) {
      throw new Error('Invalid file name')
    }
  }

  static async getSecureDocumentUrl(documentId: string, userId: string): Promise<string | null> {
    try {
      const document = await this.getDocument(documentId)
      if (!document) {
        return null
      }

      const docRef = doc(db, 'verificationDocuments', documentId)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data()
        if (data.userId !== userId) {
          throw new Error('Unauthorized access')
        }
      }

      return document.fileUrl
    } catch (error) {
      console.error('Error getting secure document URL:', error)
      return null
    }
  }

  static async getUserStorageUsage(userId: string): Promise<{ totalFiles: number; totalSize: number }> {
    try {
      const documents = await this.getUserDocuments(userId)

      return {
        totalFiles: documents.length,
        totalSize: documents.reduce((total, doc) => total + doc.fileSize, 0)
      }
    } catch (error) {
      console.error('Error getting storage usage:', error)
      return { totalFiles: 0, totalSize: 0 }
    }
  }

  /**
   * Admin Methods
   */

  static async getPendingDocuments(): Promise<VerificationDocument[]> {
    try {
      const docsQuery = query(
        collection(db, 'verificationDocuments'),
        where('status', '==', 'pending')
      )

      const snapshot = await getDocs(docsQuery)
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        submittedAt: doc.data().submittedAt?.toDate() || new Date(),
        verifiedAt: doc.data().verifiedAt?.toDate(),
        rejectedAt: doc.data().rejectedAt?.toDate(),
        verificationAttempt: doc.data().verificationAttempt ? {
          ...doc.data().verificationAttempt,
          attemptedAt: doc.data().verificationAttempt.attemptedAt?.toDate() || new Date()
        } : undefined
      })) as VerificationDocument[]
    } catch (error) {
      console.error('Error getting pending documents:', error)
      throw new Error('Failed to load pending documents')
    }
  }

  static async getAllDocumentsForAdmin(status?: 'draft' | 'pending' | 'verified' | 'rejected'): Promise<VerificationDocument[]> {
    try {
      const docsQuery = status
        ? query(collection(db, 'verificationDocuments'), where('status', '==', status))
        : collection(db, 'verificationDocuments')

      const snapshot = await getDocs(docsQuery)
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        submittedAt: doc.data().submittedAt?.toDate() || new Date(),
        verifiedAt: doc.data().verifiedAt?.toDate(),
        rejectedAt: doc.data().rejectedAt?.toDate(),
        verificationAttempt: doc.data().verificationAttempt ? {
          ...doc.data().verificationAttempt,
          attemptedAt: doc.data().verificationAttempt.attemptedAt?.toDate() || new Date()
        } : undefined
      })) as VerificationDocument[]
    } catch (error) {
      console.error('Error getting documents for admin:', error)
      throw new Error('Failed to load documents')
    }
  }

  static async adminApproveDocument(documentId: string, adminUserId: string, notes?: string): Promise<void> {
    try {
      const docRef = doc(db, 'verificationDocuments', documentId)

      // Get document data first to access userId and verificationLevel
      const docSnap = await getDoc(docRef)
      if (!docSnap.exists()) {
        throw new Error('Document not found')
      }

      const documentData = docSnap.data()
      const userId = documentData.userId
      const verificationLevel = documentData.verificationLevel
      const documentType = documentData.type

      // Update document status
      await updateDoc(docRef, {
        status: 'verified',
        verifiedAt: serverTimestamp(),
        reviewedBy: adminUserId,
        notes: notes || 'Manually approved by admin',
        updatedAt: serverTimestamp()
      })

      // Update user verification status
      const userRef = doc(db, 'users', userId)
      await updateDoc(userRef, {
        isVerified: true,
        verificationLevel: verificationLevel,
        updatedAt: serverTimestamp()
      })

      // Update user's verification level in security service
      await SecurityService.updateUserVerificationLevel(userId, verificationLevel)

      // Update trust score
      await SecurityService.updateTrustScore(
        userId,
        'document_verified',
        15,
        `${documentType} document manually approved by admin`
      )
    } catch (error) {
      console.error('Error approving document:', error)
      throw new Error('Failed to approve document')
    }
  }

  static async adminRejectDocument(documentId: string, adminUserId: string, reason: string): Promise<void> {
    try {
      const docRef = doc(db, 'verificationDocuments', documentId)

      await updateDoc(docRef, {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        reviewedBy: adminUserId,
        notes: reason,
        updatedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Error rejecting document:', error)
      throw new Error('Failed to reject document')
    }
  }
}
'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { DocumentStorageService } from '@/lib/services/documentStorageService'
import { SimpleIdVerification } from '@/lib/services/simpleIdVerification'
import { VerificationDocument } from '@/types/auth'
import DocumentUpload from './DocumentUpload'

interface DocumentVerificationFlowProps {
  verificationLevel: 'basic' | 'enhanced' | 'premium' // Verification levels
  onBack: () => void
  onComplete: () => void
}

export default function DocumentVerificationFlow({
  verificationLevel,
  onBack,
  onComplete
}: DocumentVerificationFlowProps) {
  const { user } = useAuth()
  const { success, error: showError, warning, info } = useToast()
  const [documents, setDocuments] = useState<VerificationDocument[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadExistingDocuments()
  }, [user, verificationLevel])

  const loadExistingDocuments = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      // Load documents from Firebase Storage service
      const userDocs = await DocumentStorageService.getUserDocuments(user.id, verificationLevel)
      setDocuments(userDocs)
    } catch (error) {
      console.error('Error loading documents:', error)
      showError('Failed to load existing documents')
    } finally {
      setIsLoading(false)
    }
  }

  const getRequiredDocuments = () => {
    const commonFormats = ['pdf', 'jpg', 'png']

    // Only basic verification is currently supported
    // Enhanced and premium features will be added in future phases
    return [
      {
        type: 'sa_id' as const,
        title: 'South African ID Document',
        description: 'Upload a clear photo of your SA ID (both sides) or passport',
        acceptedFormats: commonFormats,
        maxSize: 10,
        required: true
      }
    ]
  }

  const handleDocumentUpload = async (documentType: string, documentData: Partial<VerificationDocument>) => {
    try {
      // Document is already uploaded to Firebase Storage via DocumentStorageService
      // Update local state to reflect the new document
      setDocuments(prev => {
        const existing = prev.findIndex(doc => doc.type === documentType)
        if (existing >= 0) {
          const updated = [...prev]
          updated[existing] = { ...updated[existing], ...documentData } as VerificationDocument
          return updated
        }
        return [...prev, documentData as VerificationDocument]
      })

      const docTitle = getRequiredDocuments().find(doc => doc.type === documentType)?.title || 'Document'
      success(`${docTitle} uploaded successfully! You can now submit for review.`)
    } catch (error) {
      console.error('Error updating document state:', error)
      showError('Failed to update document. Please try again.')
    }
  }

  const handleDocumentRemove = async (documentType: VerificationDocument['type'], silent = false) => {
    if (!user) return

    try {
      // Find the document to remove
      const documentToRemove = documents.find(doc => doc.type === documentType)
      if (!documentToRemove) {
        if (!silent) {
          showError('Document not found')
        }
        return
      }

      // Delete from Firebase Storage and database
      await DocumentStorageService.deleteDocument(documentToRemove.id, user.id)

      // Update local state
      setDocuments(prev => prev.filter(doc => doc.type !== documentType))

      // Only show success message if not silent (i.e., explicit deletion, not replacement)
      if (!silent) {
        const docTitle = getRequiredDocuments().find(doc => doc.type === documentType)?.title || 'Document'
        success(`${docTitle} removed successfully.`)
      }
    } catch (error) {
      console.error('Error removing document:', error)
      showError(error instanceof Error ? error.message : 'Failed to remove document. Please try again.')
    }
  }

  const handleSubmitForReview = async () => {
    if (!user) return

    try {
      setIsSubmitting(true)

      // Process verification for all draft documents
      const draftDocuments = documents.filter(doc => doc.status === 'draft')
      let allVerified = true
      const verificationResults: Array<{docId: string, status: string, message: string}> = []

      for (const doc of draftDocuments) {
        try {
          const verificationResult = await SimpleIdVerification.processDocumentVerification(doc.id)
          verificationResults.push({
            docId: doc.id,
            status: verificationResult.status,
            message: verificationResult.message
          })

          if (verificationResult.status !== 'verified') {
            allVerified = false
          }
        } catch (error) {
          console.error(`Verification failed for document ${doc.id}:`, error)
          verificationResults.push({
            docId: doc.id,
            status: 'rejected',
            message: 'Verification system error - document rejected'
          })
          allVerified = false
        }
      }

      // Reload documents to get updated statuses
      await loadExistingDocuments()

      // Show results
      const verifiedCount = verificationResults.filter(r => r.status === 'verified').length
      const rejectedCount = verificationResults.filter(r => r.status === 'rejected').length
      const pendingCount = verificationResults.filter(r => r.status === 'pending').length

      if (allVerified && verifiedCount === draftDocuments.length) {
        // All documents successfully verified
        success(`All documents verified successfully! Your ${verificationLevel} verification is complete. ✓`)
        onComplete()
      } else if (rejectedCount > 0 && pendingCount === 0) {
        // Only rejected documents
        const rejectedMessages = verificationResults
          .filter(r => r.status === 'rejected')
          .map(r => r.message)
          .join('; ')
        showError(`${rejectedCount} document(s) rejected: ${rejectedMessages}. Please re-upload with valid documents.`)
      } else if (pendingCount > 0 && rejectedCount === 0) {
        // Only pending documents - use info toast
        info(`Your document${pendingCount > 1 ? 's are' : ' is'} pending manual review. Our team will review within 24-48 hours and notify you via email. No further action needed.`, { duration: 10000 })
        // Navigate back to verification center to show pending status
        onComplete()
      } else if (pendingCount > 0 && rejectedCount > 0) {
        // Mix of pending and rejected
        warning(`${rejectedCount} document(s) rejected, ${pendingCount} pending review. Please re-upload rejected documents. Pending documents will be reviewed within 24-48 hours.`, { duration: 10000 })
      } else if (verifiedCount > 0) {
        // Some verified, some might have issues
        success(`${verifiedCount} document(s) verified. Review process complete.`)
        onComplete()
      } else {
        // Nothing was verified
        showError('No documents were verified. Please ensure your documents are clear and readable.')
      }
    } catch (error) {
      console.error('Error submitting for review:', error)
      showError('Failed to submit verification. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const requiredDocs = getRequiredDocuments()
  const uploadedDocs = documents.reduce((acc, doc) => {
    acc[doc.type] = doc
    return acc
  }, {} as Record<string, VerificationDocument>)

  const allRequiredDocsUploaded = requiredDocs.every(reqDoc =>
    uploadedDocs[reqDoc.type] && uploadedDocs[reqDoc.type].status !== 'rejected'
  )

  // Check if there are any pending documents
  const hasPendingDocuments = documents.some(doc => doc.status === 'pending')

  // Check if there are any draft documents that can be submitted
  const hasDraftDocuments = documents.some(doc => doc.status === 'draft')

  const getVerificationTitle = () => {
    return 'Basic Identity Verification'
  }

  const getVerificationDescription = () => {
    return 'Verify your identity with official South African documents. This helps employers trust you and gives you access to more opportunities.'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{getVerificationTitle()}</h1>
          <p className="text-gray-600 mt-1 max-w-2xl">
            {getVerificationDescription()}
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          ← Back to Verification
        </Button>
      </div>

      {/* Progress Indicator */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Verification Progress</p>
              <p className="text-sm text-gray-600">
                {Object.keys(uploadedDocs).length} of {requiredDocs.length} documents uploaded
              </p>
            </div>
            <div className="flex space-x-2">
              {requiredDocs.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full ${
                    index < Object.keys(uploadedDocs).length
                      ? 'bg-green-500'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Upload Sections */}
      <div className="space-y-6">
        {requiredDocs.map((reqDoc) => (
          <DocumentUpload
            key={reqDoc.type}
            documentType={reqDoc.type}
            verificationLevel={verificationLevel}
            title={reqDoc.title}
            description={reqDoc.description}
            acceptedFormats={reqDoc.acceptedFormats}
            maxSize={reqDoc.maxSize}
            onUploadComplete={(docData) => handleDocumentUpload(reqDoc.type, docData)}
            onDocumentRemove={handleDocumentRemove}
            existingDocument={uploadedDocs[reqDoc.type]}
            canEdit={true} // Allow editing until submitted for review
          />
        ))}
      </div>

      {/* Name Verification Warning */}
      {allRequiredDocsUploaded && user && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800 flex items-center">
              ⚠️ Important: Name Verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <p className="text-yellow-800">
                <strong>Your Profile Name:</strong> {user.firstName} {user.lastName}
              </p>
              <p className="text-yellow-700">
                Please ensure this <strong>exactly matches</strong> the name on your ID document.
                Any mismatch will result in verification failure and may lead to account restrictions.
              </p>
              <div className="bg-yellow-100 p-3 rounded border">
                <p className="text-yellow-800 font-medium">
                  ✓ Names must match exactly (including spelling, order, and spacing)
                </p>
                <p className="text-yellow-800 font-medium">
                  ✓ If your profile name is incorrect, update it before verification
                </p>
                <p className="text-yellow-800 font-medium">
                  ✓ Middle names are optional but should match if included
                </p>
              </div>
              {!user.idNumber && (
                <div className="bg-red-100 border border-red-200 p-3 rounded">
                  <p className="text-red-800 font-medium">
                    ❌ Missing ID Number: Please add your ID number to your profile before verification.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Documents Notice */}
      {hasPendingDocuments && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <div className="text-blue-600 text-2xl">ℹ️</div>
              <div>
                <p className="font-medium text-blue-900">Documents Pending Review</p>
                <p className="text-sm text-blue-800 mt-1">
                  Your documents have been submitted and are awaiting manual review by our team.
                  You will be notified via email within 24-48 hours once the review is complete.
                </p>
                <p className="text-sm text-blue-800 mt-2 font-medium">
                  No further action is required at this time.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      {allRequiredDocsUploaded && (
        <div className="flex justify-center pt-6">
          <Button
            onClick={handleSubmitForReview}
            isLoading={isSubmitting}
            disabled={isSubmitting || !user?.idNumber || hasPendingDocuments || !hasDraftDocuments}
            size="lg"
            className="px-8"
          >
            {isSubmitting ? 'Processing Verification...' :
             !user?.idNumber ? 'Add ID Number to Profile First' :
             hasPendingDocuments ? 'Documents Pending Review' :
             !hasDraftDocuments ? 'All Documents Submitted' :
             'I Confirm Names Match - Submit for Verification'}
          </Button>
        </div>
      )}

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>What happens next?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-xs">
                1
              </div>
              <p>Upload all required documents using the forms above</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-xs">
                2
              </div>
              <p>Our system automatically verifies your documents using OCR technology</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-xs">
                3
              </div>
              <p>You&apos;ll receive instant verification results or feedback if documents need improvement</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-xs">
                4
              </div>
              <p>Once verified, your trust score will be updated and you&apos;ll gain access to more opportunities</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
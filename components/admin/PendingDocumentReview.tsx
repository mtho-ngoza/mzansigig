'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { DocumentStorageService } from '@/lib/services/documentStorageService'
import { VerificationDocument } from '@/types/auth'
import { User } from '@/types/auth'
import { isAdmin } from '@/lib/utils/adminAuth'
import { getDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

type FilterStatus = 'all' | 'pending' | 'verified' | 'rejected'

export default function PendingDocumentReview() {
  const { user } = useAuth()
  const { success: showSuccess, error: showError } = useToast()
  const [documents, setDocuments] = useState<VerificationDocument[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<VerificationDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('pending')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<VerificationDocument | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [userDetails, setUserDetails] = useState<Record<string, User>>({})
  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string>('')

  useEffect(() => {
    if (user && !isAdmin(user)) {
      showError('Admin access required')
      return
    }
    loadDocuments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    if (filter === 'all') {
      setFilteredDocuments(documents)
    } else {
      setFilteredDocuments(documents.filter(d => d.status === filter))
    }
  }, [filter, documents])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const data = await DocumentStorageService.getAllDocumentsForAdmin()
      setDocuments(data)

      // Load user details for each document
      const userIds = [...new Set(data.map(d => d.userId))]
      const details: Record<string, User> = {}

      await Promise.all(
        userIds.map(async (userId) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', userId))
            if (userDoc.exists()) {
              details[userId] = { id: userDoc.id, ...userDoc.data() } as User
            }
          } catch (error) {
            console.debug('Error loading user details:', error)
          }
        })
      )

      setUserDetails(details)
    } catch (error) {
      showError('Failed to load documents')
      console.error('Error loading documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (document: VerificationDocument) => {
    if (!user) return

    const userInfo = userDetails[document.userId]
    const confirmed = window.confirm(
      `Approve verification document for ${userInfo?.firstName || 'user'} ${userInfo?.lastName || ''}?`
    )

    if (!confirmed) return

    try {
      setProcessingId(document.id)
      await DocumentStorageService.adminApproveDocument(document.id, user.id)
      showSuccess('Document approved successfully')
      await loadDocuments()
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to approve document')
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectClick = (document: VerificationDocument) => {
    setSelectedDocument(document)
    setRejectionReason('')
    setRejectModalOpen(true)
  }

  const handleRejectConfirm = async () => {
    if (!user || !selectedDocument || !rejectionReason.trim()) {
      showError('Please provide a rejection reason')
      return
    }

    try {
      setProcessingId(selectedDocument.id)
      await DocumentStorageService.adminRejectDocument(
        selectedDocument.id,
        user.id,
        rejectionReason
      )
      showSuccess('Document rejected')
      setRejectModalOpen(false)
      setSelectedDocument(null)
      setRejectionReason('')
      await loadDocuments()
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to reject document')
    } finally {
      setProcessingId(null)
    }
  }

  const handleViewImage = (imageUrl: string) => {
    setSelectedImage(imageUrl)
    setImageModalOpen(true)
  }

  const formatDate = (date?: Date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      sa_id: 'SA ID',
      passport: 'Passport',
      drivers_license: 'Driver\'s License',
      proof_of_address: 'Proof of Address',
      bank_statement: 'Bank Statement',
      employment_letter: 'Employment Letter',
      reference_letter: 'Reference Letter'
    }
    return labels[type] || type
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      draft: 'bg-gray-100 text-gray-800'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
        {status.toUpperCase()}
      </span>
    )
  }

  if (!user || !isAdmin(user)) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Admin access required</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading documents...</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Document Verification Review</h1>
        <p className="text-gray-600 mt-1">Review and approve user verification documents</p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex space-x-6">
          {(['all', 'pending', 'verified', 'rejected'] as FilterStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                filter === status
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              <span className="ml-2 text-xs">
                ({status === 'all' ? documents.length : documents.filter(d => d.status === status).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            No {filter !== 'all' ? filter : ''} documents found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDocuments.map((document) => {
            const userInfo = userDetails[document.userId]
            const isProcessing = processingId === document.id

            return (
              <Card key={document.id}>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* User Info */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">User Information</h3>
                      <div className="text-sm space-y-1">
                        <p><span className="text-gray-600">Name:</span> {userInfo?.firstName} {userInfo?.lastName}</p>
                        <p><span className="text-gray-600">Email:</span> {userInfo?.email}</p>
                        <p><span className="text-gray-600">ID Number:</span> {userInfo?.idNumber || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Document Info */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Document Details</h3>
                      <div className="text-sm space-y-1">
                        <p><span className="text-gray-600">Type:</span> {getDocumentTypeLabel(document.type)}</p>
                        <p><span className="text-gray-600">Status:</span> {getStatusBadge(document.status)}</p>
                        <p><span className="text-gray-600">Submitted:</span> {formatDate(document.submittedAt)}</p>
                        <p><span className="text-gray-600">Level:</span> {document.verificationLevel}</p>
                      </div>
                    </div>

                    {/* Verification Attempt */}
                    {document.verificationAttempt && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">OCR Verification</h3>
                        <div className="text-sm space-y-1">
                          <p><span className="text-gray-600">Confidence:</span> {document.verificationAttempt.confidence}%</p>
                          {document.verificationAttempt.issues.length > 0 && (
                            <div>
                              <p className="text-gray-600 mb-1">Issues:</p>
                              <ul className="list-disc list-inside text-red-600 text-xs">
                                {document.verificationAttempt.issues.map((issue, idx) => (
                                  <li key={idx}>{issue}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {document.verificationAttempt.ocrExtractedText && (
                            <p className="text-xs text-gray-500 mt-2">
                              OCR Text: {document.verificationAttempt.ocrExtractedText.substring(0, 100)}...
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewImage(document.fileUrl)}
                      >
                        View Document
                      </Button>

                      {document.status === 'pending' && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleApprove(document)}
                            isLoading={isProcessing}
                            disabled={isProcessing}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRejectClick(document)}
                            disabled={isProcessing}
                            className="text-red-600 border-red-600 hover:bg-red-50"
                          >
                            Reject
                          </Button>
                        </>
                      )}

                      {document.notes && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                          <p className="text-gray-600 font-medium">Notes:</p>
                          <p className="text-gray-700">{document.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Image Viewer Modal */}
      {imageModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Document Image</h3>
              <Button variant="outline" onClick={() => setImageModalOpen(false)}>
                Close
              </Button>
            </div>
            <div className="p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedImage}
                alt="Document"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Reject Document</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting this document. This will be visible to the user.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter rejection reason..."
            />
            <div className="flex space-x-3 mt-4">
              <Button
                variant="outline"
                onClick={handleRejectConfirm}
                isLoading={processingId === selectedDocument.id}
                disabled={!rejectionReason.trim() || processingId === selectedDocument.id}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                Confirm Reject
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setRejectModalOpen(false)
                  setSelectedDocument(null)
                  setRejectionReason('')
                }}
                disabled={processingId === selectedDocument.id}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

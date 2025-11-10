'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/contexts/ToastContext'
import { VerificationDocument } from '@/types/auth'
import { DocumentStorageService } from '@/lib/services/documentStorageService'
import { useAuth } from '@/contexts/AuthContext'

interface DocumentUploadProps {
  documentType: VerificationDocument['type']
  verificationLevel: 'basic' | 'enhanced' | 'premium'
  title: string
  description: string
  acceptedFormats: string[]
  maxSize: number // in MB
  onUploadComplete: (document: Partial<VerificationDocument>) => void
  onDocumentRemove?: (documentType: VerificationDocument['type'], silent?: boolean) => Promise<void>
  isUploading?: boolean
  existingDocument?: VerificationDocument
  canEdit?: boolean // Whether document can be edited/deleted
}

export default function DocumentUpload({
  documentType,
  verificationLevel,
  title,
  description,
  acceptedFormats,
  maxSize,
  onUploadComplete,
  onDocumentRemove,
  isUploading = false,
  existingDocument,
  canEdit = true
}: DocumentUploadProps) {
  const { user } = useAuth()
  const { error: showError } = useToast()
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploaded, setIsUploaded] = useState(false)
  const [isUploadingState, setIsUploadingState] = useState(false)
  const [isDeletingState, setIsDeletingState] = useState(false)
  const [showUploadInterface, setShowUploadInterface] = useState(!existingDocument)

  useEffect(() => {
    if (!existingDocument) {
      setShowUploadInterface(true)
      setIsUploaded(false)
      setIsDeletingState(false)
    } else {
      setShowUploadInterface(false)
      setIsUploaded(false)
      setIsDeletingState(false)
    }
  }, [existingDocument])

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`
    }

    // Check file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const isValidFormat = acceptedFormats.some(format => {
      if (format === 'pdf') return file.type === 'application/pdf' || fileExtension === 'pdf'
      if (format === 'jpg' || format === 'jpeg') return file.type.startsWith('image/jpeg') || fileExtension === 'jpg' || fileExtension === 'jpeg'
      if (format === 'png') return file.type.startsWith('image/png') || fileExtension === 'png'
      return false
    })

    if (!isValidFormat) {
      return `Only ${acceptedFormats.join(', ')} files are accepted`
    }

    return null
  }, [acceptedFormats, maxSize])

  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file)
    if (error) {
      showError(error)
      return
    }

    setSelectedFile(file)
  }, [validateFile, showError])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }, [handleFileSelect])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }, [handleFileSelect])

  const handleChooseFileClick = useCallback(() => {
    const fileInput = document.getElementById(`file-input-${documentType}`) as HTMLInputElement
    if (fileInput) {
      fileInput.click()
    }
  }, [documentType])

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !user || isUploadingState) return

    try {
      setIsUploadingState(true)

      // If replacing an existing document, remove it first (silently)
      if (existingDocument && onDocumentRemove) {
        await onDocumentRemove(documentType, true)
      }

      // Upload to Firebase Storage using DocumentStorageService
      const documentData = {
        userId: user.id,
        type: documentType,
        verificationLevel,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
        status: 'draft' as const
      }

      const uploadedDocument = await DocumentStorageService.uploadDocument(
        user.id,
        selectedFile,
        documentData
      )

      onUploadComplete(uploadedDocument)
      setIsUploaded(true)
      setSelectedFile(null)
      setShowUploadInterface(false)
    } catch (error) {
      console.error('Upload error:', error)
      showError(error instanceof Error ? error.message : 'Failed to upload document. Please try again.')
    } finally {
      setIsUploadingState(false)
    }
  }, [selectedFile, user, isUploadingState, documentType, verificationLevel, onUploadComplete, showError, existingDocument, onDocumentRemove])

  const handleDeleteDocument = useCallback(async () => {
    if (isDeletingState) return

    if (window.confirm(`Are you sure you want to delete this document? This action cannot be undone.`)) {
      try {
        setIsDeletingState(true)
        if (onDocumentRemove) {
          await onDocumentRemove(documentType, false)
        }
      } catch (error) {
        console.error('Delete error:', error)
        showError('Failed to delete document. Please try again.')
      } finally {
        setIsDeletingState(false)
      }
    }
  }, [onDocumentRemove, documentType, isDeletingState, showError])

  const handleReplaceDocument = useCallback(() => {
    setShowUploadInterface(true)
    setIsUploaded(false)
    setSelectedFile(null)
  }, [])

  const handleCancelReplace = useCallback(() => {
    setShowUploadInterface(false)
    setIsUploaded(false)
    setSelectedFile(null)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'text-green-600 bg-green-100'
      case 'rejected': return 'text-red-600 bg-red-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'draft': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'verified': return '✓ Verified'
      case 'rejected': return '✗ Rejected'
      case 'pending': return '⏳ Under Review'
      case 'draft': return '📝 Ready for Submission'
      default: return '❓ Unknown'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          {existingDocument && (
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(existingDocument.status)}`}>
              {getStatusText(existingDocument.status)}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">{description}</p>

        {existingDocument && !showUploadInterface ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                  📄
                </div>
                <div>
                  <p className="font-medium text-gray-900">{existingDocument.fileName}</p>
                  <p className="text-xs text-gray-500">
                    Uploaded {existingDocument.submittedAt.toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(existingDocument.status)}`}>
                  {getStatusText(existingDocument.status)}
                </div>
              </div>
            </div>

            {existingDocument.notes && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Review Notes:</strong> {existingDocument.notes}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            {canEdit && (existingDocument.status === 'pending' || existingDocument.status === 'draft') && (
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={handleReplaceDocument}
                  className="flex-1"
                  disabled={isUploadingState || isDeletingState}
                >
                  Replace Document
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDeleteDocument}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  disabled={isUploadingState || isDeletingState}
                  isLoading={isDeletingState}
                >
                  {isDeletingState ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            )}

            {existingDocument.status === 'rejected' && (
              <Button
                variant="outline"
                onClick={handleReplaceDocument}
                className="w-full"
                disabled={isUploadingState || isDeletingState}
              >
                Upload New Document
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Show cancel option when replacing existing document */}
            {existingDocument && showUploadInterface && (
              <div className="flex justify-between items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div>
                  <p className="font-medium text-yellow-800">Replacing: {existingDocument.fileName}</p>
                  <p className="text-sm text-yellow-600">Upload a new document or cancel to keep the current one</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelReplace}
                  className="text-gray-600 border-gray-300"
                  disabled={isUploadingState || isDeletingState}
                >
                  Cancel
                </Button>
              </div>
            )}
            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isUploadingState
                  ? 'border-blue-300 bg-blue-50 cursor-wait'
                  : isDeletingState
                  ? 'border-red-300 bg-red-50 cursor-wait'
                  : dragActive
                  ? 'border-primary-500 bg-primary-50'
                  : selectedFile
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
              } ${isUploadingState || isDeletingState ? 'pointer-events-none' : ''}`}
              onDragEnter={isUploadingState || isDeletingState ? undefined : handleDrag}
              onDragLeave={isUploadingState || isDeletingState ? undefined : handleDrag}
              onDragOver={isUploadingState || isDeletingState ? undefined : handleDrag}
              onDrop={isUploadingState || isDeletingState ? undefined : handleDrop}
            >
              {isUploadingState ? (
                <div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                  <p className="font-medium text-blue-900">Uploading {selectedFile?.name}</p>
                  <p className="text-sm text-blue-600">Please wait while we upload your document...</p>
                </div>
              ) : selectedFile ? (
                <div>
                  <div className="w-12 h-12 bg-green-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                    ✓
                  </div>
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-600">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div>
                  <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                    📎
                  </div>
                  <p className="font-medium text-gray-900 mb-1">
                    Drop your file here
                  </p>
                  <p className="text-sm text-gray-600 mb-3">
                    Accepted: {acceptedFormats.join(', ')} • Max size: {maxSize}MB
                  </p>
                  <Button
                    variant="outline"
                    onClick={handleChooseFileClick}
                    disabled={isUploadingState || isDeletingState}
                  >
                    Choose File
                  </Button>
                </div>
              )}
            </div>

            {/* Upload Button */}
            {selectedFile && !isUploaded && !isUploadingState && !isDeletingState && (
              <Button
                onClick={handleUpload}
                isLoading={isUploadingState}
                disabled={isUploadingState || isDeletingState || !selectedFile}
                className="w-full"
              >
                Upload Document
              </Button>
            )}

            {/* Upload Success Indicator */}
            {isUploaded && (
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="w-12 h-12 bg-green-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <span className="text-green-600 text-xl">✓</span>
                </div>
                <p className="text-green-800 font-medium">Document ready for submission</p>
                <p className="text-sm text-green-600 mb-3">You can now submit all documents for review</p>

                {/* Edit/Delete options for uploaded document */}
                {canEdit && (
                  <div className="flex space-x-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReplaceDocument}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      disabled={isUploadingState || isDeletingState}
                    >
                      Replace
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteDocument}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      disabled={isUploadingState || isDeletingState}
                      isLoading={isDeletingState}
                    >
                      {isDeletingState ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Hidden file input */}
            <input
              type="file"
              onChange={handleFileInput}
              accept={acceptedFormats.map(f => f === 'jpg' ? '.jpg,.jpeg' : `.${f}`).join(',')}
              className="hidden"
              disabled={isUploadingState || isDeletingState}
              id={`file-input-${documentType}`}
            />
          </div>
        )}

        {/* Format Guidelines */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Document Guidelines:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Ensure document is clear and readable</li>
            <li>• All corners and edges must be visible</li>
            <li>• No glare or shadows on the document</li>
            <li>• Document must be valid and not expired</li>
            {documentType === 'sa_id' && (
              <li>• Both front and back sides required for SA ID</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
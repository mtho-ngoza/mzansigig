'use client'

import React, { useState, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { ProfileService } from '@/lib/database/profileService'
import { getProfileSectionConfig, isInformalWorker } from '@/lib/utils/userProfile'
import { useToast } from '@/contexts/ToastContext'

interface ProfilePhotoUploadProps {
  onBack?: () => void
}

export default function ProfilePhotoUpload({ onBack }: ProfilePhotoUploadProps) {
  const { success, error: showError } = useToast()
  const { user, refreshUser } = useAuth()
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!user) return null

  const isInformal = isInformalWorker(user)
  const config = getProfileSectionConfig(user, 'photo')

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Please select an image file.')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showError('File size must be less than 5MB.')
      return
    }

    setSelectedFile(file)

    // Create preview URL
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    try {
      await ProfileService.uploadProfilePhoto(user.id, selectedFile)
      await ProfileService.updateProfileCompleteness(user.id)

      // Refresh user data to get updated profile photo
      await refreshUser()

      success('Lekker! Profile photo looking sharp')
      setSelectedFile(null)
      setPreviewUrl(null)

      if (onBack) onBack()
    } catch (err) {
      console.error('Error uploading profile photo:', err)
      showError('Failed to upload profile photo. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancel = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const currentPhotoUrl = user.profilePhoto || previewUrl

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          {onBack && (
            <Button variant="ghost" onClick={onBack} className="mb-4">
              ← Back to Profile
            </Button>
          )}

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {config?.title || 'Profile Photo'}
            </h1>
            <p className="text-gray-600 max-w-md mx-auto">
              {config?.description || `Upload a professional photo to build trust with ${user.userType === 'job-seeker' ? 'employers' : 'job seekers'}.`}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Update Profile Photo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current/Preview Photo */}
            <div className="text-center">
              <div className="inline-block relative">
                {currentPhotoUrl ? (
                  <img
                    src={currentPhotoUrl}
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 shadow-lg"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-200 shadow-lg">
                    <span className="text-4xl text-gray-500">
                      {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                    </span>
                  </div>
                )}

                {previewUrl && (
                  <div className="absolute -top-2 -right-2 bg-secondary-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                    ✓
                  </div>
                )}
              </div>
            </div>

            {/* File Input */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="profile-photo-input"
              />
              <label
                htmlFor="profile-photo-input"
                className="w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-primary-500 hover:bg-gray-50 transition-colors"
              >
                <div className="text-gray-600 text-center">
                  <div className="text-4xl mb-2">📷</div>
                  <div className="text-lg font-medium mb-1">Choose a photo</div>
                  <div className="text-sm">
                    Click to upload or drag and drop
                    <br />
                    PNG, JPG, GIF up to 5MB
                  </div>
                </div>
              </label>
            </div>

            {/* Photo Guidelines */}
            <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-4">
              <h4 className="font-semibold text-secondary-800 mb-2">📋 {isInformal ? 'Photo Tips' : 'Photo Guidelines'}</h4>
              <ul className="text-sm text-secondary-700 space-y-1">
                <li>• Use a clear, well-lit photo of your face</li>
                <li>• Look professional and approachable</li>
                <li>• Avoid group photos, selfies, or distracting backgrounds</li>
                <li>• Make sure you&apos;re looking directly at the camera</li>
                <li>• Keep it recent (within the last 2 years)</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              {(selectedFile || previewUrl) && (
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
              )}

              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                isLoading={isUploading}
              >
                {isUploading ? 'Uploading...' : selectedFile ? 'Upload Photo' : 'Choose Photo First'}
              </Button>
            </div>

            {/* Current Photo Options */}
            {user.profilePhoto && !selectedFile && (
              <div className="pt-4 border-t text-center">
                <p className="text-sm text-gray-600 mb-3">
                  You already have a profile photo. You can update it by choosing a new one above.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
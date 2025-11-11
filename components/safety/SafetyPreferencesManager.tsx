'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { SecurityService } from '@/lib/services/securityService'
import { SafetyPreferences } from '@/types/auth'
import EmergencyContactsManager from './EmergencyContactsManager'
import VerificationCenter from './VerificationCenter'
import { TrustScoreBadge, VerificationBadge } from './TrustScoreBadge'

interface SafetyPreferencesManagerProps {
  onBack?: () => void
}

export default function SafetyPreferencesManager({ onBack }: SafetyPreferencesManagerProps) {
  const { user } = useAuth()
  const { success, error: showError } = useToast()
  const [preferences, setPreferences] = useState<SafetyPreferences>({
    emergencyContacts: [],
    preferredMeetingTypes: 'any',
    shareLocationWithContacts: false,
    allowCheckInReminders: true,
    allowSafetyNotifications: true
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showEmergencyContacts, setShowEmergencyContacts] = useState(false)
  const [showVerificationCenter, setShowVerificationCenter] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    loadSafetyPreferences()
  }, [user])

  const loadSafetyPreferences = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const userPreferences = await SecurityService.getSafetyPreferences(user.id)
      if (userPreferences) {
        setPreferences(userPreferences)
      }
    } catch (error) {
      console.error('Error loading safety preferences:', error)
      showError('Failed to load safety preferences')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePreferenceChange = (key: keyof SafetyPreferences, value: string | boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!user) return

    try {
      setIsSaving(true)
      await SecurityService.updateSafetyPreferences(user.id, preferences)
      success('Safety preferences updated successfully')
      setHasChanges(false)
    } catch (error) {
      console.error('Error updating safety preferences:', error)
      showError('Failed to update safety preferences')
    } finally {
      setIsSaving(false)
    }
  }

  if (showEmergencyContacts) {
    return (
      <EmergencyContactsManager
        onBack={() => {
          setShowEmergencyContacts(false)
          loadSafetyPreferences() // Reload to get updated emergency contacts
        }}
      />
    )
  }

  if (showVerificationCenter) {
    return (
      <VerificationCenter
        onBack={() => setShowVerificationCenter(false)}
      />
    )
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Safety Preferences</h1>
          <p className="text-gray-600 mt-1">
            Configure your safety and security settings for a safer gig experience
          </p>
        </div>
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            ← Back to Profile
          </Button>
        )}
      </div>

      {/* Safety Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.99-4L21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <CardTitle>Your Safety Status</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {preferences.emergencyContacts.length}
              </div>
              <div className="text-sm text-gray-600">Emergency Contacts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary-600">
                {user?.trustScore || 50}
              </div>
              <div className="text-sm text-gray-600">Trust Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {user?.verificationLevel === 'premium' ? 'Premium' :
                 user?.verificationLevel === 'enhanced' ? 'Enhanced' :
                 user?.isVerified ? 'Basic' : 'None'}
              </div>
              <div className="text-sm text-gray-600">Verification Level</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification & Trust Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Verification & Trust</CardTitle>
            <Button
              variant="outline"
              onClick={() => setShowVerificationCenter(true)}
            >
              Manage Verification
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Current Verification</h4>
              <VerificationBadge
                level={user?.verificationLevel || (user?.isVerified ? 'basic' : 'none')}
                size="lg"
              />
              <p className="text-xs text-gray-600 mt-2">
                {user?.verificationLevel === 'premium' ? 'Highest verification level achieved!' :
                 user?.verificationLevel === 'enhanced' ? 'Enhanced verification - upgrade to Premium available' :
                 user?.verificationLevel === 'basic' ? 'Basic verification - upgrade to Enhanced available' :
                 'Get verified to increase trust with employers and workers'}
              </p>
            </div>
            <div className="text-center">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Trust Score</h4>
              <TrustScoreBadge score={user?.trustScore || 50} size="lg" />
              <p className="text-xs text-gray-600 mt-2">
                Based on verifications, reviews, and platform activity
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contacts Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Emergency Contacts</CardTitle>
            <Button
              variant="outline"
              onClick={() => setShowEmergencyContacts(true)}
            >
              Manage Contacts
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {preferences.emergencyContacts.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-gray-400 mb-2">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-gray-600">No emergency contacts added yet</p>
              <Button
                className="mt-2"
                onClick={() => setShowEmergencyContacts(true)}
              >
                Add Emergency Contact
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {preferences.emergencyContacts.slice(0, 3).map((contact) => (
                <div key={contact.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{contact.name}</span>
                      {contact.isPrimary && (
                        <span className="bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full">
                          Primary
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-600">{contact.relationship}</span>
                  </div>
                  <span className="text-sm text-gray-500">{contact.phone}</span>
                </div>
              ))}
              {preferences.emergencyContacts.length > 3 && (
                <p className="text-sm text-gray-500 text-center">
                  And {preferences.emergencyContacts.length - 3} more contacts...
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meeting Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Meeting Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Meeting Types
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="meetingType"
                    value="public_only"
                    checked={preferences.preferredMeetingTypes === 'public_only'}
                    onChange={(e) => handlePreferenceChange('preferredMeetingTypes', e.target.value)}
                    className="mr-3"
                  />
                  <div>
                    <span className="font-medium">Public places only</span>
                    <p className="text-sm text-gray-600">
                      Only meet in public locations like malls, cafes, or community centers
                    </p>
                  </div>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="meetingType"
                    value="any"
                    checked={preferences.preferredMeetingTypes === 'any'}
                    onChange={(e) => handlePreferenceChange('preferredMeetingTypes', e.target.value)}
                    className="mr-3"
                  />
                  <div>
                    <span className="font-medium">Any safe location</span>
                    <p className="text-sm text-gray-600">
                      Meet anywhere that feels safe and appropriate for the gig
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location and Communication Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Location & Communication</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div className="flex-1">
                <span className="font-medium text-gray-900">Share location with emergency contacts</span>
                <p className="text-sm text-gray-600">
                  Allow emergency contacts to see your location during active gigs
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.shareLocationWithContacts}
                onChange={(e) => handlePreferenceChange('shareLocationWithContacts', e.target.checked)}
                className="ml-4"
              />
            </label>

            <label className="flex items-center justify-between">
              <div className="flex-1">
                <span className="font-medium text-gray-900">Allow check-in reminders</span>
                <p className="text-sm text-gray-600">
                  Receive reminders to check in during long gigs for your safety
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.allowCheckInReminders}
                onChange={(e) => handlePreferenceChange('allowCheckInReminders', e.target.checked)}
                className="ml-4"
              />
            </label>

            <label className="flex items-center justify-between">
              <div className="flex-1">
                <span className="font-medium text-gray-900">Safety notifications</span>
                <p className="text-sm text-gray-600">
                  Receive notifications about safety updates and tips
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.allowSafetyNotifications}
                onChange={(e) => handlePreferenceChange('allowSafetyNotifications', e.target.checked)}
                className="ml-4"
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Safety Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Safety Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-secondary-50 p-4 rounded-lg">
              <h4 className="font-medium text-secondary-900 mb-2">Before Meeting</h4>
              <ul className="text-sm text-secondary-800 space-y-1">
                <li>• Verify the employer&apos;s identity</li>
                <li>• Share meeting details with contacts</li>
                <li>• Choose well-lit, public locations</li>
                <li>• Trust your instincts</li>
              </ul>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">During Gigs</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Check in with emergency contacts</li>
                <li>• Keep your phone charged</li>
                <li>• Stay in public areas when possible</li>
                <li>• Report any concerns immediately</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6">
          <Button
            onClick={handleSave}
            isLoading={isSaving}
            disabled={isSaving}
            className="shadow-lg"
          >
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      )}
    </div>
  )
}
'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useLocation } from '@/contexts/LocationContext'
import { GigService } from '@/lib/database/gigService'
import { GigApplication } from '@/types/gig'

interface GigCheckInProps {
  application: GigApplication
  onUpdate?: () => void
}

export default function GigCheckIn({ application, onUpdate }: GigCheckInProps) {
  const { user } = useAuth()
  const { success, error: showError } = useToast()
  const { getEffectiveCoordinates } = useLocation()
  const [isLoading, setIsLoading] = useState(false)
  const [checkInStatus, setCheckInStatus] = useState<{
    isCheckedIn: boolean
    checkInAt?: Date
    checkOutAt?: Date
    lastSafetyCheckAt?: Date
    missedSafetyChecks: number
    needsSafetyCheck: boolean
  } | null>(null)

  useEffect(() => {
    loadCheckInStatus()
  }, [application.id])

  const loadCheckInStatus = async () => {
    try {
      const status = await GigService.getCheckInStatus(application.id)
      setCheckInStatus(status)
    } catch (error) {
      console.error('Error loading check-in status:', error)
    }
  }

  const handleCheckIn = async () => {
    if (!user) return

    try {
      setIsLoading(true)

      // Get current location
      const coordinates = await getEffectiveCoordinates()

      await GigService.checkIn(application.id, user.id, coordinates || undefined)
      success('Sharp! Checked in. Stay safe out there')
      await loadCheckInStatus()
      onUpdate?.()
    } catch (error) {
      console.error('Error checking in:', error)
      showError(error instanceof Error ? error.message : 'Failed to check in')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckOut = async () => {
    if (!user) return

    try {
      setIsLoading(true)

      // Get current location
      const coordinates = await getEffectiveCoordinates()

      await GigService.checkOut(application.id, user.id, coordinates || undefined)
      success("Lekker! You're all checked out. Safe travels")
      await loadCheckInStatus()
      onUpdate?.()
    } catch (error) {
      console.error('Error checking out:', error)
      showError(error instanceof Error ? error.message : 'Failed to check out')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSafetyCheck = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      await GigService.performSafetyCheck(application.id, user.id)
      success('Safety check confirmed. Thank you!')
      await loadCheckInStatus()
      onUpdate?.()
    } catch (error) {
      console.error('Error performing safety check:', error)
      showError(error instanceof Error ? error.message : 'Failed to perform safety check')
    } finally {
      setIsLoading(false)
    }
  }

  if (!checkInStatus || application.status !== 'funded') {
    return null
  }

  const formatTime = (date?: Date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (startDate?: Date) => {
    if (!startDate) return 'N/A'
    const duration = Date.now() - new Date(startDate).getTime()
    const hours = Math.floor(duration / (1000 * 60 * 60))
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>Safety Check-In</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Check-In Status */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Status</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              checkInStatus.isCheckedIn
                ? 'bg-green-100 text-green-800'
                : checkInStatus.checkOutAt
                ? 'bg-gray-100 text-gray-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {checkInStatus.isCheckedIn
                ? 'Checked In'
                : checkInStatus.checkOutAt
                ? 'Checked Out'
                : 'Not Checked In'}
            </span>
          </div>

          {checkInStatus.checkInAt && (
            <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 mb-1">Check-in Time</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatTime(checkInStatus.checkInAt)}
                </p>
              </div>
              {checkInStatus.checkOutAt ? (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Check-out Time</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatTime(checkInStatus.checkOutAt)}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Duration</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDuration(checkInStatus.checkInAt)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Safety Check Reminder */}
        {checkInStatus.isCheckedIn && checkInStatus.needsSafetyCheck && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Safety Check Needed
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  It&apos;s been 2+ hours since your last check-in. Please confirm you&apos;re safe.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {!checkInStatus.checkInAt && (
            <Button
              onClick={handleCheckIn}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? 'Checking In...' : 'Check In at Gig Location'}
            </Button>
          )}

          {checkInStatus.isCheckedIn && (
            <>
              <Button
                onClick={handleSafetyCheck}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                {isLoading ? 'Confirming...' : 'Confirm I\'m Safe ✓'}
              </Button>

              <Button
                onClick={handleCheckOut}
                disabled={isLoading}
                className="w-full bg-gray-600 hover:bg-gray-700"
              >
                {isLoading ? 'Checking Out...' : 'Check Out from Gig'}
              </Button>
            </>
          )}
        </div>

        {/* Safety Tips */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Safety Tips</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Check in when you arrive at the gig location</li>
            <li>• Confirm you&apos;re safe every 2 hours during work</li>
            <li>• Check out when you finish and leave the location</li>
            <li>• Your emergency contacts will be notified if you miss check-ins</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

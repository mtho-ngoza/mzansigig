'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useLocation } from '@/contexts/LocationContext'

interface LocationPermissionPromptProps {
  onDismiss?: () => void
  showDismiss?: boolean
  compact?: boolean
}

export default function LocationPermissionPrompt({
  onDismiss,
  showDismiss = true,
  compact = false
}: LocationPermissionPromptProps) {
  const { requestLocationPermission, isLoadingLocation } = useLocation()
  const [isDismissed, setIsDismissed] = useState(false)

  const handleRequestLocation = async () => {
    await requestLocationPermission()
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  if (isDismissed) return null

  if (compact) {
    return (
      <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-secondary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-secondary-900">
                Find gigs near you
              </p>
              <p className="text-sm text-secondary-700">
                Enable location to see nearby opportunities first
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRequestLocation}
              disabled={isLoadingLocation}
              className="text-secondary-700 border-secondary-300 hover:bg-secondary-100"
            >
              {isLoadingLocation ? 'Requesting...' : 'Enable'}
            </Button>
            {showDismiss && (
              <button
                onClick={handleDismiss}
                className="text-secondary-400 hover:text-secondary-600"
                aria-label="Dismiss"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className="mb-6 border-secondary-200 bg-secondary-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg text-secondary-900">
          <svg className="mr-2 h-5 w-5 text-secondary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Find Gigs Near You
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-secondary-800">
            Enable location services to discover gigs in your area. This is especially useful for:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-secondary-500 rounded-full"></div>
              <span className="text-sm text-secondary-700">Cleaning services</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-secondary-500 rounded-full"></div>
              <span className="text-sm text-secondary-700">Construction work</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-secondary-500 rounded-full"></div>
              <span className="text-sm text-secondary-700">Transportation</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-secondary-500 rounded-full"></div>
              <span className="text-sm text-secondary-700">Local services</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-md border border-secondary-200">
            <h4 className="font-medium text-secondary-900 mb-1">Privacy Notice</h4>
            <p className="text-xs text-secondary-700">
              Your location is only used to show nearby gigs and is not shared with employers until you apply.
              You can disable location access at any time in your browser settings.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleRequestLocation}
              disabled={isLoadingLocation}
              className="bg-primary-600 hover:bg-primary-700 text-white flex-1"
            >
              {isLoadingLocation ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Requesting Location...
                </>
              ) : (
                <>
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Enable Location
                </>
              )}
            </Button>

            {showDismiss && (
              <Button
                variant="outline"
                onClick={handleDismiss}
                className="border-secondary-300 text-secondary-700 hover:bg-secondary-100"
              >
                Maybe Later
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
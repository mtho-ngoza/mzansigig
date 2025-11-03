'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import { ProfileService } from '@/lib/database/profileService'

export default function ProfileCompleteness() {
  const { user } = useAuth()
  const [completeness, setCompleteness] = useState(0)

  useEffect(() => {
    if (user) {
      const calculated = ProfileService.calculateProfileCompleteness(user)
      setCompleteness(calculated)
    }
  }, [user])

  if (!user) return null

  const getCompletenessColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 60) return 'bg-yellow-500'
    if (percentage >= 40) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getCompletenessText = (percentage: number) => {
    if (percentage >= 80) return 'Excellent! Your profile looks great.'
    if (percentage >= 60) return 'Good progress! Add a few more details.'
    if (percentage >= 40) return 'Getting there! Keep adding information.'
    return "Let's start building your profile!"
  }

  const getMissingFields = () => {
    const missing = []
    if (!user.bio) missing.push('Bio/About section')
    if (!user.profilePhoto) missing.push('Profile photo')
    if (!user.skills || user.skills.length === 0) missing.push('Skills')
    if (!user.experience) missing.push('Experience level')
    if (!user.hourlyRate) missing.push('Hourly rate')
    if (!user.availability) missing.push('Availability')
    if (!user.education) missing.push('Education')
    if (!user.languages || user.languages.length === 0) missing.push('Languages')

    if (user.userType === 'job-seeker') {
      if (!user.portfolio || user.portfolio.length === 0) missing.push('Portfolio items')
    } else {
      if (!user.certifications || user.certifications.length === 0) missing.push('Certifications')
    }

    return missing
  }

  const missingFields = getMissingFields()

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Profile Completeness</h3>
            <p className="text-sm text-gray-600">
              {getCompletenessText(completeness)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{completeness}%</div>
            <div className="text-sm text-gray-500">Complete</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${getCompletenessColor(completeness)}`}
            style={{ width: `${completeness}%` }}
          ></div>
        </div>

        {/* Missing Fields */}
        {missingFields.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              To improve your profile, consider adding:
            </h4>
            <div className="flex flex-wrap gap-2">
              {missingFields.slice(0, 5).map((field, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs border border-blue-200"
                >
                  {field}
                </span>
              ))}
              {missingFields.length > 5 && (
                <span className="text-xs text-gray-500">
                  +{missingFields.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Achievement Badge */}
        {completeness >= 80 && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <span className="text-green-600 text-lg mr-2">🏆</span>
              <div>
                <div className="text-green-800 font-medium text-sm">Profile Complete!</div>
                <div className="text-green-700 text-xs">
                  Your profile is now optimized for {user.userType === 'job-seeker' ? 'getting hired' : 'attracting talent'}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
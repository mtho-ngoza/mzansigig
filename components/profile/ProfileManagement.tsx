'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import BasicInfoForm from './BasicInfoForm'
import ProfilePhotoUpload from './ProfilePhotoUpload'
import SkillsForm from './SkillsForm'
import PortfolioManager from './PortfolioManager'
import ExperienceForm from './ExperienceForm'
import ProfileCompleteness from './ProfileCompleteness'
import { isInformalWorker, getProfileSectionIcon } from '@/lib/utils/userProfile'
import SafetyPreferencesManager from '@/components/safety/SafetyPreferencesManager'
import { TrustScoreBadge, VerificationBadge } from '@/components/safety/TrustScoreBadge'
import { RatingDisplay, ReviewList } from '@/components/review'

interface ProfileManagementProps {
  onBack?: () => void
}

type ProfileSection = 'overview' | 'basic' | 'photo' | 'skills' | 'portfolio' | 'experience' | 'safety'

export default function ProfileManagement({ onBack }: ProfileManagementProps) {
  const { user } = useAuth()
  const [currentSection, setCurrentSection] = useState<ProfileSection>('overview')

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <p className="text-red-600">Please login to manage your profile.</p>
          </div>
        </div>
      </div>
    )
  }

  const isInformal = isInformalWorker(user)

  const sections = [
    { id: 'overview' as const, name: 'Overview', icon: '📊' },
    { id: 'basic' as const, name: 'Basic Info', icon: '👤' },
    {
      id: 'photo' as const,
      name: isInformal ? 'Your Photo' : 'Photo',
      icon: getProfileSectionIcon('photo', isInformal)
    },
    {
      id: 'skills' as const,
      name: isInformal ? 'What You Can Do' : 'Skills',
      icon: getProfileSectionIcon('skills', isInformal)
    },
    ...(user.userType === 'job-seeker' ? [{
      id: 'portfolio' as const,
      name: isInformal ? 'Show Your Work' : 'Portfolio',
      icon: getProfileSectionIcon('portfolio', isInformal)
    }] : []),
    {
      id: 'experience' as const,
      name: isInformal ? 'Experience & Rates' : 'Experience',
      icon: getProfileSectionIcon('experience', isInformal)
    },
    {
      id: 'safety' as const,
      name: isInformal ? 'Safety & Security' : 'Safety Preferences',
      icon: '🛡️'
    }
  ]

  const renderCurrentSection = () => {
    switch (currentSection) {
      case 'basic':
        return <BasicInfoForm onBack={() => setCurrentSection('overview')} />
      case 'photo':
        return <ProfilePhotoUpload onBack={() => setCurrentSection('overview')} />
      case 'skills':
        return <SkillsForm onBack={() => setCurrentSection('overview')} />
      case 'portfolio':
        return <PortfolioManager onBack={() => setCurrentSection('overview')} />
      case 'experience':
        return <ExperienceForm onBack={() => setCurrentSection('overview')} />
      case 'safety':
        return <SafetyPreferencesManager onBack={() => setCurrentSection('overview')} />
      default:
        return null
    }
  }

  if (currentSection !== 'overview') {
    return renderCurrentSection()
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          {onBack && (
            <Button variant="ghost" onClick={onBack} className="mb-4">
              ← Back to Dashboard
            </Button>
          )}

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Profile Management
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              {isInformal
                ? 'Fill out your profile so people can learn about you and the good work you do.'
                : `Complete your profile to increase your visibility and improve your chances of ${user.userType === 'job-seeker' ? 'getting hired' : 'finding great talent'}.`
              }
            </p>
          </div>
        </div>

        {/* Profile Completeness */}
        <div className="mb-8">
          <ProfileCompleteness />
        </div>

        {/* Profile Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section) => (
            <div
              key={section.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setCurrentSection(section.id)}
            >
              <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <span className="text-2xl mr-3">{section.icon}</span>
                  {section.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 mb-4">
                  {section.id === 'basic' && 'Update your personal information, contact details, and location'}
                  {section.id === 'photo' && (isInformal
                    ? 'Add a photo so people can see who they\'re working with'
                    : 'Upload a professional profile photo to build trust'
                  )}
                  {section.id === 'skills' && (isInformal
                    ? 'Tell people what kind of work you do and what you\'re good at'
                    : 'Add your skills, languages, and certifications'
                  )}
                  {section.id === 'portfolio' && (isInformal
                    ? 'Show photos of good work you\'ve done before'
                    : 'Showcase your best work and completed projects'
                  )}
                  {section.id === 'experience' && (isInformal
                    ? 'Tell people how long you\'ve been doing this work and what you charge'
                    : 'Add your work experience, education, and hourly rate'
                  )}
                  {section.id === 'safety' && (isInformal
                    ? 'Stay safe while working - add emergency contacts and safety preferences'
                    : 'Configure safety preferences, emergency contacts, and verification settings'
                  )}
                </div>
                <Button variant="outline" size="sm">
                  Manage →
                </Button>
              </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Profile Preview */}
        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Profile Preview</CardTitle>
              <p className="text-gray-600">This is how your profile appears to others</p>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-4 mb-6">
                {/* Profile Photo */}
                <div className="flex-shrink-0">
                  {user.profilePhoto ? (
                    <img
                      src={user.profilePhoto}
                      alt={`${user.firstName} ${user.lastName}`}
                      className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-2xl text-gray-500">
                        {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Basic Info */}
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {user.firstName} {user.lastName}
                    </h3>
                    <VerificationBadge
                      level={user.verificationLevel || (user.isVerified ? 'basic' : 'none')}
                      size="sm"
                    />
                  </div>
                  <div className="mb-2">
                    <TrustScoreBadge score={user.trustScore || 50} size="sm" />
                  </div>
                  <p className="text-gray-600 mb-2">{user.location}</p>
                  {user.bio && (
                    <p className="text-gray-700 mb-3">{user.bio}</p>
                  )}

                  {/* Work Sector */}
                  {user.workSector && (
                    <span className="inline-block mb-2 px-3 py-1 bg-secondary-100 text-secondary-800 text-sm rounded-full">
                      {user.workSector === 'professional' ? 'Professional' : 'Informal Sector'}
                    </span>
                  )}

                  {/* Skills */}
                  {user.skills && user.skills.length > 0 && (
                    <div className="mb-3">
                      <span className="text-sm text-gray-500 block mb-1">Skills:</span>
                      <div className="flex flex-wrap gap-1">
                        {user.skills.map((skill, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-xs"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rating & Stats */}
                  <div className="flex items-center flex-wrap gap-4 text-sm text-gray-600 mb-3">
                    <RatingDisplay
                      rating={user.rating}
                      reviewCount={user.reviewCount}
                      size="sm"
                      showLabel
                      showCount
                    />
                    {user.completedGigs && (
                      <div>
                        {user.completedGigs} completed {user.userType === 'job-seeker' ? 'gigs' : 'projects'}
                      </div>
                    )}
                    {user.hourlyRate && (
                      <div>
                        R{user.hourlyRate}/hour
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Experience & Education */}
              {(user.experience || user.education || user.availability) && (
                <div className="mb-6 pb-6 border-b">
                  <h4 className="font-semibold text-gray-900 mb-3">Experience & Background</h4>
                  <div className="space-y-3">
                    {user.experience && (
                      <div>
                        <span className="text-sm text-gray-500 block mb-1">Experience:</span>
                        <p className="text-gray-700 text-sm">{user.experience}</p>
                      </div>
                    )}
                    {user.education && (
                      <div>
                        <span className="text-sm text-gray-500 block mb-1">Education:</span>
                        <p className="text-gray-700 text-sm">{user.education}</p>
                      </div>
                    )}
                    {user.availability && (
                      <div>
                        <span className="text-sm text-gray-500 block mb-1">Availability:</span>
                        <p className="text-gray-700 text-sm">{user.availability}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Languages */}
              {user.languages && user.languages.length > 0 && (
                <div className="mb-6 pb-6 border-b">
                  <h4 className="font-semibold text-gray-900 mb-3">Languages</h4>
                  <div className="flex flex-wrap gap-2">
                    {user.languages.map((language, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        {language}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {user.certifications && user.certifications.length > 0 && (
                <div className="mb-6 pb-6 border-b">
                  <h4 className="font-semibold text-gray-900 mb-3">Certifications</h4>
                  <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                    {user.certifications.map((cert, index) => (
                      <li key={index}>{cert}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Portfolio Preview */}
              {user.userType === 'job-seeker' && user.portfolio && user.portfolio.length > 0 && (
                <div className="mb-6 pb-6 border-b">
                  <h4 className="font-semibold text-gray-900 mb-3">Portfolio</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {user.portfolio.map((item) => (
                      <div key={item.id} className="border rounded-lg p-3">
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full h-32 object-cover rounded mb-2"
                          />
                        )}
                        <h5 className="font-medium text-sm mb-1">{item.title}</h5>
                        <p className="text-xs text-gray-600 line-clamp-2">{item.description}</p>
                        {item.technologies && item.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.technologies.map((tech, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Social Links */}
              {user.socialLinks && (user.socialLinks.linkedin || user.socialLinks.website || user.socialLinks.github) && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Links</h4>
                  <div className="flex flex-wrap gap-3">
                    {user.socialLinks.linkedin && (
                      <a
                        href={user.socialLinks.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 text-sm"
                      >
                        LinkedIn →
                      </a>
                    )}
                    {user.socialLinks.website && (
                      <a
                        href={user.socialLinks.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 text-sm"
                      >
                        Website →
                      </a>
                    )}
                    {user.socialLinks.github && (
                      <a
                        href={user.socialLinks.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 text-sm"
                      >
                        GitHub →
                      </a>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Reviews Section */}
        <div className="mt-8">
          <ReviewList
            userId={user.id}
            title={isInformal ? "What People Say About Me" : "Reviews"}
            maxInitialReviews={5}
          />
        </div>
      </div>
    </div>
  )
}
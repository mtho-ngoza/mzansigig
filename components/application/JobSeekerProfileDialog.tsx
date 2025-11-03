'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FirestoreService } from '@/lib/database/firestore'
import { User } from '@/types/auth'
import { TrustScoreBadge, VerificationBadge } from '@/components/safety/TrustScoreBadge'
import { RatingDisplay } from '@/components/review'

interface JobSeekerProfileDialogProps {
  userId: string
  isOpen: boolean
  onClose: () => void
}

export default function JobSeekerProfileDialog({
  userId,
  isOpen,
  onClose
}: JobSeekerProfileDialogProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setLoading(true)
        setError(null)
        const userData = await FirestoreService.getById<User>('users', userId)

        if (userData) {
          setUser(userData)
        } else {
          setError('User profile not found')
        }
      } catch (err) {
        setError('Failed to load user profile')
      } finally {
        setLoading(false)
      }
    }

    if (isOpen && userId) {
      loadUserProfile()
    }
  }, [isOpen, userId])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Applicant Profile</h2>
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </Button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading profile...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
              <Button onClick={onClose} className="mt-4">
                Close
              </Button>
            </div>
          )}

          {/* Profile Content */}
          {user && !loading && !error && (
            <div className="space-y-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      {user.profilePhoto ? (
                        <img
                          src={user.profilePhoto}
                          alt={`${user.firstName} ${user.lastName}`}
                          className="w-20 h-20 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-2xl font-semibold text-primary-700">
                            {user.firstName[0]}{user.lastName[0]}
                          </span>
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-2xl">
                          {user.firstName} {user.lastName}
                        </CardTitle>
                        <p className="text-gray-600">{user.location}</p>
                        {user.workSector && (
                          <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                            {user.workSector === 'professional' ? 'Professional' : 'Informal Sector'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <VerificationBadge
                        level={user.verificationLevel || (user.isVerified ? 'basic' : 'none')}
                        size="sm"
                      />
                      <div>
                        <TrustScoreBadge score={user.trustScore || 50} size="sm" />
                      </div>
                      {user.rating !== undefined && (
                        <div className="flex items-center justify-end">
                          <RatingDisplay
                            rating={user.rating}
                            reviewCount={user.reviewCount}
                            size="sm"
                            showCount
                          />
                        </div>
                      )}
                      {user.completedGigs !== undefined && user.completedGigs > 0 && (
                        <div className="text-sm text-gray-600">
                          {user.completedGigs} completed gigs
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {user.bio ? (
                  <CardContent>
                    <p className="text-gray-700">{user.bio}</p>
                  </CardContent>
                ) : (
                  <CardContent>
                    <p className="text-sm text-gray-500 italic">This user hasn&apos;t added a bio yet.</p>
                  </CardContent>
                )}
              </Card>

              {/* Contact Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-500">Email:</span>
                      <div className="font-medium">{user.email}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Phone:</span>
                      <div className="font-medium">{user.phone}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Skills & Experience */}
              {(user.skills && user.skills.length > 0) || user.experience || user.hourlyRate !== undefined || user.availability && (
                <Card>
                  <CardHeader>
                    <CardTitle>Skills & Experience</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {user.skills && user.skills.length > 0 && (
                      <div>
                        <span className="text-sm text-gray-500 block mb-2">Skills:</span>
                        <div className="flex flex-wrap gap-2">
                          {user.skills.map((skill, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {user.experience && (
                      <div>
                        <span className="text-sm text-gray-500 block mb-2">Experience:</span>
                        <p className="text-gray-700">{user.experience}</p>
                      </div>
                    )}

                    {user.hourlyRate !== undefined && user.hourlyRate !== null && (
                      <div>
                        <span className="text-sm text-gray-500 block mb-2">Hourly Rate:</span>
                        <p className="font-medium">R{Number(user.hourlyRate).toLocaleString()}/hour</p>
                      </div>
                    )}

                    {user.availability && (
                      <div>
                        <span className="text-sm text-gray-500 block mb-2">Availability:</span>
                        <p className="text-gray-700">{user.availability}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Languages */}
              {user.languages && user.languages.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Languages</CardTitle>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>
              )}

              {/* Education & Certifications */}
              {(user.education || (user.certifications && user.certifications.length > 0)) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Education & Certifications</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {user.education && (
                      <div>
                        <span className="text-sm text-gray-500 block mb-2">Education:</span>
                        <p className="text-gray-700">{user.education}</p>
                      </div>
                    )}

                    {user.certifications && user.certifications.length > 0 && (
                      <div>
                        <span className="text-sm text-gray-500 block mb-2">Certifications:</span>
                        <ul className="list-disc list-inside text-gray-700">
                          {user.certifications.map((cert, index) => (
                            <li key={index}>{cert}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Portfolio */}
              {user.portfolio && user.portfolio.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Portfolio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {user.portfolio.map((item) => (
                        <div key={item.id} className="border rounded-lg p-4">
                          {item.imageUrl && (
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="w-full h-40 object-cover rounded-lg mb-3"
                            />
                          )}
                          <h4 className="font-semibold text-gray-900 mb-2">{item.title}</h4>
                          <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                          {item.technologies && item.technologies.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
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
                          {item.projectUrl && (
                            <a
                              href={item.projectUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:text-primary-700 text-sm"
                            >
                              View Project →
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Social Links */}
              {user.socialLinks && (user.socialLinks.linkedin || user.socialLinks.website || user.socialLinks.github) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Links</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {user.socialLinks.linkedin && (
                        <a
                          href={user.socialLinks.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700"
                        >
                          LinkedIn →
                        </a>
                      )}
                      {user.socialLinks.website && (
                        <a
                          href={user.socialLinks.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700"
                        >
                          Website →
                        </a>
                      )}
                      {user.socialLinks.github && (
                        <a
                          href={user.socialLinks.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700"
                        >
                          GitHub →
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Profile Completeness Note */}
              {(!user.skills || user.skills.length === 0) && !user.experience && !user.bio && (
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardContent className="p-4">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm text-yellow-800 font-medium">Limited Profile Information</p>
                        <p className="text-sm text-yellow-700 mt-1">
                          This applicant hasn&apos;t completed their profile yet. Consider contacting them directly to learn more about their skills and experience before making a decision.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Close Button */}
              <div className="flex justify-end pt-4">
                <Button onClick={onClose} size="lg">
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

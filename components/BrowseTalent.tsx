'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { User } from '@/types/auth'
import { UserService } from '@/lib/database/userService'
import JobSeekerProfileDialog from '@/components/application/JobSeekerProfileDialog'

interface BrowseTalentProps {
  onBack?: () => void
}

export default function BrowseTalent({ onBack }: BrowseTalentProps) {
  const [jobSeekers, setJobSeekers] = useState<User[]>([])
  const [filteredJobSeekers, setFilteredJobSeekers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<User | null>(null)
  const [showProfileDialog, setShowProfileDialog] = useState(false)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [skillFilter, setSkillFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'rating' | 'recent' | 'completed'>('rating')

  useEffect(() => {
    loadJobSeekers()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [jobSeekers, searchQuery, skillFilter, locationFilter, minRatingFilter, verifiedOnly, sortBy])

  const loadJobSeekers = async () => {
    try {
      setLoading(true)
      const data = await UserService.getAllJobSeekers()
      setJobSeekers(data)
      setFilteredJobSeekers(data)
    } catch (err) {
      console.error('Error loading job seekers:', err)
      setError('Failed to load talent profiles')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let result = [...jobSeekers]

    // Search by name or bio
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(user =>
        user.firstName.toLowerCase().includes(query) ||
        user.lastName.toLowerCase().includes(query) ||
        user.bio?.toLowerCase().includes(query)
      )
    }

    // Filter by skill
    if (skillFilter) {
      result = result.filter(user =>
        user.skills?.some(skill =>
          skill.toLowerCase().includes(skillFilter.toLowerCase())
        )
      )
    }

    // Filter by location
    if (locationFilter) {
      result = result.filter(user =>
        user.location.toLowerCase().includes(locationFilter.toLowerCase())
      )
    }

    // Filter by minimum rating
    if (minRatingFilter > 0) {
      result = result.filter(user =>
        user.rating !== undefined && user.rating >= minRatingFilter
      )
    }

    // Filter by verified status
    if (verifiedOnly) {
      result = result.filter(user => user.isVerified === true)
    }

    // Sort results
    switch (sortBy) {
      case 'rating':
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0))
        break
      case 'completed':
        result.sort((a, b) => (b.completedGigs || 0) - (a.completedGigs || 0))
        break
      case 'recent':
        result.sort((a, b) => {
          const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime()
          const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime()
          return dateB - dateA
        })
        break
    }

    setFilteredJobSeekers(result)
  }

  const handleViewProfile = (user: User) => {
    setSelectedProfile(user)
    setShowProfileDialog(true)
  }

  const handleCloseProfile = () => {
    setShowProfileDialog(false)
    setSelectedProfile(null)
  }

  const formatRating = (rating?: number) => {
    if (!rating) return 'No ratings yet - be the first!'
    return `${rating.toFixed(1)} ★`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <p className="text-gray-600">Loading talent profiles...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <p className="text-red-600">{error}</p>
            <Button onClick={loadJobSeekers} className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          {onBack && (
            <div className="mb-6">
              <Button variant="ghost" onClick={onBack}>
                ← Back to Dashboard
              </Button>
            </div>
          )}

          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Browse Talent
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Find skilled professionals for your projects. Filter by skills, location, ratings, and verification status.
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Search & Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search by name
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Skill Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Skill
                </label>
                <input
                  type="text"
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                  placeholder="e.g., Plumbing, Painting..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Location Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  placeholder="e.g., Johannesburg..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Rating Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Rating
                </label>
                <select
                  value={minRatingFilter}
                  onChange={(e) => setMinRatingFilter(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={0}>Any rating</option>
                  <option value={3}>3+ stars</option>
                  <option value={4}>4+ stars</option>
                  <option value={4.5}>4.5+ stars</option>
                </select>
              </div>

              {/* Verified Only */}
              <div className="flex items-end">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Verified only</span>
                </label>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort by
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'rating' | 'recent' | 'completed')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="rating">Highest rated</option>
                  <option value="completed">Most completed gigs</option>
                  <option value="recent">Recently joined</option>
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setSkillFilter('')
                  setLocationFilter('')
                  setMinRatingFilter(0)
                  setVerifiedOnly(false)
                  setSortBy('rating')
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Showing {filteredJobSeekers.length} of {jobSeekers.length} talent profiles
          </p>
        </div>

        {/* Talent Grid */}
        {filteredJobSeekers.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Eish, no talent matches yet
              </h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your filters to see more results.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobSeekers.map((user) => (
              <Card key={user.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  {/* Profile Header */}
                  <div className="flex items-start mb-4">
                    <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-xl mr-4 flex-shrink-0">
                      {user.firstName[0]}{user.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {user.firstName} {user.lastName}
                      </h3>
                      <p className="text-sm text-gray-600 flex items-center mt-1">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {user.location}
                      </p>
                    </div>
                  </div>

                  {/* Bio */}
                  {user.bio && (
                    <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                      {user.bio}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-xs text-gray-500">Rating</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatRating(user.rating)}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-xs text-gray-500">Completed</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {user.completedGigs || 0} gigs
                      </p>
                    </div>
                  </div>

                  {/* Skills */}
                  {user.skills && user.skills.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-2">Skills</p>
                      <div className="flex flex-wrap gap-1">
                        {user.skills.slice(0, 3).map((skill, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded"
                          >
                            {skill}
                          </span>
                        ))}
                        {user.skills.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            +{user.skills.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Verification Badge */}
                  {user.isVerified && (
                    <div className="flex items-center text-green-600 text-sm mb-4">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Verified {user.verificationLevel}
                    </div>
                  )}

                  {/* View Profile Button */}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleViewProfile(user)}
                  >
                    View Full Profile
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Profile Dialog */}
        {showProfileDialog && selectedProfile && (
          <JobSeekerProfileDialog
            userId={selectedProfile.id}
            isOpen={showProfileDialog}
            onClose={handleCloseProfile}
          />
        )}
      </div>
    </div>
  )
}

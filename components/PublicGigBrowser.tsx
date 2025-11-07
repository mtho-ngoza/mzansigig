'use client'

import React, { useState, useEffect } from 'react'
import { GigService } from '@/lib/database/gigService'
import { Gig } from '@/types/gig'
import { User } from '@/types/auth'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import ApplicationForm from '@/components/application/ApplicationForm'
import { QuickMessageButton } from '@/components/messaging/QuickMessageButton'
import { useToast } from '@/contexts/ToastContext'
import { useLocation } from '@/contexts/LocationContext'
import { calculateDistance, formatDistance } from '@/lib/utils/locationUtils'
import GigAmountDisplay from '@/components/gig/GigAmountDisplay'

interface PublicGigBrowserProps {
  onSignUpClick: () => void
  onLoginClick: () => void
  showAuthButtons?: boolean
  onDashboardClick?: () => void
  currentUser?: User | null
  onMessageConversationStart?: (conversationId: string) => void
  onMessagesClick?: () => void
}

export default function PublicGigBrowser({
  onSignUpClick,
  onDashboardClick,
  currentUser,
  onMessageConversationStart
}: PublicGigBrowserProps) {
  const { success, error } = useToast()
  const {
    locationPermissionGranted,
    requestLocationPermission,
    isLoadingLocation,
    currentCoordinates
  } = useLocation()

  const [gigs, setGigs] = useState<Gig[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null)
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [showLocationPrompt, setShowLocationPrompt] = useState(true)
  const [showNearbyOnly, setShowNearbyOnly] = useState(false)
  const [radiusKm, setRadiusKm] = useState(25)
  const [applicationCounts, setApplicationCounts] = useState<Record<string, number>>({})
  const [userAppliedGigs, setUserAppliedGigs] = useState<Set<string>>(new Set())

  const categories = [
    'Technology',
    'Design',
    'Writing',
    'Marketing',
    'Construction',
    'Transportation',
    'Cleaning',
    'Education',
    'Other'
  ]

  const filterGigsByLocation = async (allGigs: Gig[]) => {
    if (!showNearbyOnly || !currentCoordinates) {
      return allGigs
    }

    return allGigs.filter(gig => {
      if (!gig.coordinates) return false

      const distance = calculateDistance(
        currentCoordinates,
        gig.coordinates
      )
      return distance <= radiusKm
    }).sort((a, b) => {
      if (!a.coordinates || !b.coordinates) return 0

      const distA = calculateDistance(
        currentCoordinates,
        a.coordinates
      )
      const distB = calculateDistance(
        currentCoordinates,
        b.coordinates
      )
      return distA - distB
    })
  }

  const loadGigs = async () => {
    try {
      setLoading(true)
      const openGigs = await GigService.getGigsByStatus('open')

      // Load application counts and check which gigs user has applied to (only if user is authenticated)
      if (currentUser) {
        const counts: Record<string, number> = {}
        const appliedGigIds = new Set<string>()
        await Promise.all(
          openGigs.map(async (gig) => {
            const count = await GigService.getApplicationCountByGig(gig.id)
            counts[gig.id] = count

            // Check if current user has applied to this gig
            const hasApplied = await GigService.hasUserApplied(gig.id, currentUser.id)
            if (hasApplied) {
              appliedGigIds.add(gig.id)
            }
          })
        )
        setApplicationCounts(counts)
        setUserAppliedGigs(appliedGigIds)
      }

      // If no gigs found from database, show demo data
      if (openGigs.length === 0) {
        const demoGigs: Gig[] = [
          {
            id: 'demo-1',
            title: 'Website Development for Small Business',
            description: 'Looking for a skilled web developer to create a modern, responsive website for our local bakery. Need online ordering system and payment integration.',
            category: 'Technology',
            location: 'Cape Town',
            coordinates: { latitude: -33.9249, longitude: 18.4241 },
            budget: 15000,
            duration: '2-3 weeks',
            skillsRequired: ['React', 'Node.js', 'Payment Integration'],
            employerId: 'employer-1',
            employerName: 'Cape Town Bakery',
            status: 'open' as const,
            applicants: ['user-1', 'user-2'],
            createdAt: new Date('2024-09-15'),
            updatedAt: new Date('2024-09-15')
          },
          {
            id: 'demo-2',
            title: 'Logo Design for Tech Startup',
            description: 'Need a creative logo designer to create a modern, professional logo for our AI startup. Should reflect innovation and trustworthiness.',
            category: 'Design',
            location: 'Johannesburg',
            coordinates: { latitude: -26.2041, longitude: 28.0473 },
            budget: 3500,
            duration: '1 week',
            skillsRequired: ['Graphic Design', 'Logo Design', 'Adobe Illustrator'],
            employerId: 'employer-2',
            employerName: 'AI Innovations',
            status: 'open' as const,
            applicants: ['user-3'],
            createdAt: new Date('2024-09-18'),
            updatedAt: new Date('2024-09-18')
          },
          {
            id: 'demo-3',
            title: 'Content Writing for Travel Blog',
            description: 'Seeking experienced travel writer to create engaging blog posts about South African destinations. 10 articles needed.',
            category: 'Writing',
            location: 'Durban',
            coordinates: { latitude: -29.8587, longitude: 31.0218 },
            budget: 8000,
            duration: '3 weeks',
            skillsRequired: ['Content Writing', 'SEO', 'Travel Experience'],
            employerId: 'employer-3',
            employerName: 'SA Travel Guide',
            status: 'open' as const,
            applicants: [],
            createdAt: new Date('2024-09-20'),
            updatedAt: new Date('2024-09-20')
          },
          {
            id: 'demo-4',
            title: 'Social Media Marketing Campaign',
            description: 'Small restaurant needs help with social media presence. Create content calendar, design posts, and manage Instagram/Facebook accounts.',
            category: 'Marketing',
            location: 'Pretoria',
            coordinates: { latitude: -25.7479, longitude: 28.2293 },
            budget: 5000,
            duration: '1 month',
            skillsRequired: ['Social Media Marketing', 'Content Creation', 'Canva'],
            employerId: 'employer-4',
            employerName: 'Mama\'s Kitchen',
            status: 'open' as const,
            applicants: ['user-4', 'user-5', 'user-6'],
            createdAt: new Date('2024-09-19'),
            updatedAt: new Date('2024-09-19')
          },
          {
            id: 'demo-5',
            title: 'Weekly House Cleaning',
            description: 'Need reliable person for weekly house cleaning in Sandton. 3-bedroom house, must bring own cleaning supplies. Looking for someone trustworthy and thorough.',
            category: 'Cleaning',
            location: 'Johannesburg',
            coordinates: { latitude: -26.2041, longitude: 28.0473 },
            budget: 600,
            duration: '1 day',
            skillsRequired: ['House Cleaning'],
            employerId: 'employer-5',
            employerName: 'Johnson Family',
            status: 'open' as const,
            applicants: [],
            createdAt: new Date('2024-09-21'),
            updatedAt: new Date('2024-09-21')
          },
          {
            id: 'demo-6',
            title: 'Mobile App UI/UX Design',
            description: 'Looking for UI/UX designer to redesign our fitness tracking mobile app. Need modern, intuitive design that encourages user engagement.',
            category: 'Design',
            location: 'Cape Town',
            coordinates: { latitude: -33.9249, longitude: 18.4241 },
            budget: 12000,
            duration: '4 weeks',
            skillsRequired: ['UI/UX Design', 'Figma', 'Mobile Design', 'User Research'],
            employerId: 'employer-5',
            employerName: 'FitTrack Solutions',
            status: 'open' as const,
            applicants: ['user-7'],
            createdAt: new Date('2024-09-21'),
            updatedAt: new Date('2024-09-21')
          }
        ]
        const filteredGigs = await filterGigsByLocation(demoGigs)
        setGigs(filteredGigs)
      } else {
        const filteredGigs = await filterGigsByLocation(openGigs.slice(0, 20))
        setGigs(filteredGigs)
      }
    } catch (error) {
      console.error('Error loading gigs:', error)
      // Show demo data on error as well
      setGigs([{
        id: 'demo-fallback',
        title: 'Demo: Website Development Project',
        description: 'This is demo data shown because Firebase is not configured. Set up your Firebase project to see real gigs.',
        category: 'Technology',
        location: 'South Africa',
        budget: 10000,
        duration: '2 weeks',
        skillsRequired: ['Web Development'],
        employerId: 'demo-employer',
        employerName: 'Demo Company',
        status: 'open' as const,
        applicants: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleNearMeToggle = async () => {
    if (!currentCoordinates) {
      error('Location not available. Please enable location first.')
      return
    }

    const newShowNearbyOnly = !showNearbyOnly
    setShowNearbyOnly(newShowNearbyOnly)

    if (newShowNearbyOnly) {
      success(`Now showing gigs within ${formatDistance(radiusKm)} of your location`)
    } else {
      success('Now showing all gigs')
    }
  }

  useEffect(() => {
    loadGigs()
  }, [])

  useEffect(() => {
    // Reload gigs whenever the location filter changes (on or off)
    loadGigs()
  }, [showNearbyOnly, radiusKm, currentCoordinates])

  // Auto-search when category changes (instant filter)
  useEffect(() => {
    handleSearch()
  }, [selectedCategory])

  // Debounced search for text input (auto-search after user stops typing)
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchTerm !== '') {
        handleSearch()
      }
    }, 500) // 500ms delay after user stops typing

    return () => clearTimeout(debounceTimer)
  }, [searchTerm])

  const handleSearch = async () => {
    try {
      setLoading(true)
      const searchResults = await GigService.searchGigs(searchTerm, selectedCategory || undefined)
      const openGigs = searchResults.filter(gig => gig.status === 'open').slice(0, 20)

      // Load application counts for search results (only if user is authenticated)
      if (currentUser) {
        const counts: Record<string, number> = {}
        await Promise.all(
          openGigs.map(async (gig) => {
            const count = await GigService.getApplicationCountByGig(gig.id)
            counts[gig.id] = count
          })
        )
        setApplicationCounts(counts)
      }

      const filteredGigs = await filterGigsByLocation(openGigs)
      setGigs(filteredGigs)
    } catch (error) {
      console.error('Error searching gigs:', error)
      setGigs([])
    } finally {
      setLoading(false)
    }
  }

  // Handle Enter key press for immediate search
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }


  const formatDate = (date: Date | unknown) => {
    try {
      let dateObj: Date;

      if (date && typeof date === 'object' && 'toDate' in date && typeof (date as { toDate: () => Date }).toDate === 'function') {
        // Handle Firestore Timestamp
        dateObj = (date as { toDate: () => Date }).toDate();
      } else if (date instanceof Date) {
        dateObj = date;
      } else if (typeof date === 'string' || typeof date === 'number') {
        dateObj = new Date(date);
      } else {
        return 'N/A';
      }

      if (isNaN(dateObj.getTime())) {
        return 'N/A';
      }

      return dateObj.toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  }

  const handleApplyClick = (gig: Gig) => {
    if (!currentUser) {
      onSignUpClick()
      return
    }

    if (currentUser.userType !== 'job-seeker') {
      error('Only job seekers can apply for gigs.')
      return
    }

    // Check if user has already applied
    if (userAppliedGigs.has(gig.id)) {
      error('You have already applied to this gig')
      return
    }

    setSelectedGig(gig)
    setShowApplicationForm(true)
  }

  const handleApplicationSuccess = async () => {
    setShowApplicationForm(false)

    // Refresh the application count for this gig and mark as applied
    if (selectedGig) {
      const newCount = await GigService.getApplicationCountByGig(selectedGig.id)
      setApplicationCounts(prev => ({
        ...prev,
        [selectedGig.id]: newCount
      }))

      // Add this gig to the user's applied gigs set
      setUserAppliedGigs(prev => new Set(prev).add(selectedGig.id))
    }

    setSelectedGig(null)
    success('Application submitted successfully! You can track your applications in your dashboard.')
  }

  const handleApplicationCancel = () => {
    setShowApplicationForm(false)
    setSelectedGig(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Find Your Next Opportunity
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Browse thousands of gigs from trusted employers across South Africa
          </p>

          {/* Search Section */}
          <div className="max-w-4xl mx-auto bg-white rounded-lg p-6 shadow-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="md:col-span-2">
                <input
                  type="text"
                  placeholder="Search gigs... (auto-searches as you type)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                />
              </div>
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <Button onClick={handleSearch} className="w-full" variant="outline">
                  🔍 Search Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gigs Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Location Status - Show different content based on permission state */}
        {!showLocationPrompt || locationPermissionGranted ? null : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    Find gigs near you
                  </p>
                  <p className="text-sm text-blue-700">
                    Enable location to see nearby opportunities first - especially useful for cleaning, construction & transport jobs
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={requestLocationPermission}
                  disabled={isLoadingLocation}
                  className="text-blue-700 border-blue-300 hover:bg-blue-100"
                >
                  {isLoadingLocation ? 'Getting Location...' : 'Enable Location'}
                </Button>
                <button
                  onClick={() => setShowLocationPrompt(false)}
                  className="text-blue-400 hover:text-blue-600"
                  aria-label="Dismiss"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Location Enabled Indicator */}
        {locationPermissionGranted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-900">
                  Location enabled! You can now find nearby gigs.
                </p>
                <p className="text-sm text-green-700">
                  Use the &quot;Near Me&quot; button to filter gigs by distance.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Radius Selector */}
        {showNearbyOnly && currentCoordinates && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Showing gigs within {formatDistance(radiusKm)} of your location
                </p>
                <p className="text-xs text-blue-700">
                  Adjust the radius to see more or fewer nearby opportunities
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm text-blue-700">Radius:</label>
                <select
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="px-3 py-1 border border-blue-300 rounded-md text-sm text-blue-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                  <option value={25}>25 km</option>
                  <option value={50}>50 km</option>
                  <option value={100}>100 km</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-bold text-gray-900">
            Available Gigs
          </h3>
          <div className="flex items-center space-x-4">
            <p className="text-gray-600">
              {gigs.length} gigs found{showNearbyOnly ? ` within ${formatDistance(radiusKm)}` : ''}
            </p>
            {locationPermissionGranted && (
              <Button
                variant={showNearbyOnly ? "primary" : "outline"}
                size="sm"
                onClick={handleNearMeToggle}
                className={showNearbyOnly ? "bg-blue-600 text-white" : "text-blue-700 border-blue-300 hover:bg-blue-100"}
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {showNearbyOnly ? `Within ${formatDistance(radiusKm)}` : 'Near Me'}
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <Card>
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                      <div className="h-3 bg-gray-200 rounded w-4/6"></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        ) : gigs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">
              No gigs found matching your criteria.
            </p>
            <Button onClick={loadGigs} variant="outline">
              View All Gigs
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {gigs.map((gig) => (
              <Card key={gig.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">{gig.title}</CardTitle>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{gig.category}</span>
                    <div className="flex items-center space-x-2">
                      <span>{gig.location}</span>
                      {showNearbyOnly && currentCoordinates && gig.coordinates && (
                        <span className="text-blue-600 font-medium">
                          • {formatDistance(calculateDistance(
                            currentCoordinates,
                            gig.coordinates
                          ))} away
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {gig.description}
                  </p>

                  <div className="space-y-2 mb-4">
                    <GigAmountDisplay
                      budget={gig.budget}
                      showBreakdown={currentUser ? true : false}
                      variant="compact"
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Duration:</span>
                      <span className="text-sm">{gig.duration}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Posted:</span>
                      <span className="text-sm">{formatDate(gig.createdAt)}</span>
                    </div>
                  </div>

                  {gig.skillsRequired && gig.skillsRequired.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 mb-2">Skills Required:</p>
                      <div className="flex flex-wrap gap-1">
                        {gig.skillsRequired.slice(0, 3).map((skill, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full"
                          >
                            {skill}
                          </span>
                        ))}
                        {gig.skillsRequired.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            +{gig.skillsRequired.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      {gig.maxApplicants ? (
                        <span className={`text-sm font-medium ${
                          (applicationCounts[gig.id] || 0) >= gig.maxApplicants
                            ? 'text-orange-600'
                            : 'text-gray-700'
                        }`}>
                          {applicationCounts[gig.id] || 0}/{gig.maxApplicants} applicants
                        </span>
                      ) : currentUser ? (
                        <span className="text-sm text-gray-500">
                          {applicationCounts[gig.id] || 0} applicants
                        </span>
                      ) : (
                        <span></span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {currentUser && currentUser.id !== gig.employerId && (
                        <QuickMessageButton
                          recipientId={gig.employerId}
                          recipientName={gig.employerName}
                          recipientType="employer"
                          gigId={gig.id}
                          gigTitle={gig.title}
                          size="sm"
                          variant="outline"
                          onConversationStart={onMessageConversationStart}
                        />
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleApplyClick(gig)}
                        disabled={
                          !!(currentUser && userAppliedGigs.has(gig.id)) ||
                          gig.status === 'reviewing' ||
                          !!(gig.maxApplicants && (applicationCounts[gig.id] || 0) >= gig.maxApplicants)
                        }
                        variant={currentUser && userAppliedGigs.has(gig.id) ? 'outline' : 'primary'}
                      >
                        {currentUser && userAppliedGigs.has(gig.id) ? 'Already Applied' :
                         gig.status === 'reviewing' ? 'Under Review' :
                         gig.maxApplicants && (applicationCounts[gig.id] || 0) >= gig.maxApplicants ? 'Limit Reached' :
                         (currentUser ? 'Apply' : 'Apply Now')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Call to Action */}
        {!currentUser ? (
          <div className="text-center mt-12 py-12 bg-gray-100 rounded-lg">
            <h4 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to Get Started?
            </h4>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Join thousands of South Africans finding work and hiring talent on GigSA.
              Sign up today to apply for gigs or post your own opportunities.
            </p>
            <div className="space-x-4">
              <Button onClick={onSignUpClick} size="lg">
                Sign Up as Job Seeker
              </Button>
              <Button onClick={onSignUpClick} variant="outline" size="lg">
                Post a Gig
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center mt-12 py-12 bg-primary-50 rounded-lg">
            <h4 className="text-2xl font-bold text-gray-900 mb-4">
              Found something interesting?
            </h4>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Apply for gigs that match your skills or return to your dashboard to manage your profile and applications.
            </p>
            <div className="space-x-4">
              {onDashboardClick && (
                <Button onClick={onDashboardClick} size="lg">
                  Go to Dashboard
                </Button>
              )}
              <Button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} variant="outline" size="lg">
                Back to Top
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Application Form Modal/Overlay */}
      {showApplicationForm && selectedGig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Apply for Gig</h2>
                <Button
                  variant="ghost"
                  onClick={handleApplicationCancel}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </Button>
              </div>
              <ApplicationForm
                gig={selectedGig}
                onSuccess={handleApplicationSuccess}
                onCancel={handleApplicationCancel}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
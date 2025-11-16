'use client'

import React, { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { GigService } from '@/lib/database/gigService'
import { Gig } from '@/types/gig'
import { User } from '@/types/auth'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { QuickMessageButton } from '@/components/messaging/QuickMessageButton'

// Lazy load ApplicationForm (only loaded when user clicks "Apply")
// This reduces initial bundle size for 2G/3G optimization
const ApplicationForm = dynamic(
  () => import('@/components/application/ApplicationForm'),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    ),
    ssr: false
  }
)

// Lazy load DistanceWarningDialog (only loaded when needed)
const DistanceWarningDialog = dynamic(
  () => import('@/components/safety/DistanceWarningDialog'),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    ),
    ssr: false
  }
)
import { useToast } from '@/contexts/ToastContext'
import { useLocation } from '@/contexts/LocationContext'
import { calculateDistance, formatDistance } from '@/lib/utils/locationUtils'
import { checkDistanceWarning, DistanceWarningInfo } from '@/lib/utils/distanceWarning'
import GigAmountDisplay from '@/components/gig/GigAmountDisplay'
import PaymentInfoBadge from '@/components/gig/PaymentInfoBadge'
import { WorkTypeBadge } from '@/components/gig/WorkTypeBadge'
import { Footer } from '@/components/layout/Footer'
import { FilterPanel } from '@/components/gig/FilterPanel'
import { SortDropdown, SortOption } from '@/components/gig/SortDropdown'
import { ActiveFilters } from '@/components/gig/ActiveFilters'
import { GigFilterOptions, DEFAULT_FILTERS } from '@/types/filters'
import type { DocumentSnapshot, DocumentData } from 'firebase/firestore'
import { GigCache } from '@/lib/utils/gigCache'

// Custom hook for scroll-triggered animations
function useInView(options = {}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true)
        observer.disconnect()
      }
    }, { threshold: 0.1, ...options })

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  return { ref, isInView }
}

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
  const [filteredAndSortedGigs, setFilteredAndSortedGigs] = useState<Gig[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null)
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [showDistanceWarning, setShowDistanceWarning] = useState(false)
  const [distanceWarningInfo, setDistanceWarningInfo] = useState<DistanceWarningInfo | null>(null)
  const [showLocationPrompt, setShowLocationPrompt] = useState(true)
  const [showNearbyOnly, setShowNearbyOnly] = useState(false)
  const [radiusKm, setRadiusKm] = useState(25)
  const [applicationCounts, setApplicationCounts] = useState<Record<string, number>>({})
  const [userAppliedGigs, setUserAppliedGigs] = useState<Set<string>>(new Set())
  const [heroAnimated, setHeroAnimated] = useState(false)
  const [filters, setFilters] = useState<GigFilterOptions>({
    ...DEFAULT_FILTERS,
    searchTerm: '',
    category: ''
  })
  const [sortOption, setSortOption] = useState<SortOption>('newest')
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  // Pagination state
  const PAGE_SIZE = 20
  const [hasMoreGigs, setHasMoreGigs] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [lastDocCursor, setLastDocCursor] = useState<DocumentSnapshot<DocumentData> | null>(null)

  // Infinite scroll state
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null)

  // Scroll-triggered animations
  const { ref: statsRef, isInView: statsInView } = useInView()
  const { ref: howItWorksRef, isInView: howItWorksInView } = useInView()
  const { ref: testimonialsRef, isInView: testimonialsInView } = useInView()
  const { ref: faqRef, isInView: faqInView } = useInView()

  // Trigger hero animations on mount
  useEffect(() => {
    const timer = setTimeout(() => setHeroAnimated(true), 100)
    return () => clearTimeout(timer)
  }, [])

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

  const applyFiltersAndSort = (gigsToFilter: Gig[]) => {
    let result = [...gigsToFilter]

    // Apply budget filter
    if (filters.budgetMin !== undefined) {
      result = result.filter(
        (gig) =>
          gig.budget >= filters.budgetMin! &&
          (filters.budgetMax === undefined || gig.budget <= filters.budgetMax)
      )
    }

    // Apply duration filter
    if (filters.durations.length > 0) {
      result = result.filter((gig) => filters.durations.includes(gig.duration))
    }

    // Apply work type filter
    if (filters.workType !== 'all') {
      result = result.filter((gig) => gig.workType === filters.workType)
    }

    // Apply urgency filter
    if (filters.urgency !== 'all' && filters.urgency) {
      const now = new Date()
      result = result.filter((gig) => {
        if (!gig.deadline) return false

        const deadline =
          gig.deadline instanceof Date
            ? gig.deadline
            : typeof gig.deadline === 'object' && 'toDate' in gig.deadline
            ? (gig.deadline as { toDate: () => Date }).toDate()
            : new Date(gig.deadline)

        const daysUntilDeadline = Math.ceil(
          (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )

        if (filters.urgency === 'urgent') {
          return daysUntilDeadline <= 3 && daysUntilDeadline >= 0
        } else if (filters.urgency === 'week') {
          return daysUntilDeadline <= 7 && daysUntilDeadline >= 0
        } else if (filters.urgency === 'month') {
          return daysUntilDeadline <= 30 && daysUntilDeadline >= 0
        }
        return true
      })
    }

    // Apply skills filter
    if (filters.skills.length > 0) {
      result = result.filter((gig) =>
        filters.skills.some((skill) =>
          gig.skillsRequired.some((req) =>
            req.toLowerCase().includes(skill.toLowerCase())
          )
        )
      )
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortOption) {
        case 'newest': {
          const createdAtA =
            a.createdAt instanceof Date
              ? a.createdAt
              : typeof a.createdAt === 'object' && 'toDate' in a.createdAt
              ? (a.createdAt as { toDate: () => Date }).toDate()
              : new Date(a.createdAt)

          const createdAtB =
            b.createdAt instanceof Date
              ? b.createdAt
              : typeof b.createdAt === 'object' && 'toDate' in b.createdAt
              ? (b.createdAt as { toDate: () => Date }).toDate()
              : new Date(b.createdAt)

          return createdAtB.getTime() - createdAtA.getTime()
        }
        case 'oldest': {
          const createdAtA =
            a.createdAt instanceof Date
              ? a.createdAt
              : typeof a.createdAt === 'object' && 'toDate' in a.createdAt
              ? (a.createdAt as { toDate: () => Date }).toDate()
              : new Date(a.createdAt)

          const createdAtB =
            b.createdAt instanceof Date
              ? b.createdAt
              : typeof b.createdAt === 'object' && 'toDate' in b.createdAt
              ? (b.createdAt as { toDate: () => Date }).toDate()
              : new Date(b.createdAt)

          return createdAtA.getTime() - createdAtB.getTime()
        }
        case 'budget-high':
          return b.budget - a.budget
        case 'budget-low':
          return a.budget - b.budget
        case 'deadline-soon': {
          if (!a.deadline && !b.deadline) return 0
          if (!a.deadline) return 1
          if (!b.deadline) return -1

          const deadlineA =
            a.deadline instanceof Date
              ? a.deadline
              : typeof a.deadline === 'object' && 'toDate' in a.deadline
              ? (a.deadline as { toDate: () => Date }).toDate()
              : new Date(a.deadline)

          const deadlineB =
            b.deadline instanceof Date
              ? b.deadline
              : typeof b.deadline === 'object' && 'toDate' in b.deadline
              ? (b.deadline as { toDate: () => Date }).toDate()
              : new Date(b.deadline)

          return deadlineA.getTime() - deadlineB.getTime()
        }
        case 'most-applications':
          return (
            (applicationCounts[b.id] || 0) - (applicationCounts[a.id] || 0)
          )
        case 'least-applications':
          return (
            (applicationCounts[a.id] || 0) - (applicationCounts[b.id] || 0)
          )
        default:
          return 0
      }
    })

    return result
  }

  const loadGigs = async () => {
    try {
      setLoading(true)
      setHasMoreGigs(false) // Reset pagination state
      setLastDocCursor(null) // Reset cursor

      // Try to load from cache first (huge win for 2G/3G on revisits)
      const cacheKey = 'open_gigs_page_1'
      const cachedGigs = GigCache.get(cacheKey)

      let openGigs: Gig[]

      if (cachedGigs && cachedGigs.length > 0) {
        // Cache hit! Use cached data (saves Firestore query)
        openGigs = cachedGigs
        setHasMoreGigs(cachedGigs.length >= PAGE_SIZE)
      } else {
        // Cache miss - fetch from Firestore
        const result = await GigService.getGigsByStatusWithCursor('open', PAGE_SIZE)
        openGigs = result.gigs

        // Store cursor for next page
        setLastDocCursor(result.lastDoc)
        setHasMoreGigs(openGigs.length === PAGE_SIZE && result.lastDoc !== null)

        // Cache the results for next visit
        GigCache.set(cacheKey, openGigs)
      }

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
            workType: 'remote',
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
            workType: 'remote',
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
            workType: 'remote',
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
            workType: 'hybrid',
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
            workType: 'physical',
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
            workType: 'remote',
            applicants: ['user-7'],
            createdAt: new Date('2024-09-21'),
            updatedAt: new Date('2024-09-21')
          }
        ]
        const filteredGigs = await filterGigsByLocation(demoGigs)
        setGigs(filteredGigs)
        setHasMoreGigs(false) // No more gigs in demo mode
        setLastDocCursor(null)
      } else {
        // Filter gigs by location if needed
        const filteredGigs = await filterGigsByLocation(openGigs)
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
        workType: 'remote',
        applicants: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }])
      setHasMoreGigs(false)
    } finally {
      setLoading(false)
    }
  }

  const loadMoreGigs = async () => {
    if (!lastDocCursor) {
      setHasMoreGigs(false)
      return
    }

    setIsLoadingMore(true)
    try {
      // Load next batch using cursor-based pagination
      const { gigs: moreGigs, lastDoc } = await GigService.getGigsByStatusWithCursor(
        'open',
        PAGE_SIZE,
        lastDocCursor
      )

      // Update cursor for next page
      setLastDocCursor(lastDoc)
      setHasMoreGigs(moreGigs.length === PAGE_SIZE && lastDoc !== null)

      // Load application counts for new gigs
      if (currentUser && moreGigs.length > 0) {
        const counts: Record<string, number> = {}
        const appliedGigIds = new Set<string>(userAppliedGigs)

        await Promise.all(
          moreGigs.map(async (gig) => {
            const count = await GigService.getApplicationCountByGig(gig.id)
            counts[gig.id] = count

            const hasApplied = await GigService.hasUserApplied(gig.id, currentUser.id)
            if (hasApplied) {
              appliedGigIds.add(gig.id)
            }
          })
        )

        setApplicationCounts(prev => ({ ...prev, ...counts }))
        setUserAppliedGigs(appliedGigIds)
      }

      // Append new gigs to existing list
      const filteredNewGigs = await filterGigsByLocation(moreGigs)
      setGigs(prev => [...prev, ...filteredNewGigs])
    } catch (error) {
      console.error('Error loading more gigs:', error)
      setHasMoreGigs(false)
    } finally {
      setIsLoadingMore(false)
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
    // Debounce location filter changes to avoid rapid reloads
    // Especially useful when user is adjusting radius slider
    const debounceTimer = setTimeout(() => {
      loadGigs()
    }, 300) // 300ms delay for location changes

    return () => clearTimeout(debounceTimer)
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

  // Apply filters and sorting with debouncing to prevent UI freezes
  // during rapid filter changes (e.g., multiple checkboxes)
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      const filtered = applyFiltersAndSort(gigs)
      setFilteredAndSortedGigs(filtered)
    }, 150) // 150ms delay for filter application

    return () => clearTimeout(debounceTimer)
  }, [gigs, filters, sortOption, applicationCounts])

  // Update filters state when search term or category changes
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      searchTerm,
      category: selectedCategory
    }))
  }, [searchTerm, selectedCategory])

  // Update filters state when location filter changes
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      showNearbyOnly,
      radiusKm
    }))
  }, [showNearbyOnly, radiusKm])

  // Infinite scroll: Auto-load more gigs when user scrolls near bottom
  useEffect(() => {
    const trigger = loadMoreTriggerRef.current
    if (!trigger || !hasMoreGigs || isLoadingMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        // When the trigger element becomes visible, load more gigs
        if (entries[0].isIntersecting && hasMoreGigs && !isLoadingMore) {
          loadMoreGigs()
        }
      },
      {
        // Trigger when element is 200px away from viewport
        rootMargin: '200px',
        threshold: 0.1
      }
    )

    observer.observe(trigger)

    return () => {
      if (trigger) {
        observer.unobserve(trigger)
      }
    }
  }, [hasMoreGigs, isLoadingMore, lastDocCursor])

  const handleSearch = async () => {
    try {
      setLoading(true)

      // Load search results with a reasonable limit
      const SEARCH_LIMIT = 100
      const searchResults = await GigService.searchGigs(searchTerm, selectedCategory || undefined, SEARCH_LIMIT)
      const openGigs = searchResults.filter(gig => gig.status === 'open')

      // Track if there are more gigs
      setHasMoreGigs(openGigs.length === SEARCH_LIMIT)

      // Only load application counts for first PAGE_SIZE gigs
      const visibleGigs = openGigs.slice(0, PAGE_SIZE)

      // Load application counts for search results (only if user is authenticated)
      if (currentUser) {
        const counts: Record<string, number> = {}
        await Promise.all(
          visibleGigs.map(async (gig) => {
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
      setHasMoreGigs(false)
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

  const handleFiltersChange = (newFilters: Partial<GigFilterOptions>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters
    }))
  }

  const handleClearFilters = () => {
    setFilters({
      ...DEFAULT_FILTERS,
      searchTerm,
      category: selectedCategory,
      showNearbyOnly,
      radiusKm
    })
  }

  const handleRemoveFilter = (
    filterKey: keyof GigFilterOptions,
    value?: string
  ) => {
    setFilters((prev) => {
      const updated = { ...prev }

      if (filterKey === 'durations' && value) {
        updated.durations = updated.durations.filter((d) => d !== value)
      } else if (filterKey === 'skills' && value) {
        updated.skills = updated.skills.filter((s) => s !== value)
      } else if (filterKey === 'budgetMin') {
        updated.budgetMin = undefined
        updated.budgetMax = undefined
      } else if (filterKey === 'workType') {
        updated.workType = 'all'
      } else if (filterKey === 'urgency') {
        updated.urgency = 'all'
      } else if (filterKey === 'showNearbyOnly') {
        updated.showNearbyOnly = false
        setShowNearbyOnly(false)
      }

      return updated
    })
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

  const handleApplyClick = async (gig: Gig) => {
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

    // Check if distance warning is needed for physical gigs
    const warningInfo = await checkDistanceWarning(gig, currentCoordinates)

    if (warningInfo && warningInfo.shouldWarn) {
      // Show distance warning dialog first
      setDistanceWarningInfo(warningInfo)
      setShowDistanceWarning(true)
    } else {
      // No warning needed, proceed directly to application form
      setShowApplicationForm(true)
    }
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

  const handleDistanceWarningConfirm = () => {
    // User confirmed they want to proceed despite distance
    setShowDistanceWarning(false)
    setDistanceWarningInfo(null)
    setShowApplicationForm(true)
  }

  const handleDistanceWarningCancel = () => {
    // User decided not to apply
    setShowDistanceWarning(false)
    setDistanceWarningInfo(null)
    setSelectedGig(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 via-primary-600 to-primary-700 text-white py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className={`text-5xl md:text-6xl font-bold mb-6 leading-tight transition-all duration-700 ${heroAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            Mzansi&apos;s Gig Connection: Work Starts Here
          </h2>
          <p className={`text-2xl md:text-3xl mb-4 max-w-4xl mx-auto font-light transition-all duration-700 delay-100 ${heroAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            Connecting all South Africans with safe, accessible gig opportunities
          </p>
          <p className={`text-lg mb-10 opacity-95 flex items-center justify-center gap-6 flex-wrap max-w-3xl mx-auto transition-all duration-700 delay-200 ${heroAnimated ? 'opacity-95 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              ID Verified Employers
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Payment Protected
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Safe Work
            </span>
          </p>

          {/* Search Section */}
          <div className={`max-w-4xl mx-auto bg-white rounded-lg p-6 shadow-lg transition-all duration-700 delay-300 ${heroAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
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

      {/* Gigs Section - PRIORITY: Show immediately after hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Location Status - Show different content based on permission state */}
        {!showLocationPrompt || locationPermissionGranted ? null : (
          <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-4 mb-6">
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
                  className="text-secondary-700 border-secondary-300 hover:bg-secondary-100"
                >
                  {isLoadingLocation ? 'Getting Location...' : 'Enable Location'}
                </Button>
                <button
                  onClick={() => setShowLocationPrompt(false)}
                  className="text-secondary-400 hover:text-secondary-600"
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
          <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div>
                <p className="text-sm font-medium text-secondary-900">
                  Showing gigs within {formatDistance(radiusKm)} of your location
                </p>
                <p className="text-xs text-secondary-700">
                  Adjust the radius to see more or fewer nearby opportunities
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm text-secondary-700">Radius:</label>
                <select
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="px-3 py-1 border border-secondary-300 rounded-md text-sm text-secondary-900 bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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

        {/* Active Filters */}
        <ActiveFilters
          filters={filters}
          onRemoveFilter={handleRemoveFilter}
          onClearAll={handleClearFilters}
        />

        {/* Filter Panel and Gigs Layout */}
        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          {/* Filter Panel - Desktop Sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            <FilterPanel
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
              resultCount={filteredAndSortedGigs.length}
              currentUser={currentUser}
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Mobile Filter Button */}
            <div className="lg:hidden mb-4">
              <Button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                variant="outline"
                className="w-full"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
                Filters
              </Button>
            </div>

            {/* Mobile Filter Panel */}
            {showFilterPanel && (
              <div className="lg:hidden mb-4">
                <FilterPanel
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  onClearFilters={handleClearFilters}
                  resultCount={filteredAndSortedGigs.length}
                  isOpen={showFilterPanel}
                  onClose={() => setShowFilterPanel(false)}
                  currentUser={currentUser}
                />
              </div>
            )}

            {/* Header with Sort */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Available Gigs</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Showing {filteredAndSortedGigs.length} of {gigs.length} gigs
                  {showNearbyOnly ? ` within ${formatDistance(radiusKm)}` : ''}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <SortDropdown value={sortOption} onChange={setSortOption} />
                {locationPermissionGranted && (
                  <Button
                    variant={showNearbyOnly ? "primary" : "outline"}
                    size="sm"
                    onClick={handleNearMeToggle}
                    className={showNearbyOnly ? "bg-primary-600 text-white" : "text-secondary-700 border-secondary-300 hover:bg-secondary-100"}
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

            {/* Gigs Grid */}
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
            ) : filteredAndSortedGigs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg mb-4">
                  No gigs found matching your criteria.
                </p>
                <Button onClick={handleClearFilters} variant="outline">
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredAndSortedGigs.map((gig) => (
              <Card key={gig.id} className="hover:shadow-xl hover:scale-[1.02] transition-all duration-200 cursor-pointer border-l-4 border-l-transparent hover:border-l-primary-500">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg flex-1">{gig.title}</CardTitle>
                    {gig.workType && <WorkTypeBadge workType={gig.workType} size="sm" />}
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{gig.category}</span>
                    <div className="flex items-center space-x-2">
                      <span>{gig.location}</span>
                      {showNearbyOnly && currentCoordinates && gig.coordinates && (
                        <span className="text-secondary-600 font-medium">
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
                    {gig.status === 'open' && (
                      <div className="flex justify-start">
                        <PaymentInfoBadge variant="info" size="sm" />
                      </div>
                    )}
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

        {/* Infinite Scroll Trigger & Load More Button */}
        {!loading && hasMoreGigs && filteredAndSortedGigs.length > 0 && (
          <div className="mt-8 text-center">
            {/* Invisible trigger for infinite scroll */}
            <div ref={loadMoreTriggerRef} className="h-1" />

            {/* Manual Load More button (backup for infinite scroll) */}
            <Button
              onClick={loadMoreGigs}
              disabled={isLoadingMore}
              variant="outline"
              size="lg"
            >
              {isLoadingMore ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading More Gigs...
                </>
              ) : (
                'Load More Gigs'
              )}
            </Button>
            <p className="text-sm text-gray-500 mt-2">
              Showing {filteredAndSortedGigs.length} gigs
            </p>
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
          </div>
          {/* End of Main Content (lg:col-span-3) */}
        </div>
        {/* End of Filter Panel and Gigs Layout (lg:grid) */}
      </section>

      {/* Stats Section */}
      <section ref={statsRef} className="bg-gradient-to-br from-primary-50 to-secondary-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div className={`transition-all duration-700 ${statsInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: statsInView ? '0ms' : '0ms' }}>
              <div className="text-4xl md:text-5xl font-bold text-primary-600 mb-2">1,200+</div>
              <div className="text-gray-600 font-medium">Active Workers</div>
            </div>
            <div className={`transition-all duration-700 ${statsInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: statsInView ? '100ms' : '0ms' }}>
              <div className="text-4xl md:text-5xl font-bold text-primary-600 mb-2">500+</div>
              <div className="text-gray-600 font-medium">Verified Employers</div>
            </div>
            <div className={`transition-all duration-700 ${statsInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: statsInView ? '200ms' : '0ms' }}>
              <div className="text-4xl md:text-5xl font-bold text-secondary-600 mb-2">R2.5M+</div>
              <div className="text-gray-600 font-medium">Paid to Workers</div>
            </div>
            <div className={`transition-all duration-700 ${statsInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: statsInView ? '300ms' : '0ms' }}>
              <div className="text-4xl md:text-5xl font-bold text-secondary-600 mb-2">4.8/5</div>
              <div className="text-gray-600 font-medium">Average Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section ref={howItWorksRef} className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-12 transition-all duration-700 ${howItWorksInView ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">Get started in three simple steps</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            <div className={`text-center transition-all duration-700 ${howItWorksInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: howItWorksInView ? '0ms' : '0ms' }}>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 text-primary-600 font-bold text-2xl mb-4">1</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Create Your Profile</h3>
              <p className="text-gray-600">Sign up with your SA ID, add your skills, and get verified. Build trust with your profile.</p>
            </div>
            <div className={`text-center transition-all duration-700 ${howItWorksInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: howItWorksInView ? '150ms' : '0ms' }}>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 text-primary-600 font-bold text-2xl mb-4">2</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Find & Apply</h3>
              <p className="text-gray-600">Browse gigs in your area, apply to opportunities that match your skills, and get hired.</p>
            </div>
            <div className={`text-center transition-all duration-700 ${howItWorksInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: howItWorksInView ? '300ms' : '0ms' }}>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 text-primary-600 font-bold text-2xl mb-4">3</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Work & Get Paid</h3>
              <p className="text-gray-600">Complete the job, get reviewed, and receive secure payment. Build your reputation.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section ref={testimonialsRef} className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-12 transition-all duration-700 ${testimonialsInView ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">What Our Community Says</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">Real stories from workers and employers across South Africa</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className={`bg-white p-6 rounded-lg shadow-sm transition-all duration-700 ${testimonialsInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: testimonialsInView ? '0ms' : '0ms' }}>
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-secondary-100 flex items-center justify-center text-2xl">👨🏿</div>
                <div className="ml-3">
                  <div className="font-bold text-gray-900">Thabo M.</div>
                  <div className="text-sm text-gray-600">Plumber, Soweto</div>
                </div>
              </div>
              <p className="text-gray-600 italic mb-3">&quot;MzansiGig changed my life. I went from struggling to find work to having steady income. The payment protection means I always get paid.&quot;</p>
              <div className="flex text-accent-400">★★★★★</div>
            </div>
            <div className={`bg-white p-6 rounded-lg shadow-sm transition-all duration-700 ${testimonialsInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: testimonialsInView ? '150ms' : '0ms' }}>
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-secondary-100 flex items-center justify-center text-2xl">👩🏾</div>
                <div className="ml-3">
                  <div className="font-bold text-gray-900">Nomsa K.</div>
                  <div className="text-sm text-gray-600">Cleaner, Durban</div>
                </div>
              </div>
              <p className="text-gray-600 italic mb-3">&quot;As a single mother, finding flexible work was impossible. Now I choose my own hours and my kids eat every day.&quot;</p>
              <div className="flex text-accent-400">★★★★★</div>
            </div>
            <div className={`bg-white p-6 rounded-lg shadow-sm transition-all duration-700 ${testimonialsInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: testimonialsInView ? '300ms' : '0ms' }}>
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-2xl">👨🏽</div>
                <div className="ml-3">
                  <div className="font-bold text-gray-900">David L.</div>
                  <div className="text-sm text-gray-600">Employer, Cape Town</div>
                </div>
              </div>
              <p className="text-gray-600 italic mb-3">&quot;Finding reliable workers used to be a nightmare. MzansiGig&apos;s verification system gives me peace of mind.&quot;</p>
              <div className="flex text-accent-400">★★★★★</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section ref={faqRef} className="bg-white py-16 border-t">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-12 transition-all duration-700 ${faqInView ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-gray-600">Everything you need to know about getting started</p>
          </div>
          <div className="space-y-6">
            <div className={`bg-gray-50 p-6 rounded-lg transition-all duration-700 ${faqInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`} style={{ transitionDelay: faqInView ? '0ms' : '0ms' }}>
              <h3 className="font-bold text-gray-900 mb-2">Is MzansiGig really free to use?</h3>
              <p className="text-gray-600">Yes! Creating an account and browsing gigs is completely free. We only take a small commission when you successfully complete a job.</p>
            </div>
            <div className={`bg-gray-50 p-6 rounded-lg transition-all duration-700 ${faqInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`} style={{ transitionDelay: faqInView ? '100ms' : '0ms' }}>
              <h3 className="font-bold text-gray-900 mb-2">How does payment protection work?</h3>
              <p className="text-gray-600">Employers deposit payment into escrow before work begins. Once you complete the job and it&apos;s approved, payment is released to you. You always get paid for completed work.</p>
            </div>
            <div className={`bg-gray-50 p-6 rounded-lg transition-all duration-700 ${faqInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`} style={{ transitionDelay: faqInView ? '200ms' : '0ms' }}>
              <h3 className="font-bold text-gray-900 mb-2">Do I need experience to get started?</h3>
              <p className="text-gray-600">Not at all! We have gigs for all skill levels. Build your profile, earn reviews, and grow your opportunities over time.</p>
            </div>
            <div className={`bg-gray-50 p-6 rounded-lg transition-all duration-700 ${faqInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`} style={{ transitionDelay: faqInView ? '300ms' : '0ms' }}>
              <h3 className="font-bold text-gray-900 mb-2">What documents do I need to get verified?</h3>
              <p className="text-gray-600">Just your South African ID document. Verification is quick and helps build trust with employers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Distance Warning Dialog */}
      {showDistanceWarning && selectedGig && distanceWarningInfo && (
        <DistanceWarningDialog
          warningInfo={distanceWarningInfo}
          gigTitle={selectedGig.title}
          onConfirm={handleDistanceWarningConfirm}
          onCancel={handleDistanceWarningCancel}
        />
      )}

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

      {/* Footer */}
      <Footer />
    </div>
  )
}
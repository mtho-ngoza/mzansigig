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
import { useMessaging } from '@/contexts/MessagingContext'

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
  onLoginClick,
  showAuthButtons = true,
  onDashboardClick,
  currentUser,
  onMessageConversationStart,
  onMessagesClick
}: PublicGigBrowserProps) {
  const { success, error } = useToast()
  const { totalUnreadCount } = useMessaging()
  const [gigs, setGigs] = useState<Gig[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null)
  const [showApplicationForm, setShowApplicationForm] = useState(false)

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

  useEffect(() => {
    loadGigs()
  }, [])

  const loadGigs = async () => {
    try {
      setLoading(true)
      const openGigs = await GigService.getGigsByStatus('open')

      // If no gigs found from database, show demo data
      if (openGigs.length === 0) {
        const demoGigs: Gig[] = [
          {
            id: 'demo-1',
            title: 'Website Development for Small Business',
            description: 'Looking for a skilled web developer to create a modern, responsive website for our local bakery. Need online ordering system and payment integration.',
            category: 'Technology',
            location: 'Cape Town',
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
        setGigs(demoGigs)
      } else {
        setGigs(openGigs.slice(0, 20)) // Show first 20 gigs
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

  const handleSearch = async () => {
    try {
      setLoading(true)
      const searchResults = await GigService.searchGigs(searchTerm, selectedCategory || undefined)
      setGigs(searchResults.filter(gig => gig.status === 'open').slice(0, 20))
    } catch (error) {
      console.error('Error searching gigs:', error)
      setGigs([])
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount)
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

    setSelectedGig(gig)
    setShowApplicationForm(true)
  }

  const handleApplicationSuccess = () => {
    setShowApplicationForm(false)
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
                  placeholder="Search gigs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                <Button onClick={handleSearch} className="w-full">
                  Search
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gigs Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-bold text-gray-900">
            Available Gigs
          </h3>
          <p className="text-gray-600">
            {gigs.length} gigs found
          </p>
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
                    <span>{gig.location}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {gig.description}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Budget:</span>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(gig.budget)}
                      </span>
                    </div>
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
                    <span className="text-sm text-gray-500">
                      {gig.applicants?.length || 0} applicants
                    </span>
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
                      >
                        {currentUser ? 'Apply' : 'Apply Now'}
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
/**
 * ProfileManagement Tests * for a profile management component including ProfilePreview section
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import ProfileManagement from '@/components/profile/ProfileManagement'
import { useAuth } from '@/contexts/AuthContext'
import { User } from '@/types/auth'

// Mock AuthContext
jest.mock('@/contexts/AuthContext')

// Mock child components
jest.mock('@/components/profile/BasicInfoForm', () => ({
  __esModule: true,
  default: ({ onBack }: { onBack: () => void }) => (
    <div data-testid="basic-info-form">
      <button onClick={onBack}>Back</button>
    </div>
  )
}))

jest.mock('@/components/profile/ProfilePhotoUpload', () => ({
  __esModule: true,
  default: () => <div data-testid="profile-photo-upload">Photo Upload</div>
}))

jest.mock('@/components/profile/SkillsForm', () => ({
  __esModule: true,
  default: () => <div data-testid="skills-form">Skills Form</div>
}))

jest.mock('@/components/profile/PortfolioManager', () => ({
  __esModule: true,
  default: () => <div data-testid="portfolio-manager">Portfolio Manager</div>
}))

jest.mock('@/components/profile/ExperienceForm', () => ({
  __esModule: true,
  default: () => <div data-testid="experience-form">Experience Form</div>
}))

jest.mock('@/components/profile/ProfileCompleteness', () => ({
  __esModule: true,
  default: () => <div data-testid="profile-completeness">Profile Completeness</div>
}))

jest.mock('@/components/safety/SafetyPreferencesManager', () => ({
  __esModule: true,
  default: () => <div data-testid="safety-preferences">Safety Preferences</div>
}))

jest.mock('@/components/safety/TrustScoreBadge', () => ({
  TrustScoreBadge: ({ score }: { score: number }) => <div data-testid="trust-score-badge">Trust Score: {score}</div>,
  VerificationBadge: ({ level }: { level: string }) => <div data-testid="verification-badge">Verified: {level}</div>
}))

jest.mock('@/components/review', () => ({
  RatingDisplay: ({ rating, reviewCount }: { rating?: number, reviewCount?: number }) => (
    <div data-testid="rating-display">
      {rating?.toFixed(1)} ({reviewCount} reviews)
    </div>
  ),
  ReviewList: ({ userId }: { userId: string }) => (
    <div data-testid="review-list">Reviews for {userId}</div>
  )
}))

describe('ProfileManagement', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+27123456789',
    location: 'Cape Town',
    userType: 'job-seeker',
    workSector: 'professional',
    bio: 'Experienced web developer with 5 years of experience',
    skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
    experience: '5 years of professional web development',
    hourlyRate: 500,
    availability: 'flexible',
    languages: ['English', 'Afrikaans'],
    education: 'BSc Computer Science',
    certifications: ['AWS Certified Developer', 'React Professional'],
    isVerified: true,
    verificationLevel: 'basic',
    rating: 4.8,
    reviewCount: 15,
    completedGigs: 42,
    trustScore: 85,
    profilePhoto: 'https://example.com/photo.jpg',
    socialLinks: {
      linkedin: 'https://linkedin.com/in/johndoe',
      website: 'https://johndoe.dev',
      github: 'https://github.com/johndoe'
    },
    portfolio: [
      {
        id: 'port-1',
        title: 'E-commerce Website',
        description: 'Built a full-stack e-commerce platform',
        imageUrl: 'https://example.com/portfolio1.jpg',
        projectUrl: 'https://example-project.com',
        technologies: ['React', 'Node.js', 'PostgreSQL'],
        category: 'Web Development',
        completedAt: new Date('2024-01-15')
      },
      {
        id: 'port-2',
        title: 'Mobile App',
        description: 'Created a mobile application',
        imageUrl: 'https://example.com/portfolio2.jpg',
        projectUrl: 'https://example-app.com',
        technologies: ['React Native', 'Firebase'],
        category: 'Mobile Development',
        completedAt: new Date('2024-02-20')
      }
    ],
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2024-09-01')
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false
    })
  })

  describe('Profile Preview Section', () => {
    it('should display complete profile preview with all sections', () => {
      render(<ProfileManagement />)

      expect(screen.getByText('Profile Preview')).toBeInTheDocument()
      expect(screen.getByText('This is how your profile appears to others')).toBeInTheDocument()
    })

    it('should display basic information in preview', () => {
      render(<ProfileManagement />)

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Cape Town')).toBeInTheDocument()
      expect(screen.getByText(/Experienced web developer/i)).toBeInTheDocument()
    })

    it('should display work sector badge', () => {
      render(<ProfileManagement />)

      expect(screen.getByText('Professional')).toBeInTheDocument()
    })

    it('should display all skills without truncation', () => {
      render(<ProfileManagement />)

      // Check that all skills are displayed (some may appear multiple times in portfolio + skills)
      const reactElements = screen.getAllByText('React')
      expect(reactElements.length).toBeGreaterThanOrEqual(1)

      expect(screen.getByText('TypeScript')).toBeInTheDocument()

      const nodejsElements = screen.getAllByText('Node.js')
      expect(nodejsElements.length).toBeGreaterThanOrEqual(1)

      const postgresqlElements = screen.getAllByText('PostgreSQL')
      expect(postgresqlElements.length).toBeGreaterThanOrEqual(1)
    })

    it('should display verification badge', () => {
      render(<ProfileManagement />)

      expect(screen.getByTestId('verification-badge')).toBeInTheDocument()
    })

    it('should display trust score badge', () => {
      render(<ProfileManagement />)

      expect(screen.getByTestId('trust-score-badge')).toBeInTheDocument()
      expect(screen.getByText(/Trust Score: 85/i)).toBeInTheDocument()
    })

    it('should display rating with review count', () => {
      render(<ProfileManagement />)

      expect(screen.getByTestId('rating-display')).toBeInTheDocument()
    })

    it('should display experience and education section', () => {
      render(<ProfileManagement />)

      expect(screen.getByText('Experience & Background')).toBeInTheDocument()
      expect(screen.getByText(/5 years of professional web development/i)).toBeInTheDocument()
      expect(screen.getByText(/BSc Computer Science/i)).toBeInTheDocument()
      expect(screen.getByText(/Flexible/i)).toBeInTheDocument()
    })

    it('should display languages section', () => {
      render(<ProfileManagement />)

      expect(screen.getByText('Languages')).toBeInTheDocument()
      expect(screen.getByText('English')).toBeInTheDocument()
      expect(screen.getByText('Afrikaans')).toBeInTheDocument()
    })

    it('should display certifications section', () => {
      render(<ProfileManagement />)

      expect(screen.getByText('Certifications')).toBeInTheDocument()
      expect(screen.getByText('AWS Certified Developer')).toBeInTheDocument()
      expect(screen.getByText('React Professional')).toBeInTheDocument()
    })

    it('should display portfolio section with technologies', () => {
      render(<ProfileManagement />)

      // Portfolio appears in both navigation and preview, so use getAllByText
      const portfolioElements = screen.getAllByText('Portfolio')
      expect(portfolioElements.length).toBeGreaterThanOrEqual(1)

      expect(screen.getByText('E-commerce Website')).toBeInTheDocument()
      expect(screen.getByText('Mobile App')).toBeInTheDocument()
      expect(screen.getByText('Firebase')).toBeInTheDocument()
    })

    it('should display social links section', () => {
      render(<ProfileManagement />)

      expect(screen.getByText('Links')).toBeInTheDocument()
      expect(screen.getByText('LinkedIn →')).toBeInTheDocument()
      expect(screen.getByText('Website →')).toBeInTheDocument()
      expect(screen.getByText('GitHub →')).toBeInTheDocument()
    })

    it('should display hourly rate', () => {
      render(<ProfileManagement />)

      expect(screen.getByText(/R500\/hour/i)).toBeInTheDocument()
    })

    it('should display completed gigs count', () => {
      render(<ProfileManagement />)

      expect(screen.getByText(/42 completed gigs/i)).toBeInTheDocument()
    })
  })

  describe('Profile Preview - Informal Worker', () => {
    beforeEach(() => {
      const informalUser = {
        ...mockUser,
        workSector: 'informal' as const
      }
      ;(useAuth as jest.Mock).mockReturnValue({
        user: informalUser,
        loading: false
      })
    })

    it('should display informal sector badge', () => {
      render(<ProfileManagement />)

      expect(screen.getByText('Informal Sector')).toBeInTheDocument()
    })
  })

  describe('Profile Preview - Minimal Profile', () => {
    beforeEach(() => {
      const minimalUser: User = {
        id: 'user-456',
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+27987654321',
        location: 'Johannesburg',
        userType: 'job-seeker',
        createdAt: new Date()
      }
      ;(useAuth as jest.Mock).mockReturnValue({
        user: minimalUser,
        loading: false
      })
    })

    it('should handle profile with minimal information gracefully', () => {
      render(<ProfileManagement />)

      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('Johannesburg')).toBeInTheDocument()

      // Should not display preview sections that don't have data (but nav sections will still exist)
      expect(screen.queryByText('Experience & Background')).not.toBeInTheDocument()
      expect(screen.queryByText('Languages')).not.toBeInTheDocument()
      expect(screen.queryByText('Certifications')).not.toBeInTheDocument()

      // Portfolio appears in navigation for job seekers, but not in preview section
      const portfolioElements = screen.queryAllByText('Portfolio')
      // Should be in navigation section only (1 occurrence)
      expect(portfolioElements.length).toBeLessThanOrEqual(1)

      expect(screen.queryByText('Links')).not.toBeInTheDocument()
    })
  })

  describe('Profile Preview - Employer User', () => {
    beforeEach(() => {
      const employerUser = {
        ...mockUser,
        userType: 'employer' as const,
        portfolio: undefined // Employers don't have portfolios
      }
      ;(useAuth as jest.Mock).mockReturnValue({
        user: employerUser,
        loading: false
      })
    })

    it('should not display portfolio section for employers', () => {
      render(<ProfileManagement />)

      expect(screen.queryByText('Portfolio')).not.toBeInTheDocument()
    })
  })

  describe('No User State', () => {
    beforeEach(() => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        loading: false
      })
    })

    it('should display login message when no user is logged in', () => {
      render(<ProfileManagement />)

      expect(screen.getByText('Please login to manage your profile.')).toBeInTheDocument()
    })
  })
})

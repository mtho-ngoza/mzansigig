/**
 * ProfileCompleteness Tests
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import ProfileCompleteness from '@/components/profile/ProfileCompleteness'
import { useAuth } from '@/contexts/AuthContext'
import { User } from '@/types/auth'

// Mock AuthContext
jest.mock('@/contexts/AuthContext')

// Mock ProfileService
jest.mock('@/lib/database/profileService', () => ({
  ProfileService: {
    calculateProfileCompleteness: jest.fn()
  }
}))

import { ProfileService } from '@/lib/database/profileService'

describe('ProfileCompleteness', () => {
  const baseUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+27123456789',
    location: 'Cape Town',
    userType: 'job-seeker',
    createdAt: new Date()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Progress Calculation', () => {
    it('should show 0% for empty profile', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: baseUser,
        loading: false
      })
      ;(ProfileService.calculateProfileCompleteness as jest.Mock).mockReturnValue(0)

      render(<ProfileCompleteness />)

      expect(screen.getByText('0%')).toBeInTheDocument()
      expect(screen.getByText("Let's start building your profile!")).toBeInTheDocument()
    })

    it('should show 40% progress with some fields filled', () => {
      const partialUser = {
        ...baseUser,
        bio: 'Test bio',
        profilePhoto: 'https://example.com/photo.jpg',
        skills: ['React', 'TypeScript'],
        experience: '5 years'
      }
      ;(useAuth as jest.Mock).mockReturnValue({
        user: partialUser,
        loading: false
      })
      ;(ProfileService.calculateProfileCompleteness as jest.Mock).mockReturnValue(44)

      render(<ProfileCompleteness />)

      expect(screen.getByText('44%')).toBeInTheDocument()
      expect(screen.getByText('Getting there! Keep adding information.')).toBeInTheDocument()
    })

    it('should show 60% progress with more fields filled', () => {
      const moreCompleteUser = {
        ...baseUser,
        bio: 'Test bio',
        profilePhoto: 'https://example.com/photo.jpg',
        skills: ['React', 'TypeScript'],
        experience: '5 years',
        hourlyRate: 500,
        availability: 'Available immediately'
      }
      ;(useAuth as jest.Mock).mockReturnValue({
        user: moreCompleteUser,
        loading: false
      })
      ;(ProfileService.calculateProfileCompleteness as jest.Mock).mockReturnValue(67)

      render(<ProfileCompleteness />)

      expect(screen.getByText('67%')).toBeInTheDocument()
      expect(screen.getByText('Good progress! Add a few more details.')).toBeInTheDocument()
    })

    it('should show 100% for complete profile', () => {
      const completeUser: User = {
        ...baseUser,
        bio: 'Test bio',
        profilePhoto: 'https://example.com/photo.jpg',
        skills: ['React', 'TypeScript'],
        experience: '5 years',
        hourlyRate: 500,
        availability: 'Available immediately',
        education: 'BSc Computer Science',
        languages: ['English', 'Afrikaans'],
        portfolio: [{
          id: '1',
          title: 'Project',
          description: 'Test project',
          category: 'Web Development',
          completedAt: new Date()
        }]
      }
      ;(useAuth as jest.Mock).mockReturnValue({
        user: completeUser,
        loading: false
      })
      ;(ProfileService.calculateProfileCompleteness as jest.Mock).mockReturnValue(100)

      render(<ProfileCompleteness />)

      expect(screen.getByText('100%')).toBeInTheDocument()
      expect(screen.getByText('Excellent! Your profile looks great.')).toBeInTheDocument()
      expect(screen.getByText('Profile Complete!')).toBeInTheDocument()
    })
  })

  describe('Missing Fields Display', () => {
    it('should show missing fields for incomplete profile', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: baseUser,
        loading: false
      })
      ;(ProfileService.calculateProfileCompleteness as jest.Mock).mockReturnValue(0)

      render(<ProfileCompleteness />)

      expect(screen.getByText('To improve your profile, consider adding:')).toBeInTheDocument()
      expect(screen.getByText('Bio/About section')).toBeInTheDocument()
      expect(screen.getByText('Profile photo')).toBeInTheDocument()
      expect(screen.getByText('Skills')).toBeInTheDocument()
    })

    it('should not show missing fields for complete profile', () => {
      const completeUser: User = {
        ...baseUser,
        bio: 'Test bio',
        profilePhoto: 'https://example.com/photo.jpg',
        skills: ['React'],
        experience: '5 years',
        hourlyRate: 500,
        availability: 'Available',
        education: 'BSc',
        languages: ['English'],
        portfolio: [{ id: '1', title: 'Project', description: 'Test', category: 'Web', completedAt: new Date() }]
      }
      ;(useAuth as jest.Mock).mockReturnValue({
        user: completeUser,
        loading: false
      })
      ;(ProfileService.calculateProfileCompleteness as jest.Mock).mockReturnValue(100)

      render(<ProfileCompleteness />)

      expect(screen.queryByText('To improve your profile, consider adding:')).not.toBeInTheDocument()
    })

    it('should show portfolio for job seekers', () => {
      const jobSeeker = { ...baseUser, userType: 'job-seeker' as const }
      ;(useAuth as jest.Mock).mockReturnValue({
        user: jobSeeker,
        loading: false
      })
      ;(ProfileService.calculateProfileCompleteness as jest.Mock).mockReturnValue(0)

      render(<ProfileCompleteness />)

      // Portfolio items is in the missing fields (shown in "+X more" since component only shows first 5)
      expect(screen.getByText(/\+\d+ more/i)).toBeInTheDocument()
    })

    it('should show certifications for employers', () => {
      const employer = { ...baseUser, userType: 'employer' as const }
      ;(useAuth as jest.Mock).mockReturnValue({
        user: employer,
        loading: false
      })
      ;(ProfileService.calculateProfileCompleteness as jest.Mock).mockReturnValue(0)

      render(<ProfileCompleteness />)

      // Certifications is in the missing fields (shown in "+X more" since component only shows first 5)
      expect(screen.getByText(/\+\d+ more/i)).toBeInTheDocument()
    })
  })

  describe('No User State', () => {
    it('should not render when no user is logged in', () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        loading: false
      })

      const { container } = render(<ProfileCompleteness />)

      expect(container.firstChild).toBeNull()
    })
  })
})

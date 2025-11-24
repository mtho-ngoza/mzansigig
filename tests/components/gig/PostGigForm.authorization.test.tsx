import React from 'react'
import { render, screen } from '@testing-library/react'
import PostGigForm from '@/components/gig/PostGigForm'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { Gig } from '@/types/gig'

// Mock contexts
jest.mock('@/contexts/AuthContext')
jest.mock('@/contexts/ToastContext')

// Mock LocationAutocomplete
jest.mock('@/components/location/LocationAutocomplete', () => ({
  __esModule: true,
  default: ({ value, onChange }: any) => (
    <input
      data-testid="location-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}))

describe('PostGigForm - Authorization', () => {
  const mockOwnerUser = {
    id: 'owner-123',
    email: 'owner@example.com',
    firstName: 'Owner',
    lastName: 'User',
    userType: 'employer' as const
  }

  const mockOtherUser = {
    id: 'other-456',
    email: 'other@example.com',
    firstName: 'Other',
    lastName: 'User',
    userType: 'employer' as const
  }

  const mockGig: Gig = {
    id: 'gig-123',
    title: 'Test Gig',
    description: 'Test description for authorization checks',
    category: 'Technology',
    location: 'Johannesburg',
    budget: 5000,
    duration: '1 week',
    skillsRequired: ['React', 'TypeScript'],
    employerId: 'owner-123',
    employerName: 'Owner User',
    applicants: [],
    status: 'open',
    workType: 'remote',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockSuccess = jest.fn()
  const mockError = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useToast as jest.Mock).mockReturnValue({
      success: mockSuccess,
      error: mockError
    })
  })

  describe('given user is the gig owner', () => {
    describe('when rendering edit form', () => {
      it('then displays the edit form', () => {
        // Given
        ;(useAuth as jest.Mock).mockReturnValue({
          user: mockOwnerUser,
          isAuthenticated: true
        })

        // When
        render(<PostGigForm editGig={mockGig} />)

        // Then
        expect(screen.getByText('Edit Gig')).toBeInTheDocument()
        expect(screen.getByDisplayValue('Test Gig')).toBeInTheDocument()
        expect(screen.getByDisplayValue('Test description for authorization checks')).toBeInTheDocument()
        expect(mockError).not.toHaveBeenCalled()
      })
    })
  })

  describe('given user is NOT the gig owner', () => {
    describe('when attempting to render edit form', () => {
      it('then displays unauthorized message', () => {
        // Given
        ;(useAuth as jest.Mock).mockReturnValue({
          user: mockOtherUser,
          isAuthenticated: true
        })

        // When
        render(<PostGigForm editGig={mockGig} />)

        // Then
        expect(screen.getByText('Unauthorized Access')).toBeInTheDocument()
        expect(screen.getByText(/You are not authorized to edit this gig/)).toBeInTheDocument()
        expect(screen.getByText(/Only the gig owner can make changes/)).toBeInTheDocument()
        expect(mockError).toHaveBeenCalledWith('Unauthorized: You can only edit your own gigs')
      })

      it('then hides the edit form fields', () => {
        // Given
        ;(useAuth as jest.Mock).mockReturnValue({
          user: mockOtherUser,
          isAuthenticated: true
        })

        // When
        render(<PostGigForm editGig={mockGig} />)

        // Then
        expect(screen.queryByDisplayValue('Test Gig')).not.toBeInTheDocument()
        expect(screen.queryByDisplayValue('Test description for authorization checks')).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Update Gig/i })).not.toBeInTheDocument()
      })

      it('then shows Go Back button when onCancel is provided', () => {
        // Given
        ;(useAuth as jest.Mock).mockReturnValue({
          user: mockOtherUser,
          isAuthenticated: true
        })
        const mockOnCancel = jest.fn()

        // When
        render(<PostGigForm editGig={mockGig} onCancel={mockOnCancel} />)

        // Then
        expect(screen.getByRole('button', { name: /Go Back/i })).toBeInTheDocument()
      })
    })
  })

  describe('given user is not authenticated', () => {
    describe('when attempting to render edit form', () => {
      it('then does not show unauthorized message (waits for user)', () => {
        // Given
        ;(useAuth as jest.Mock).mockReturnValue({
          user: null,
          isAuthenticated: false
        })

        // When
        render(<PostGigForm editGig={mockGig} />)

        // Then - Should show the form but not trigger unauthorized state
        // (the form won't be functional without a user anyway)
        expect(screen.getByText('Edit Gig')).toBeInTheDocument()
      })
    })
  })

  describe('given creating a new gig (no editGig prop)', () => {
    describe('when rendering form', () => {
      it('then displays create form without authorization check', () => {
        // Given
        ;(useAuth as jest.Mock).mockReturnValue({
          user: mockOtherUser,
          isAuthenticated: true
        })

        // When
        render(<PostGigForm />)

        // Then
        expect(screen.getByText('Post a New Gig')).toBeInTheDocument()
        expect(mockError).not.toHaveBeenCalled()
      })
    })
  })

  describe('Authorization - Edge Cases', () => {
    describe('given attacker attempts to edit victim gig', () => {
      describe('when rendering with non-matching user ID', () => {
        it('then blocks access immediately', () => {
          // Given
          const victimGig = { ...mockGig, employerId: 'victim-999' }
          const attackerUser = { ...mockOtherUser, id: 'attacker-666' }

          ;(useAuth as jest.Mock).mockReturnValue({
            user: attackerUser,
            isAuthenticated: true
          })

          // When
          render(<PostGigForm editGig={victimGig} />)

          // Then
          expect(screen.getByText('Unauthorized Access')).toBeInTheDocument()
          expect(mockError).toHaveBeenCalledWith('Unauthorized: You can only edit your own gigs')

          // Critical: Form fields should not be accessible
          expect(screen.queryByDisplayValue('Test Gig')).not.toBeInTheDocument()
        })
      })
    })

    describe('given gig with missing employerId', () => {
      describe('when attempting to edit', () => {
        it('then treats as unauthorized', () => {
          // Given
          const gigWithoutEmployerId = { ...mockGig, employerId: '' }
          ;(useAuth as jest.Mock).mockReturnValue({
            user: mockOwnerUser,
            isAuthenticated: true
          })

          // When
          render(<PostGigForm editGig={gigWithoutEmployerId} />)

          // Then
          expect(screen.getByText('Unauthorized Access')).toBeInTheDocument()
          expect(mockError).toHaveBeenCalled()
        })
      })
    })
  })
})

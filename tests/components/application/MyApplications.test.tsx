/**
 * MyApplications Tests - Worker payment protection warnings
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import MyApplications from '@/components/application/MyApplications'
import { useAuth } from '@/contexts/AuthContext'
import { GigService } from '@/lib/database/gigService'

// Mock dependencies
jest.mock('@/contexts/AuthContext')
jest.mock('@/lib/database/gigService')
jest.mock('@/components/messaging/QuickMessageButton', () => ({
  QuickMessageButton: () => <div>Quick Message</div>
}))

describe('MyApplications - Payment Protection', () => {
  const mockUser = {
    id: 'worker-123',
    email: 'worker@example.com',
    firstName: 'John',
    lastName: 'Worker',
    userType: 'job-seeker' as const,
    phone: '+27123456789',
    location: 'Johannesburg',
    createdAt: new Date()
  }

  const mockGig = {
    id: 'gig-1',
    title: 'Web Development Project',
    budget: 10000,
    employerId: 'employer-123',
    employerName: 'Jane Employer',
    status: 'open',
    createdAt: new Date()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false
    })
  })

  describe('Worker Payment Warning Banners', () => {
    it('should display warning banner for accepted but unfunded applications', async () => {
      const acceptedUnfundedApp = {
        id: 'app-1',
        gigId: 'gig-1',
        applicantId: 'worker-123',
        applicantName: 'John Worker',
        coverLetter: 'I am interested in this position.',
        proposedRate: 5000,
        status: 'accepted' as const,
        paymentStatus: 'unpaid' as const,
        createdAt: new Date()
      }

      ;(GigService.getApplicationsByApplicant as jest.Mock).mockResolvedValue([acceptedUnfundedApp])
      ;(GigService.getGigById as jest.Mock).mockResolvedValue(mockGig)

      render(<MyApplications />)

      await waitFor(() => {
        expect(screen.getByText('⚠️ PAYMENT NOT FUNDED - DO NOT START WORK')).toBeInTheDocument()
      })

      expect(screen.getByText(/Your application has been accepted, but/i)).toBeInTheDocument()
      expect(screen.getByText(/the employer has not yet funded the payment/i)).toBeInTheDocument()
      expect(screen.getByText(/For your protection: Do not begin any work/i)).toBeInTheDocument()
    })

    it('should display payment secured banner for funded applications', async () => {
      const fundedApp = {
        id: 'app-1',
        gigId: 'gig-1',
        applicantId: 'worker-123',
        applicantName: 'John Worker',
        coverLetter: 'I am interested in this position.',
        proposedRate: 5000,
        status: 'accepted' as const,
        paymentStatus: 'in_escrow' as const,
        createdAt: new Date()
      }

      ;(GigService.getApplicationsByApplicant as jest.Mock).mockResolvedValue([fundedApp])
      ;(GigService.getGigById as jest.Mock).mockResolvedValue(mockGig)

      render(<MyApplications />)

      await waitFor(() => {
        expect(screen.getByText('✓ Payment Secured in Escrow - Safe to Start Work')).toBeInTheDocument()
      })

      expect(screen.getByText(/The payment for this gig is now held in secure escrow/i)).toBeInTheDocument()
      expect(screen.getByText('IN ESCROW')).toBeInTheDocument()
    })

    it('should not display warning for pending applications', async () => {
      const pendingApp = {
        id: 'app-1',
        gigId: 'gig-1',
        applicantId: 'worker-123',
        applicantName: 'John Worker',
        coverLetter: 'I am interested in this position.',
        proposedRate: 5000,
        status: 'pending' as const,
        createdAt: new Date()
      }

      ;(GigService.getApplicationsByApplicant as jest.Mock).mockResolvedValue([pendingApp])
      ;(GigService.getGigById as jest.Mock).mockResolvedValue(mockGig)

      render(<MyApplications />)

      await waitFor(() => {
        expect(screen.getByText('Web Development Project')).toBeInTheDocument()
      })

      expect(screen.queryByText('⚠️ PAYMENT NOT FUNDED - DO NOT START WORK')).not.toBeInTheDocument()
    })

    it('should not display warning for rejected applications', async () => {
      const rejectedApp = {
        id: 'app-1',
        gigId: 'gig-1',
        applicantId: 'worker-123',
        applicantName: 'John Worker',
        coverLetter: 'I am interested in this position.',
        proposedRate: 5000,
        status: 'rejected' as const,
        createdAt: new Date()
      }

      ;(GigService.getApplicationsByApplicant as jest.Mock).mockResolvedValue([rejectedApp])
      ;(GigService.getGigById as jest.Mock).mockResolvedValue(mockGig)

      render(<MyApplications />)

      await waitFor(() => {
        expect(screen.getByText('Application not selected this time.')).toBeInTheDocument()
      })

      expect(screen.queryByText('⚠️ PAYMENT NOT FUNDED - DO NOT START WORK')).not.toBeInTheDocument()
    })

    it('should show current payment status in warning banner', async () => {
      const acceptedUnfundedApp = {
        id: 'app-1',
        gigId: 'gig-1',
        applicantId: 'worker-123',
        applicantName: 'John Worker',
        coverLetter: 'I am interested in this position.',
        proposedRate: 5000,
        status: 'accepted' as const,
        paymentStatus: 'unpaid' as const,
        createdAt: new Date()
      }

      ;(GigService.getApplicationsByApplicant as jest.Mock).mockResolvedValue([acceptedUnfundedApp])
      ;(GigService.getGigById as jest.Mock).mockResolvedValue(mockGig)

      render(<MyApplications />)

      await waitFor(() => {
        expect(screen.getByText('Current Payment Status:')).toBeInTheDocument()
      })

      expect(screen.getByText('UNPAID')).toBeInTheDocument()
    })

    it('should show paid status badge when payment is in escrow', async () => {
      const paidApp = {
        id: 'app-1',
        gigId: 'gig-1',
        applicantId: 'worker-123',
        applicantName: 'John Worker',
        coverLetter: 'I am interested in this position.',
        proposedRate: 5000,
        status: 'accepted' as const,
        paymentStatus: 'paid' as const,
        createdAt: new Date()
      }

      ;(GigService.getApplicationsByApplicant as jest.Mock).mockResolvedValue([paidApp])
      ;(GigService.getGigById as jest.Mock).mockResolvedValue(mockGig)

      render(<MyApplications />)

      await waitFor(() => {
        expect(screen.getByText('✓ Payment Secured in Escrow - Safe to Start Work')).toBeInTheDocument()
      })

      expect(screen.getByText('PAID')).toBeInTheDocument()
    })

    it('should display both warnings and acceptance message together for accepted apps', async () => {
      const acceptedUnfundedApp = {
        id: 'app-1',
        gigId: 'gig-1',
        applicantId: 'worker-123',
        applicantName: 'John Worker',
        coverLetter: 'I am interested in this position.',
        proposedRate: 5000,
        status: 'accepted' as const,
        paymentStatus: 'unpaid' as const,
        createdAt: new Date()
      }

      ;(GigService.getApplicationsByApplicant as jest.Mock).mockResolvedValue([acceptedUnfundedApp])
      ;(GigService.getGigById as jest.Mock).mockResolvedValue(mockGig)

      render(<MyApplications />)

      await waitFor(() => {
        // Both warning and acceptance message should be present
        expect(screen.getByText('⚠️ PAYMENT NOT FUNDED - DO NOT START WORK')).toBeInTheDocument()
        expect(screen.getByText(/Congratulations! Your application has been accepted/i)).toBeInTheDocument()
      })
    })
  })

  describe('Multiple Application States', () => {
    it('should show correct warnings for multiple applications with different payment statuses', async () => {
      const mixedApplications = [
        {
          id: 'app-1',
          gigId: 'gig-1',
          applicantId: 'worker-123',
          applicantName: 'John Worker',
          coverLetter: 'Application 1',
          proposedRate: 5000,
          status: 'accepted' as const,
          paymentStatus: 'unpaid' as const,
          createdAt: new Date()
        },
        {
          id: 'app-2',
          gigId: 'gig-2',
          applicantId: 'worker-123',
          applicantName: 'John Worker',
          coverLetter: 'Application 2',
          proposedRate: 6000,
          status: 'accepted' as const,
          paymentStatus: 'in_escrow' as const,
          createdAt: new Date()
        }
      ]

      ;(GigService.getApplicationsByApplicant as jest.Mock).mockResolvedValue(mixedApplications)
      ;(GigService.getGigById as jest.Mock).mockImplementation((gigId: string) => {
        if (gigId === 'gig-1') {
          return Promise.resolve({ ...mockGig, id: 'gig-1', title: 'Project 1' })
        }
        return Promise.resolve({ ...mockGig, id: 'gig-2', title: 'Project 2' })
      })

      render(<MyApplications />)

      await waitFor(() => {
        // Should have one warning banner
        expect(screen.getByText('⚠️ PAYMENT NOT FUNDED - DO NOT START WORK')).toBeInTheDocument()
        // Should have one secured banner
        expect(screen.getByText('✓ Payment Secured in Escrow - Safe to Start Work')).toBeInTheDocument()
      })
    })
  })

  describe('Empty States', () => {
    it('should show empty state when no applications exist', async () => {
      ;(GigService.getApplicationsByApplicant as jest.Mock).mockResolvedValue([])

      render(<MyApplications />)

      await waitFor(() => {
        expect(screen.getByText('No Applications Yet')).toBeInTheDocument()
      })
    })
  })

  describe('Loading State', () => {
    it('should display loading state while fetching applications', () => {
      ;(GigService.getApplicationsByApplicant as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(<MyApplications />)

      expect(screen.getByText(/Loading your applications/i)).toBeInTheDocument()
    })
  })
})

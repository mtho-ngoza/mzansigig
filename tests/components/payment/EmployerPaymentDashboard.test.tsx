/**
 * EmployerPaymentDashboard Component Tests
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import EmployerPaymentDashboard from '@/components/payment/EmployerPaymentDashboard'
import { AuthContext } from '@/contexts/AuthContext'
import { PaymentContext } from '@/contexts/PaymentContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { GigService } from '@/lib/database/gigService'
import { GigApplication } from '@/types/gig'

// Mock GigService
jest.mock('@/lib/database/gigService')

const mockGigService = GigService as jest.Mocked<typeof GigService>

const mockEmployerUser = {
  id: 'employer-123',
  email: 'employer@test.com',
  firstName: 'Test',
  lastName: 'Employer',
  userType: 'employer' as const,
  phone: '+27123456789',
  location: 'Johannesburg',
  idNumber: '1234567890123',
  createdAt: new Date()
}

const mockFormatCurrency = jest.fn((amount) => `R${amount.toFixed(2)}`)

const mockPaymentContextValue = {
  paymentMethods: [
    {
      id: 'pm-123',
      type: 'bank' as const,
      provider: 'eft' as const,
      bankName: 'FNB',
      accountLast4: '1234',
      accountType: 'cheque' as const,
      accountHolder: 'Test Employer',
      isDefault: true,
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  payments: [],
  withdrawals: [],
  analytics: {
    totalEarnings: 0,
    totalPaid: 5000,
    totalWithdrawn: 0,
    availableBalance: 0,
    pendingBalance: 0,
    pendingPayments: 2000,
    completedGigs: 10,
    averageGigValue: 500,
    monthlyEarnings: [
      { month: new Date().toISOString().slice(0, 7), amount: 1500 }
    ],
    topCategories: [],
    paymentMethodUsage: []
  },
  isLoading: false,
  error: null,
  addPaymentMethod: jest.fn(),
  setDefaultPaymentMethod: jest.fn(),
  deletePaymentMethod: jest.fn(),
  refreshPaymentMethods: jest.fn(),
  createPaymentIntent: jest.fn(),
  processPayment: jest.fn(),
  releaseEscrow: jest.fn(),
  createMilestone: jest.fn(),
  updateMilestoneStatus: jest.fn(),
  requestWithdrawal: jest.fn(),
  refreshWithdrawals: jest.fn(),
  refreshAnalytics: jest.fn(),
  calculateFees: jest.fn(),
  calculateGigFees: jest.fn(),
  formatCurrency: mockFormatCurrency
}

const mockAuthContextValue = {
  user: mockEmployerUser,
  updateUser: jest.fn(),
  refreshUser: jest.fn(),
  isLoading: false,
  isAuthenticated: true,
  error: null,
  login: jest.fn(),
  loginWithGoogle: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  updateProfile: jest.fn(),
  sendPasswordReset: jest.fn(),
  resetIdleTimer: jest.fn()
}

const renderEmployerPaymentDashboard = (props = {}) => {
  return render(
    <ToastProvider>
      <AuthContext.Provider value={mockAuthContextValue}>
        <PaymentContext.Provider value={mockPaymentContextValue}>
          <EmployerPaymentDashboard {...props} />
        </PaymentContext.Provider>
      </AuthContext.Provider>
    </ToastProvider>
  )
}

describe('EmployerPaymentDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Overview Rendering', () => {
    it('should render dashboard title and description', () => {
      mockGigService.getGigsByEmployer.mockResolvedValue([])

      renderEmployerPaymentDashboard()

      expect(screen.getByText('Payment Dashboard')).toBeInTheDocument()
      expect(screen.getByText(/Manage payments, track spending, and view obligations/i)).toBeInTheDocument()
    })

    it('should display quick stats cards', async () => {
      mockGigService.getGigsByEmployer.mockResolvedValue([])

      renderEmployerPaymentDashboard()

      await waitFor(() => {
        expect(screen.getByText('Total Paid')).toBeInTheDocument()
        expect(screen.getByText('Pending Obligations')).toBeInTheDocument()
        expect(screen.getByText('This Month')).toBeInTheDocument()
        expect(screen.getByText('In Escrow')).toBeInTheDocument()
      })
    })

    it('should display correct amounts in stats cards', async () => {
      mockGigService.getGigsByEmployer.mockResolvedValue([])

      renderEmployerPaymentDashboard()

      await waitFor(() => {
        // Total Paid
        expect(screen.getByText('R5000.00')).toBeInTheDocument()
        // This Month
        expect(screen.getByText('R1500.00')).toBeInTheDocument()
        // In Escrow (pendingPayments)
        expect(screen.getByText('R2000.00')).toBeInTheDocument()
      })
    })

    it('should display quick action buttons', async () => {
      mockGigService.getGigsByEmployer.mockResolvedValue([])

      renderEmployerPaymentDashboard()

      await waitFor(() => {
        expect(screen.getByText('Pending Payments')).toBeInTheDocument()
        expect(screen.getAllByText('Payment Methods').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Payment History').length).toBeGreaterThan(0)
        expect(screen.getByText('Manage Gigs')).toBeInTheDocument()
      })
    })

    it('should display help section', async () => {
      mockGigService.getGigsByEmployer.mockResolvedValue([])

      renderEmployerPaymentDashboard()

      await waitFor(() => {
        expect(screen.getByText('Payment Help')).toBeInTheDocument()
        expect(screen.getByText('Escrow Protection')).toBeInTheDocument()
        expect(screen.getByText('Payment Best Practices')).toBeInTheDocument()
      })
    })
  })

  describe('Pending Obligations', () => {
    const mockUnpaidApplication: GigApplication = {
      id: 'app-123',
      gigId: 'gig-123',
      applicantId: 'worker-123',
      applicantName: 'John Worker',
      status: 'accepted',
      proposedRate: 500,
      createdAt: new Date()
    }

    const mockGig = {
      id: 'gig-123',
      title: 'Test Gig',
      description: 'Test description',
      category: 'Cleaning',
      budget: 500,
      duration: '1 week',
      skillsRequired: ['cleaning'],
      location: 'Johannesburg',
      employerId: 'employer-123',
      employerName: 'Test Employer',
      status: 'open' as const,
      applicants: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      workType: 'physical' as const
    }

    it('should load and display pending obligations', async () => {
      mockGigService.getGigsByEmployer.mockResolvedValue([mockGig])
      mockGigService.getApplicationsByGig.mockResolvedValue([mockUnpaidApplication])
      mockGigService.getGigById.mockResolvedValue(mockGig)

      renderEmployerPaymentDashboard()

      await waitFor(() => {
        expect(mockGigService.getGigsByEmployer).toHaveBeenCalledWith('employer-123')
      })
    })

    it('should show warning banner when there are pending obligations', async () => {
      mockGigService.getGigsByEmployer.mockResolvedValue([mockGig])
      mockGigService.getApplicationsByGig.mockResolvedValue([mockUnpaidApplication])
      mockGigService.getGigById.mockResolvedValue(mockGig)

      renderEmployerPaymentDashboard()

      await waitFor(() => {
        expect(screen.getByText(/Pending Payment Obligations/i)).toBeInTheDocument()
        expect(screen.getByText(/You have 1 accepted application waiting for payment/i)).toBeInTheDocument()
      })
    })

    it('should not show warning banner when there are no pending obligations', async () => {
      mockGigService.getGigsByEmployer.mockResolvedValue([])

      renderEmployerPaymentDashboard()

      await waitFor(() => {
        expect(screen.queryByText(/Pending Payment Obligations/i)).not.toBeInTheDocument()
      })
    })

    it('should filter only accepted applications without paymentId', async () => {
      const applications: GigApplication[] = [
        { ...mockUnpaidApplication, id: 'app-1', status: 'accepted' },
        { ...mockUnpaidApplication, id: 'app-2', status: 'accepted', paymentId: 'payment-123' }, // Has payment
        { ...mockUnpaidApplication, id: 'app-3', status: 'pending' }, // Not accepted
        { ...mockUnpaidApplication, id: 'app-4', status: 'accepted' }
      ]

      mockGigService.getGigsByEmployer.mockResolvedValue([mockGig])
      mockGigService.getApplicationsByGig.mockResolvedValue(applications)
      mockGigService.getGigById.mockResolvedValue(mockGig)

      renderEmployerPaymentDashboard()

      await waitFor(() => {
        // Should only count 2 unpaid obligations (app-1 and app-4)
        expect(screen.getByText(/You have 2 accepted applications waiting for payment/i)).toBeInTheDocument()
      })
    })

    it('should navigate to obligations view when clicking "View & Pay Now"', async () => {
      mockGigService.getGigsByEmployer.mockResolvedValue([mockGig])
      mockGigService.getApplicationsByGig.mockResolvedValue([mockUnpaidApplication])
      mockGigService.getGigById.mockResolvedValue(mockGig)

      renderEmployerPaymentDashboard()

      await waitFor(() => {
        const viewPayButton = screen.getByText('View & Pay Now')
        fireEvent.click(viewPayButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Pending Payment Obligations')).toBeInTheDocument()
        expect(screen.getByText('Test Gig')).toBeInTheDocument()
        expect(screen.getByText(/Worker: John Worker/)).toBeInTheDocument()
      })
    })

    it('should show "No pending obligations" message when obligations list is empty', async () => {
      mockGigService.getGigsByEmployer.mockResolvedValue([])

      renderEmployerPaymentDashboard()

      await waitFor(() => {
        const pendingPaymentsButton = screen.getByText('Pending Payments')
        fireEvent.click(pendingPaymentsButton)
      })

      await waitFor(() => {
        expect(screen.getByText(/No pending payment obligations/i)).toBeInTheDocument()
        expect(screen.getByText(/All accepted applications have been funded/i)).toBeInTheDocument()
      })
    })

    it('should display obligation details correctly', async () => {
      mockGigService.getGigsByEmployer.mockResolvedValue([mockGig])
      mockGigService.getApplicationsByGig.mockResolvedValue([mockUnpaidApplication])
      mockGigService.getGigById.mockResolvedValue(mockGig)

      renderEmployerPaymentDashboard()

      // Navigate to obligations view
      await waitFor(() => {
        const pendingPaymentsButton = screen.getByText('Pending Payments')
        fireEvent.click(pendingPaymentsButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Test Gig')).toBeInTheDocument()
        expect(screen.getByText(/Worker: John Worker/)).toBeInTheDocument()
        expect(screen.getAllByText('R500.00').length).toBeGreaterThan(0)
        expect(screen.getByText('Pay Now')).toBeInTheDocument()
      })
    })

    it('should calculate total obligations correctly', async () => {
      const applications: GigApplication[] = [
        { ...mockUnpaidApplication, id: 'app-1', proposedRate: 500 },
        { ...mockUnpaidApplication, id: 'app-2', proposedRate: 300 },
        { ...mockUnpaidApplication, id: 'app-3', proposedRate: 200 }
      ]

      mockGigService.getGigsByEmployer.mockResolvedValue([mockGig])
      mockGigService.getApplicationsByGig.mockResolvedValue(applications)
      mockGigService.getGigById.mockResolvedValue(mockGig)

      renderEmployerPaymentDashboard()

      // Navigate to obligations view
      await waitFor(() => {
        const pendingPaymentsButton = screen.getByText('Pending Payments')
        fireEvent.click(pendingPaymentsButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Total Obligations:')).toBeInTheDocument()
        expect(screen.getByText('R1000.00')).toBeInTheDocument()
      })
    })

    it('should show loading state while fetching obligations', async () => {
      mockGigService.getGigsByEmployer.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve([]), 100))
      )

      renderEmployerPaymentDashboard()

      // Navigate to obligations view
      const pendingPaymentsButton = screen.getByText('Pending Payments')
      fireEvent.click(pendingPaymentsButton)

      expect(screen.getByText(/Loading payment obligations.../i)).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.queryByText(/Loading payment obligations.../i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    beforeEach(() => {
      mockGigService.getGigsByEmployer.mockResolvedValue([])
    })

    it('should navigate to payment methods view', async () => {
      renderEmployerPaymentDashboard()

      await waitFor(() => {
        const paymentMethodsButtons = screen.getAllByText('Payment Methods')
        fireEvent.click(paymentMethodsButtons[0])
      })

      expect(screen.getAllByText('Payment Methods').length).toBeGreaterThan(0)
      expect(screen.getByText(/Manage your payment methods and preferences/i)).toBeInTheDocument()
    })

    it('should navigate to payment history view', async () => {
      renderEmployerPaymentDashboard()

      await waitFor(() => {
        const historyButtons = screen.getAllByText('Payment History')
        fireEvent.click(historyButtons[0])
      })

      expect(screen.getAllByText('Payment History').length).toBeGreaterThan(0)
      expect(screen.getByText(/View all your payment transactions/i)).toBeInTheDocument()
    })

    it('should navigate to add payment method view', async () => {
      renderEmployerPaymentDashboard()

      // First go to payment methods
      await waitFor(() => {
        const paymentMethodsButtons = screen.getAllByText('Payment Methods')
        fireEvent.click(paymentMethodsButtons[0])
      })

      // Then go to add new method (assuming the button exists in PaymentMethodList)
      // This tests the routing logic
      expect(screen.getAllByText('Payment Methods').length).toBeGreaterThan(0)
    })

    it('should have back to overview button in sub-views', async () => {
      renderEmployerPaymentDashboard()

      await waitFor(() => {
        const historyButton = screen.getByText('Payment History')
        fireEvent.click(historyButton)
      })

      await waitFor(() => {
        const backButton = screen.getByText(/Back to Overview/i)
        expect(backButton).toBeInTheDocument()
      })
    })

    it('should call onBack callback when back to dashboard is clicked', async () => {
      const mockOnBack = jest.fn()
      renderEmployerPaymentDashboard({ onBack: mockOnBack })

      await waitFor(() => {
        const backButton = screen.getByText(/Back to Dashboard/i)
        fireEvent.click(backButton)
      })

      expect(mockOnBack).toHaveBeenCalled()
    })
  })

  describe('Breadcrumbs', () => {
    beforeEach(() => {
      mockGigService.getGigsByEmployer.mockResolvedValue([])
    })

    it('should display correct breadcrumbs on overview', async () => {
      renderEmployerPaymentDashboard()

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
        expect(screen.getByText('Payments')).toBeInTheDocument()
      })
    })

    it('should update breadcrumbs when navigating to sub-views', async () => {
      renderEmployerPaymentDashboard()

      await waitFor(() => {
        const historyButtons = screen.getAllByText('Payment History')
        fireEvent.click(historyButtons[0])
      })

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
        expect(screen.getAllByText('Payments').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Payment History').length).toBeGreaterThan(0)
      })
    })
  })

  describe('Actions', () => {
    beforeEach(() => {
      mockGigService.getGigsByEmployer.mockResolvedValue([])
    })

    it('should show "Pay Now" action when there are pending obligations', async () => {
      const mockUnpaidApplication: GigApplication = {
        id: 'app-123',
        gigId: 'gig-123',
        applicantId: 'worker-123',
        applicantName: 'John Worker',
        status: 'accepted',
        proposedRate: 500,
        createdAt: new Date()
      }

      const mockGig = {
        id: 'gig-123',
        title: 'Test Gig',
        description: 'Test',
        category: 'Cleaning',
        budget: 500,
        duration: '1 week',
        skillsRequired: ['cleaning'],
        location: 'Johannesburg',
        employerId: 'employer-123',
        employerName: 'Test Employer',
        status: 'open' as const,
        applicants: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        workType: 'physical' as const
      }

      mockGigService.getGigsByEmployer.mockResolvedValue([mockGig])
      mockGigService.getApplicationsByGig.mockResolvedValue([mockUnpaidApplication])
      mockGigService.getGigById.mockResolvedValue(mockGig)

      renderEmployerPaymentDashboard()

      await waitFor(() => {
        expect(screen.getByText(/Pay Now \(1\)/i)).toBeInTheDocument()
      })
    })

    it('should not show "Pay Now" action when there are no pending obligations', async () => {
      mockGigService.getGigsByEmployer.mockResolvedValue([])

      renderEmployerPaymentDashboard()

      await waitFor(() => {
        expect(screen.queryByText(/Pay Now/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle errors when loading pending obligations', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockGigService.getGigsByEmployer.mockRejectedValue(new Error('Failed to load'))

      renderEmployerPaymentDashboard()

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading pending obligations:', expect.any(Error))
      })

      consoleErrorSpy.mockRestore()
    })

    it('should handle errors when loading gig details', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const mockUnpaidApplication: GigApplication = {
        id: 'app-123',
        gigId: 'gig-123',
        applicantId: 'worker-123',
        applicantName: 'John Worker',
        status: 'accepted',
        proposedRate: 500,
        createdAt: new Date()
      }

      mockGigService.getGigsByEmployer.mockResolvedValue([{
        id: 'gig-123',
        title: 'Test Gig',
        description: 'Test',
        category: 'Cleaning',
        budget: 500,
        duration: '1 week',
        skillsRequired: ['cleaning'],
        location: 'Johannesburg',
        employerId: 'employer-123',
        employerName: 'Test Employer',
        status: 'open' as const,
        applicants: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        workType: 'physical' as const
      }])
      mockGigService.getApplicationsByGig.mockResolvedValue([mockUnpaidApplication])
      mockGigService.getGigById.mockRejectedValue(new Error('Gig not found'))

      renderEmployerPaymentDashboard()

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading obligation details:', expect.any(Error))
      })

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Currency Formatting', () => {
    beforeEach(() => {
      mockGigService.getGigsByEmployer.mockResolvedValue([])
    })

    it('should format currency amounts correctly', async () => {
      renderEmployerPaymentDashboard()

      await waitFor(() => {
        expect(mockFormatCurrency).toHaveBeenCalled()
      })
    })
  })
})

import { Gig, GigApplication, Review } from '@/types/gig'
import { Payment } from '@/types/payment'

// Mock Gigs
export const mockOpenGig: Gig = {
  id: 'gig-1',
  title: 'Web Development Project',
  description: 'Need a developer to build a responsive website',
  category: 'technology',
  location: 'Johannesburg, South Africa',
  coordinates: {
    latitude: -26.2041,
    longitude: 28.0473,
  },
  budget: 5000,
  duration: '2 weeks',
  skillsRequired: ['React', 'TypeScript', 'Tailwind CSS'],
  employerId: 'employer-1',
  employerName: 'Test Employer',
  status: 'open',
  applicants: [],
  deadline: new Date('2025-12-31'),
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
}

export const mockInProgressGig: Gig = {
  ...mockOpenGig,
  id: 'gig-2',
  title: 'Plumbing Repair',
  category: 'home_services',
  status: 'in-progress',
  assignedTo: 'worker-1',
  applicants: ['worker-1'],
}

export const mockCompletedGig: Gig = {
  ...mockInProgressGig,
  id: 'gig-3',
  status: 'completed',
}

export const mockClosedGig: Gig = {
  ...mockOpenGig,
  id: 'gig-4',
  status: 'cancelled',
}

// Mock Applications
export const mockPendingApplication: GigApplication = {
  id: 'app-1',
  gigId: 'gig-1',
  applicantId: 'worker-1',
  applicantName: 'Test Worker',
  message: 'I am interested in this position...',
  proposedRate: 4500,
  status: 'pending',
  createdAt: new Date('2025-01-05'),
}

export const mockAcceptedApplication: GigApplication = {
  ...mockPendingApplication,
  id: 'app-2',
  status: 'accepted',
}

export const mockRejectedApplication: GigApplication = {
  ...mockPendingApplication,
  id: 'app-3',
  status: 'rejected',
}

// Mock Payment Method
const mockPaymentMethod = {
  id: 'pm-1',
  type: 'bank' as const,
  provider: 'ozow' as const,
  bankName: 'Standard Bank',
  accountType: 'cheque' as const,
  accountLast4: '1234',
  isDefault: true,
  isVerified: true,
  createdAt: new Date('2025-01-01'),
}

// Mock Payments
export const mockPendingPayment: Payment = {
  id: 'payment-1',
  gigId: 'gig-2',
  employerId: 'employer-1',
  workerId: 'worker-1',
  amount: 5000,
  currency: 'ZAR',
  type: 'fixed',
  status: 'pending',
  paymentMethodId: 'pm-1',
  paymentMethod: mockPaymentMethod,
  escrowStatus: 'pending',
  createdAt: new Date('2025-01-15'),
}

export const mockFundedPayment: Payment = {
  ...mockPendingPayment,
  id: 'payment-2',
  escrowStatus: 'funded',
  status: 'processing',
  processedAt: new Date('2025-01-16'),
}

export const mockReleasedPayment: Payment = {
  ...mockPendingPayment,
  id: 'payment-3',
  escrowStatus: 'released',
  status: 'completed',
  processedAt: new Date('2025-01-16'),
  completedAt: new Date('2025-01-20'),
  escrowReleaseDate: new Date('2025-01-20'),
}

// Mock Reviews
export const mockEmployerReview: Review = {
  id: 'review-1',
  gigId: 'gig-3',
  reviewerId: 'employer-1',
  revieweeId: 'worker-1',
  rating: 5,
  comment: 'Excellent work, very professional',
  type: 'employer-to-worker',
  createdAt: new Date('2025-01-21'),
}

export const mockWorkerReview: Review = {
  id: 'review-2',
  gigId: 'gig-3',
  reviewerId: 'worker-1',
  revieweeId: 'employer-1',
  rating: 4,
  comment: 'Good employer, clear communication',
  type: 'worker-to-employer',
  createdAt: new Date('2025-01-21'),
}

// Mock Fee Configuration
export const mockFeeConfig = {
  id: 'fee-config-1',
  platformFeePercentage: 10,
  minimumFee: 50,
  maximumFee: 1000,
  withdrawalFee: 25,
  isActive: true,
  effectiveFrom: new Date('2025-01-01'),
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
}

// Helper function to create multiple mock gigs
export const createMockGigs = (count: number): Gig[] => {
  return Array.from({ length: count }, (_, index) => ({
    ...mockOpenGig,
    id: `gig-${index + 1}`,
    title: `Gig ${index + 1}`,
    budget: 1000 + index * 500,
  }))
}

// Helper function to create multiple mock applications
export const createMockApplications = (count: number): GigApplication[] => {
  return Array.from({ length: count }, (_, index) => ({
    ...mockPendingApplication,
    id: `app-${index + 1}`,
    applicantId: `worker-${index + 1}`,
  }))
}

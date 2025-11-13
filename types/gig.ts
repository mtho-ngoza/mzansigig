import { Coordinates } from './location'

export interface Gig {
  id: string
  title: string
  description: string
  category: string
  location: string
  coordinates?: Coordinates
  budget: number
  duration: string
  skillsRequired: string[]
  employerId: string
  employerName: string
  status: 'open' | 'in-progress' | 'completed' | 'cancelled' | 'reviewing'
  applicants: string[]
  assignedTo?: string
  createdAt: Date
  updatedAt: Date
  deadline?: Date
  isRemote?: boolean
  maxTravelDistance?: number
  maxApplicants?: number // Maximum number of applicants employer wants to review
}

export interface GigApplication {
  id: string
  gigId: string
  applicantId: string
  applicantName: string
  message?: string // Optional brief message from applicant
  proposedRate: number
  status: 'pending' | 'accepted' | 'rejected' | 'funded' | 'completed' | 'withdrawn'
  paymentStatus?: 'unpaid' | 'paid' | 'in_escrow' | 'released' | 'disputed'
  paymentId?: string // Reference to the payment record
  createdAt: Date
  // Worker completion request fields
  completionRequestedAt?: Date // When worker requested completion
  completionRequestedBy?: 'worker' | 'employer' // Who initiated completion request
  completionAutoReleaseAt?: Date // When escrow will auto-release if no employer response
  completionDisputedAt?: Date // If employer disputed the completion request
  completionDisputeReason?: string // Employer's reason for disputing
}

export interface Review {
  id: string
  gigId: string
  reviewerId: string
  revieweeId: string
  rating: number
  comment: string
  type: 'employer-to-worker' | 'worker-to-employer'
  createdAt: Date
}
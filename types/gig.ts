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
  workType: 'remote' | 'physical' | 'hybrid' // Clear work type classification
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
  acceptedAt?: Date // When application was accepted (for funding timeout tracking)
  // Worker completion request fields
  completionRequestedAt?: Date // When worker requested completion
  completionRequestedBy?: 'worker' | 'employer' // Who initiated completion request
  completionAutoReleaseAt?: Date // When escrow will auto-release if no employer response
  completionDisputedAt?: Date // If employer disputed the completion request
  completionDisputeReason?: string // Employer's reason for disputing
  // Admin dispute resolution fields
  completionResolvedAt?: Date // When admin resolved the dispute
  completionResolvedBy?: string // Admin ID who resolved the dispute
  completionResolution?: 'approved' | 'rejected' // Admin's ruling (approved = worker wins, rejected = employer wins)
  completionResolutionNotes?: string // Admin's explanation of the resolution
  // Safety check-in fields (for physical gigs)
  checkInAt?: Date // When worker checked in at work location
  checkInLocation?: Coordinates // GPS coordinates of check-in
  checkOutAt?: Date // When worker checked out
  checkOutLocation?: Coordinates // GPS coordinates of check-out
  lastSafetyCheckAt?: Date // Last time worker confirmed they're safe
  missedSafetyChecks?: number // Number of missed safety check-ins
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
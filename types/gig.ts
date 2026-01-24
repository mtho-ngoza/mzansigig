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

// Rate negotiation history entry
export interface RateHistoryEntry {
  amount: number
  by: 'worker' | 'employer'
  at: Date
  note?: string // Optional message explaining the rate change
}

export interface GigApplication {
  id: string
  gigId: string
  applicantId: string
  applicantName: string
  message?: string // Optional brief message from applicant
  proposedRate: number // Initial rate proposed by worker
  gigBudget?: number // Original gig budget (denormalized for easy access)
  employerId?: string // ID of the gig employer (for efficient queries)

  // Rate negotiation fields
  agreedRate?: number // Final agreed rate (set when both parties confirm)
  rateStatus: 'proposed' | 'countered' | 'agreed' // Track negotiation state
  lastRateUpdate?: {
    amount: number
    by: 'worker' | 'employer'
    at: Date
    note?: string
  }
  rateHistory?: RateHistoryEntry[] // Full history of rate changes

  // Structured application fields (for physical work)
  experience?: string // Years of experience (e.g., "1-3", "5-10")
  availability?: string // When they can start (e.g., "immediately", "within-week")
  equipment?: string // Equipment ownership (e.g., "fully-equipped", "no-equipment")

  // Application status: pending (new), accepted (rate agreed), rejected (declined),
  // funded (escrow paid), completed (work done), withdrawn (worker withdrew)
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
  // Mutual review reveal - reviews only visible after both parties submit
  isRevealed: boolean // Whether this review is visible to the reviewee
  counterReviewId?: string // Reference to the other party's review (for mutual reveal)
  // Review deadline - 30 days from gig completion
  reviewDeadline: Date // Deadline for submitting reviews (30 days from completion)
}
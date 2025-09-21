export interface Gig {
  id: string
  title: string
  description: string
  category: string
  location: string
  budget: number
  duration: string
  skillsRequired: string[]
  employerId: string
  employerName: string
  status: 'open' | 'in-progress' | 'completed' | 'cancelled'
  applicants: string[]
  assignedTo?: string
  createdAt: Date
  updatedAt: Date
  deadline?: Date
}

export interface GigApplication {
  id: string
  gigId: string
  applicantId: string
  applicantName: string
  coverLetter: string
  proposedRate: number
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: Date
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
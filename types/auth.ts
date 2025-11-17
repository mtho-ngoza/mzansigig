import { Coordinates, UserLocation, LocationPreferences } from './location'

export interface EmergencyContact {
  id: string
  name: string
  phone: string
  relationship: string
  isPrimary: boolean
  createdAt: Date
}

export interface SafetyPreferences {
  emergencyContacts: EmergencyContact[]
  preferredMeetingTypes: 'public_only' | 'any'
  shareLocationWithContacts: boolean
  allowCheckInReminders: boolean
  allowSafetyNotifications: boolean
}

export interface VerificationDocument {
  id: string
  userId: string
  type: 'sa_id' | 'passport' | 'drivers_license' | 'proof_of_address' | 'bank_statement' | 'employment_letter' | 'reference_letter'
  verificationLevel: 'basic' | 'enhanced' | 'premium'
  status: 'draft' | 'pending' | 'verified' | 'rejected'
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  submittedAt: Date
  verifiedAt?: Date
  rejectedAt?: Date
  notes?: string
  reviewedBy?: string
  verificationAttempt?: {
    confidence: number
    issues: string[]
    ocrExtractedText?: string
    attemptedAt: Date
  }
}

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
  location: string
  coordinates?: Coordinates
  locationData?: UserLocation
  locationPreferences?: LocationPreferences
  userType: 'job-seeker' | 'employer' | 'admin'
  workSector?: 'professional' | 'informal'
  idNumber?: string // Encrypted ID number (POPIA compliance)
  idNumberHash?: string // Hash for duplicate detection without storing plaintext
  rating?: number
  reviewCount?: number
  completedGigs?: number
  skills?: string[]
  badges?: string[]
  bio?: string
  profilePhoto?: string
  portfolio?: PortfolioItem[]
  experience?: string
  hourlyRate?: number
  availability?: string
  languages?: string[]
  education?: string
  certifications?: string[]
  // Informal worker specific fields
  experienceYears?: 'less-than-1' | '1-3' | '3-5' | '5-10' | '10-plus'
  equipmentOwnership?: 'fully-equipped' | 'partially-equipped' | 'no-equipment'
  socialLinks?: {
    linkedin?: string
    website?: string
    github?: string
  }
  profileCompleteness?: number
  isVerified?: boolean
  verificationLevel?: 'basic' | 'enhanced' | 'premium'
  backgroundCheckStatus?: 'none' | 'pending' | 'verified' | 'failed'
  trustScore?: number
  safetyPreferences?: SafetyPreferences
  verificationDocuments?: VerificationDocument[]
  lastSafetyUpdate?: Date
  // Wallet/earnings fields
  walletBalance?: number // Available funds that can be withdrawn
  pendingBalance?: number // Funds held in escrow
  totalEarnings?: number // Lifetime earnings
  totalWithdrawn?: number // Total amount withdrawn
  // Legal consents (POPIA compliance - audit trail)
  consents?: {
    terms: { accepted: boolean; acceptedAt: Date; version: string }
    privacy: { accepted: boolean; acceptedAt: Date; version: string }
    popia: { accepted: boolean; acceptedAt: Date; version: string }
  }
  createdAt: Date
  updatedAt?: Date
}

export interface PortfolioItem {
  id: string
  title: string
  description: string
  imageUrl?: string
  projectUrl?: string
  technologies?: string[]
  category: string
  completedAt: Date
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
  phone: string
  location: string
  coordinates?: Coordinates
  userType: 'job-seeker' | 'employer' | 'admin'
  workSector?: 'professional' | 'informal'
  idNumber: string
  // Legal consents (required for POPIA compliance)
  acceptTerms: boolean
  acceptPrivacy: boolean
  acceptPopia: boolean
}
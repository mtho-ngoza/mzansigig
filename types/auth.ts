import { Coordinates, UserLocation, LocationPreferences } from './location'

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
  userType: 'job-seeker' | 'employer'
  workSector?: 'professional' | 'informal'
  idNumber?: string
  rating?: number
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
  userType: 'job-seeker' | 'employer'
  workSector?: 'professional' | 'informal'
  idNumber?: string
}
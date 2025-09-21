export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
  location: string
  userType: 'job-seeker' | 'employer'
  idNumber?: string
  rating?: number
  completedGigs?: number
  skills?: string[]
  badges?: string[]
  bio?: string
  createdAt: Date
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
  userType: 'job-seeker' | 'employer'
  idNumber?: string
}
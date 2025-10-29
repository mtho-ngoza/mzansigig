import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { AuthContext, AuthContextType } from '@/contexts/AuthContext'
import { LocationContext, LocationContextType } from '@/contexts/LocationContext'
import { User } from '@/types/auth'

// Mock user data for tests
export const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  phone: '+27123456789',
  location: 'Johannesburg, South Africa',
  coordinates: {
    latitude: -26.2041,
    longitude: 28.0473,
  },
  userType: 'job-seeker',
  isVerified: true,
  trustScore: 85,
  profilePhoto: 'https://example.com/avatar.jpg',
  bio: 'Test user bio',
  skills: ['JavaScript', 'React', 'TypeScript'],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

export const mockEmployer: User = {
  ...mockUser,
  id: 'test-employer-id',
  email: 'employer@example.com',
  userType: 'employer',
}

// Mock authentication context
export const mockAuthContextValue: AuthContextType = {
  user: mockUser,
  isLoading: false,
  isAuthenticated: true,
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  updateUser: jest.fn(),
  refreshUser: jest.fn(),
}

// Mock location context
export const mockLocationContextValue: LocationContextType = {
  userLocation: {
    current: { latitude: -26.2041, longitude: 28.0473 },
    preferred: {
      name: 'Johannesburg',
      coordinates: { latitude: -26.2041, longitude: 28.0473 },
      address: 'Johannesburg, South Africa',
      city: 'Johannesburg',
      province: 'Gauteng',
      country: 'South Africa',
    },
    allowLocationAccess: true,
    lastUpdated: new Date(),
  },
  currentCoordinates: { latitude: -26.2041, longitude: 28.0473 },
  locationPermissionGranted: true,
  isLoadingLocation: false,
  locationFilter: null,
  radiusKm: 50,
  showLocationFilters: false,
  requestLocationPermission: jest.fn(),
  refreshLocation: jest.fn(),
  clearLocation: jest.fn(),
  setLocationFilter: jest.fn(),
  setRadiusKm: jest.fn(),
  setShowLocationFilters: jest.fn(),
  getEffectiveCoordinates: jest.fn(),
  isLocationFilterActive: jest.fn(),
}

// Custom render with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authContext?: Partial<AuthContextType>
  locationContext?: Partial<LocationContextType>
}

export function renderWithProviders(
  ui: ReactElement,
  {
    authContext = {},
    locationContext = {},
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  const authValue = { ...mockAuthContextValue, ...authContext }
  const locationValue = { ...mockLocationContextValue, ...locationContext }

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AuthContext.Provider value={authValue}>
        <LocationContext.Provider value={locationValue}>
          {children}
        </LocationContext.Provider>
      </AuthContext.Provider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Test data builders using given_when_then pattern
export const givenAnAuthenticatedUser = (overrides?: Partial<User>): User => ({
  ...mockUser,
  ...overrides,
})

export const givenAnUnauthenticatedContext = (): Partial<AuthContextType> => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,
})

export const givenALoadingAuthContext = (): Partial<AuthContextType> => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
})

export const givenAnEmployer = (overrides?: Partial<User>): User => ({
  ...mockEmployer,
  ...overrides,
})

export const givenAJobSeeker = (overrides?: Partial<User>): User => ({
  ...mockUser,
  userType: 'job-seeker',
  ...overrides,
})

// Helper to wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// Helper for mocking Firebase Firestore responses
export const mockFirestoreDoc = (data: any) => ({
  exists: () => true,
  data: () => data,
  id: data.id || 'mock-id',
})

export const mockFirestoreQuerySnapshot = (docs: any[]) => ({
  empty: docs.length === 0,
  size: docs.length,
  docs: docs.map(data => mockFirestoreDoc(data)),
  forEach: (callback: (doc: any) => void) => {
    docs.forEach(data => callback(mockFirestoreDoc(data)))
  },
})

// Re-export everything from React Testing Library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'

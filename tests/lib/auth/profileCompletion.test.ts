import { isProfileComplete } from '@/lib/auth/firebase'
import { User } from '@/types/auth'

describe('isProfileComplete', () => {
  const completeUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+27123456789',
    location: 'Cape Town',
    userType: 'job-seeker',
    idNumber: '8001015009082',
    createdAt: new Date()
  }

  it('should return true for user with all required fields', () => {
    expect(isProfileComplete(completeUser)).toBe(true)
  })

  it('should return false for null user', () => {
    expect(isProfileComplete(null)).toBe(false)
  })

  it('should return false when phone is missing', () => {
    const user = { ...completeUser, phone: '' }
    expect(isProfileComplete(user)).toBe(false)
  })

  it('should return false when location is missing', () => {
    const user = { ...completeUser, location: '' }
    expect(isProfileComplete(user)).toBe(false)
  })

  it('should return false when userType is missing', () => {
    const user = { ...completeUser, userType: undefined as any }
    expect(isProfileComplete(user)).toBe(false)
  })

  it('should return false when idNumber is missing', () => {
    const user = { ...completeUser, idNumber: undefined }
    expect(isProfileComplete(user)).toBe(false)
  })

  it('should return false when idNumber is empty string', () => {
    const user = { ...completeUser, idNumber: '' }
    expect(isProfileComplete(user)).toBe(false)
  })

  it('should return true for employer with all required fields', () => {
    const employer: User = {
      ...completeUser,
      userType: 'employer'
    }
    expect(isProfileComplete(employer)).toBe(true)
  })

  it('should return false for Google signup user without completed profile', () => {
    const googleUser: User = {
      id: 'google-123',
      email: 'google@gmail.com',
      firstName: 'Google',
      lastName: 'User',
      phone: '',
      location: '',
      userType: 'job-seeker',
      createdAt: new Date()
    }
    expect(isProfileComplete(googleUser)).toBe(false)
  })
})

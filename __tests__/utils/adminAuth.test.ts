/**
 * Tests for Admin Authentication Utilities
 */

import { isAdmin, requireAdmin, canAccessAdminFeatures, getAdminUsers } from '@/lib/utils/adminAuth'
import { User } from '@/types/auth'

describe('Admin Authentication Utilities', () => {
  const mockJobSeeker: User = {
    id: 'user-1',
    email: 'worker@example.com',
    firstName: 'John',
    lastName: 'Worker',
    phone: '0821234567',
    location: 'Johannesburg',
    userType: 'job-seeker',
    createdAt: new Date()
  }

  const mockEmployer: User = {
    id: 'user-2',
    email: 'employer@example.com',
    firstName: 'Jane',
    lastName: 'Employer',
    phone: '0827654321',
    location: 'Cape Town',
    userType: 'employer',
    createdAt: new Date()
  }

  const mockAdmin: User = {
    id: 'admin-1',
    email: 'admin@kasigig.co.za',
    firstName: 'Admin',
    lastName: 'User',
    phone: '0821111111',
    location: 'Pretoria',
    userType: 'admin',
    createdAt: new Date()
  }

  describe('isAdmin', () => {
    it('should return true for admin user', () => {
      expect(isAdmin(mockAdmin)).toBe(true)
    })

    it('should return false for job-seeker', () => {
      expect(isAdmin(mockJobSeeker)).toBe(false)
    })

    it('should return false for employer', () => {
      expect(isAdmin(mockEmployer)).toBe(false)
    })

    it('should return false for null user', () => {
      expect(isAdmin(null)).toBe(false)
    })
  })

  describe('requireAdmin', () => {
    it('should not throw for admin user', () => {
      expect(() => requireAdmin(mockAdmin)).not.toThrow()
    })

    it('should throw for job-seeker', () => {
      expect(() => requireAdmin(mockJobSeeker)).toThrow('Admin access required')
    })

    it('should throw for employer', () => {
      expect(() => requireAdmin(mockEmployer)).toThrow('Admin access required')
    })

    it('should throw for null user', () => {
      expect(() => requireAdmin(null)).toThrow('Authentication required')
    })
  })

  describe('canAccessAdminFeatures', () => {
    it('should return true for admin user', () => {
      expect(canAccessAdminFeatures(mockAdmin)).toBe(true)
    })

    it('should return false for job-seeker', () => {
      expect(canAccessAdminFeatures(mockJobSeeker)).toBe(false)
    })

    it('should return false for employer', () => {
      expect(canAccessAdminFeatures(mockEmployer)).toBe(false)
    })

    it('should return false for null user', () => {
      expect(canAccessAdminFeatures(null)).toBe(false)
    })
  })

  describe('getAdminUsers', () => {
    it('should be defined', () => {
      expect(getAdminUsers).toBeDefined()
    })

    // Note: Full integration test requires Firebase setup
    // This is tested in integration tests with Firebase emulator
  })
})

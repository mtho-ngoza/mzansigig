import { ProfileService } from '@/lib/database/profileService'
import { uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { User, PortfolioItem } from '@/types/auth'

// Mock Firebase
jest.mock('firebase/storage')
jest.mock('firebase/firestore')
jest.mock('@/lib/firebase', () => ({
  storage: {},
  db: {}
}))

const mockUploadBytes = uploadBytes as jest.MockedFunction<typeof uploadBytes>
const mockGetDownloadURL = getDownloadURL as jest.MockedFunction<typeof getDownloadURL>
const mockDeleteObject = deleteObject as jest.MockedFunction<typeof deleteObject>
const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>

describe('ProfileService - Upload Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('uploadProfilePhoto', () => {
    const userId = 'test-user-123'
    const validFile = new File(
      [new ArrayBuffer(2 * 1024 * 1024)],
      'profile.jpg',
      { type: 'image/jpeg' }
    )

    it('should upload profile photo successfully', async () => {
      const mockDownloadURL = 'https://storage.example.com/profile-photos/test-user-123-profile.jpg'

      mockUploadBytes.mockResolvedValueOnce({} as any)
      mockGetDownloadURL.mockResolvedValueOnce(mockDownloadURL)
      mockUpdateDoc.mockResolvedValueOnce()

      const result = await ProfileService.uploadProfilePhoto(userId, validFile)

      expect(result).toBe(mockDownloadURL)
      expect(mockUploadBytes).toHaveBeenCalledTimes(1)
      expect(mockGetDownloadURL).toHaveBeenCalledTimes(1)

      const updateCall = mockUpdateDoc.mock.calls[0]
      expect(updateCall[1]).toMatchObject({
        profilePhoto: mockDownloadURL
      })
    })

    it('should reject files larger than 5MB', async () => {
      const largeFile = new File(
        [new ArrayBuffer(6 * 1024 * 1024)],
        'large.jpg',
        { type: 'image/jpeg' }
      )

      await expect(ProfileService.uploadProfilePhoto(userId, largeFile))
        .rejects.toThrow('File size must be less than 5MB')
    })

    it('should reject invalid file types', async () => {
      const pdfFile = new File(
        [new ArrayBuffer(1 * 1024 * 1024)],
        'document.pdf',
        { type: 'application/pdf' }
      )

      await expect(ProfileService.uploadProfilePhoto(userId, pdfFile))
        .rejects.toThrow('Only JPEG and PNG images are allowed')
    })

    it('should handle upload errors gracefully', async () => {
      mockUploadBytes.mockRejectedValueOnce(new Error('Storage error'))

      await expect(ProfileService.uploadProfilePhoto(userId, validFile))
        .rejects.toThrow('Storage error')
    })

    it('should reject files with path traversal attempts in filename', async () => {
      const maliciousFile = new File(
        [new ArrayBuffer(2 * 1024 * 1024)],
        '../../../etc/passwd.jpg',
        { type: 'image/jpeg' }
      )

      await expect(ProfileService.uploadProfilePhoto(userId, maliciousFile))
        .rejects.toThrow('Invalid file extension detected')
    })

    it('should reject files with invalid extensions', async () => {
      const invalidFile = new File(
        [new ArrayBuffer(2 * 1024 * 1024)],
        'file.exe',
        { type: 'image/jpeg' }
      )

      await expect(ProfileService.uploadProfilePhoto(userId, invalidFile))
        .rejects.toThrow('Invalid file extension. Only JPG and PNG files are allowed')
    })

    it('should handle files with multiple dots in filename', async () => {
      const validComplexFile = new File(
        [new ArrayBuffer(2 * 1024 * 1024)],
        'my.profile.photo.jpg',
        { type: 'image/jpeg' }
      )

      mockUploadBytes.mockResolvedValueOnce({} as any)
      mockGetDownloadURL.mockResolvedValueOnce('https://storage.example.com/url.jpg')
      mockUpdateDoc.mockResolvedValueOnce()

      await expect(ProfileService.uploadProfilePhoto(userId, validComplexFile))
        .resolves.toBeDefined()
    })
  })

  describe('uploadPortfolioImage', () => {
    const userId = 'test-user-123'
    const validFile = new File(
      [new ArrayBuffer(2 * 1024 * 1024)],
      'portfolio-image.png',
      { type: 'image/png' }
    )

    it('should upload portfolio image successfully', async () => {
      const mockDownloadURL = 'https://storage.example.com/portfolio/test-user-123-uuid.png'

      mockUploadBytes.mockResolvedValueOnce({} as any)
      mockGetDownloadURL.mockResolvedValueOnce(mockDownloadURL)

      const result = await ProfileService.uploadPortfolioImage(userId, validFile)

      expect(result).toBe(mockDownloadURL)
      expect(mockUploadBytes).toHaveBeenCalledTimes(1)
      expect(mockGetDownloadURL).toHaveBeenCalledTimes(1)
    })

    it('should reject files larger than 5MB', async () => {
      const largeFile = new File(
        [new ArrayBuffer(6 * 1024 * 1024)],
        'large.png',
        { type: 'image/png' }
      )

      await expect(ProfileService.uploadPortfolioImage(userId, largeFile))
        .rejects.toThrow('File size must be less than 5MB')
    })

    it('should handle upload errors', async () => {
      mockUploadBytes.mockRejectedValueOnce(new Error('Network error'))

      await expect(ProfileService.uploadPortfolioImage(userId, validFile))
        .rejects.toThrow('Network error')
    })

    it('should reject files with path traversal attempts', async () => {
      const maliciousFile = new File(
        [new ArrayBuffer(2 * 1024 * 1024)],
        '../../malicious.png',
        { type: 'image/png' }
      )

      await expect(ProfileService.uploadPortfolioImage(userId, maliciousFile))
        .rejects.toThrow('Invalid file extension detected')
    })

    it('should reject files with backslash path traversal', async () => {
      const maliciousFile = new File(
        [new ArrayBuffer(2 * 1024 * 1024)],
        '..\\..\\malicious.jpg',
        { type: 'image/jpeg' }
      )

      await expect(ProfileService.uploadPortfolioImage(userId, maliciousFile))
        .rejects.toThrow('Invalid file extension detected')
    })
  })

  describe('addPortfolioItem', () => {
    const userId = 'test-user-123'
    const portfolioData: Omit<PortfolioItem, 'id'> = {
      title: 'Test Project',
      description: 'A great project',
      imageUrl: 'https://example.com/image.jpg',
      category: 'web-development',
      completedAt: new Date('2024-01-01')
    }

    it('should add portfolio item successfully', async () => {
      const mockUser: User = {
        id: userId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '+27123456789',
        location: 'Johannesburg',
        userType: 'job-seeker',
        createdAt: new Date(),
        portfolio: []
      }

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => mockUser
      } as any)
      mockUpdateDoc.mockResolvedValueOnce()

      await ProfileService.addPortfolioItem(userId, portfolioData)

      expect(mockGetDoc).toHaveBeenCalledTimes(1)

      const updateCall = mockUpdateDoc.mock.calls[0]
      const portfolio = (updateCall[1] as Record<string, any>).portfolio
      expect(portfolio).toHaveLength(1)
      expect(portfolio[0]).toMatchObject({
        title: 'Test Project'
      })
      expect(portfolio[0].id).toBeDefined()
    })

    it('should throw error when user not found', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false
      } as any)

      await expect(ProfileService.addPortfolioItem(userId, portfolioData))
        .rejects.toThrow('User not found')
    })

    it('should add to existing portfolio', async () => {
      const existingPortfolio: PortfolioItem[] = [
        {
          id: 'existing-1',
          title: 'Existing Project',
          description: 'Desc',
          imageUrl: 'url',
          category: 'web-development',
          completedAt: new Date()
        }
      ]

      const mockUser: User = {
        id: userId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '+27123456789',
        location: 'Johannesburg',
        userType: 'job-seeker',
        createdAt: new Date(),
        portfolio: existingPortfolio
      }

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => mockUser
      } as any)
      mockUpdateDoc.mockResolvedValueOnce()

      await ProfileService.addPortfolioItem(userId, portfolioData)

      const updateCall = mockUpdateDoc.mock.calls[0]
      const portfolio = (updateCall[1] as Record<string, any>).portfolio
      expect(portfolio).toHaveLength(2)
      expect(portfolio[0].id).toBe('existing-1')
      expect(portfolio[1].title).toBe('Test Project')
    })
  })

  describe('updatePortfolioItem', () => {
    const userId = 'test-user-123'
    const portfolioId = 'portfolio-1'
    const updates: Partial<PortfolioItem> = {
      title: 'Updated Title',
      description: 'Updated description'
    }

    it('should update portfolio item successfully', async () => {
      const mockUser: User = {
        id: userId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '+27123456789',
        location: 'Johannesburg',
        userType: 'job-seeker',
        createdAt: new Date(),
        portfolio: [
          {
            id: portfolioId,
            title: 'Original Title',
            description: 'Original description',
            imageUrl: 'url',
            category: 'web-development',
            completedAt: new Date()
          }
        ]
      }

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => mockUser
      } as any)
      mockUpdateDoc.mockResolvedValueOnce()

      await ProfileService.updatePortfolioItem(userId, portfolioId, updates)

      const updateCall = mockUpdateDoc.mock.calls[0]
      const portfolio = (updateCall[1] as Record<string, any>).portfolio
      expect(portfolio[0]).toMatchObject({
        id: portfolioId,
        title: 'Updated Title',
        description: 'Updated description'
      })
    })

    it('should throw error when user not found', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false
      } as any)

      await expect(ProfileService.updatePortfolioItem(userId, portfolioId, updates))
        .rejects.toThrow('User not found')
    })
  })

  describe('deletePortfolioItem', () => {
    const userId = 'test-user-123'
    const portfolioId = 'portfolio-1'

    it('should delete portfolio item and its image', async () => {
      const mockUser: User = {
        id: userId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '+27123456789',
        location: 'Johannesburg',
        userType: 'job-seeker',
        createdAt: new Date(),
        portfolio: [
          {
            id: portfolioId,
            title: 'Project',
            description: 'Desc',
            imageUrl: 'https://storage.example.com/portfolio/image.jpg',
            category: 'web-development',
            completedAt: new Date()
          }
        ]
      }

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => mockUser
      } as any)
      mockDeleteObject.mockResolvedValueOnce()
      mockUpdateDoc.mockResolvedValueOnce()

      await ProfileService.deletePortfolioItem(userId, portfolioId)

      expect(mockDeleteObject).toHaveBeenCalledTimes(1)

      const updateCall = mockUpdateDoc.mock.calls[0]
      expect((updateCall[1] as Record<string, any>).portfolio).toEqual([])
    })

    it('should handle image deletion failure gracefully', async () => {
      const mockUser: User = {
        id: userId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '+27123456789',
        location: 'Johannesburg',
        userType: 'job-seeker',
        createdAt: new Date(),
        portfolio: [
          {
            id: portfolioId,
            title: 'Project',
            description: 'Desc',
            imageUrl: 'https://storage.example.com/portfolio/image.jpg',
            category: 'web-development',
            completedAt: new Date()
          }
        ]
      }

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => mockUser
      } as any)
      mockDeleteObject.mockRejectedValueOnce(new Error('Image not found'))
      mockUpdateDoc.mockResolvedValueOnce()

      // Should not throw - should handle gracefully
      await ProfileService.deletePortfolioItem(userId, portfolioId)

      expect(mockUpdateDoc).toHaveBeenCalled()
    })

    it('should delete item without image', async () => {
      const mockUser: User = {
        id: userId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '+27123456789',
        location: 'Johannesburg',
        userType: 'job-seeker',
        createdAt: new Date(),
        portfolio: [
          {
            id: portfolioId,
            title: 'Project',
            description: 'Desc',
            imageUrl: '',
            category: 'web-development',
            completedAt: new Date()
          }
        ]
      }

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => mockUser
      } as any)
      mockUpdateDoc.mockResolvedValueOnce()

      await ProfileService.deletePortfolioItem(userId, portfolioId)

      expect(mockDeleteObject).not.toHaveBeenCalled()
      expect(mockUpdateDoc).toHaveBeenCalled()
    })

    it('should throw error when user not found', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false
      } as any)

      await expect(ProfileService.deletePortfolioItem(userId, portfolioId))
        .rejects.toThrow('User not found')
    })
  })

  describe('updateProfile', () => {
    const userId = 'test-user-123'

    it('should update profile with valid data', async () => {
      const updates: Partial<User> = {
        bio: 'New bio',
        skills: ['JavaScript', 'React'],
        hourlyRate: 500
      }

      mockUpdateDoc.mockResolvedValueOnce()

      await ProfileService.updateProfile(userId, updates)

      const updateCall = mockUpdateDoc.mock.calls[0]
      expect(updateCall[1]).toMatchObject({
        bio: 'New bio',
        skills: ['JavaScript', 'React'],
        hourlyRate: 500
      })
    })

    it('should filter out undefined and null values', async () => {
      const updates: Partial<User> = {
        bio: 'New bio',
        skills: undefined,
        hourlyRate: null as any
      }

      mockUpdateDoc.mockResolvedValueOnce()

      await ProfileService.updateProfile(userId, updates)

      const callArgs = mockUpdateDoc.mock.calls[0][1] as any
      expect(callArgs.bio).toBe('New bio')
      expect(callArgs).not.toHaveProperty('skills')
      expect(callArgs).not.toHaveProperty('hourlyRate')
    })

    it('should always include updatedAt timestamp', async () => {
      const updates: Partial<User> = {
        bio: 'New bio'
      }

      mockUpdateDoc.mockResolvedValueOnce()

      await ProfileService.updateProfile(userId, updates)

      const callArgs = mockUpdateDoc.mock.calls[0][1] as any
      expect(callArgs.updatedAt).toBeInstanceOf(Date)
    })

    it('should handle update errors', async () => {
      mockUpdateDoc.mockRejectedValueOnce(new Error('Database error'))

      await expect(ProfileService.updateProfile(userId, { bio: 'New bio' }))
        .rejects.toThrow('Database error')
    })
  })

  describe('updateProfileCompleteness', () => {
    const userId = 'test-user-123'

    it('should calculate and update profile completeness', async () => {
      const mockUser: User = {
        id: userId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '+27123456789',
        location: 'Johannesburg',
        userType: 'job-seeker',
        createdAt: new Date(),
        bio: 'My bio',
        skills: ['JavaScript'],
        profilePhoto: 'https://example.com/photo.jpg'
      }

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => mockUser
      } as any)
      mockUpdateDoc.mockResolvedValueOnce()

      await ProfileService.updateProfileCompleteness(userId)

      const updateCall = mockUpdateDoc.mock.calls[0]
      expect((updateCall[1] as any).profileCompleteness).toEqual(expect.any(Number))
    })

    it('should throw error when user not found', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false
      } as any)

      await expect(ProfileService.updateProfileCompleteness(userId))
        .rejects.toThrow('User not found')
    })

    it('should handle update errors', async () => {
      const mockUser: User = {
        id: userId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '+27123456789',
        location: 'Johannesburg',
        userType: 'job-seeker',
        createdAt: new Date()
      }

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => mockUser
      } as any)
      mockUpdateDoc.mockRejectedValueOnce(new Error('Update failed'))

      await expect(ProfileService.updateProfileCompleteness(userId))
        .rejects.toThrow('Update failed')
    })
  })
})

import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { v4 as uuidv4 } from 'uuid'
import { db, storage } from '@/lib/firebase'
import { User, PortfolioItem } from '@/types/auth'
import { sanitizeText, validatePhoneNumber, validateUrl } from '@/lib/utils/profileValidation'

export class ProfileService {
  /**
   * Validate file for profile uploads
   */
  private static validateImageFile(file: File): void {
    const maxSize = 5 * 1024 * 1024 // 5MB for profile images
    if (file.size > maxSize) {
      throw new Error('File size must be less than 5MB')
    }

    if (file.size < 1024) { // Less than 1KB
      throw new Error('File is too small to be a valid image')
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg'
    ]

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only JPEG and PNG images are allowed')
    }

    // Validate file extension matches mime type
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const validExtensions = ['jpg', 'jpeg', 'png']

    if (!fileExtension || !validExtensions.includes(fileExtension)) {
      throw new Error('Invalid file extension. Only JPG and PNG files are allowed')
    }
  }

  static async uploadProfilePhoto(userId: string, file: File): Promise<string> {
    try {
      // Validate file before upload
      this.validateImageFile(file)

      const fileExtension = file.name.split('.').pop()
      const fileName = `${userId}-profile.${fileExtension}`
      const storageRef = ref(storage, `profile-photos/${fileName}`)

      // Add CORS-friendly headers for upload
      const metadata = {
        contentType: file.type,
        customMetadata: {
          'uploadedBy': userId
        }
      }

      await uploadBytes(storageRef, file, metadata)
      const downloadURL = await getDownloadURL(storageRef)

      // Update user profile with photo URL
      await updateDoc(doc(db, 'users', userId), {
        profilePhoto: downloadURL,
        updatedAt: new Date()
      })

      return downloadURL
    } catch (error) {
      console.error('Error uploading profile photo:', error)
      throw new Error(error instanceof Error ? error.message : 'Failed to upload profile photo')
    }
  }

  static async uploadPortfolioImage(userId: string, file: File): Promise<string> {
    try {
      // Validate file before upload
      this.validateImageFile(file)

      const fileExtension = file.name.split('.').pop()
      const fileName = `${userId}-${uuidv4()}.${fileExtension}`
      const storageRef = ref(storage, `portfolio/${fileName}`)

      // Add CORS-friendly headers for upload
      const metadata = {
        contentType: file.type,
        customMetadata: {
          'uploadedBy': userId
        }
      }

      await uploadBytes(storageRef, file, metadata)
      return await getDownloadURL(storageRef)
    } catch (error) {
      console.error('Error uploading portfolio image:', error)
      throw new Error(error instanceof Error ? error.message : 'Failed to upload portfolio image')
    }
  }

  static async addPortfolioItem(userId: string, portfolioData: Omit<PortfolioItem, 'id'>): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId)
      const userDoc = await getDoc(userRef)

      if (!userDoc.exists()) {
        throw new Error('User not found')
      }

      const userData = userDoc.data() as User
      const currentPortfolio = userData.portfolio || []

      const newPortfolioItem: PortfolioItem = {
        ...portfolioData,
        id: uuidv4()
      }

      const updatedPortfolio = [...currentPortfolio, newPortfolioItem]

      await updateDoc(userRef, {
        portfolio: updatedPortfolio,
        updatedAt: new Date()
      })
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to add portfolio item')
    }
  }

  static async updatePortfolioItem(userId: string, portfolioId: string, updates: Partial<PortfolioItem>): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId)
      const userDoc = await getDoc(userRef)

      if (!userDoc.exists()) {
        throw new Error('User not found')
      }

      const userData = userDoc.data() as User
      const currentPortfolio = userData.portfolio || []

      const updatedPortfolio = currentPortfolio.map(item =>
        item.id === portfolioId ? { ...item, ...updates } : item
      )

      await updateDoc(userRef, {
        portfolio: updatedPortfolio,
        updatedAt: new Date()
      })
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update portfolio item')
    }
  }

  static async deletePortfolioItem(userId: string, portfolioId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId)
      const userDoc = await getDoc(userRef)

      if (!userDoc.exists()) {
        throw new Error('User not found')
      }

      const userData = userDoc.data() as User
      const currentPortfolio = userData.portfolio || []

      const portfolioItem = currentPortfolio.find(item => item.id === portfolioId)

      // Delete image from storage if it exists
      if (portfolioItem?.imageUrl) {
        try {
          const imageRef = ref(storage, portfolioItem.imageUrl)
          await deleteObject(imageRef)
        } catch (error) {
          console.warn('Failed to delete portfolio image from storage:', error)
        }
      }

      const updatedPortfolio = currentPortfolio.filter(item => item.id !== portfolioId)

      await updateDoc(userRef, {
        portfolio: updatedPortfolio,
        updatedAt: new Date()
      })
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to delete portfolio item')
    }
  }

  /**
   * Sanitize text fields to prevent XSS attacks
   * Server-side validation as defense-in-depth
   */
  private static sanitizeProfileUpdates(updates: Partial<User>): Record<string, unknown> {
    const cleanUpdates: Record<string, unknown> = {}

    // Text fields that need sanitization
    const textFields = ['firstName', 'lastName', 'bio', 'experience', 'education',
                        'availability', 'experienceYears', 'equipmentOwnership']

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return // Skip undefined/null values
      }

      // Sanitize text fields
      if (textFields.includes(key) && typeof value === 'string') {
        cleanUpdates[key] = sanitizeText(value)
      }
      // Sanitize socialLinks object
      else if (key === 'socialLinks' && typeof value === 'object' && value !== null) {
        const socialLinks = value as Record<string, string>
        const sanitizedLinks: Record<string, string> = {}

        Object.entries(socialLinks).forEach(([platform, url]) => {
          const sanitized = sanitizeText(url)
          const validation = validateUrl(sanitized)
          if (validation.isValid && sanitized) {
            sanitizedLinks[platform] = sanitized
          }
        })

        if (Object.keys(sanitizedLinks).length > 0) {
          cleanUpdates[key] = sanitizedLinks
        }
      }
      // Validate phone number
      else if (key === 'phone' && typeof value === 'string') {
        const validation = validatePhoneNumber(value)
        if (validation.isValid) {
          cleanUpdates[key] = value.trim()
        } else {
          throw new Error(validation.message || 'Invalid phone number')
        }
      }
      // Validate location (sanitize the string)
      else if (key === 'location' && typeof value === 'string') {
        cleanUpdates[key] = sanitizeText(value)
      }
      // Validate workSector enum
      else if (key === 'workSector' && typeof value === 'string') {
        const validSectors = ['professional', 'informal']
        if (validSectors.includes(value)) {
          cleanUpdates[key] = value
        } else {
          throw new Error('Invalid work sector')
        }
      }
      // Pass through other fields (arrays, numbers, booleans, etc.)
      else {
        cleanUpdates[key] = value
      }
    })

    return cleanUpdates
  }

  static async updateProfile(userId: string, updates: Partial<User>): Promise<void> {
    try {
      // Sanitize and validate all updates (defense-in-depth)
      const sanitizedUpdates = this.sanitizeProfileUpdates(updates)

      // Add timestamp
      sanitizedUpdates.updatedAt = new Date()

      await updateDoc(doc(db, 'users', userId), sanitizedUpdates)
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update profile')
    }
  }

  static calculateProfileCompleteness(user: User): number {
    const fields = [
      user.bio,
      user.profilePhoto,
      user.skills?.length ? user.skills : null,
      user.experience,
      user.hourlyRate,
      user.availability,
      user.education,
      user.languages?.length ? user.languages : null
    ]

    const additionalFields = user.userType === 'job-seeker'
      ? [user.portfolio?.length ? user.portfolio : null]
      : [user.certifications?.length ? user.certifications : null]

    const allFields = [...fields, ...additionalFields]
    const completedFields = allFields.filter(field => field !== null && field !== undefined && field !== '').length

    return Math.round((completedFields / allFields.length) * 100)
  }

  static async updateProfileCompleteness(userId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId)
      const userDoc = await getDoc(userRef)

      if (!userDoc.exists()) {
        throw new Error('User not found')
      }

      const userData = userDoc.data() as User
      const completeness = this.calculateProfileCompleteness(userData)

      await updateDoc(userRef, {
        profileCompleteness: completeness,
        updatedAt: new Date()
      })
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update profile completeness')
    }
  }
}
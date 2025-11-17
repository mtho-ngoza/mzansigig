import { db } from '@/lib/firebase'
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore'
import { User, SafetyPreferences, EmergencyContact } from '@/types/auth'
import { SafetyReport, SafetyCheckIn, LocationSafetyRating } from '@/types/security'

export class SecurityService {
  // User Verification Management
  static async updateUserVerificationLevel(
    userId: string,
    level: 'basic' | 'enhanced' | 'premium'
  ): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        verificationLevel: level,
        isVerified: true,
        verificationUpdatedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Error updating verification level:', error)
      throw error
    }
  }

  // Document management integration
  static async getUserDocuments(userId: string, verificationLevel?: string) {
    const { DocumentStorageService } = await import('./documentStorageService')
    return DocumentStorageService.getUserDocuments(userId, verificationLevel)
  }

  static async updateDocumentStatus(
    documentId: string,
    status: 'pending' | 'verified' | 'rejected',
    notes?: string,
    reviewedBy?: string
  ) {
    const { DocumentStorageService } = await import('./documentStorageService')
    return DocumentStorageService.updateDocumentStatus(documentId, status, notes, reviewedBy)
  }

  // User Data Helper
  static async getUser(userId: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId))
      return userDoc.exists() ? userDoc.data() as User : null
    } catch (error) {
      console.error('Error fetching user:', error)
      return null
    }
  }

  // Trust Score Management
  static async calculateTrustScore(userId: string): Promise<number> {
    try {
      const user = await this.getUser(userId)
      if (!user) return 50 // Default score for new users

      let score = 50 // Base score

      // Verification bonuses
      if (user.isVerified) score += 15
      if (user.verificationLevel === 'enhanced') score += 10
      if (user.verificationLevel === 'premium') score += 20
      if (user.backgroundCheckStatus === 'verified') score += 25

      // Experience bonuses
      const completedGigs = user.completedGigs || 0
      score += Math.min(completedGigs * 2, 30) // Max 30 points for experience

      // Rating bonus
      if (user.rating) {
        score += (user.rating - 3) * 10 // +/-20 points based on rating
      }

      // Safety penalties - check recent reports
      const recentReports = await this.getSafetyReports(userId, 30) // Last 30 days
      score -= recentReports.length * 10

      // Cap between 1-100
      return Math.max(1, Math.min(100, Math.round(score)))
    } catch (error) {
      console.error('Error calculating trust score:', error)
      return 50
    }
  }

  static async updateTrustScore(userId: string, action: string, scoreChange: number, reason: string, gigId?: string): Promise<void> {
    try {
      const currentScore = await this.calculateTrustScore(userId)
      const newScore = Math.max(1, Math.min(100, currentScore + scoreChange))

      // Update user's trust score
      await updateDoc(doc(db, 'users', userId), {
        trustScore: newScore,
        updatedAt: serverTimestamp()
      })

      // Record in history
      const historyDoc = doc(collection(db, 'trustScoreHistory'))
      await setDoc(historyDoc, {
        id: historyDoc.id,
        userId,
        action,
        scoreChange,
        newScore,
        reason,
        gigId: gigId || null,
        createdAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Error updating trust score:', error)
      throw error
    }
  }

  // Safety Preferences Management
  static async updateSafetyPreferences(userId: string, preferences: SafetyPreferences): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        safetyPreferences: preferences,
        lastSafetyUpdate: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Error updating safety preferences:', error)
      throw error
    }
  }

  static async getSafetyPreferences(userId: string): Promise<SafetyPreferences | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId))
      if (!userDoc.exists()) return null

      const userData = userDoc.data()
      return userData.safetyPreferences || {
        emergencyContacts: [],
        preferredMeetingTypes: 'any',
        shareLocationWithContacts: false,
        allowCheckInReminders: true,
        allowSafetyNotifications: true
      }
    } catch (error) {
      console.error('Error getting safety preferences:', error)
      return null
    }
  }

  // Emergency Contacts Management
  static async addEmergencyContact(userId: string, contact: Omit<EmergencyContact, 'id' | 'createdAt'>): Promise<string> {
    try {
      const contactDoc = doc(collection(db, 'emergencyContacts'))
      const newContact: EmergencyContact = {
        ...contact,
        id: contactDoc.id,
        createdAt: new Date()
      }

      await setDoc(contactDoc, newContact)

      // Update user's safety preferences
      const preferences = await this.getSafetyPreferences(userId)
      if (preferences) {
        preferences.emergencyContacts.push(newContact)
        await this.updateSafetyPreferences(userId, preferences)
      }

      return contactDoc.id
    } catch (error) {
      console.error('Error adding emergency contact:', error)
      throw error
    }
  }

  static async updateEmergencyContact(userId: string, contactId: string, updates: Partial<EmergencyContact>): Promise<void> {
    try {
      await updateDoc(doc(db, 'emergencyContacts', contactId), {
        ...updates,
        updatedAt: serverTimestamp()
      })

      // Update user's safety preferences
      const preferences = await this.getSafetyPreferences(userId)
      if (preferences) {
        const contactIndex = preferences.emergencyContacts.findIndex(c => c.id === contactId)
        if (contactIndex >= 0) {
          preferences.emergencyContacts[contactIndex] = {
            ...preferences.emergencyContacts[contactIndex],
            ...updates
          }
          await this.updateSafetyPreferences(userId, preferences)
        }
      }
    } catch (error) {
      console.error('Error updating emergency contact:', error)
      throw error
    }
  }

  static async removeEmergencyContact(userId: string, contactId: string): Promise<void> {
    try {
      // Remove from emergencyContacts collection
      await updateDoc(doc(db, 'emergencyContacts', contactId), {
        deleted: true,
        deletedAt: serverTimestamp()
      })

      // Update user's safety preferences
      const preferences = await this.getSafetyPreferences(userId)
      if (preferences) {
        preferences.emergencyContacts = preferences.emergencyContacts.filter(c => c.id !== contactId)
        await this.updateSafetyPreferences(userId, preferences)
      }
    } catch (error) {
      console.error('Error removing emergency contact:', error)
      throw error
    }
  }

  // Safety Check-ins
  static async createSafetyCheckIn(checkIn: Omit<SafetyCheckIn, 'id' | 'createdAt'>): Promise<string> {
    try {
      const checkInDoc = doc(collection(db, 'safety-checkins'))
      const newCheckIn: SafetyCheckIn = {
        ...checkIn,
        id: checkInDoc.id,
        createdAt: new Date()
      }

      await setDoc(checkInDoc, newCheckIn)

      // If it's an emergency check-in, notify emergency contacts
      if (checkIn.type === 'emergency') {
        await this.notifyEmergencyContacts(checkIn.userId, checkIn.gigId, checkIn.location)
      }

      return checkInDoc.id
    } catch (error) {
      console.error('Error creating safety check-in:', error)
      throw error
    }
  }

  private static async notifyEmergencyContacts(userId: string, _gigId: string, _location?: string): Promise<void> {
    try {
      const preferences = await this.getSafetyPreferences(userId)
      if (!preferences || !preferences.shareLocationWithContacts) return

      // TODO: Integrate with SMS service like Twilio for emergency notifications
      // for (const contact of preferences.emergencyContacts) {
      //   await sendEmergencySMS(contact.phone, userId, location)
      // }
    } catch (error) {
      console.error('Error notifying emergency contacts:', error)
    }
  }

  // Safety Reports
  static async submitSafetyReport(report: Omit<SafetyReport, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<string> {
    try {
      const reportDoc = doc(collection(db, 'safety-reports'))
      const newReport: SafetyReport = {
        ...report,
        id: reportDoc.id,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await setDoc(reportDoc, newReport)

      // Update trust scores based on severity
      let scoreChange = 0
      switch (report.severity) {
        case 'low': scoreChange = -5; break
        case 'medium': scoreChange = -10; break
        case 'high': scoreChange = -20; break
        case 'critical': scoreChange = -30; break
      }

      await this.updateTrustScore(
        report.reporteeId,
        'report_against',
        scoreChange,
        `Safety report: ${report.type}`,
        report.gigId
      )

      return reportDoc.id
    } catch (error) {
      console.error('Error submitting safety report:', error)
      throw error
    }
  }

  static async getSafetyReports(userId: string, daysBack?: number): Promise<SafetyReport[]> {
    try {
      let q = query(
        collection(db, 'safety-reports'),
        where('reporteeId', '==', userId),
        orderBy('createdAt', 'desc')
      )

      if (daysBack) {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - daysBack)
        q = query(q, where('createdAt', '>=', cutoffDate))
      }

      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => doc.data() as SafetyReport)
    } catch (error) {
      console.error('Error getting safety reports:', error)
      return []
    }
  }

  // Location Safety Ratings
  static async getLocationSafetyRating(location: string): Promise<LocationSafetyRating | null> {
    try {
      const q = query(
        collection(db, 'location-safety-ratings'),
        where('location', '==', location),
        limit(1)
      )

      const querySnapshot = await getDocs(q)
      if (querySnapshot.empty) return null

      return querySnapshot.docs[0].data() as LocationSafetyRating
    } catch (error) {
      console.error('Error getting location safety rating:', error)
      return null
    }
  }

  static async updateLocationSafetyRating(location: string, coordinates: { latitude: number; longitude: number }, incident: boolean): Promise<void> {
    try {
      const existing = await this.getLocationSafetyRating(location)

      if (existing) {
        // Update existing rating
        const newIncidents = incident ? existing.recentIncidents + 1 : existing.recentIncidents
        const newTotal = existing.totalReports + 1
        const newRating = Math.max(1, existing.overallRating - (incident ? 0.1 : 0))

        await updateDoc(doc(db, 'location-safety-ratings', existing.id), {
          totalReports: newTotal,
          recentIncidents: newIncidents,
          overallRating: newRating,
          safetyScore: this.calculateSafetyScore(newRating, newIncidents, newTotal),
          lastUpdated: serverTimestamp()
        })
      } else {
        // Create new rating
        const ratingDoc = doc(collection(db, 'location-safety-ratings'))
        const newRating: LocationSafetyRating = {
          id: ratingDoc.id,
          location,
          coordinates,
          overallRating: incident ? 4.5 : 5.0,
          totalReports: 1,
          recentIncidents: incident ? 1 : 0,
          safetyScore: incident ? 75 : 100,
          lastUpdated: new Date()
        }

        await setDoc(ratingDoc, newRating)
      }
    } catch (error) {
      console.error('Error updating location safety rating:', error)
      throw error
    }
  }

  private static calculateSafetyScore(rating: number, incidents: number, total: number): number {
    const baseScore = (rating / 5) * 100
    const incidentPenalty = (incidents / total) * 50
    return Math.max(0, Math.round(baseScore - incidentPenalty))
  }

  // Utility methods
}
/**
 * Notification Service
 * Handles in-app notifications for users
 */

import { FirestoreService } from './firestore'
import { Notification, NotificationType } from '@/types/notification'

const NOTIFICATION_COLLECTION = 'notifications'

export class NotificationService {
  /**
   * Create a new notification
   */
  static async createNotification(
    notification: Omit<Notification, 'id' | 'createdAt' | 'read'>
  ): Promise<string> {
    const notificationData = {
      ...notification,
      read: false,
      createdAt: new Date()
    }

    return await FirestoreService.create(NOTIFICATION_COLLECTION, notificationData)
  }

  /**
   * Get all notifications for a user
   */
  static async getUserNotifications(
    userId: string,
    limit: number = 50,
    includeRead: boolean = true
  ): Promise<Notification[]> {
    if (includeRead) {
      return await FirestoreService.getWhere<Notification>(
        NOTIFICATION_COLLECTION,
        'userId',
        '==',
        userId,
        'createdAt',
        limit
      )
    }

    // Get only unread notifications
    return await FirestoreService.getWhereCompound<Notification>(
      NOTIFICATION_COLLECTION,
      [
        { field: 'userId', operator: '==', value: userId },
        { field: 'read', operator: '==', value: false }
      ],
      'createdAt',
      limit
    )
  }

  /**
   * Get unread notification count for a user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    const unreadNotifications = await this.getUserNotifications(userId, 100, false)
    return unreadNotifications.length
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    await FirestoreService.update(NOTIFICATION_COLLECTION, notificationId, {
      read: true
    })
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<void> {
    const unreadNotifications = await this.getUserNotifications(userId, 100, false)

    await Promise.all(
      unreadNotifications.map(notification =>
        FirestoreService.update(NOTIFICATION_COLLECTION, notification.id, { read: true })
      )
    )
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string): Promise<void> {
    await FirestoreService.delete(NOTIFICATION_COLLECTION, notificationId)
  }

  /**
   * Delete old notifications (older than 30 days)
   */
  static async cleanupOldNotifications(userId: string): Promise<number> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const oldNotifications = await FirestoreService.getWhereCompound<Notification>(
      NOTIFICATION_COLLECTION,
      [
        { field: 'userId', operator: '==', value: userId },
        { field: 'read', operator: '==', value: true },
        { field: 'createdAt', operator: '<', value: thirtyDaysAgo }
      ]
    )

    await Promise.all(
      oldNotifications.map(notification =>
        FirestoreService.delete(NOTIFICATION_COLLECTION, notification.id)
      )
    )

    return oldNotifications.length
  }

  // ========================================
  // Helper methods for specific notification types
  // ========================================

  /**
   * Notify about rate proposal
   */
  static async notifyRateProposed(
    recipientId: string,
    actorName: string,
    actorId: string,
    gigId: string,
    gigTitle: string,
    applicationId: string,
    proposedRate: number
  ): Promise<string> {
    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount)

    return await this.createNotification({
      userId: recipientId,
      type: 'rate_proposed',
      title: 'New Rate Proposal',
      message: `${actorName} proposed ${formatCurrency(proposedRate)} for "${gigTitle}"`,
      gigId,
      gigTitle,
      applicationId,
      actorId,
      actorName
    })
  }

  /**
   * Notify about rate counter-offer
   */
  static async notifyRateCountered(
    recipientId: string,
    actorName: string,
    actorId: string,
    gigId: string,
    gigTitle: string,
    applicationId: string,
    newRate: number
  ): Promise<string> {
    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount)

    return await this.createNotification({
      userId: recipientId,
      type: 'rate_countered',
      title: 'Rate Counter-Offer',
      message: `${actorName} countered with ${formatCurrency(newRate)} for "${gigTitle}"`,
      gigId,
      gigTitle,
      applicationId,
      actorId,
      actorName
    })
  }

  /**
   * Notify about rate acceptance/agreement
   */
  static async notifyRateAccepted(
    recipientId: string,
    actorName: string,
    actorId: string,
    gigId: string,
    gigTitle: string,
    applicationId: string,
    agreedRate: number,
    isEmployer: boolean
  ): Promise<string> {
    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount)

    const message = isEmployer
      ? `Rate agreed at ${formatCurrency(agreedRate)} for "${gigTitle}". You can now fund the escrow.`
      : `${actorName} accepted your rate of ${formatCurrency(agreedRate)} for "${gigTitle}"`

    return await this.createNotification({
      userId: recipientId,
      type: 'rate_accepted',
      title: 'Rate Agreed!',
      message,
      gigId,
      gigTitle,
      applicationId,
      actorId,
      actorName
    })
  }

  /**
   * Notify about new application on employer's gig
   */
  static async notifyNewApplication(
    employerId: string,
    applicantName: string,
    applicantId: string,
    gigId: string,
    gigTitle: string,
    applicationId: string,
    proposedRate: number
  ): Promise<string> {
    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount)

    return await this.createNotification({
      userId: employerId,
      type: 'new_application',
      title: 'New Application',
      message: `${applicantName} applied to "${gigTitle}" at ${formatCurrency(proposedRate)}`,
      gigId,
      gigTitle,
      applicationId,
      actorId: applicantId,
      actorName: applicantName
    })
  }
}

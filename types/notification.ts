/**
 * In-App Notification Types
 */

export type NotificationType =
  | 'rate_proposed'      // Worker proposed a rate
  | 'rate_countered'     // Rate was countered
  | 'rate_accepted'      // Rate was accepted/agreed
  | 'application_accepted' // Application was accepted
  | 'application_rejected' // Application was rejected
  | 'payment_funded'     // Escrow was funded
  | 'completion_requested' // Worker requested completion
  | 'payment_released'   // Payment was released
  | 'new_message'        // New message received
  | 'new_application'    // New application on employer's gig

export interface Notification {
  id: string
  userId: string           // Recipient user ID
  type: NotificationType
  title: string
  message: string
  read: boolean
  createdAt: Date
  // Optional context for navigation
  gigId?: string
  gigTitle?: string
  applicationId?: string
  conversationId?: string
  // Actor info (who triggered the notification)
  actorId?: string
  actorName?: string
}

export interface NotificationPreferences {
  userId: string
  // In-app notification preferences
  rateNegotiation: boolean
  applications: boolean
  payments: boolean
  messages: boolean
  // Future: email/push preferences
  emailNotifications?: boolean
  pushNotifications?: boolean
}

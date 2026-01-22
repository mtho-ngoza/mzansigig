/**
 * Centralized Firestore Collection Names
 *
 * All collection names should be defined here to ensure consistency
 * across the codebase. Use camelCase naming convention.
 */

export const COLLECTIONS = {
  // User & Auth
  USERS: 'users',

  // Gigs & Applications
  GIGS: 'gigs',
  APPLICATIONS: 'applications',

  // Payment & Financial
  PAYMENTS: 'payments',
  PAYMENT_INTENTS: 'paymentIntents',
  PAYMENT_HISTORY: 'paymentHistory',
  PAYMENT_DISPUTES: 'paymentDisputes',
  ESCROW_ACCOUNTS: 'escrowAccounts',
  WALLET_TRANSACTIONS: 'walletTransactions',
  WITHDRAWALS: 'withdrawals',
  MILESTONES: 'milestones',
  FEE_CONFIGS: 'feeConfigs',

  // Messaging
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',

  // Verification & Security
  VERIFICATION_DOCUMENTS: 'verificationDocuments',
  VERIFICATION_RESULTS: 'verificationResults',
  TRUST_SCORE_HISTORY: 'trustScoreHistory',
  EMERGENCY_CONTACTS: 'emergencyContacts',
  SAFETY_CHECKINS: 'safetyCheckins',
  SAFETY_REPORTS: 'safetyReports',
  LOCATION_SAFETY_RATINGS: 'locationSafetyRatings',

  // Platform Configuration
  PLATFORM_CONFIG: 'platformConfig'
} as const

// Type for collection names
export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS]

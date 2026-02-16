export interface PaymentMethod {
  id: string
  type: 'card' | 'bank' | 'mobile_money' | 'eft'
  provider: 'tradesafe' | 'ozow' | 'yoco' | 'manual' | 'eft'

  // Card details (for card type)
  cardLast4?: string
  cardBrand?: string
  cardType?: 'debit' | 'credit'
  expiryMonth?: number
  expiryYear?: number

  // Bank details (for bank/eft type)
  bankName?: string
  accountType?: 'cheque' | 'savings'
  accountLast4?: string
  accountHolder?: string // Full name on account
  accountNumber?: string // Full account number (only store for bank/eft types)
  branchCode?: string // Required for South African banks

  // Mobile money details
  mobileProvider?: 'vodacom' | 'mtn' | 'cell_c' | 'telkom'
  mobileNumber?: string

  isDefault: boolean
  isVerified: boolean
  isDeleted?: boolean // Soft delete flag
  deletedAt?: Date // When the payment method was deleted
  createdAt: Date
  updatedAt?: Date
}

export interface Payment {
  id: string
  gigId: string
  employerId: string
  workerId: string
  amount: number
  currency: 'ZAR'
  type: 'milestone' | 'hourly' | 'fixed' | 'bonus'
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'disputed'

  // Payment provider (tradesafe, ozow, yoco)
  provider?: string
  paymentMethodId?: string
  paymentMethod?: PaymentMethod

  // Transaction details
  transactionId?: string
  providerTransactionId?: string
  providerReference?: string

  // Escrow details
  escrowStatus: 'pending' | 'funded' | 'released' | 'refunded'
  escrowReleaseDate?: Date

  // Timing
  createdAt: Date
  processedAt?: Date
  completedAt?: Date
  failedAt?: Date

  // Additional info
  description?: string
  metadata?: Record<string, any>
  failureReason?: string

  // Dispute handling
  disputeId?: string
  disputeStatus?: 'none' | 'raised' | 'investigating' | 'resolved'
}

export interface Milestone {
  id: string
  gigId: string
  title: string
  description: string
  amount: number
  dueDate?: Date
  status: 'pending' | 'in_progress' | 'completed' | 'approved' | 'paid'
  paymentId?: string
  completedAt?: Date
  approvedAt?: Date
  createdAt: Date
}

export interface PaymentHistory {
  id: string
  userId: string
  type: 'earnings' | 'payments' | 'refunds' | 'fees'
  amount: number
  currency: 'ZAR'
  status: 'completed' | 'pending' | 'failed'
  gigId?: string
  paymentId?: string
  description: string
  createdAt: Date
}

export interface WithdrawalRequest {
  id: string
  userId: string
  amount: number
  currency: 'ZAR'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  paymentMethodId: string
  bankDetails?: {
    bankName: string
    accountNumber: string
    branchCode: string
    accountHolder: string
    accountType: 'cheque' | 'savings'
  }
  requestedAt: Date
  processedAt?: Date
  completedAt?: Date
  failureReason?: string
  adminNotes?: string
  approvedBy?: string // Admin user ID who approved
  rejectedBy?: string // Admin user ID who rejected
}

/**
 * Payment Configuration
 *
 * Simplified fee structure for TradeSafe escrow payments.
 * TradeSafe handles all payment processing - we only configure the platform commission.
 */
export interface PaymentConfig {
  id: string

  // Platform commission - taken from worker earnings via TradeSafe agent fee
  platformCommissionPercent: number // 10% - platform's revenue

  // Gig amount limits
  minimumGigAmount: number // R100 - minimum gig value
  maximumGigAmount: number // R100,000 - maximum gig value

  // Escrow auto-release (worker protection)
  escrowAutoReleaseDays: number // 7 days - auto-release if employer doesn't respond

  // Configuration metadata
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: string // admin user ID
}

/**
 * Fee Breakdown
 *
 * Simple breakdown showing what each party pays/receives.
 * Employer pays the gig amount, worker receives 90% (after 10% platform commission).
 */
export interface FeeBreakdown {
  gigAmount: number           // What employer pays (the gig budget)
  platformCommission: number  // Platform's cut (10% of gig amount)
  workerEarnings: number      // What worker receives (90% of gig amount)
}

export interface PaymentAnalytics {
  totalEarnings: number
  totalPaid: number
  totalWithdrawn: number
  availableBalance: number
  pendingBalance: number
  pendingPayments: number
  completedGigs: number
  averageGigValue: number
  monthlyEarnings: { month: string; amount: number }[]
  topCategories: { category: string; earnings: number }[]
  paymentMethodUsage: { method: string; count: number }[]
}

// For South African banking
export interface BankAccount {
  bankName: string
  accountNumber: string
  branchCode: string
  accountHolder: string
  accountType: 'cheque' | 'savings'
  isVerified: boolean
}

// Payment intents for processing
export interface PaymentIntent {
  id: string
  amount: number
  currency: 'ZAR'
  status: 'created' | 'processing' | 'succeeded' | 'failed'
  gigId: string
  paymentMethodId: string
  clientSecret?: string
  metadata?: Record<string, any>
  createdAt: Date
  expiresAt?: Date // Payment intent expiration time (30 minutes from creation)
}

// Escrow specific types
export interface EscrowAccount {
  id: string
  gigId: string
  employerId: string
  workerId: string
  totalAmount: number
  releasedAmount: number
  status: 'active' | 'completed' | 'disputed'
  milestones: Milestone[]
  createdAt: Date
}

export interface PaymentDispute {
  id: string
  paymentId: string
  gigId: string
  raisedBy: string
  raisedAgainst: string
  reason: string
  description: string
  status: 'open' | 'investigating' | 'resolved_in_favor_of_employer' | 'resolved_in_favor_of_worker' | 'cancelled'
  evidence?: string[]
  adminNotes?: string
  resolvedAt?: Date
  createdAt: Date
}

// UI state types
export interface PaymentState {
  payments: Payment[]
  withdrawals: WithdrawalRequest[]
  analytics: PaymentAnalytics | null
  isLoading: boolean
  error: string | null
}

// Note: PayFast and Paystack applications were rejected (marketplace/escrow flagged as high-risk)
// TradeSafe is purpose-built for marketplace escrow in South Africa
export type PaymentProvider = 'tradesafe' | 'ozow' | 'yoco'

// South African payment provider specific types
export interface TradeSafeConfig {
  clientId: string
  clientSecret: string
  environment: 'sandbox' | 'production'
}

export interface OzowConfig {
  apiKey: string
  privateKey: string
  siteCode: string
  sandbox: boolean
}

export interface YocoConfig {
  secretKey: string
  publicKey: string
  sandbox: boolean
}
export interface PaymentMethod {
  id: string
  type: 'card' | 'bank' | 'mobile_money' | 'eft'
  provider: 'payfast' | 'ozow' | 'yoco' | 'stripe' | 'manual' | 'eft'

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

  // Payment method used
  paymentMethodId: string
  paymentMethod: PaymentMethod

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

export interface PaymentConfig {
  id: string
  // Fee structure (percentages)
  platformFeePercentage: number // e.g., 5% - service fee taken by platform
  paymentProcessingFeePercentage: number // e.g., 2.9% - payment processor fee
  fixedTransactionFee: number // e.g., R2.50 - fixed fee per transaction

  // Worker commission (what platform takes from worker earnings)
  workerCommissionPercentage: number // e.g., 10% - commission taken from worker's earnings

  // Minimum amounts
  minimumGigAmount: number // R100
  minimumWithdrawal: number // R50
  minimumMilestone: number // R50

  // Escrow settings
  escrowReleaseDelayHours: number // 72 hours default
  autoReleaseEnabled: boolean

  // Supported providers
  enabledProviders: string[]
  defaultProvider: string

  // South African specific
  vatIncluded: boolean
  vatPercentage: number // 15%

  // Configuration metadata
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: string // admin user ID
}

// Fee breakdown interface for transparent calculations
export interface FeeBreakdown {
  grossAmount: number // Original amount before fees
  platformFee: number // Platform service fee
  processingFee: number // Payment processor fee
  fixedFee: number // Fixed transaction fee
  workerCommission: number // Commission taken from worker
  totalEmployerFees: number // Total fees paid by employer
  totalWorkerDeductions: number // Total deductions from worker
  netAmountToWorker: number // Amount worker actually receives
  totalEmployerCost: number // Total cost to employer
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
  paymentMethods: PaymentMethod[]
  payments: Payment[]
  withdrawals: WithdrawalRequest[]
  analytics: PaymentAnalytics | null
  isLoading: boolean
  error: string | null
}

export type PaymentProvider = 'payfast' | 'ozow' | 'yoco' | 'stripe'

// South African payment provider specific types
export interface PayFastConfig {
  merchantId: string
  merchantKey: string
  passphrase: string
  sandbox: boolean
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
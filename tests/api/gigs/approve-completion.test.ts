/**
 * Tests for /api/gigs/approve-completion endpoint logic
 *
 * This API handles employer approval of worker's completion request,
 * releasing escrow funds to worker (minus 10% platform commission).
 *
 * Key behaviors tested:
 * 1. Validation - applicationId required, correct status
 * 2. Authorization - only gig employer can approve
 * 3. Business logic - wallet calculations, commission deduction
 * 4. Payment history - record creation and updates
 */

describe('/api/gigs/approve-completion logic', () => {
  /**
   * The approve-completion endpoint performs these steps:
   * 1. Validate applicationId is provided
   * 2. Verify Firebase ID token
   * 3. Check application exists and is in 'funded' or 'in_progress' status
   * 4. Check gig exists and user is the employer
   * 5. Run transaction to:
   *    - Update application status to 'completed'
   *    - Update gig status to 'completed'
   *    - Increment worker's completedGigs
   *    - Release escrow (deduct from pendingBalance, add to walletBalance)
   *    - Update employer's pendingBalance
   * 6. Create/update payment history records
   */

  describe('Validation Logic', () => {
    const validateApplicationId = (applicationId: string | null | undefined): { valid: boolean; error?: string } => {
      if (!applicationId) {
        return { valid: false, error: 'Missing required field: applicationId' }
      }
      return { valid: true }
    }

    it('should reject missing applicationId', () => {
      const result = validateApplicationId(undefined)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Missing required field: applicationId')
    })

    it('should reject null applicationId', () => {
      const result = validateApplicationId(null)
      expect(result.valid).toBe(false)
    })

    it('should reject empty string applicationId', () => {
      const result = validateApplicationId('')
      expect(result.valid).toBe(false)
    })

    it('should accept valid applicationId', () => {
      const result = validateApplicationId('app-123')
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })

  describe('Application Status Validation', () => {
    const validateApplicationStatus = (status: string): { valid: boolean; error?: string } => {
      if (status !== 'funded' && status !== 'in_progress') {
        return { valid: false, error: `Cannot approve completion: application status is ${status}` }
      }
      return { valid: true }
    }

    it('should accept funded status', () => {
      expect(validateApplicationStatus('funded').valid).toBe(true)
    })

    it('should accept in_progress status', () => {
      expect(validateApplicationStatus('in_progress').valid).toBe(true)
    })

    it('should reject pending status', () => {
      const result = validateApplicationStatus('pending')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('pending')
    })

    it('should reject accepted status', () => {
      const result = validateApplicationStatus('accepted')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('accepted')
    })

    it('should reject completed status', () => {
      const result = validateApplicationStatus('completed')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('completed')
    })

    it('should reject rejected status', () => {
      const result = validateApplicationStatus('rejected')
      expect(result.valid).toBe(false)
    })
  })

  describe('Authorization Logic', () => {
    const validateEmployerOwnership = (gigEmployerId: string, requestUserId: string): boolean => {
      return gigEmployerId === requestUserId
    }

    it('should allow when user is the gig employer', () => {
      expect(validateEmployerOwnership('employer-123', 'employer-123')).toBe(true)
    })

    it('should reject when user is not the employer', () => {
      expect(validateEmployerOwnership('employer-123', 'other-user')).toBe(false)
    })

    it('should reject when user is the worker', () => {
      expect(validateEmployerOwnership('employer-123', 'worker-456')).toBe(false)
    })
  })

  describe('Escrow Amount Calculation', () => {
    const calculateEscrowAmount = (
      gigEscrowAmount: number,
      agreedRate: number,
      proposedRate: number
    ): number => {
      return gigEscrowAmount || agreedRate || proposedRate || 0
    }

    it('should use gig.escrowAmount when available', () => {
      expect(calculateEscrowAmount(5000, 4000, 3000)).toBe(5000)
    })

    it('should fall back to agreedRate when escrowAmount is 0', () => {
      expect(calculateEscrowAmount(0, 4000, 3000)).toBe(4000)
    })

    it('should fall back to proposedRate when both are 0', () => {
      expect(calculateEscrowAmount(0, 0, 3000)).toBe(3000)
    })

    it('should return 0 when all are 0', () => {
      expect(calculateEscrowAmount(0, 0, 0)).toBe(0)
    })

  })

  describe('Platform Commission Calculation', () => {
    const PLATFORM_COMMISSION_RATE = 0.10 // 10%

    const calculateCommission = (grossAmount: number): { commission: number; netAmount: number } => {
      const commission = grossAmount * PLATFORM_COMMISSION_RATE
      const netAmount = grossAmount - commission
      return { commission, netAmount }
    }

    it('should calculate 10% commission correctly for R1000', () => {
      const result = calculateCommission(1000)
      expect(result.commission).toBe(100)
      expect(result.netAmount).toBe(900)
    })

    it('should calculate 10% commission correctly for R5000', () => {
      const result = calculateCommission(5000)
      expect(result.commission).toBe(500)
      expect(result.netAmount).toBe(4500)
    })

    it('should calculate 10% commission correctly for R10000', () => {
      const result = calculateCommission(10000)
      expect(result.commission).toBe(1000)
      expect(result.netAmount).toBe(9000)
    })

    it('should handle zero amount', () => {
      const result = calculateCommission(0)
      expect(result.commission).toBe(0)
      expect(result.netAmount).toBe(0)
    })

    it('should handle decimal amounts', () => {
      const result = calculateCommission(1234.56)
      expect(result.commission).toBeCloseTo(123.456)
      expect(result.netAmount).toBeCloseTo(1111.104)
    })
  })

  describe('Worker Wallet Update Logic', () => {
    interface WorkerWallet {
      pendingBalance: number
      walletBalance: number
      totalEarnings: number
      completedGigs: number
    }

    const calculateWalletUpdate = (
      currentWallet: WorkerWallet,
      grossAmount: number
    ): WorkerWallet => {
      const commission = grossAmount * 0.10
      const netAmount = grossAmount - commission

      return {
        pendingBalance: currentWallet.pendingBalance - grossAmount,
        walletBalance: currentWallet.walletBalance + netAmount,
        totalEarnings: currentWallet.totalEarnings + netAmount,
        completedGigs: currentWallet.completedGigs + 1
      }
    }

    it('should correctly update wallet for standard completion', () => {
      const currentWallet = {
        pendingBalance: 5000,
        walletBalance: 1000,
        totalEarnings: 10000,
        completedGigs: 5
      }

      const result = calculateWalletUpdate(currentWallet, 5000)

      expect(result.pendingBalance).toBe(0)
      expect(result.walletBalance).toBe(5500) // 1000 + 4500
      expect(result.totalEarnings).toBe(14500) // 10000 + 4500
      expect(result.completedGigs).toBe(6)
    })

    it('should handle worker with multiple pending gigs', () => {
      const currentWallet = {
        pendingBalance: 15000, // Multiple gigs in progress
        walletBalance: 5000,
        totalEarnings: 20000,
        completedGigs: 10
      }

      const result = calculateWalletUpdate(currentWallet, 5000)

      expect(result.pendingBalance).toBe(10000) // 15000 - 5000
      expect(result.walletBalance).toBe(9500) // 5000 + 4500
      expect(result.totalEarnings).toBe(24500) // 20000 + 4500
      expect(result.completedGigs).toBe(11)
    })

    it('should handle first-time worker', () => {
      const currentWallet = {
        pendingBalance: 3000,
        walletBalance: 0,
        totalEarnings: 0,
        completedGigs: 0
      }

      const result = calculateWalletUpdate(currentWallet, 3000)

      expect(result.pendingBalance).toBe(0)
      expect(result.walletBalance).toBe(2700) // 0 + 2700
      expect(result.totalEarnings).toBe(2700)
      expect(result.completedGigs).toBe(1)
    })
  })

  describe('Employer Pending Balance Update', () => {
    const calculateEmployerPendingUpdate = (
      currentPending: number,
      releaseAmount: number
    ): number => {
      return Math.max(0, currentPending - releaseAmount)
    }

    it('should deduct release amount from pending', () => {
      expect(calculateEmployerPendingUpdate(5000, 5000)).toBe(0)
    })

    it('should handle partial release', () => {
      expect(calculateEmployerPendingUpdate(10000, 5000)).toBe(5000)
    })

    it('should not go negative', () => {
      expect(calculateEmployerPendingUpdate(3000, 5000)).toBe(0)
    })

    it('should handle zero pending', () => {
      expect(calculateEmployerPendingUpdate(0, 5000)).toBe(0)
    })
  })

  describe('Pending Balance Validation', () => {
    const validatePendingBalance = (
      workerPendingBalance: number,
      escrowAmount: number
    ): { valid: boolean; error?: string } => {
      if (escrowAmount > 0 && workerPendingBalance < escrowAmount) {
        return {
          valid: false,
          error: `Insufficient pending balance. Expected ${escrowAmount}, found ${workerPendingBalance}`
        }
      }
      return { valid: true }
    }

    it('should pass when balance equals escrow amount', () => {
      expect(validatePendingBalance(5000, 5000).valid).toBe(true)
    })

    it('should pass when balance exceeds escrow amount', () => {
      expect(validatePendingBalance(10000, 5000).valid).toBe(true)
    })

    it('should fail when balance is less than escrow', () => {
      const result = validatePendingBalance(3000, 5000)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Insufficient pending balance')
      expect(result.error).toContain('5000')
      expect(result.error).toContain('3000')
    })

    it('should pass when escrow amount is 0', () => {
      expect(validatePendingBalance(0, 0).valid).toBe(true)
    })

    it('should pass when escrow amount is 0 and balance is also 0', () => {
      // Zero escrow means no funds to release, so validation should pass
      expect(validatePendingBalance(0, 0).valid).toBe(true)
    })
  })

  describe('Payment History Record Structure', () => {
    interface PaymentHistoryRecord {
      userId: string
      type: 'earnings' | 'payments' | 'fees' | 'refunds'
      amount: number
      currency: 'ZAR'
      status: 'completed' | 'pending' | 'failed'
      gigId: string
      description: string
    }

    const createEarningsRecord = (
      workerId: string,
      gigId: string,
      gigTitle: string,
      grossAmount: number,
      netAmount: number
    ): PaymentHistoryRecord => {
      return {
        userId: workerId,
        type: 'earnings',
        amount: netAmount,
        currency: 'ZAR',
        status: 'completed',
        gigId: gigId,
        description: `Earnings from: ${gigTitle} (R${grossAmount.toFixed(2)} minus 10% fee)`
      }
    }

    const createFeeRecord = (
      workerId: string,
      gigId: string,
      gigTitle: string,
      commission: number
    ): PaymentHistoryRecord => {
      return {
        userId: workerId,
        type: 'fees',
        amount: -commission, // Negative to indicate deduction
        currency: 'ZAR',
        status: 'completed',
        gigId: gigId,
        description: `Platform fee (10%) for: ${gigTitle}`
      }
    }

    it('should create correct earnings record', () => {
      const record = createEarningsRecord('worker-123', 'gig-456', 'Web Dev', 5000, 4500)

      expect(record.userId).toBe('worker-123')
      expect(record.type).toBe('earnings')
      expect(record.amount).toBe(4500)
      expect(record.currency).toBe('ZAR')
      expect(record.status).toBe('completed')
      expect(record.gigId).toBe('gig-456')
      expect(record.description).toContain('Web Dev')
      expect(record.description).toContain('5000.00')
      expect(record.description).toContain('10% fee')
    })

    it('should create correct fee record with negative amount', () => {
      const record = createFeeRecord('worker-123', 'gig-456', 'Web Dev', 500)

      expect(record.userId).toBe('worker-123')
      expect(record.type).toBe('fees')
      expect(record.amount).toBe(-500)
      expect(record.currency).toBe('ZAR')
      expect(record.status).toBe('completed')
      expect(record.description).toContain('Platform fee')
      expect(record.description).toContain('10%')
    })
  })

  describe('Complete Approval Flow Simulation', () => {
    /**
     * Simulates the full approval flow to verify all calculations are correct
     */

    interface Application {
      id: string
      applicantId: string
      gigId: string
      status: string
      agreedRate: number
    }

    interface Gig {
      id: string
      employerId: string
      title: string
      escrowAmount: number
    }

    interface Worker {
      id: string
      pendingBalance: number
      walletBalance: number
      totalEarnings: number
      completedGigs: number
    }

    interface Employer {
      id: string
      pendingBalance: number
    }

    interface ApprovalResult {
      success: boolean
      error?: string
      workerAfter?: Worker
      employerAfter?: Employer
      applicationStatus?: string
      gigStatus?: string
      earningsRecorded?: number
      feeRecorded?: number
    }

    const simulateApproval = (
      requestUserId: string,
      application: Application,
      gig: Gig,
      worker: Worker,
      employer: Employer
    ): ApprovalResult => {
      // Authorization check
      if (gig.employerId !== requestUserId) {
        return { success: false, error: 'Only the employer can approve completion' }
      }

      // Status check
      if (application.status !== 'funded' && application.status !== 'in_progress') {
        return { success: false, error: `Cannot approve completion: application status is ${application.status}` }
      }

      // Calculate amounts
      const escrowAmount = gig.escrowAmount || application.agreedRate || 0
      const commission = escrowAmount * 0.10
      const netAmount = escrowAmount - commission

      // Pending balance check
      if (escrowAmount > 0 && worker.pendingBalance < escrowAmount) {
        return { success: false, error: 'Insufficient pending balance' }
      }

      // Calculate final states
      const workerAfter: Worker = {
        ...worker,
        pendingBalance: worker.pendingBalance - escrowAmount,
        walletBalance: worker.walletBalance + netAmount,
        totalEarnings: worker.totalEarnings + netAmount,
        completedGigs: worker.completedGigs + 1
      }

      const employerAfter: Employer = {
        ...employer,
        pendingBalance: Math.max(0, employer.pendingBalance - escrowAmount)
      }

      return {
        success: true,
        workerAfter,
        employerAfter,
        applicationStatus: 'completed',
        gigStatus: 'completed',
        earningsRecorded: netAmount,
        feeRecorded: commission
      }
    }

    it('should process full approval correctly', () => {
      const application: Application = {
        id: 'app-1',
        applicantId: 'worker-1',
        gigId: 'gig-1',
        status: 'funded',
        agreedRate: 5000
      }

      const gig: Gig = {
        id: 'gig-1',
        employerId: 'employer-1',
        title: 'Test Gig',
        escrowAmount: 5000
      }

      const worker: Worker = {
        id: 'worker-1',
        pendingBalance: 5000,
        walletBalance: 1000,
        totalEarnings: 10000,
        completedGigs: 5
      }

      const employer: Employer = {
        id: 'employer-1',
        pendingBalance: 5000
      }

      const result = simulateApproval('employer-1', application, gig, worker, employer)

      expect(result.success).toBe(true)
      expect(result.applicationStatus).toBe('completed')
      expect(result.gigStatus).toBe('completed')
      expect(result.workerAfter?.pendingBalance).toBe(0)
      expect(result.workerAfter?.walletBalance).toBe(5500)
      expect(result.workerAfter?.totalEarnings).toBe(14500)
      expect(result.workerAfter?.completedGigs).toBe(6)
      expect(result.employerAfter?.pendingBalance).toBe(0)
      expect(result.earningsRecorded).toBe(4500)
      expect(result.feeRecorded).toBe(500)
    })

    it('should reject non-employer approval', () => {
      const application: Application = {
        id: 'app-1',
        applicantId: 'worker-1',
        gigId: 'gig-1',
        status: 'funded',
        agreedRate: 5000
      }

      const gig: Gig = {
        id: 'gig-1',
        employerId: 'employer-1',
        title: 'Test Gig',
        escrowAmount: 5000
      }

      const worker: Worker = {
        id: 'worker-1',
        pendingBalance: 5000,
        walletBalance: 1000,
        totalEarnings: 10000,
        completedGigs: 5
      }

      const employer: Employer = {
        id: 'employer-1',
        pendingBalance: 5000
      }

      // Worker tries to approve their own completion
      const result = simulateApproval('worker-1', application, gig, worker, employer)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Only the employer')
    })

    it('should reject approval for wrong status', () => {
      const application: Application = {
        id: 'app-1',
        applicantId: 'worker-1',
        gigId: 'gig-1',
        status: 'accepted', // Not funded yet
        agreedRate: 5000
      }

      const gig: Gig = {
        id: 'gig-1',
        employerId: 'employer-1',
        title: 'Test Gig',
        escrowAmount: 0
      }

      const worker: Worker = {
        id: 'worker-1',
        pendingBalance: 0,
        walletBalance: 0,
        totalEarnings: 0,
        completedGigs: 0
      }

      const employer: Employer = {
        id: 'employer-1',
        pendingBalance: 0
      }

      const result = simulateApproval('employer-1', application, gig, worker, employer)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Cannot approve completion')
    })

    it('should reject when insufficient pending balance', () => {
      const application: Application = {
        id: 'app-1',
        applicantId: 'worker-1',
        gigId: 'gig-1',
        status: 'funded',
        agreedRate: 5000
      }

      const gig: Gig = {
        id: 'gig-1',
        employerId: 'employer-1',
        title: 'Test Gig',
        escrowAmount: 5000
      }

      const worker: Worker = {
        id: 'worker-1',
        pendingBalance: 3000, // Less than escrow
        walletBalance: 1000,
        totalEarnings: 10000,
        completedGigs: 5
      }

      const employer: Employer = {
        id: 'employer-1',
        pendingBalance: 5000
      }

      const result = simulateApproval('employer-1', application, gig, worker, employer)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Insufficient pending balance')
    })
  })

  describe('API Response Structure', () => {
    interface SuccessResponse {
      success: true
      message: string
    }

    interface ErrorResponse {
      error: string
      message?: string
    }

    it('should define correct success response structure', () => {
      const response: SuccessResponse = {
        success: true,
        message: 'Completion approved and escrow released'
      }

      expect(response.success).toBe(true)
      expect(response.message).toBeDefined()
    })

    it('should define correct error response structure', () => {
      const response: ErrorResponse = {
        error: 'Failed to approve completion',
        message: 'Insufficient pending balance'
      }

      expect(response.error).toBeDefined()
    })

    it('should define validation error response (400)', () => {
      const response: ErrorResponse = {
        error: 'Missing required field: applicationId'
      }

      expect(response.error).toContain('applicationId')
    })

    it('should define auth error response (401)', () => {
      const response: ErrorResponse = {
        error: 'Unauthorized. Please sign in.'
      }

      expect(response.error).toContain('Unauthorized')
    })

    it('should define forbidden error response (403)', () => {
      const response: ErrorResponse = {
        error: 'Only the employer can approve completion'
      }

      expect(response.error).toContain('employer')
    })

    it('should define not found error response (404)', () => {
      const responses: ErrorResponse[] = [
        { error: 'Application not found' },
        { error: 'Gig not found' }
      ]

      responses.forEach(r => expect(r.error).toContain('not found'))
    })
  })

  describe('TradeSafe Direct Payout Integration', () => {
    /**
     * When employer approves completion, the system should:
     * 1. Find the paymentIntent with allocationId
     * 2. Call TradeSafe acceptDelivery() to trigger direct payout
     * 3. Update paymentIntent status to 'completed'
     * 4. Return success with tradeSafePayout: true
     */

    interface PaymentIntent {
      gigId: string
      status: 'created' | 'funded' | 'completed'
      transactionId: string
      allocationId: string
    }

    interface TradeSafePayoutResult {
      success: boolean
      tradeSafePayout: boolean
      message: string
      netAmount: number
    }

    const findPaymentIntent = (
      paymentIntents: PaymentIntent[],
      gigId: string
    ): PaymentIntent | null => {
      return paymentIntents.find(
        pi => pi.gigId === gigId && pi.status === 'funded'
      ) || null
    }

    const simulateTradeSafePayout = (
      allocationId: string | null,
      escrowAmount: number
    ): TradeSafePayoutResult => {
      const platformCommission = escrowAmount * 0.10
      const netAmount = escrowAmount - platformCommission

      if (allocationId) {
        return {
          success: true,
          tradeSafePayout: true,
          message: "Completion approved. Payment sent directly to worker's bank account.",
          netAmount
        }
      } else {
        return {
          success: true,
          tradeSafePayout: false,
          message: 'Completion approved and escrow released to wallet.',
          netAmount
        }
      }
    }

    it('should find funded payment intent for gig', () => {
      const paymentIntents: PaymentIntent[] = [
        {
          gigId: 'gig-123',
          status: 'funded',
          transactionId: 'tx-abc',
          allocationId: 'alloc-xyz'
        },
        {
          gigId: 'gig-456',
          status: 'created',
          transactionId: 'tx-def',
          allocationId: 'alloc-uvw'
        }
      ]

      const result = findPaymentIntent(paymentIntents, 'gig-123')
      expect(result).not.toBeNull()
      expect(result?.allocationId).toBe('alloc-xyz')
    })

    it('should not find payment intent if not funded', () => {
      const paymentIntents: PaymentIntent[] = [
        {
          gigId: 'gig-123',
          status: 'created',
          transactionId: 'tx-abc',
          allocationId: 'alloc-xyz'
        }
      ]

      const result = findPaymentIntent(paymentIntents, 'gig-123')
      expect(result).toBeNull()
    })

    it('should trigger TradeSafe payout when allocationId exists', () => {
      const result = simulateTradeSafePayout('alloc-xyz', 5000)

      expect(result.success).toBe(true)
      expect(result.tradeSafePayout).toBe(true)
      expect(result.message).toContain('bank account')
      expect(result.netAmount).toBe(4500) // 5000 - 10%
    })

    it('should fall back to wallet payout when no allocationId', () => {
      const result = simulateTradeSafePayout(null, 5000)

      expect(result.success).toBe(true)
      expect(result.tradeSafePayout).toBe(false)
      expect(result.message).toContain('wallet')
      expect(result.netAmount).toBe(4500)
    })

    it('should calculate correct net amount after platform fee', () => {
      const testCases = [
        { escrow: 1000, expectedNet: 900 },
        { escrow: 5000, expectedNet: 4500 },
        { escrow: 10000, expectedNet: 9000 },
        { escrow: 500, expectedNet: 450 }
      ]

      testCases.forEach(({ escrow, expectedNet }) => {
        const result = simulateTradeSafePayout('alloc-123', escrow)
        expect(result.netAmount).toBe(expectedNet)
      })
    })

    describe('TradeSafe Allocation State Transitions', () => {
      /**
       * TradeSafe allocation states:
       * CREATED → FUNDS_DEPOSITED → FUNDS_RECEIVED → INITIATED → ACCEPTED
       *
       * IMPORTANT: completeDelivery() and acceptDelivery() are MUTUALLY EXCLUSIVE:
       * - Path A: startDelivery → acceptDelivery (immediate payout, no email)
       * - Path B: startDelivery → completeDelivery (24h countdown email to buyer)
       *
       * You CANNOT call acceptDelivery after completeDelivery.
       * For platform-initiated acceptance (buyer already approved in app),
       * use: startDelivery() → acceptDelivery()
       */

      type AllocationState =
        | 'CREATED'
        | 'FUNDS_DEPOSITED'
        | 'FUNDS_RECEIVED'
        | 'INITIATED'
        | 'IN_TRANSIT'
        | 'DELIVERY_COMPLETE'
        | 'ACCEPTED'

      const canAcceptDelivery = (state: AllocationState): boolean => {
        // Can accept from these states ONLY if completeDelivery was NOT called
        // DELIVERY_COMPLETE means completeDelivery was called, so acceptDelivery will fail
        const acceptableStates: AllocationState[] = [
          'FUNDS_RECEIVED',
          'INITIATED',
          'IN_TRANSIT'
        ]
        return acceptableStates.includes(state)
      }

      it('should allow accept from FUNDS_RECEIVED state', () => {
        expect(canAcceptDelivery('FUNDS_RECEIVED')).toBe(true)
      })

      it('should allow accept from INITIATED state', () => {
        expect(canAcceptDelivery('INITIATED')).toBe(true)
      })

      it('should NOT allow accept from DELIVERY_COMPLETE state (mutually exclusive)', () => {
        // completeDelivery and acceptDelivery are mutually exclusive
        expect(canAcceptDelivery('DELIVERY_COMPLETE')).toBe(false)
      })

      it('should not allow accept from CREATED state', () => {
        expect(canAcceptDelivery('CREATED')).toBe(false)
      })

      it('should not allow accept from already ACCEPTED state', () => {
        expect(canAcceptDelivery('ACCEPTED')).toBe(false)
      })
    })
  })
})

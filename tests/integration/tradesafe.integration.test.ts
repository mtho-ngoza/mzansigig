/**
 * TradeSafe Integration Tests
 *
 * These tests call the real TradeSafe sandbox API to validate:
 * - Authentication works
 * - Bank codes are correct
 * - Token creation succeeds
 * - Transaction creation succeeds
 *
 * Run with: npx jest tests/integration/tradesafe.integration.test.ts --testTimeout=30000
 */

// Load environment variables from .env.local
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// Polyfill fetch for Node.js
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodeFetch = require('node-fetch')
if (!globalThis.fetch) {
  globalThis.fetch = nodeFetch
  globalThis.Response = nodeFetch.Response
  globalThis.Request = nodeFetch.Request
  globalThis.Headers = nodeFetch.Headers
}

import { TradeSafeService } from '@/lib/services/tradesafeService'
import { TRADESAFE_BANK_CODES, SUPPORTED_BANKS } from '@/lib/constants/banks'

// Skip if credentials not available
const hasCredentials = process.env.TRADESAFE_CLIENT_ID && process.env.TRADESAFE_CLIENT_SECRET

const describeIf = hasCredentials ? describe : describe.skip

describeIf('TradeSafe Integration Tests', () => {
  let tradeSafe: TradeSafeService

  beforeAll(() => {
    tradeSafe = new TradeSafeService({
      environment: 'sandbox'
    })
  })

  describe('Authentication', () => {
    it('should authenticate successfully', async () => {
      // getApiProfile requires auth, so if this works, auth works
      const token = await tradeSafe.getApiProfile()
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      console.log('Platform token:', token)
    })
  })

  describe('Token Creation', () => {
    it('should create a token without bank details', async () => {
      const token = await tradeSafe.createToken({
        givenName: 'Test',
        familyName: 'User',
        email: `test-${Date.now()}@example.com`,
        mobile: '+27821234567'
      })

      expect(token).toBeDefined()
      expect(token.id).toBeDefined()
      console.log('Token created (no bank):', token)
    })

    it('should create a token with bank details', async () => {
      const token = await tradeSafe.createToken({
        givenName: 'Test',
        familyName: 'Worker',
        email: `worker-${Date.now()}@example.com`,
        mobile: '+27829876543',
        bankAccount: {
          accountNumber: '1234567890',
          accountType: 'SAVINGS',
          bank: 'FNB'
        }
      })

      expect(token).toBeDefined()
      expect(token.id).toBeDefined()
      console.log('Token created (with bank):', token)
    })

    // Test all supported banks
    describe('Bank Code Validation', () => {
      const testBanks = ['FNB', 'ABSA', 'Nedbank', 'Capitec', 'Standard Bank']

      testBanks.forEach(bankName => {
        it(`should accept bank code for ${bankName}`, async () => {
          const bankCode = TRADESAFE_BANK_CODES[bankName]
          expect(bankCode).toBeDefined()
          console.log(`${bankName} -> ${bankCode}`)

          const token = await tradeSafe.createToken({
            givenName: 'Bank',
            familyName: 'Test',
            email: `bank-${bankName.toLowerCase().replace(' ', '')}-${Date.now()}@example.com`,
            mobile: '+27821111111',
            bankAccount: {
              accountNumber: '1234567890',
              accountType: 'SAVINGS',
              bank: bankCode
            }
          })

          expect(token.id).toBeDefined()
          console.log(`✓ ${bankName} (${bankCode}) - Token: ${token.id}`)
        })
      })
    })
  })

  describe('Transaction Creation', () => {
    it('should create a transaction with buyer, seller, and agent', async () => {
      // Create buyer token
      const buyer = await tradeSafe.createToken({
        givenName: 'Test',
        familyName: 'Employer',
        email: `employer-${Date.now()}@example.com`,
        mobile: '+27821112222'
      })

      // Create seller token with bank details
      const seller = await tradeSafe.createToken({
        givenName: 'Test',
        familyName: 'Worker',
        email: `worker-tx-${Date.now()}@example.com`,
        mobile: '+27821113333',
        bankAccount: {
          accountNumber: '1234567890',
          accountType: 'SAVINGS',
          bank: 'FNB'
        }
      })

      // Get platform token
      const platformToken = await tradeSafe.getApiProfile()

      // Create transaction
      const transaction = await tradeSafe.createTransaction({
        title: 'Integration Test Gig',
        description: 'Testing TradeSafe integration',
        value: 500,
        buyerToken: buyer.id,
        sellerToken: seller.id,
        agentToken: platformToken,
        agentFeePercent: 10,
        daysToDeliver: 7,
        daysToInspect: 7,
        reference: `test-${Date.now()}`
      })

      expect(transaction).toBeDefined()
      expect(transaction.id).toBeDefined()
      expect(transaction.state).toBe('CREATED')
      expect(transaction.allocations).toHaveLength(1)

      console.log('Transaction created:', {
        id: transaction.id,
        state: transaction.state,
        allocation: transaction.allocations[0]
      })
    })
  })
})

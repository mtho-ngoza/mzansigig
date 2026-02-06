/**
 * TradeSafeService Tests
 *
 * Tests for the TradeSafe escrow payment gateway integration.
 */

import { TradeSafeService } from '@/lib/services/tradesafeService'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('TradeSafeService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.TRADESAFE_CLIENT_ID = 'test_client_id'
    process.env.TRADESAFE_CLIENT_SECRET = 'test_client_secret'
    process.env.TRADESAFE_ENVIRONMENT = 'sandbox'
  })

  afterEach(() => {
    delete process.env.TRADESAFE_CLIENT_ID
    delete process.env.TRADESAFE_CLIENT_SECRET
    delete process.env.TRADESAFE_ENVIRONMENT
  })

  describe('constructor', () => {
    it('should create service with environment variables', () => {
      const service = new TradeSafeService()
      expect(service).toBeDefined()
    })

    it('should create service with config object', () => {
      const service = new TradeSafeService({
        clientId: 'custom_client_id',
        clientSecret: 'custom_client_secret',
        environment: 'sandbox'
      })
      expect(service).toBeDefined()
    })

    it('should throw error if client ID is missing', () => {
      delete process.env.TRADESAFE_CLIENT_ID
      expect(() => new TradeSafeService()).toThrow('TradeSafe client ID and secret are required')
    })

    it('should throw error if client secret is missing', () => {
      delete process.env.TRADESAFE_CLIENT_SECRET
      expect(() => new TradeSafeService()).toThrow('TradeSafe client ID and secret are required')
    })
  })

  describe('isSandbox', () => {
    it('should return true for sandbox environment', () => {
      const service = new TradeSafeService({
        clientId: 'test',
        clientSecret: 'test',
        environment: 'sandbox'
      })
      expect(service.isSandbox()).toBe(true)
    })

    it('should return false for production environment', () => {
      const service = new TradeSafeService({
        clientId: 'test',
        clientSecret: 'test',
        environment: 'production'
      })
      expect(service.isSandbox()).toBe(false)
    })
  })

  describe('authentication', () => {
    it('should authenticate and cache token', async () => {
      // Mock auth response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'test_access_token',
          token_type: 'bearer',
          expires_in: 3600
        })
      })

      // Mock GraphQL response for getApiProfile
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            apiProfile: {
              token: 'platform_token_id'
            }
          }
        })
      })

      const service = new TradeSafeService()
      const profile = await service.getApiProfile()

      // Should have called auth endpoint
      expect(mockFetch).toHaveBeenCalledWith(
        'https://auth.tradesafe.co.za/oauth/token',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })
      )

      expect(profile).toBe('platform_token_id')
    })

    it('should throw error on auth failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Invalid credentials')
      })

      const service = new TradeSafeService()
      await expect(service.getApiProfile()).rejects.toThrow('TradeSafe authentication failed')
    })
  })

  describe('createToken', () => {
    beforeEach(() => {
      // Mock successful auth
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'test_access_token',
          expires_in: 3600
        })
      })
    })

    it('should create token for user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            tokenCreate: {
              id: 'user_token_123',
              name: 'John Doe'
            }
          }
        })
      })

      const service = new TradeSafeService()
      const token = await service.createToken({
        givenName: 'John',
        familyName: 'Doe',
        email: 'john@example.com',
        mobile: '+27821234567'
      })

      expect(token.id).toBe('user_token_123')
      expect(token.name).toBe('John Doe')

      // Verify GraphQL call
      const graphqlCall = mockFetch.mock.calls[1]
      expect(graphqlCall[0]).toBe('https://api-developer.tradesafe.dev/graphql')
      expect(graphqlCall[1].headers['Authorization']).toBe('Bearer test_access_token')
    })

    it('should create token with banking details', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            tokenCreate: {
              id: 'user_token_456',
              name: 'Jane Doe'
            }
          }
        })
      })

      const service = new TradeSafeService()
      const token = await service.createToken({
        givenName: 'Jane',
        familyName: 'Doe',
        email: 'jane@example.com',
        mobile: '+27821234567',
        bankAccount: {
          accountNumber: '1234567890',
          accountType: 'CHEQUE',
          bank: 'FNB'
        }
      })

      expect(token.id).toBe('user_token_456')

      // Verify banking details in request
      const requestBody = JSON.parse(mockFetch.mock.calls[1][1].body)
      expect(requestBody.variables.input.bankAccount).toBeDefined()
    })
  })

  describe('createTransaction', () => {
    beforeEach(() => {
      // Mock successful auth
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'test_access_token',
          expires_in: 3600
        })
      })
    })

    it('should create transaction with buyer and seller', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            transactionCreate: {
              id: 'txn_123',
              title: 'Test Gig Payment',
              description: 'Payment for gig work',
              state: 'CREATED',
              createdAt: '2024-01-15T10:00:00Z',
              allocations: [{
                id: 'alloc_123',
                title: 'Test Gig Payment',
                value: 500,
                state: 'CREATED'
              }],
              parties: [
                { id: 'party_1', name: 'Buyer', role: 'BUYER' },
                { id: 'party_2', name: 'Seller', role: 'SELLER' }
              ]
            }
          }
        })
      })

      const service = new TradeSafeService()
      const transaction = await service.createTransaction({
        title: 'Test Gig Payment',
        description: 'Payment for gig work',
        value: 500,
        buyerToken: 'buyer_token_123',
        sellerToken: 'seller_token_456'
      })

      expect(transaction.id).toBe('txn_123')
      expect(transaction.state).toBe('CREATED')
      expect(transaction.allocations).toHaveLength(1)
      expect(transaction.parties).toHaveLength(2)
    })

    it('should create transaction with agent for platform fees', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            transactionCreate: {
              id: 'txn_456',
              title: 'Test Gig Payment',
              state: 'CREATED',
              createdAt: '2024-01-15T10:00:00Z',
              allocations: [{ id: 'alloc_456', title: 'Test', value: 500, state: 'CREATED' }],
              parties: [
                { id: 'party_1', name: 'Buyer', role: 'BUYER' },
                { id: 'party_2', name: 'Seller', role: 'SELLER' },
                { id: 'party_3', name: 'Platform', role: 'AGENT' }
              ]
            }
          }
        })
      })

      const service = new TradeSafeService()
      const transaction = await service.createTransaction({
        title: 'Test Gig Payment',
        description: 'Payment for gig work',
        value: 500,
        buyerToken: 'buyer_token',
        sellerToken: 'seller_token',
        agentToken: 'platform_token',
        agentFeePercent: 10
      })

      expect(transaction.parties).toHaveLength(3)
      expect(transaction.parties.some(p => p.role === 'AGENT')).toBe(true)

      // Verify agent details in request
      const requestBody = JSON.parse(mockFetch.mock.calls[1][1].body)
      const agentParty = requestBody.variables.input.parties.create.find(
        (p: { role: string }) => p.role === 'AGENT'
      )
      expect(agentParty.fee).toBe(10)
      expect(agentParty.feeType).toBe('PERCENT')
    })
  })

  describe('getCheckoutLink', () => {
    beforeEach(() => {
      // Mock successful auth
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'test_access_token',
          expires_in: 3600
        })
      })
    })

    it('should generate checkout link', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            checkoutLink: 'https://pay-sandbox.tradesafe.dev/checkout/abc123'
          }
        })
      })

      const service = new TradeSafeService()
      const link = await service.getCheckoutLink({
        transactionId: 'txn_123'
      })

      expect(link).toBe('https://pay-sandbox.tradesafe.dev/checkout/abc123')
    })

    it('should include embed option', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            checkoutLink: 'https://pay-sandbox.tradesafe.dev/checkout/abc123?embed=true'
          }
        })
      })

      const service = new TradeSafeService()
      await service.getCheckoutLink({
        transactionId: 'txn_123',
        embed: true
      })

      const requestBody = JSON.parse(mockFetch.mock.calls[1][1].body)
      expect(requestBody.variables.embed).toBe(true)
    })
  })

  describe('delivery actions', () => {
    beforeEach(() => {
      // Mock successful auth
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'test_access_token',
          expires_in: 3600
        })
      })
    })

    it('should start delivery', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            allocationStartDelivery: {
              id: 'alloc_123',
              title: 'Test',
              state: 'INITIATED'
            }
          }
        })
      })

      const service = new TradeSafeService()
      const allocation = await service.startDelivery('alloc_123')

      expect(allocation.state).toBe('INITIATED')
    })

    it('should complete delivery', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            allocationCompleteDelivery: {
              id: 'alloc_123',
              title: 'Test',
              state: 'DELIVERY_COMPLETE'
            }
          }
        })
      })

      const service = new TradeSafeService()
      const allocation = await service.completeDelivery('alloc_123')

      expect(allocation.state).toBe('DELIVERY_COMPLETE')
    })

    it('should accept delivery', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            allocationAcceptDelivery: {
              id: 'alloc_123',
              title: 'Test',
              state: 'ACCEPTED'
            }
          }
        })
      })

      const service = new TradeSafeService()
      const allocation = await service.acceptDelivery('alloc_123')

      expect(allocation.state).toBe('ACCEPTED')
    })
  })

  describe('cancelTransaction', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'test_access_token',
          expires_in: 3600
        })
      })
    })

    it('should cancel transaction with reason', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            transactionCancel: {
              id: 'txn_123',
              state: 'CANCELLED'
            }
          }
        })
      })

      const service = new TradeSafeService()
      const transaction = await service.cancelTransaction('txn_123', 'Gig cancelled by employer')

      expect(transaction.state).toBe('CANCELLED')

      const requestBody = JSON.parse(mockFetch.mock.calls[1][1].body)
      expect(requestBody.variables.comment).toBe('Gig cancelled by employer')
    })
  })

  describe('getTransaction', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'test_access_token',
          expires_in: 3600
        })
      })
    })

    it('should retrieve transaction by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            transaction: {
              id: 'txn_123',
              title: 'Test Transaction',
              description: 'Test',
              state: 'FUNDS_RECEIVED',
              createdAt: '2024-01-15T10:00:00Z',
              allocations: [{ id: 'alloc_1', title: 'Test', value: 500, state: 'FUNDS_RECEIVED' }],
              parties: []
            }
          }
        })
      })

      const service = new TradeSafeService()
      const transaction = await service.getTransaction('txn_123')

      expect(transaction?.id).toBe('txn_123')
      expect(transaction?.state).toBe('FUNDS_RECEIVED')
    })

    it('should return null for non-existent transaction', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          errors: [{ message: 'Transaction not found' }]
        })
      })

      const service = new TradeSafeService()
      const transaction = await service.getTransaction('invalid_id')

      expect(transaction).toBeNull()
    })
  })

  describe('webhook handling', () => {
    it('should parse webhook payload', () => {
      const service = new TradeSafeService()
      const payload = JSON.stringify({
        event: 'transaction.funded',
        transaction: {
          id: 'txn_123',
          state: 'FUNDS_RECEIVED'
        },
        allocation: {
          id: 'alloc_123'
        }
      })

      const result = service.parseWebhook(payload)

      expect(result).not.toBeNull()
      expect(result?.event).toBe('transaction.funded')
      expect(result?.transactionId).toBe('txn_123')
      expect(result?.allocationId).toBe('alloc_123')
      expect(result?.state).toBe('FUNDS_RECEIVED')
    })

    it('should return null for invalid JSON', () => {
      const service = new TradeSafeService()
      const result = service.parseWebhook('not valid json')

      expect(result).toBeNull()
    })
  })

  describe('GraphQL error handling', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'test_access_token',
          expires_in: 3600
        })
      })
    })

    it('should throw on GraphQL errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          errors: [{ message: 'Invalid token provided' }]
        })
      })

      const service = new TradeSafeService()
      await expect(service.createToken({
        givenName: 'Test',
        familyName: 'User',
        email: 'test@example.com',
        mobile: '+27821234567'
      })).rejects.toThrow('TradeSafe GraphQL error: Invalid token provided')
    })

    it('should throw on API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server error')
      })

      const service = new TradeSafeService()
      await expect(service.getApiProfile()).rejects.toThrow('TradeSafe API error')
    })
  })

  describe('production vs sandbox endpoints', () => {
    it('should use sandbox API for sandbox environment', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'token', expires_in: 3600 })
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: { apiProfile: { token: 'test' } }
        })
      })

      const service = new TradeSafeService({
        clientId: 'test',
        clientSecret: 'test',
        environment: 'sandbox'
      })
      await service.getApiProfile()

      expect(mockFetch.mock.calls[1][0]).toBe('https://api-developer.tradesafe.dev/graphql')
    })

    it('should use production API for production environment', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'token', expires_in: 3600 })
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: { apiProfile: { token: 'test' } }
        })
      })

      const service = new TradeSafeService({
        clientId: 'test',
        clientSecret: 'test',
        environment: 'production'
      })
      await service.getApiProfile()

      expect(mockFetch.mock.calls[1][0]).toBe('https://api.tradesafe.co.za/graphql')
    })
  })
})

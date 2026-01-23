/**
 * PaystackService Tests
 *
 * Tests for the Paystack payment gateway integration.
 */

import { PaystackService } from '@/lib/services/paystackService'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('PaystackService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_xxxxxxxxxxxxx'
    process.env.PAYSTACK_PUBLIC_KEY = 'pk_test_xxxxxxxxxxxxx'
  })

  afterEach(() => {
    delete process.env.PAYSTACK_SECRET_KEY
    delete process.env.PAYSTACK_PUBLIC_KEY
  })

  describe('constructor', () => {
    it('should create service with environment variables', () => {
      const service = new PaystackService()
      expect(service).toBeDefined()
    })

    it('should create service with config object', () => {
      const service = new PaystackService({
        secretKey: 'sk_test_custom',
        publicKey: 'pk_test_custom'
      })
      expect(service).toBeDefined()
    })

    it('should throw error if secret key is missing', () => {
      delete process.env.PAYSTACK_SECRET_KEY
      expect(() => new PaystackService()).toThrow('Paystack secret key is required')
    })
  })

  describe('toKobo', () => {
    it('should convert ZAR to kobo correctly', () => {
      expect(PaystackService.toKobo(100)).toBe(10000)
      expect(PaystackService.toKobo(1.50)).toBe(150)
      expect(PaystackService.toKobo(0.01)).toBe(1)
      expect(PaystackService.toKobo(1234.56)).toBe(123456)
    })

    it('should round fractional kobo', () => {
      expect(PaystackService.toKobo(1.234)).toBe(123)
      expect(PaystackService.toKobo(1.235)).toBe(124)
    })
  })

  describe('toZar', () => {
    it('should convert kobo to ZAR correctly', () => {
      expect(PaystackService.toZar(10000)).toBe(100)
      expect(PaystackService.toZar(150)).toBe(1.50)
      expect(PaystackService.toZar(1)).toBe(0.01)
      expect(PaystackService.toZar(123456)).toBe(1234.56)
    })
  })

  describe('formatAmount', () => {
    it('should format amount with 2 decimal places', () => {
      expect(PaystackService.formatAmount(100)).toBe('100.00')
      expect(PaystackService.formatAmount(1.5)).toBe('1.50')
      expect(PaystackService.formatAmount(1234.567)).toBe('1234.57')
    })
  })

  describe('generateReference', () => {
    it('should generate unique reference with prefix', () => {
      const ref1 = PaystackService.generateReference()
      const ref2 = PaystackService.generateReference()

      expect(ref1).toMatch(/^KSG_[A-Z0-9]+_[A-Z0-9]+$/)
      expect(ref2).toMatch(/^KSG_[A-Z0-9]+_[A-Z0-9]+$/)
      expect(ref1).not.toBe(ref2)
    })

    it('should use custom prefix', () => {
      const ref = PaystackService.generateReference('TEST')
      expect(ref).toMatch(/^TEST_[A-Z0-9]+_[A-Z0-9]+$/)
    })
  })

  describe('isPaymentSuccessful', () => {
    it('should return true for success status', () => {
      expect(PaystackService.isPaymentSuccessful('success')).toBe(true)
    })

    it('should return false for non-success statuses', () => {
      expect(PaystackService.isPaymentSuccessful('failed')).toBe(false)
      expect(PaystackService.isPaymentSuccessful('abandoned')).toBe(false)
      expect(PaystackService.isPaymentSuccessful('pending')).toBe(false)
    })
  })

  describe('isTestMode', () => {
    it('should return true for test keys', () => {
      const service = new PaystackService({
        secretKey: 'sk_test_xxxxx',
        publicKey: 'pk_test_xxxxx'
      })
      expect(service.isTestMode()).toBe(true)
    })

    it('should return false for live keys', () => {
      const service = new PaystackService({
        secretKey: 'sk_live_xxxxx',
        publicKey: 'pk_live_xxxxx'
      })
      expect(service.isTestMode()).toBe(false)
    })
  })

  describe('initializeTransaction', () => {
    it('should call Paystack API with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: true,
          message: 'Authorization URL created',
          data: {
            authorization_url: 'https://checkout.paystack.com/test',
            access_code: 'test_code',
            reference: 'KSG_TEST_123'
          }
        })
      })

      const service = new PaystackService()
      const result = await service.initializeTransaction({
        email: 'test@example.com',
        amount: 100,
        reference: 'KSG_TEST_123'
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.paystack.co/transaction/initialize',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk_test_xxxxxxxxxxxxx',
            'Content-Type': 'application/json'
          }),
          body: expect.any(String)
        })
      )

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(requestBody.email).toBe('test@example.com')
      expect(requestBody.amount).toBe(10000) // ZAR to kobo
      expect(requestBody.reference).toBe('KSG_TEST_123')
      expect(requestBody.currency).toBe('ZAR')

      expect(result.status).toBe(true)
      expect(result.data.authorization_url).toBe('https://checkout.paystack.com/test')
    })

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ message: 'Invalid amount' })
      })

      const service = new PaystackService()
      await expect(service.initializeTransaction({
        email: 'test@example.com',
        amount: 100,
        reference: 'KSG_TEST_123'
      })).rejects.toThrow('Paystack initialization failed')
    })
  })

  describe('verifyTransaction', () => {
    it('should call Paystack API to verify transaction', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: true,
          message: 'Verification successful',
          data: {
            id: 12345,
            status: 'success',
            reference: 'KSG_TEST_123',
            amount: 10000,
            fees: 290
          }
        })
      })

      const service = new PaystackService()
      const result = await service.verifyTransaction('KSG_TEST_123')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.paystack.co/transaction/verify/KSG_TEST_123',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk_test_xxxxxxxxxxxxx'
          })
        })
      )

      expect(result.status).toBe(true)
      expect(result.data.status).toBe('success')
    })
  })

  describe('validateWebhookSignature', () => {
    it('should validate correct signature', () => {
      const service = new PaystackService()
      const payload = '{"event":"charge.success"}'

      // Generate expected signature using the same algorithm
      const crypto = require('crypto')
      const expectedSignature = crypto
        .createHmac('sha512', 'sk_test_xxxxxxxxxxxxx')
        .update(payload)
        .digest('hex')

      expect(service.validateWebhookSignature(payload, expectedSignature)).toBe(true)
    })

    it('should reject incorrect signature', () => {
      const service = new PaystackService()
      const payload = '{"event":"charge.success"}'
      const wrongSignature = 'invalid_signature'

      expect(service.validateWebhookSignature(payload, wrongSignature)).toBe(false)
    })
  })

  describe('parseWebhookEvent', () => {
    it('should parse valid webhook event', () => {
      const service = new PaystackService()
      const event = {
        event: 'charge.success',
        data: {
          id: 12345,
          reference: 'KSG_TEST_123',
          status: 'success',
          amount: 10000
        }
      }
      const payload = JSON.stringify(event)

      const crypto = require('crypto')
      const signature = crypto
        .createHmac('sha512', 'sk_test_xxxxxxxxxxxxx')
        .update(payload)
        .digest('hex')

      const result = service.parseWebhookEvent(payload, signature)

      expect(result.isValid).toBe(true)
      expect(result.event?.event).toBe('charge.success')
      expect(result.event?.data.reference).toBe('KSG_TEST_123')
    })

    it('should reject webhook with invalid signature', () => {
      const service = new PaystackService()
      const payload = '{"event":"charge.success"}'

      const result = service.parseWebhookEvent(payload, 'wrong_signature')

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Invalid webhook signature')
    })

    it('should reject malformed JSON', () => {
      const service = new PaystackService()
      const payload = 'not valid json'

      const crypto = require('crypto')
      const signature = crypto
        .createHmac('sha512', 'sk_test_xxxxxxxxxxxxx')
        .update(payload)
        .digest('hex')

      const result = service.parseWebhookEvent(payload, signature)

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Failed to parse webhook payload')
    })
  })
})

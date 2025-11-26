import { PayFastService } from '@/lib/services/payfastService'
import crypto from 'crypto'

describe('PayFastService', () => {
  let service: PayFastService

  beforeEach(() => {
    // Initialize with sandbox credentials
    service = new PayFastService({
      merchantId: '10000100',
      merchantKey: '46f0cd694581a',
      passphrase: 'jt7NOE43FZPn',
      sandbox: true
    })
  })

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(service).toBeInstanceOf(PayFastService)
    })

    it('should throw error if merchant credentials are missing', () => {
      expect(() => {
        new PayFastService({
          merchantId: '',
          merchantKey: '',
          passphrase: '',
          sandbox: true
        })
      }).toThrow('PayFast merchant credentials are required')
    })

    it('should set correct base URL for sandbox mode', () => {
      const sandboxService = new PayFastService({
        merchantId: '10000100',
        merchantKey: '46f0cd694581a',
        passphrase: 'test',
        sandbox: true
      })
      expect(sandboxService.getPaymentUrl()).toContain('sandbox.payfast.co.za')
    })

    it('should set correct base URL for live mode', () => {
      const liveService = new PayFastService({
        merchantId: '10000100',
        merchantKey: '46f0cd694581a',
        passphrase: 'test',
        sandbox: false
      })
      expect(liveService.getPaymentUrl()).toContain('www.payfast.co.za')
    })
  })

  describe('createPayment', () => {
    it('should create payment data with correct fields', () => {
      const paymentData = service.createPayment({
        amount: 100.50,
        item_name: 'Test Gig',
        item_description: 'Testing payment creation',
        m_payment_id: 'test-12345',
        notify_url: 'https://example.com/itn',
        return_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel'
      })

      expect(paymentData.merchant_id).toBe('10000100')
      expect(paymentData.merchant_key).toBe('46f0cd694581a')
      expect(paymentData.amount).toBe(100.50)
      expect(paymentData.item_name).toBe('Test Gig')
      expect(paymentData.m_payment_id).toBe('test-12345')
      expect(paymentData.signature).toBeDefined()
      expect(paymentData.signature).toMatch(/^[a-f0-9]{32}$/) // MD5 hash format
    })

    it('should format amount to 2 decimal places', () => {
      const paymentData = service.createPayment({
        amount: 100.12345,
        item_name: 'Test',
        m_payment_id: 'test',
        notify_url: 'https://example.com/itn'
      })

      expect(paymentData.amount).toBe(100.12)
    })

    it('should include custom fields in payment data', () => {
      const paymentData = service.createPayment({
        amount: 100,
        item_name: 'Test',
        m_payment_id: 'test',
        notify_url: 'https://example.com/itn',
        custom_str1: 'gig-123',
        custom_str2: 'user-456',
        custom_int1: 789
      })

      expect(paymentData.custom_str1).toBe('gig-123')
      expect(paymentData.custom_str2).toBe('user-456')
      expect(paymentData.custom_int1).toBe(789)
    })

    it('should include customer details if provided', () => {
      const paymentData = service.createPayment({
        amount: 100,
        item_name: 'Test',
        m_payment_id: 'test',
        notify_url: 'https://example.com/itn',
        name_first: 'John',
        name_last: 'Doe',
        email_address: 'john@example.com',
        cell_number: '0821234567'
      })

      expect(paymentData.name_first).toBe('John')
      expect(paymentData.name_last).toBe('Doe')
      expect(paymentData.email_address).toBe('john@example.com')
      expect(paymentData.cell_number).toBe('0821234567')
    })
  })

  describe('signature generation', () => {
    it('should generate consistent signatures for same data', () => {
      const data1 = service.createPayment({
        amount: 100,
        item_name: 'Test',
        m_payment_id: 'test-123',
        notify_url: 'https://example.com/itn'
      })

      const data2 = service.createPayment({
        amount: 100,
        item_name: 'Test',
        m_payment_id: 'test-123',
        notify_url: 'https://example.com/itn'
      })

      expect(data1.signature).toBe(data2.signature)
    })

    it('should generate different signatures for different data', () => {
      const data1 = service.createPayment({
        amount: 100,
        item_name: 'Test 1',
        m_payment_id: 'test-123',
        notify_url: 'https://example.com/itn'
      })

      const data2 = service.createPayment({
        amount: 200,
        item_name: 'Test 2',
        m_payment_id: 'test-456',
        notify_url: 'https://example.com/itn'
      })

      expect(data1.signature).not.toBe(data2.signature)
    })

    it('should handle empty passphrase correctly', () => {
      // Service without passphrase should not append it to signature
      const serviceNoPass = new PayFastService({
        merchantId: '10000100',
        merchantKey: '46f0cd694581a',
        passphrase: '',
        sandbox: true
      })

      const paymentData = serviceNoPass.createPayment({
        amount: 100,
        item_name: 'Test',
        m_payment_id: 'test',
        notify_url: 'https://example.com/itn'
      })

      expect(paymentData.signature).toBeDefined()
      expect(paymentData.signature).toMatch(/^[a-f0-9]{32}$/)
    })
  })

  describe('generatePaymentForm', () => {
    it('should generate valid HTML form', () => {
      const paymentData = service.createPayment({
        amount: 100,
        item_name: 'Test Gig',
        m_payment_id: 'test-123',
        notify_url: 'https://example.com/itn'
      })

      const form = service.generatePaymentForm(paymentData, false)

      expect(form).toContain('<!DOCTYPE html>')
      expect(form).toContain('<form')
      expect(form).toContain('method="POST"')
      expect(form).toContain('action="https://sandbox.payfast.co.za/eng/process"')
      expect(form).toContain('name="merchant_id"')
      expect(form).toContain('name="amount"')
      expect(form).toContain('name="signature"')
    })

    it('should include auto-submit script when autoSubmit is true', () => {
      const paymentData = service.createPayment({
        amount: 100,
        item_name: 'Test',
        m_payment_id: 'test',
        notify_url: 'https://example.com/itn'
      })

      const form = service.generatePaymentForm(paymentData, true)

      expect(form).toContain('<script>')
      expect(form).toContain('.submit()')
    })

    it('should not include auto-submit script when autoSubmit is false', () => {
      const paymentData = service.createPayment({
        amount: 100,
        item_name: 'Test',
        m_payment_id: 'test',
        notify_url: 'https://example.com/itn'
      })

      const form = service.generatePaymentForm(paymentData, false)

      expect(form).not.toContain('<script>')
    })

    it('should include all payment fields as hidden inputs', () => {
      const paymentData = service.createPayment({
        amount: 100,
        item_name: 'Test Gig',
        m_payment_id: 'test-123',
        notify_url: 'https://example.com/itn',
        return_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        custom_str1: 'gig-123'
      })

      const form = service.generatePaymentForm(paymentData)

      expect(form).toContain('value="test-123"')
      expect(form).toContain('value="100"')
      expect(form).toContain('value="Test Gig"')
      expect(form).toContain('value="gig-123"')
    })
  })

  describe('validateITN', () => {
    it('should validate ITN with correct signature', async () => {
      const itnData = {
        m_payment_id: 'test-123',
        pf_payment_id: 'pf-456',
        payment_status: 'COMPLETE' as const,
        item_name: 'Test Gig',
        amount_gross: '100.00',
        amount_fee: '2.90',
        amount_net: '97.10',
        merchant_id: '10000100',
        signature: ''
      }

      // Calculate correct signature
      // IMPORTANT: PayFast expects plain text values (NOT URL-encoded) in signature
      const paramString = Object.entries(itnData)
        .filter(([key]) => key !== 'signature')
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value.toString().trim()}`)
        .join('&')

      itnData.signature = crypto
        .createHash('md5')
        .update(paramString + '&passphrase=jt7NOE43FZPn')
        .digest('hex')
        .toLowerCase()

      const result = await service.validateITN(itnData)

      expect(result.isValid).toBe(true)
      expect(result.data).toBeDefined()
    })

    it('should reject ITN with invalid signature', async () => {
      const itnData = {
        m_payment_id: 'test-123',
        pf_payment_id: 'pf-456',
        payment_status: 'COMPLETE' as const,
        item_name: 'Test Gig',
        amount_gross: '100.00',
        amount_fee: '2.90',
        amount_net: '97.10',
        merchant_id: '10000100',
        signature: 'invalid_signature_12345678901234567890'
      }

      const result = await service.validateITN(itnData)

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Invalid signature')
    })

    it('should reject ITN from invalid IP in production mode', async () => {
      const liveService = new PayFastService({
        merchantId: '10000100',
        merchantKey: '46f0cd694581a',
        passphrase: 'test',
        sandbox: false
      })

      const itnData = {
        m_payment_id: 'test-123',
        pf_payment_id: 'pf-456',
        payment_status: 'COMPLETE' as const,
        item_name: 'Test',
        amount_gross: '100.00',
        amount_fee: '2.90',
        amount_net: '97.10',
        merchant_id: '10000100',
        signature: ''
      }

      // Calculate valid signature so we can test IP validation
      // IMPORTANT: PayFast expects plain text values (NOT URL-encoded) in signature
      const paramString = Object.entries(itnData)
        .filter(([key]) => key !== 'signature')
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value.toString().trim()}`)
        .join('&')

      itnData.signature = crypto
        .createHash('md5')
        .update(paramString + '&passphrase=test')
        .digest('hex')
        .toLowerCase()

      const result = await liveService.validateITN(itnData, '192.168.1.1')

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Invalid source IP')
    })

    it('should accept ITN from valid PayFast IP in production', async () => {
      const liveService = new PayFastService({
        merchantId: '10000100',
        merchantKey: '46f0cd694581a',
        passphrase: 'test',
        sandbox: false
      })

      const itnData = {
        m_payment_id: 'test-123',
        pf_payment_id: 'pf-456',
        payment_status: 'COMPLETE' as const,
        item_name: 'Test',
        amount_gross: '100.00',
        amount_fee: '2.90',
        amount_net: '97.10',
        merchant_id: '10000100',
        signature: ''
      }

      // Calculate signature
      // IMPORTANT: PayFast expects plain text values (NOT URL-encoded) in signature
      const paramString = Object.entries(itnData)
        .filter(([key]) => key !== 'signature')
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value.toString().trim()}`)
        .join('&')

      itnData.signature = crypto
        .createHash('md5')
        .update(paramString + '&passphrase=test')
        .digest('hex')
        .toLowerCase()

      const result = await liveService.validateITN(itnData, '197.97.145.144')

      expect(result.isValid).toBe(true)
    })
  })

  describe('utility methods', () => {
    it('should parse amount string to number', () => {
      expect(PayFastService.parseAmount('100.00')).toBe(100.00)
      expect(PayFastService.parseAmount('99.99')).toBe(99.99)
      expect(PayFastService.parseAmount('1234.56')).toBe(1234.56)
    })

    it('should format amount to 2 decimal places', () => {
      expect(PayFastService.formatAmount(100)).toBe('100.00')
      expect(PayFastService.formatAmount(99.9)).toBe('99.90')
      expect(PayFastService.formatAmount(1234.5678)).toBe('1234.57')
    })

    it('should identify complete payments', () => {
      expect(PayFastService.isPaymentComplete('COMPLETE')).toBe(true)
      expect(PayFastService.isPaymentComplete('FAILED')).toBe(false)
      expect(PayFastService.isPaymentComplete('PENDING')).toBe(false)
      expect(PayFastService.isPaymentComplete('CANCELLED')).toBe(false)
    })

    it('should return sandbox credentials', () => {
      const credentials = PayFastService.getSandboxCredentials()
      expect(credentials.merchantId).toBe('10000100')
      expect(credentials.merchantKey).toBe('46f0cd694581a')
    })
  })
})

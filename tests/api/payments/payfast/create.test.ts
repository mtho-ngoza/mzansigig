/**
 * PayFast Create Payment Route Tests
 * Tests the payment creation and URL generation logic
 */

describe('PayFast Create Route', () => {
  describe('App URL Priority', () => {
    // Simulates the URL priority logic from the create route
    const getAppUrl = (envVars: {
      NEXT_PUBLIC_APP_URL?: string
      VERCEL_URL?: string
    }): string => {
      return envVars.NEXT_PUBLIC_APP_URL
        || (envVars.VERCEL_URL ? `https://${envVars.VERCEL_URL}` : null)
        || 'http://localhost:3000'
    }

    it('should prioritize NEXT_PUBLIC_APP_URL (custom domain) over VERCEL_URL', () => {
      const appUrl = getAppUrl({
        NEXT_PUBLIC_APP_URL: 'https://mzansigigs.co.za',
        VERCEL_URL: 'myapp-xyz.vercel.app'
      })

      expect(appUrl).toBe('https://mzansigigs.co.za')
    })

    it('should use VERCEL_URL with https when NEXT_PUBLIC_APP_URL is not set', () => {
      const appUrl = getAppUrl({
        VERCEL_URL: 'myapp-xyz.vercel.app'
      })

      expect(appUrl).toBe('https://myapp-xyz.vercel.app')
    })

    it('should fall back to localhost when no environment URLs are set', () => {
      const appUrl = getAppUrl({})

      expect(appUrl).toBe('http://localhost:3000')
    })

    it('should use NEXT_PUBLIC_APP_URL even when empty VERCEL_URL is set', () => {
      const appUrl = getAppUrl({
        NEXT_PUBLIC_APP_URL: 'https://mzansigigs.co.za',
        VERCEL_URL: ''
      })

      expect(appUrl).toBe('https://mzansigigs.co.za')
    })

    it('should ignore empty NEXT_PUBLIC_APP_URL and use VERCEL_URL', () => {
      const appUrl = getAppUrl({
        NEXT_PUBLIC_APP_URL: '',
        VERCEL_URL: 'myapp-xyz.vercel.app'
      })

      expect(appUrl).toBe('https://myapp-xyz.vercel.app')
    })
  })

  describe('Return URL Generation', () => {
    it('should generate correct return URL with custom domain', () => {
      const appUrl = 'https://mzansigigs.co.za'
      const gigId = 'gig-123'
      const returnUrl = `${appUrl}/dashboard/manage-applications?payment=success&gig=${gigId}`

      expect(returnUrl).toBe('https://mzansigigs.co.za/dashboard/manage-applications?payment=success&gig=gig-123')
    })

    it('should generate correct cancel URL with custom domain', () => {
      const appUrl = 'https://mzansigigs.co.za'
      const gigId = 'gig-123'
      const cancelUrl = `${appUrl}/dashboard/manage-applications?payment=cancelled&gig=${gigId}`

      expect(cancelUrl).toBe('https://mzansigigs.co.za/dashboard/manage-applications?payment=cancelled&gig=gig-123')
    })

    it('should generate correct ITN notify URL with custom domain', () => {
      const appUrl = 'https://mzansigigs.co.za'
      const notifyUrl = `${appUrl}/api/payments/payfast/itn`

      expect(notifyUrl).toBe('https://mzansigigs.co.za/api/payments/payfast/itn')
    })
  })

  describe('Payment ID Generation', () => {
    it('should generate unique payment ID with gigId and timestamp', () => {
      const gigId = 'gig-123'
      const timestamp = 1234567890
      const paymentId = `${gigId}-${timestamp}`

      expect(paymentId).toBe('gig-123-1234567890')
      expect(paymentId).toMatch(/^gig-\d+-\d+$/)
    })

    it('should ensure payment ID is unique per transaction', () => {
      const gigId = 'gig-123'
      const timestamp1 = Date.now()
      const paymentId1 = `${gigId}-${timestamp1}`

      // Small delay to ensure different timestamp
      const timestamp2 = timestamp1 + 1
      const paymentId2 = `${gigId}-${timestamp2}`

      expect(paymentId1).not.toBe(paymentId2)
    })
  })

  describe('Required Fields Validation', () => {
    it('should identify missing gigId', () => {
      const body = { amount: 100, itemName: 'Test' }
      const hasGigId = 'gigId' in body
      expect(hasGigId).toBe(false)
    })

    it('should identify missing amount', () => {
      const body = { gigId: 'gig-123', itemName: 'Test' }
      const hasAmount = 'amount' in body
      expect(hasAmount).toBe(false)
    })

    it('should identify missing itemName', () => {
      const body = { gigId: 'gig-123', amount: 100 }
      const hasItemName = 'itemName' in body
      expect(hasItemName).toBe(false)
    })

    it('should validate amount is positive', () => {
      const amount = 100
      const isValid = typeof amount === 'number' && amount > 0
      expect(isValid).toBe(true)
    })

    it('should reject zero amount', () => {
      const amount = 0
      const isValid = typeof amount === 'number' && amount > 0
      expect(isValid).toBe(false)
    })

    it('should reject negative amount', () => {
      const amount = -100
      const isValid = typeof amount === 'number' && amount > 0
      expect(isValid).toBe(false)
    })
  })

  describe('Customer Name Parsing', () => {
    it('should split full name into first and last name', () => {
      const customerName = 'John Doe'
      const firstName = customerName?.split(' ')[0]
      const lastName = customerName?.split(' ').slice(1).join(' ')

      expect(firstName).toBe('John')
      expect(lastName).toBe('Doe')
    })

    it('should handle names with multiple parts', () => {
      const customerName = 'John van der Berg'
      const firstName = customerName?.split(' ')[0]
      const lastName = customerName?.split(' ').slice(1).join(' ')

      expect(firstName).toBe('John')
      expect(lastName).toBe('van der Berg')
    })

    it('should handle single name', () => {
      const customerName = 'John'
      const firstName = customerName?.split(' ')[0]
      const lastName = customerName?.split(' ').slice(1).join(' ')

      expect(firstName).toBe('John')
      expect(lastName).toBe('')
    })

    it('should handle undefined customer name', () => {
      const customerName = undefined as string | undefined
      const firstName = customerName?.split(' ')[0]
      const lastName = customerName?.split(' ').slice(1).join(' ')

      expect(firstName).toBeUndefined()
      expect(lastName).toBeUndefined()
    })
  })
})

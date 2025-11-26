# PayFast Integration Guide

This document explains how PayFast payment gateway integration works in MzansiGig.

## Overview

PayFast is South Africa's leading payment gateway, trusted by over 80,000 businesses. It supports various payment methods including:
- Credit/Debit Cards (Visa, Mastercard)
- Instant EFT
- Zapper
- SnapScan
- Mobicred

## Integration Architecture

### 1. Payment Flow

```
User → Fund Gig → Create Payment → Redirect to PayFast → Complete Payment → ITN Webhook → Update Database
```

**Detailed Steps:**

1. **User Initiates Payment**
   - User clicks "Fund Gig" button
   - `PayFastPayment` component is shown

2. **Payment Creation** (`POST /api/payments/payfast/create`)
   - Validates gig and amount
   - Creates payment data with signature
   - Generates HTML form that auto-submits to PayFast
   - Stores payment intent in Firestore

3. **PayFast Processing**
   - User is redirected to PayFast's secure payment page
   - User completes payment using their preferred method
   - PayFast processes the transaction

4. **ITN (Instant Transaction Notification)**
   - PayFast sends POST request to `/api/payments/payfast/itn`
   - Webhook validates signature and source IP
   - Updates gig status, creates escrow, credits wallet
   - All done atomically in a Firestore transaction

5. **User Redirect**
   - Success: Redirected to `/dashboard?payment=success&gig={gigId}`
   - Cancelled: Redirected to `/dashboard?payment=cancelled&gig={gigId}`

### 2. Files and Components

#### Service Layer
- **`lib/services/payfastService.ts`** - Core PayFast integration
  - Payment data creation
  - Signature generation (MD5 with passphrase)
  - ITN validation
  - Payment form HTML generation

#### API Routes
- **`app/api/payments/payfast/create/route.ts`** - Payment creation endpoint
  - Accepts: `{ gigId, amount, itemName, itemDescription, customerEmail, customerName }`
  - Returns: HTML form that redirects to PayFast

- **`app/api/payments/payfast/itn/route.ts`** - Webhook handler
  - Validates ITN from PayFast
  - Processes payment completion
  - Updates database atomically

#### UI Components
- **`components/payment/PayFastPayment.tsx`** - Payment UI component
  - Shows payment summary
  - Displays security information
  - Initiates payment flow

#### Tests
- **`tests/lib/services/payfastService.test.ts`** - 23 comprehensive tests
  - Signature generation
  - Payment creation
  - ITN validation
  - IP whitelisting
  - Form generation

## Configuration

### Environment Variables

Add these to `.env.production.local`:

```bash
# PayFast Credentials
PAYFAST_MERCHANT_ID=your_merchant_id
PAYFAST_MERCHANT_KEY=your_merchant_key
PAYFAST_PASSPHRASE=your_passphrase
PAYFAST_MODE=test  # or 'live' for production

# Application URLs (for ITN callback)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Sandbox Testing

For testing, use PayFast's sandbox credentials:

```bash
PAYFAST_MERCHANT_ID=10000100
PAYFAST_MERCHANT_KEY=46f0cd694581a
PAYFAST_PASSPHRASE=your_test_passphrase
PAYFAST_MODE=test
```

**Sandbox URL:** https://sandbox.payfast.co.za

### Production Setup

1. **Create PayFast Account**
   - Sign up at https://www.payfast.co.za
   - Complete merchant verification

2. **Get Credentials**
   - Login to PayFast dashboard
   - Navigate to Settings → Integration
   - Copy Merchant ID and Merchant Key
   - Generate a secure passphrase

3. **Configure ITN**
   - In PayFast dashboard, set Notify URL (ITN):
     `https://yourdomain.com/api/payments/payfast/itn`

4. **Set Return URLs**
   - These are set programmatically in the payment creation flow
   - Success: `https://yourdomain.com/dashboard?payment=success&gig={gigId}`
   - Cancel: `https://yourdomain.com/dashboard?payment=cancelled&gig={gigId}`

## Security

### 1. Signature Verification

All PayFast requests include an MD5 signature. The signature is generated from:

```
amount=100.00&item_name=Test&merchant_id=10000100&...&passphrase=your_passphrase
```

**Important Notes:**
- Parameters MUST be sorted alphabetically
- Values MUST be URL encoded
- Empty passphrase should NOT be appended (2025 production lesson)
- Signature must be lowercase MD5 hash

### 2. IP Whitelisting

In production mode, ITN requests are validated against PayFast's IP addresses:
- 197.97.145.144
- 41.74.179.194
- 41.74.179.195
- 41.74.179.196
- 41.74.179.197
- 41.74.179.198
- 41.74.179.199

### 3. Immediate Response

The ITN webhook MUST respond with HTTP 200 within 10 seconds, otherwise PayFast will retry.

Our implementation:
1. Immediately acknowledges receipt (HTTP 200)
2. Validates signature and IP
3. Processes payment asynchronously
4. Returns success/failure status

## Usage Example

### In a Component

```tsx
import PayFastPayment from '@/components/payment/PayFastPayment'

function FundGigPage() {
  const handleSuccess = () => {
    // Payment initiated, user will be redirected to PayFast
    console.log('Payment initiated')
  }

  return (
    <PayFastPayment
      gigId="gig-123"
      amount={500.00}
      gigTitle="Website Development"
      gigDescription="Build a responsive website"
      onSuccess={handleSuccess}
      onCancel={() => router.push('/dashboard')}
    />
  )
}
```

### Direct API Call

```typescript
const response = await fetch('/api/payments/payfast/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': user.uid
  },
  body: JSON.stringify({
    gigId: 'gig-123',
    amount: 500.00,
    itemName: 'Website Development',
    itemDescription: 'Build a responsive website',
    customerEmail: 'user@example.com',
    customerName: 'John Doe'
  })
})

// Get HTML form that redirects to PayFast
const html = await response.text()

// Open in current or new window
document.write(html)
```

## Database Schema

### Payment Intent

```typescript
{
  gigId: string
  userId: string
  amount: number
  provider: 'payfast'
  status: 'created' | 'succeeded' | 'failed'
  paymentId: string  // m_payment_id
  createdAt: Timestamp
  expiresAt: Date  // 30 minutes from creation
  providerTransactionId?: string  // pf_payment_id
  completedAt?: Timestamp
  updatedAt?: Timestamp
  failureReason?: string
}
```

### Payment Record

```typescript
{
  id: string
  gigId: string
  employerId: string
  workerId: string | null
  amount: number
  grossAmount: number
  fees: number
  currency: 'ZAR'
  type: 'fixed' | 'hourly' | 'milestone'
  status: 'completed' | 'failed'
  provider: 'payfast'
  providerTransactionId: string  // pf_payment_id
  escrowStatus: 'funded'
  createdAt: Timestamp
  completedAt: Timestamp
  description: string
  metadata: {
    m_payment_id: string
    merchant_id: string
    payment_status: string
  }
}
```

### Escrow Record

```typescript
{
  id: string  // Same as gigId
  gigId: string
  employerId: string
  workerId: string | null
  totalAmount: number
  releasedAmount: number
  status: 'active' | 'completed' | 'disputed'
  paymentTransactionId: string
  createdAt: Timestamp
}
```

## Testing

### Run Tests

```bash
npm test -- tests/lib/services/payfastService.test.ts
```

### Test Coverage

- ✅ Payment creation
- ✅ Signature generation
- ✅ Form HTML generation
- ✅ ITN validation
- ✅ IP whitelisting
- ✅ Amount formatting
- ✅ Error handling

**23/23 tests passing**

### Manual Testing

1. **Sandbox Mode**
   - Use sandbox credentials
   - Access https://sandbox.payfast.co.za
   - Test with fake card numbers provided by PayFast

2. **ITN Testing**
   - Use ngrok or similar to expose local webhook
   - PayFast sandbox will send real ITN requests
   - Verify signature validation and payment processing

3. **Production Testing**
   - Start with small amounts
   - Test full flow with real payment
   - Verify escrow creation and wallet updates

## Common Issues

### 1. Signature Mismatch

**Error:** "Invalid signature - ITN may be fraudulent"

**Causes:**
- Passphrase mismatch
- URL encoding issues
- Parameter ordering incorrect
- Empty passphrase being appended

**Solution:**
- Verify passphrase matches PayFast dashboard
- Ensure parameters are sorted alphabetically
- Check URL encoding of values
- Don't append empty passphrase

### 2. ITN Not Received

**Causes:**
- Incorrect notify_url
- Firewall blocking PayFast IPs
- Webhook responding too slowly (>10s)

**Solution:**
- Verify notify_url in payment creation
- Whitelist PayFast IPs: 197.97.145.*, 41.74.179.194-199
- Optimize webhook to respond within 10 seconds

### 3. Payment Stuck in Processing

**Causes:**
- ITN validation failed
- Database transaction error
- Webhook error not logged

**Solution:**
- Check webhook logs in production
- Verify Firestore permissions
- Check payment_intents collection for stuck payments

## Troubleshooting

### Debug Mode

Enable detailed logging in ITN webhook:

```typescript
console.log('PayFast ITN received:', {
  m_payment_id: itnData.m_payment_id,
  payment_status: itnData.payment_status,
  amount_gross: itnData.amount_gross,
  signature: itnData.signature,
  sourceIp: sourceIp
})
```

### Webhook Testing Tool

Use PayFast's ITN testing tool in their dashboard to send test ITN requests to your webhook.

### Verify Payment Status

```typescript
// Check payment intent status
const intent = await db.collection('payment_intents')
  .where('gigId', '==', gigId)
  .orderBy('createdAt', 'desc')
  .limit(1)
  .get()

console.log('Payment Intent:', intent.docs[0]?.data())

// Check payment record
const payment = await db.collection('payments')
  .where('gigId', '==', gigId)
  .get()

console.log('Payment Records:', payment.docs.map(d => d.data()))
```

## Additional Resources

- [PayFast Documentation](https://developers.payfast.co.za/)
- [PayFast API Reference](https://developers.payfast.co.za/api)
- [PayFast ITN Guide](https://developers.payfast.co.za/documentation/#itn-step-by-step-guide)
- [PayFast Sandbox](https://sandbox.payfast.co.za)
- [PayFast Support](https://support.payfast.help/)

## License

This integration is part of MzansiGig platform. See main LICENSE file.

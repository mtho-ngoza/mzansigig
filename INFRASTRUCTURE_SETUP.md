# Infrastructure Setup Guide

This guide provides step-by-step instructions for setting up production infrastructure for Kasigig.

**Estimated Setup Time**: 3-5 days (including account approvals)

---

## Table of Contents

1. [Payment Gateway Integration](#1-payment-gateway-integration)
2. [Firebase Production Setup](#2-firebase-production-setup)
3. [Google Cloud Vision API](#3-google-cloud-vision-api)
4. [Legal Documents](#4-legal-documents)
5. [Environment Variables](#5-environment-variables)
6. [Testing Checklist](#6-testing-checklist)

---

## 1. Payment Gateway Integration

### Overview

Kasigig requires a payment gateway for escrow payments between employers and workers. The platform needs to:
- Accept card payments from employers
- Hold funds in escrow
- Release payments to workers upon gig completion
- Handle refunds if needed

### South African Payment Gateway Options

#### Option A: PayFast (Recommended for MVP) ⭐

**Pros**:
- Most popular in South Africa
- Simple integration, well-documented
- Supports escrow/split payments
- No setup fee, R99/month

**Pricing**:
- Monthly fee: R99
- Transaction fee: 2.9% + R2 per transaction
- No hidden fees

**Setup Steps**:

1. **Create PayFast Account**
   - Go to https://www.payfast.co.za
   - Sign up for merchant account
   - Choose "Business" account type
   - **Documents needed**: ID, proof of address, bank statement

2. **Enable Test Mode**
   - Log in to PayFast dashboard
   - Go to Settings → Integration
   - Note your **Merchant ID** and **Merchant Key**
   - Copy **Passphrase** (you'll set this)

3. **Configure Webhook/IPN**
   - Set Notify URL: `https://yourdomain.com/api/payfast/notify`
   - Set Return URL: `https://yourdomain.com/payment/success`
   - Set Cancel URL: `https://yourdomain.com/payment/cancelled`

4. **Add to Environment Variables**
   ```bash
   PAYFAST_MERCHANT_ID=your_merchant_id
   PAYFAST_MERCHANT_KEY=your_merchant_key
   PAYFAST_PASSPHRASE=your_secure_passphrase
   PAYFAST_MODE=test  # Change to 'live' for production
   ```

5. **Test Integration**
   - Use test card: 4242 4242 4242 4242
   - Test successful payment flow
   - Test failed payment flow
   - Test refund flow
   - Verify webhook notifications

6. **Go Live**
   - Submit business verification documents
   - Wait for approval (2-5 business days)
   - Change `PAYFAST_MODE=live`
   - Test with small real transaction

**Integration Code Location**:
- Payment API: `pages/api/payfast/*` (needs to be created)
- Payment Service: Update `lib/services/paymentService.ts`
- Frontend Component: `components/payment/PaymentDialog.tsx` (already exists)

**PayFast Documentation**: https://developers.payfast.co.za/docs

---

#### Option B: Yoco

**Pros**:
- Modern, developer-friendly
- Flat 2.95% fee (simpler pricing)
- Good mobile experience
- Quick approval process

**Pricing**:
- No monthly fee
- Transaction fee: 2.95% flat (no per-transaction fee)

**Setup Steps**:

1. **Create Yoco Account**
   - Go to https://www.yoco.com
   - Sign up for business account
   - **Documents needed**: ID, business registration (if applicable)

2. **Get API Keys**
   - Log in to Yoco Portal
   - Go to Developers → API Keys
   - Copy **Secret Key** and **Public Key**
   - Test keys start with `sk_test_` and `pk_test_`

3. **Configure Webhooks**
   - Go to Developers → Webhooks
   - Add endpoint: `https://yourdomain.com/api/yoco/webhook`
   - Select events: `payment.succeeded`, `payment.failed`, `refund.succeeded`

4. **Add to Environment Variables**
   ```bash
   YOCO_SECRET_KEY=sk_test_xxxxxxxxxxxxx
   YOCO_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx
   YOCO_MODE=test  # Change to 'live' for production
   ```

**Yoco Documentation**: https://developer.yoco.com/online/resources/integration-guide

---

#### Option C: PayGate

**Pros**:
- Enterprise-grade
- Advanced fraud protection
- 3D Secure support
- Good for high-volume

**Cons**:
- More complex integration
- Custom pricing (need to contact sales)
- Longer approval process

**Best for**: If you expect high transaction volumes (>R500k/month)

**Setup**: Contact PayGate sales at sales@paygate.co.za

---

### Recommended Choice

**For MVP/Launch**: PayFast
- Easiest integration
- Most documentation/community support
- Predictable pricing
- Can switch later if needed

---

## 2. Firebase Production Setup

### Current Status
- ✅ Security rules deployed
- ⏳ Production project configuration
- ⏳ Auth domains setup
- ⏳ Billing alerts

### Setup Steps

#### 2.1 Create Production Firebase Project

1. **Go to Firebase Console**
   - Visit https://console.firebase.google.com
   - Click "Add project"
   - Project name: "kasigig-production" (or your choice)

2. **Enable Required Services**
   - **Authentication**: Email/Password, Google Sign-In (optional)
   - **Firestore Database**: Production mode
   - **Storage**: For profile photos, ID documents, portfolio items
   - **Cloud Functions**: For backend processing (optional but recommended)

3. **Configure Firestore**
   - Go to Firestore Database
   - Choose location: `europe-west1` or closest to South Africa
   - **Important**: Location cannot be changed later!
   - Deploy security rules from `firestore.rules`

4. **Configure Firebase Storage**
   - Go to Storage
   - Choose same location as Firestore
   - Deploy rules from `storage.rules`

#### 2.2 Set Up Authentication

1. **Enable Sign-In Methods**
   - Go to Authentication → Sign-in method
   - Enable "Email/Password"
   - Optionally enable "Google" for easier sign-up

2. **Configure Authorized Domains**
   - Go to Authentication → Settings → Authorized domains
   - Add your production domain: `kasigigs.co.za` (example)
   - Add staging domain if you have one

3. **Email Templates**
   - Go to Authentication → Templates
   - Customize email templates:
     - Email verification
     - Password reset
     - Email address change
   - Update sender name to "Kasigig"
   - Add your support email

#### 2.3 Set Up Billing Alerts

1. **Enable Billing**
   - Go to Project Settings → Usage and billing
   - Set up billing account (required for production)

2. **Set Budget Alerts**
   - Go to Google Cloud Console
   - Billing → Budgets & alerts
   - Create budget:
     - Monthly budget: R1,000 (adjust based on expected usage)
     - Alert at: 50%, 90%, 100%
     - Email notifications to your email

3. **Expected Costs** (for 1000 active users):
   - Firestore: R200-500/month
   - Storage: R50-200/month
   - Authentication: Free (up to 50k users)
   - **Total**: ~R300-800/month

#### 2.4 Environment Variables

Create production Firebase config:

```bash
# Firebase Production Config
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=kasigig-production.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=kasigig-production
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=kasigig-production.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

**Where to get these**:
- Go to Project Settings → General → Your apps
- Click on web app (</> icon)
- Copy the config object

#### 2.5 Deploy Security Rules

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize (if not done)
firebase init

# Deploy rules
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

---

## 3. Google Cloud Vision API

### Overview

Kasigig uses Google Cloud Vision API for ID verification (OCR to extract ID details from uploaded documents).

**Current Implementation**: `lib/services/idVerificationService.ts`

### Setup Steps

#### 3.1 Enable Vision API

1. **Go to Google Cloud Console**
   - Visit https://console.cloud.google.com
   - Select your Firebase project (or create new one)

2. **Enable Vision API**
   - Go to APIs & Services → Library
   - Search for "Cloud Vision API"
   - Click "Enable"

3. **Create Service Account** (for server-side)
   - Go to IAM & Admin → Service Accounts
   - Click "Create Service Account"
   - Name: "kasigig-vision-api"
   - Role: "Cloud Vision AI Service Agent"
   - Click "Create Key" → JSON
   - Download JSON file (keep secure!)

#### 3.2 Configure API Key

**Option A: Service Account (Recommended for Production)**

```bash
# Add service account JSON to environment
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Or add JSON content directly
GOOGLE_CLOUD_CREDENTIALS='{"type":"service_account","project_id":"..."}'
```

**Option B: API Key (Easier for testing)**

1. Go to APIs & Services → Credentials
2. Create credentials → API key
3. Restrict API key:
   - Application restrictions: HTTP referrers
   - Add your domain: `kasigigs.co.za/*`
   - API restrictions: Cloud Vision API only

```bash
GOOGLE_VISION_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXX
```

#### 3.3 Set Quotas and Alerts

1. **Check Default Quotas**
   - Go to APIs & Services → Cloud Vision API → Quotas
   - Default: 1,800 requests/minute (more than enough)

2. **Set Budget Alert**
   - Vision API pricing: $1.50 per 1000 images
   - Expected cost for 500 verifications/month: ~$0.75
   - Set alert at $10/month

#### 3.4 Update Code

The current code likely needs updates to use production credentials:

```typescript
// lib/services/idVerificationService.ts
import vision from '@google-cloud/vision'

const client = new vision.ImageAnnotatorClient({
  credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS || '{}')
})
```

---

## 4. Legal Documents

### Overview

South African law (POPIA - Protection of Personal Information Act) requires clear privacy policies and terms of service.

### Required Documents

#### 4.1 Terms of Service

**Must include**:
- Service description
- User obligations
- Payment terms
- Refund policy
- Dispute resolution
- Limitation of liability
- Governing law (South African law)

**Template Location**: Create at `public/legal/terms-of-service.md`

**Key Sections**:
```markdown
# Terms of Service

Last Updated: [DATE]

## 1. Acceptance of Terms
By accessing Kasigig, you agree to these terms...

## 2. Service Description
Kasigig is a platform connecting employers with workers...

## 3. User Accounts
- Workers must be 18+ years old
- Accurate information required
- Account security is user's responsibility

## 4. Payment Terms
- Escrow system: funds held until gig completion
- Platform fee: [X]% per transaction
- Refund policy: [conditions]

## 5. Prohibited Activities
- Fraud
- Harassment
- Off-platform payments

## 6. Limitation of Liability
Kasigig is a platform, not an employer...

## 7. Dispute Resolution
[Process for handling disputes]

## 8. Governing Law
These terms are governed by South African law...
```

#### 4.2 Privacy Policy (POPIA Compliant)

**Must include**:
- What data you collect
- How you use it
- Who you share it with
- User rights (access, deletion, correction)
- Data security measures
- Contact information for privacy concerns

**Template Location**: Create at `public/legal/privacy-policy.md`

**Key Sections**:
```markdown
# Privacy Policy

Last Updated: [DATE]

## 1. Introduction
We respect your privacy and comply with POPIA...

## 2. Information We Collect
- Personal: Name, ID number, email, phone
- Profile: Location, skills, photo
- Payment: Bank details (stored by payment gateway)
- Usage: How you use the platform

## 3. How We Use Your Information
- Facilitate gig matching
- Process payments
- Verify identity
- Prevent fraud
- Improve service

## 4. Data Sharing
- Payment gateway (PayFast/Yoco)
- Government authorities (if required by law)
- We NEVER sell your data

## 5. Your Rights (POPIA)
- Access your data
- Correct inaccuracies
- Request deletion
- Object to processing
- Data portability

## 6. Data Security
- Encrypted storage
- Secure payment processing
- Regular security audits

## 7. Contact Us
For privacy concerns: privacy@kasigigs.co.za
```

#### 4.3 Cookie Policy (If using analytics)

If you use Google Analytics or similar:

```markdown
# Cookie Policy

We use cookies for:
- Authentication (necessary)
- Analytics (optional - can be disabled)
- User preferences

You can control cookies in your browser settings.
```

#### 4.4 ID Verification Consent

Special consent for collecting ID documents:

```markdown
# ID Verification Consent

By uploading your ID document, you consent to:
- OCR processing to extract information
- Secure encrypted storage
- Use for verification purposes only
- Deletion upon account closure (or after X years)
```

### Implementation Steps

1. **Create Legal Pages**
   - Create `pages/legal/terms.tsx`
   - Create `pages/legal/privacy.tsx`
   - Link from footer

2. **Add Acceptance Checkboxes**
   - Update signup forms to require acceptance
   - Log acceptance timestamp in user document

```typescript
// Example: SignUpForm
const [acceptedTerms, setAcceptedTerms] = useState(false)
const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)

// In user document
{
  acceptedTermsAt: new Date(),
  acceptedPrivacyAt: new Date(),
  termsVersion: '1.0',
  privacyVersion: '1.0'
}
```

3. **Add to Firestore Schema**

```typescript
// types/user.ts
export interface User {
  // ... existing fields
  legal: {
    acceptedTermsAt: Date
    acceptedPrivacyAt: Date
    termsVersion: string
    privacyVersion: string
  }
}
```

### Legal Review Recommendation

⚠️ **Important**: Have these documents reviewed by a South African lawyer familiar with:
- POPIA (Protection of Personal Information Act)
- ECT Act (Electronic Communications and Transactions Act)
- Labour law (for gig worker relationships)

**Cost**: R5,000 - R15,000 for legal review

**Alternative**: Use template services like GetTerms.io or Termly (adjust for South African law)

---

## 5. Environment Variables

### Complete .env.production File

```bash
# ============================================
# KASIGIG PRODUCTION ENVIRONMENT VARIABLES
# ============================================

# ------------------
# Firebase Config
# ------------------
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=kasigig-production.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=kasigig-production
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=kasigig-production.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# ------------------
# Payment Gateway (PayFast)
# ------------------
PAYFAST_MERCHANT_ID=10000100
PAYFAST_MERCHANT_KEY=46f0cd694581a
PAYFAST_PASSPHRASE=your_secure_passphrase_here
PAYFAST_MODE=live  # 'test' or 'live'

# ------------------
# Google Cloud Vision API
# ------------------
GOOGLE_CLOUD_CREDENTIALS='{"type":"service_account","project_id":"..."}'
# OR
GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/google-credentials.json

# ------------------
# Application URLs
# ------------------
NEXT_PUBLIC_APP_URL=https://kasigigs.co.za
NEXT_PUBLIC_API_URL=https://kasigigs.co.za/api

# ------------------
# Security
# ------------------
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
NEXTAUTH_URL=https://kasigigs.co.za

# ------------------
# Email (Optional - for notifications)
# ------------------
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@kasigigs.co.za
SMTP_PASSWORD=your_app_password
SMTP_FROM=Mzansigig <noreply@kasigigs.co.za>

# ------------------
# SMS (Optional - for emergency notifications)
# ------------------
# If using Twilio, Africa's Talking, or similar
SMS_API_KEY=xxxxxxxxxxxxx
SMS_SENDER_ID=Kasigig

# ------------------
# Analytics (Optional)
# ------------------
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# ------------------
# Feature Flags
# ------------------
NEXT_PUBLIC_ENABLE_ENHANCED_VERIFICATION=false
NEXT_PUBLIC_ENABLE_LOCATION_SEARCH=false
```

### Environment Variable Security

**Never commit to Git**:
```bash
# Add to .gitignore
.env.production
.env.local
.env*.local
```

**Secure Storage Options**:
1. **Vercel**: Use Vercel dashboard → Settings → Environment Variables
2. **AWS**: Use AWS Secrets Manager
3. **Docker**: Use Docker secrets or encrypted volumes
4. **Local**: Use `.env.production.local` (git-ignored)

---

## 6. Testing Checklist

### Pre-Production Testing

#### Payment Gateway Tests
- [ ] Test successful payment
- [ ] Test failed payment (declined card)
- [ ] Test payment cancellation
- [ ] Test escrow holding
- [ ] Test payment release
- [ ] Test refunds
- [ ] Verify webhook notifications received
- [ ] Check transaction records in database
- [ ] Test with various amounts (small, large)
- [ ] Test payment from different browsers/devices

#### Firebase Tests
- [ ] User signup works
- [ ] Email verification sent
- [ ] Password reset works
- [ ] Login/logout works
- [ ] Profile data saves correctly
- [ ] File uploads work (photos, IDs, portfolio)
- [ ] Security rules prevent unauthorized access
- [ ] Check Firebase usage dashboard
- [ ] Verify billing alerts configured

#### ID Verification Tests
- [ ] Upload clear ID document → successful extraction
- [ ] Upload blurry ID → error handling
- [ ] Upload non-ID image → rejected
- [ ] Verify OCR accuracy on 10+ test IDs
- [ ] Check data stored correctly
- [ ] Verify compliance with POPIA

#### Legal Compliance
- [ ] Terms of Service page accessible
- [ ] Privacy Policy page accessible
- [ ] Cookie notice displays (if applicable)
- [ ] Signup requires acceptance checkboxes
- [ ] Acceptance logged in database
- [ ] Legal document versions tracked
- [ ] Contact email for privacy requests works

#### Security Tests
- [ ] All API endpoints require authentication
- [ ] Users can only access own data
- [ ] Sensitive data encrypted at rest
- [ ] HTTPS enforced on production
- [ ] No sensitive data in client-side code
- [ ] Environment variables not exposed
- [ ] SQL injection tests (if applicable)
- [ ] XSS protection verified

#### Performance Tests
- [ ] Page load times < 3 seconds
- [ ] Image optimization working
- [ ] Database queries optimized
- [ ] Mobile experience smooth
- [ ] Works on slow connections (3G)

### Go-Live Checklist

#### Final Steps Before Launch
- [ ] Switch all services from test to production mode
- [ ] Update environment variables in hosting platform
- [ ] Deploy production Firebase rules
- [ ] Configure custom domain and SSL
- [ ] Set up monitoring/error tracking (e.g., Sentry)
- [ ] Create backup strategy for Firestore
- [ ] Set up uptime monitoring (e.g., UptimeRobot)
- [ ] Prepare customer support email/system
- [ ] Test contact forms work
- [ ] Legal documents reviewed by lawyer
- [ ] Privacy policy compliance verified
- [ ] Payment gateway live mode activated
- [ ] Test 1-2 real transactions with small amounts

#### Day 1 Monitoring
- [ ] Monitor error logs
- [ ] Check payment transactions
- [ ] Verify Firebase usage
- [ ] Monitor API costs (Vision API, etc.)
- [ ] Check user signup flow
- [ ] Monitor uptime
- [ ] Respond to early user feedback

---

## Cost Summary

### Monthly Recurring Costs

| Service | Cost (ZAR) | Notes |
|---------|------------|-------|
| **PayFast** | R99 + 2.9% + R2/tx | ~R300-500 for 50 transactions |
| **Firebase** | R300-800 | Based on 1000 active users |
| **Google Cloud Vision** | R15-30 | ~500 ID verifications/month |
| **Domain** | R150/year | .co.za domain |
| **Hosting (Vercel)** | R0-300 | Free tier sufficient initially |
| **Email Service** | R0-150 | Optional, can use Firebase email |
| **SSL Certificate** | R0 | Free with Let's Encrypt/Vercel |
| **Legal Review** | R10,000 | One-time cost |
| **Total Monthly** | **R500-1,800** | Scales with usage |

### Initial Setup Costs
- Legal review: R5,000 - R15,000 (one-time)
- Domain registration: R150/year
- Business registration (if needed): R500-1,000

---

## Support and Resources

### Documentation Links
- **PayFast**: https://developers.payfast.co.za/docs
- **Firebase**: https://firebase.google.com/docs
- **Google Cloud Vision**: https://cloud.google.com/vision/docs
- **POPIA Compliance**: https://popia.co.za

### Support Contacts
- PayFast Support: support@payfast.co.za
- Firebase Support: https://firebase.google.com/support
- POPIA Info Officer: [Register at https://popia.co.za]

### Recommended Next Steps
1. Create accounts (PayFast, Firebase production, Google Cloud)
2. Set up test environments and verify integration
3. Get legal documents reviewed
4. Configure environment variables
5. Run full testing checklist
6. Soft launch with beta users
7. Monitor and iterate

---

## Questions or Issues?

If you encounter issues during setup:
1. Check service status pages
2. Review error logs
3. Consult official documentation
4. Contact provider support
5. Consider hiring integration specialist if needed

**Estimated Total Setup Time**: 3-5 days (including waiting for account approvals)

Good luck with your launch! 🚀

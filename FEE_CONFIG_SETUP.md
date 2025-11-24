# Fee Configuration Setup Guide

This guide shows you how to manually add the default fee configuration to both DEV and production environments to ensure consistency.

## Why Manual Setup?

The fee configuration needs to be seeded once to each environment. This ensures:
- Consistent fee structures across all environments
- No hardcoded values in the application
- Easy to update fees in the future through the admin panel

## Fee Configuration Values

These are the standard fees for the South African market:

### Employer Fees (added to gig amount):
- **Platform Fee**: 5%
- **Payment Processing Fee**: 2.9%
- **Fixed Transaction Fee**: R2.50

### Worker Deductions (deducted from gig amount):
- **Worker Commission**: 10%

### Minimum Amounts:
- **Minimum Gig Amount**: R100
- **Minimum Withdrawal**: R50
- **Minimum Milestone**: R50

### Escrow Settings:
- **Release Delay**: 72 hours (3 days)
- **Auto Release**: Enabled

### Payment Providers:
- **Enabled**: PayFast, Ozow, Yoco
- **Default**: PayFast

### Tax:
- **VAT Included**: Yes
- **VAT Percentage**: 15%

---

## Manual Setup Instructions

### Step 1: DEV Environment

1. Go to [Firebase Console - DEV](https://console.firebase.google.com/project/kasigig-dev/firestore)
2. Navigate to **Firestore Database**
3. Click **Start collection**
4. Collection ID: `feeConfigs`
5. Click **Next**
6. Document ID: `default-fee-config` (or leave auto-generated)
7. Add the following fields:

```
platformFeePercentage          (number)    5
paymentProcessingFeePercentage (number)    2.9
fixedTransactionFee            (number)    2.5
workerCommissionPercentage     (number)    10
minimumGigAmount               (number)    100
minimumWithdrawal              (number)    50
minimumMilestone               (number)    50
escrowReleaseDelayHours        (number)    72
autoReleaseEnabled             (boolean)   true
enabledProviders               (array)     ["payfast", "ozow", "yoco"]
defaultProvider                (string)    "payfast"
vatIncluded                    (boolean)   true
vatPercentage                  (number)    15
isActive                       (boolean)   true
createdBy                      (string)    "system-admin"
createdAt                      (timestamp) [Click "Use current time"]
updatedAt                      (timestamp) [Click "Use current time"]
```

8. Click **Save**

### Step 2: Production Environment

Repeat the exact same steps for production:

1. Go to [Firebase Console - Production](https://console.firebase.google.com/project/kasigig-production/firestore)
2. Navigate to **Firestore Database**
3. Follow steps 3-8 from above with the **exact same values**

---

## Verification

After adding the fee config, verify it works:

### DEV Environment:
1. Open your local app at http://localhost:3000
2. Go to any gig posting page
3. You should see fee breakdown displayed correctly

### Production Environment:
1. Open https://mzansigig.vercel.app
2. Go to any gig posting page
3. You should see fee breakdown displayed correctly

---

## Example Calculation

For a **R1000 gig**:

**Employer pays**: R1,109.50
- Gig amount: R1,000.00
- Platform fee (5%): R50.00
- Processing fee (2.9%): R29.00
- Fixed fee: R2.50
- **Total: R1,081.50**

**Worker receives**: R900.00
- Gig amount: R1,000.00
- Worker commission (10%): R100.00
- **Net to worker: R900.00**

**Platform earns**: R181.50
- From employer: R81.50
- From worker: R100.00
- **Total platform revenue: R181.50**

---

## Alternative: Use Firebase CLI (Advanced)

If you have Firebase CLI authentication set up:

```bash
# DEV
npm run seed:dev

# Production
npm run seed:prod
```

Note: This requires `gcloud auth application-default login` to be run first.

---

## Future Updates

Once the fee config is in the database, you can update it through:
1. The admin panel (when built)
2. Firebase Console directly
3. The seed scripts (if authentication is set up)

**Important**: Only one fee config should have `isActive: true` at a time. When creating a new config, set the old one to `isActive: false`.

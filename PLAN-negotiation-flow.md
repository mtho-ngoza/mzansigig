# Rate Negotiation Flow - Implementation Plan

## Overview
Enable rate negotiation between employers and workers using a hybrid approach:
- Use existing **messaging channel** for discussion
- Simple **rate proposal/confirmation** UI for finalizing amounts

## Phase 1: Data Model Updates

### 1.1 Update GigApplication Type
**File:** `types/gig.ts`

```typescript
interface GigApplication {
  // Existing fields...
  proposedRate: number        // Initial rate proposed by worker

  // New fields
  agreedRate?: number         // Final agreed rate (when both confirm)
  rateStatus: 'proposed' | 'countered' | 'agreed'
  lastRateUpdate?: {
    amount: number
    updatedBy: 'worker' | 'employer'
    updatedAt: Date
    message?: string          // Brief note about why rate changed
  }
  rateHistory?: {
    amount: number
    by: 'worker' | 'employer'
    at: Date
    note?: string
  }[]
}
```

### 1.2 Migration Script
- Add default values for existing applications
- `rateStatus: 'proposed'` for pending apps
- `rateStatus: 'agreed'` + `agreedRate: proposedRate` for already accepted apps

---

## Phase 2: Backend Services

### 2.1 Update GigService
**File:** `lib/database/gigService.ts`

Add methods:
```typescript
// Update the proposed/agreed rate
static async updateApplicationRate(
  applicationId: string,
  newRate: number,
  updatedBy: 'worker' | 'employer',
  note?: string
): Promise<void>

// Confirm the current rate (other party accepts)
static async confirmApplicationRate(
  applicationId: string,
  confirmedBy: 'worker' | 'employer'
): Promise<void>

// Get rate negotiation history
static async getRateHistory(applicationId: string): Promise<RateHistoryEntry[]>
```

### 2.2 Validation Rules
- Rate must be > 0
- Rate must be within platform limits (min R50, max R100,000)
- Only involved parties can update rate
- Cannot update rate after application is funded

### 2.3 Firestore Security Rules
**File:** `firestore.rules`
- Allow rate updates only by employer or worker of that application
- Prevent rate changes after funding

---

## Phase 3: UI Components

### 3.1 Rate Negotiation Banner
**New Component:** `components/application/RateNegotiationBanner.tsx`

Shows on application card when rate needs confirmation:
```
┌─────────────────────────────────────────────────────────────┐
│ 💬 Rate Update                                               │
│                                                              │
│ [Worker Name] proposed R320 (was R350)                      │
│ "After seeing the job, I think R320 is fair"                │
│                                                              │
│ [Accept R320]  [Counter Offer]  [Message to Discuss]        │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Update Rate Modal
**New Component:** `components/application/UpdateRateModal.tsx`

Simple modal:
```
┌─────────────────────────────────────────────────────────────┐
│ Update Proposed Rate                                         │
│                                                              │
│ Current: R350                                                │
│ New Rate: [R________]                                        │
│                                                              │
│ Note (optional):                                             │
│ [Job is smaller than expected________________]               │
│                                                              │
│ 💡 Tip: Use messages to discuss before updating rate        │
│                                                              │
│ [Cancel]                              [Propose New Rate]     │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Update ManageApplications
**File:** `components/application/ManageApplications.tsx`

Changes:
- Show rate status badge: "Proposed" | "Awaiting Your Confirmation" | "Agreed"
- Add "Update Rate" button for employer
- Add "Message" quick action button
- Show rate history expandable section
- Disable "Fund" button until rate is "agreed"

### 3.4 Update Worker's Application View
**File:** `components/application/MyApplications.tsx` (or similar)

Changes:
- Show when employer has countered
- Add "Accept Rate" / "Update Rate" / "Message" buttons
- Show negotiation history

### 3.5 Rate Agreement Confirmation
**New Component:** `components/application/RateAgreementConfirmation.tsx`

Final confirmation before funding:
```
┌─────────────────────────────────────────────────────────────┐
│ ✓ Rate Agreed                                                │
│                                                              │
│ Both parties have agreed to:                                 │
│                                                              │
│ Gig: "House Cleaning - Sandton"                             │
│ Worker: John Doe                                             │
│ Agreed Rate: R300                                            │
│                                                              │
│ Worker will receive: R294 (after 2% service fee)            │
│ You will pay: R308.36 (including payment fees)              │
│                                                              │
│ [Fund Escrow - R308.36]                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 4: Messaging Integration

### 4.1 Quick Message Templates
Add suggested messages for rate negotiation:
- "I'd like to discuss the rate before accepting"
- "The job looks bigger than expected, can we adjust?"
- "I can offer R[X] for this work"
- "Let's agree on R[X] and I'll update the rate"

### 4.2 Message Link from Application
- Add "Message about this gig" button on application cards
- Pre-fill conversation context: "Re: [Gig Title] - Rate Discussion"

### 4.3 Rate Update Notification in Chat
When rate is updated, auto-send message:
```
📋 Rate Update
I've updated the proposed rate to R300.
Please review and confirm if you agree.
[View Application]
```

---

## Phase 5: Notifications

### 5.1 In-App Notifications
- "John proposed a new rate of R320 for 'House Cleaning'"
- "Employer accepted your rate of R300"
- "Rate confirmed! You can now fund the escrow"

### 5.2 Email Notifications (if enabled)
- Rate counter notification
- Rate acceptance notification

---

## Phase 6: Payment Flow Updates

### 6.1 Update PaymentDialog
**File:** `components/payment/PaymentDialog.tsx`

- Use `agreedRate` instead of `proposedRate`
- Show "Agreed Rate" label (both parties confirmed)
- Block payment if rate not yet agreed

### 6.2 Update PaymentProcessingService
**File:** `lib/services/paymentProcessingService.ts`

- Validate rate is agreed before processing
- Use `agreedRate` for escrow amount

---

## Implementation Order

| Step | Task | Effort | Dependencies |
|------|------|--------|--------------|
| 1 | Update GigApplication type | Small | None |
| 2 | Add GigService rate methods | Medium | Step 1 |
| 3 | Update Firestore rules | Small | Step 1 |
| 4 | Create UpdateRateModal component | Medium | Step 2 |
| 5 | Create RateNegotiationBanner | Medium | Step 2 |
| 6 | Update ManageApplications UI | Large | Steps 4, 5 |
| 7 | Update Worker's application view | Medium | Steps 4, 5 |
| 8 | Add message integration | Medium | Step 6, 7 |
| 9 | Update PaymentDialog | Small | Step 2 |
| 10 | Add notifications | Medium | Steps 6, 7 |
| 11 | Migration script for existing data | Small | Step 1 |
| 12 | Tests for all new functionality | Large | All steps |

---

## Testing Checklist

- [ ] Worker can propose initial rate
- [ ] Employer can accept initial rate → agreed
- [ ] Employer can counter with new rate
- [ ] Worker sees counter and can accept/counter
- [ ] Rate history is recorded correctly
- [ ] Cannot fund until rate is agreed
- [ ] Payment uses agreedRate
- [ ] Message integration works
- [ ] Notifications sent correctly
- [ ] Existing applications migrated correctly
- [ ] Security rules enforce proper access

---

## Future Enhancements (Post-MVP)

1. **Rate Bounds per Gig** - Employer sets min/max acceptable range
2. **Auto-Accept** - If counter is within X% of original, auto-accept
3. **Rate Templates** - Common rate adjustments (e.g., +10% for urgent)
4. **Dispute Rate** - Challenge agreed rate before payment
5. **Rate Analytics** - Show average rates for gig category/location

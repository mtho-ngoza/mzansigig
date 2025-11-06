# Firestore Security Rules for Withdrawals

## Critical Security Requirements

### Withdrawals Collection (`/withdrawals/{withdrawalId}`)

**Read Access:**
- ✅ User can read ONLY their own withdrawal requests
- ❌ User CANNOT read other users' withdrawals
- ✅ Admin can read all withdrawals (for approval workflow)

**Write Access:**
- ✅ User can CREATE withdrawal requests (but only for themselves)
- ❌ User CANNOT UPDATE or DELETE withdrawal requests
- ❌ User CANNOT modify withdrawal status
- ✅ Admin can UPDATE withdrawal status (approve/reject)

**Field Validation:**
- `userId` must match authenticated user ID
- `amount` must be positive number
- `status` must be 'pending' on creation
- `currency` must be 'ZAR'

### Payment Methods Collection (`/paymentMethods/{methodId}`)

**Read Access:**
- ✅ User can read ONLY their own payment methods
- ❌ User CANNOT read other users' payment methods

**Write Access:**
- ✅ User can CREATE payment methods for themselves
- ✅ User can UPDATE their own payment methods
- ❌ User CANNOT modify payment methods of other users

### Users Collection (`/users/{userId}`)

**Wallet Balance Fields:**
- ❌ User CANNOT directly modify `walletBalance`
- ❌ User CANNOT directly modify `totalWithdrawn`
- ❌ User CANNOT directly modify `pendingBalance`
- ❌ User CANNOT directly modify `totalEarnings`
- ✅ Only server-side code (via Admin SDK) can modify wallet fields

## Proposed Firestore Rules

\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function isAdmin() {
      return isAuthenticated() &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Users - Prevent direct wallet modification
    match /users/{userId} {
      allow read: if isAuthenticated() && (isOwner(userId) || isAdmin());
      allow create: if isOwner(userId);
      allow update: if isOwner(userId) &&
                      // Prevent modification of wallet fields
                      !request.resource.data.diff(resource.data).affectedKeys()
                        .hasAny(['walletBalance', 'totalWithdrawn', 'pendingBalance', 'totalEarnings']);
    }

    // Withdrawals - Strict access control
    match /withdrawals/{withdrawalId} {
      allow read: if isAuthenticated() &&
                    (resource.data.userId == request.auth.uid || isAdmin());

      allow create: if isAuthenticated() &&
                      request.resource.data.userId == request.auth.uid &&
                      request.resource.data.status == 'pending' &&
                      request.resource.data.amount > 0 &&
                      request.resource.data.currency == 'ZAR';

      // Only admins can update (approve/reject)
      allow update: if isAdmin();

      allow delete: if false; // No deletions allowed
    }

    // Payment Methods - User can only access their own
    match /paymentMethods/{methodId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }
  }
}
\`\`\`

## Test Scenarios

### ✅ Should ALLOW:
1. User reads their own withdrawals
2. User creates withdrawal for themselves with valid data
3. Admin reads any withdrawal
4. Admin updates withdrawal status
5. User reads their own payment methods

### ❌ Should DENY:
1. User reads another user's withdrawals
2. User updates withdrawal status
3. User creates withdrawal for another user
4. User modifies walletBalance directly
5. User reads another user's payment methods
6. Unauthenticated access to any withdrawal data

## Implementation Status

- [ ] Rules defined in firestore.rules file
- [ ] Rules deployed to Firebase project
- [ ] Unit tests written using @firebase/rules-unit-testing
- [ ] Integration tests with actual Firebase emulator
- [ ] Verified in production environment

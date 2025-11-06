# Firestore Security Rules - Documentation

## 🔐 Security Overview

KasiGig's Firestore security rules implement **defense-in-depth** security for all platform data. All rules follow the principle of **least privilege** - users can only access data they explicitly need.

## ✅ Security Fix Applied

**CRITICAL**: Fixed default deny rule vulnerability (December 2024)
- **Before**: `match /{document=**} { allow read, write: if true; }` (WIDE OPEN)
- **After**: `match /{document=**} { allow read, write: if false; }` (SECURE)

This change ensures that any collection not explicitly defined in the rules is **denied by default**.

---

## 📋 Collections Security Matrix

### Core Platform Collections

| Collection | Read Access | Write Access | Key Security Features |
|------------|-------------|--------------|----------------------|
| **users** | All authenticated users | Owner only | Cannot modify email, id, or createdAt |
| **gigs** | Public (anyone) | Owner (employer) only | Minimum budget R100, status validation |
| **applications** | Applicant & employer | Applicant & employer | Status workflow validation |
| **reviews** | All authenticated | Reviewer only (24h edit window) | Completed gigs only, rating 1-5 |
| **conversations** | Participants only | Participants only | Cannot change participant list |
| **messages** | Conversation participants | Sender only | Recipient can mark as read |

### Payment & Financial Collections

| Collection | Read Access | Write Access | Key Security Features |
|------------|-------------|--------------|----------------------|
| **payments** | Employer, worker, admin | Employer, worker, admin | Escrow status validation |
| **paymentMethods** | Owner only | Owner only | User-specific only |
| **withdrawals** | Owner or admin | Owner (create), admin (approve) | Minimum R50, status validation |
| **paymentIntents** | Employer & worker | Employer only | Amount validation |
| **paymentHistory** | Owner only | Owner & system | Generally immutable |
| **escrowAccounts** | Employer, worker, admin | Employer & admin | Escrow release control |
| **feeConfigs** | Public | Admin only | Platform fee transparency |

### Trust & Safety Collections

| Collection | Read Access | Write Access | Key Security Features |
|------------|-------------|--------------|----------------------|
| **safetyReports** | Reporter, reportee, admin | Reporter (create), admin (update) | Pending status on creation |
| **safetyCheckIns** | Owner or admin | Owner (create only) | Immutable check-in records |
| **backgroundChecks** | Owner or admin | Owner (request), admin (update) | Admin-verified results |
| **trustScoreHistory** | Owner or admin | Admin only | Immutable history |
| **verification-results** | Owner or admin | Admin only | System-controlled verification |
| **verification-documents** | Owner or admin | Owner only | Private document storage |

### Other Collections

| Collection | Read Access | Write Access | Key Security Features |
|------------|-------------|--------------|----------------------|
| **milestones** | Employer, worker, admin | Employer & worker | Gig ownership validation |
| **paymentDisputes** | Involved parties & admin | Parties (evidence), admin (resolve) | Status-based access |
| **safeMeetingLocations** | All authenticated | Verified users (suggest), admin (approve) | Community-driven safety |
| **admins** | Admin only | Admin only | Cannot update yourself |

---

## 🛡️ Security Features

### 1. Authentication Requirements

**All collections require authentication** except:
- `gigs` - Public read for gig browsing (core feature)
- `feeConfigs` - Public read for transparency

### 2. Owner-Based Access Control

Users can only access their own data:
```javascript
function isOwner(userId) {
  return isAuthenticated() && request.auth.uid == userId;
}
```

### 3. Admin Role Support

Admins have elevated privileges via custom claims:
```javascript
function isAdmin() {
  return isAuthenticated() && request.auth.token.admin == true;
}
```

**Setting admin custom claims** (Firebase Admin SDK):
```javascript
admin.auth().setCustomUserClaims(userId, { admin: true })
```

### 4. Immutable Field Protection

Critical fields cannot be changed after creation:
- User: `id`, `email`, `createdAt`
- Gig: `employerId`, `createdAt`
- Application: `applicantId`, `gigId`
- Trust Score History: All fields (append-only)

### 5. Data Validation

**Required fields validation**:
```javascript
function hasRequiredFields(fields) {
  return request.resource.data.keys().hasAll(fields);
}
```

**Business rule validation**:
- Gigs: Minimum budget R100
- Withdrawals: Minimum R50, must start with 'pending' status
- Reviews: Rating between 1-5 stars
- Applications: Must reference existing gig

### 6. Relationship Validation

Cross-collection validation using `exists()` and `get()`:
- Applications must reference valid gigs
- Messages must belong to valid conversations
- Payments must reference valid gigs
- Milestones must belong to gigs owned by the creator

---

## 🧪 Testing Security Rules

### Manual Testing with Firebase Emulator

**Setup**:
```bash
# Start Firebase emulators
firebase emulators:start

# Access Emulator UI
open http://localhost:4000
```

**Test Scenarios**:

#### Test 1: Unauthenticated Access
```javascript
// ❌ Should FAIL - No auth
db.collection('users').doc('user123').get()
db.collection('withdrawals').get()
db.collection('paymentMethods').get()

// ✅ Should SUCCEED - Public read
db.collection('gigs').get()
db.collection('feeConfigs').get()
```

#### Test 2: User Data Access
```javascript
// User alice@example.com (uid: alice123)

// ✅ Should SUCCEED - Own data
db.collection('users').doc('alice123').get()
db.collection('users').doc('alice123').update({ bio: 'New bio' })

// ❌ Should FAIL - Other user's data
db.collection('users').doc('bob456').update({ bio: 'Hacked!' })

// ❌ Should FAIL - Cannot change email
db.collection('users').doc('alice123').update({ email: 'newemail@example.com' })
```

#### Test 3: Gig Creation
```javascript
// Employer bob@example.com (uid: bob456)

// ✅ Should SUCCEED - Valid gig
db.collection('gigs').add({
  title: 'Test Gig',
  description: 'Description',
  category: 'cleaning',
  budget: 500,
  employerId: 'bob456',
  status: 'open',
  createdAt: new Date()
})

// ❌ Should FAIL - Budget too low
db.collection('gigs').add({
  budget: 50,  // < R100 minimum
  employerId: 'bob456',
  status: 'open'
})

// ❌ Should FAIL - Wrong employerId
db.collection('gigs').add({
  employerId: 'alice123',  // Not bob456
  budget: 500,
  status: 'open'
})
```

#### Test 4: Withdrawal Security
```javascript
// Worker alice@example.com (uid: alice123)

// ✅ Should SUCCEED - Create own withdrawal
db.collection('withdrawals').add({
  userId: 'alice123',
  amount: 100,
  paymentMethodId: 'pm123',
  status: 'pending'
})

// ❌ Should FAIL - Create withdrawal for other user
db.collection('withdrawals').add({
  userId: 'bob456',
  amount: 100,
  status: 'pending'
})

// ❌ Should FAIL - Amount too low
db.collection('withdrawals').add({
  userId: 'alice123',
  amount: 30,  // < R50 minimum
  status: 'pending'
})

// ❌ Should FAIL - Update status (only admin can)
db.collection('withdrawals').doc('w123').update({
  status: 'completed'
})
```

#### Test 5: Admin Access
```javascript
// Admin user (uid: admin123, custom claim: admin=true)

// ✅ Should SUCCEED - Read all withdrawals
db.collection('withdrawals').get()

// ✅ Should SUCCEED - Approve withdrawal
db.collection('withdrawals').doc('w123').update({
  status: 'completed',
  approvedBy: 'admin123'
})

// ✅ Should SUCCEED - Delete user
db.collection('users').doc('alice123').delete()

// ✅ Should SUCCEED - Update fee config
db.collection('feeConfigs').doc('active').update({
  platformFeePercent: 12
})
```

---

## 🚀 Deployment Guide

### Pre-Deployment Checklist

- [x] **Security vulnerability fixed** (default deny rule)
- [ ] **Manual testing completed** (see test scenarios above)
- [ ] **Admin custom claims set** for admin users
- [ ] **Backup current rules** (if updating existing deployment)
- [ ] **Review diff** before deploying

### Deployment Steps

#### 1. Review Current Rules (Production)
```bash
# Download current production rules
firebase firestore:rules get > firestore.rules.backup

# Review differences
diff firestore.rules firestore.rules.backup
```

#### 2. Test with Emulator (Local)
```bash
# Start emulators with new rules
firebase emulators:start

# Run manual tests in Emulator UI (http://localhost:4000)
# Verify all test scenarios pass
```

#### 3. Deploy to Production
```bash
# Deploy rules only (safe - doesn't affect data)
firebase deploy --only firestore:rules

# Verify deployment
firebase firestore:rules get
```

#### 4. Post-Deployment Verification

**In Firebase Console** (https://console.firebase.google.com):
1. Go to **Firestore → Rules**
2. Click **Rules Playground**
3. Test critical scenarios:
   - Unauthenticated user reading /users → should **DENY**
   - User reading own data → should **ALLOW**
   - User reading other user's withdrawal → should **DENY**
   - Public gig browsing → should **ALLOW**

#### 5. Monitor for Errors

**First 24 hours after deployment**:
```bash
# Check Firebase Console → Firestore → Usage
# Look for:
# - Unexpected permission denied errors
# - User complaints about access issues
```

**Common issues after deployment**:
- **Admin functions failing**: Ensure admin users have custom claims set
- **Public gig browsing broken**: Verify gigs collection allows public read
- **Users can't update profiles**: Check immutable field list is correct

---

## 🔧 Setting Admin Custom Claims

**Option 1: Firebase Console (Recommended for first admin)**
1. Go to Authentication → Users
2. Find user → click UID
3. Cannot set custom claims in console - use Option 2

**Option 2: Firebase Admin SDK (Node.js script)**
```javascript
// admin-setup.js
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setAdminClaim(email) {
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, { admin: true });
  console.log(`✅ Admin claim set for ${email} (${user.uid})`);
}

// Set your admin email here
setAdminClaim('admin@kasigig.co.za')
  .then(() => process.exit(0))
  .catch(console.error);
```

**Option 3: Cloud Function (Production)**
```javascript
// Secure cloud function to set admin (one-time use)
exports.setAdminClaim = functions.https.onCall(async (data, context) => {
  // Add security: only allow specific email or require existing admin
  if (context.auth.token.admin !== true) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can set admin claims');
  }

  await admin.auth().setCustomUserClaims(data.uid, { admin: true });
  return { success: true };
});
```

---

## 📊 Security Monitoring

### Key Metrics to Monitor

**Firebase Console → Firestore → Usage**:
1. **Read/Write denials** - Should be minimal after launch
2. **Unusual access patterns** - Spike in denied requests
3. **Document access distribution** - Ensure users access own data

### Security Audit Schedule

- **Weekly** (Month 1-3): Review denied request logs
- **Monthly**: Full security audit of rules
- **Quarterly**: Penetration testing (if budget allows)
- **After major feature**: Review and update relevant rules

### Common Attack Vectors to Monitor

1. **Enumeration attacks**: Users trying to read other users' data systematically
2. **Privilege escalation**: Non-admins attempting admin actions
3. **Data exfiltration**: Bulk reads of sensitive collections
4. **Injection attacks**: Malicious data in write operations

---

## 🔒 Production Hardening

### Additional Security Measures

1. **Rate Limiting** (Firebase App Check):
```javascript
// Enable App Check for abuse protection
// Prevents automated abuse and unauthorized access
```

2. **Data Encryption**:
   - Firestore encrypts data at rest (automatic)
   - Use HTTPS for all connections (enforced)
   - Consider encrypting sensitive fields (bank account numbers)

3. **Audit Logging**:
   - Enable Firestore audit logs in Google Cloud Console
   - Monitor for suspicious patterns
   - Set up alerts for mass deletions or updates

4. **Backup Strategy**:
   - Daily automated backups of Firestore data
   - Test restore process monthly
   - Keep backups for 90 days

---

## 📚 Resources

- [Firestore Security Rules Reference](https://firebase.google.com/docs/firestore/security/get-started)
- [Security Rules Unit Testing](https://firebase.google.com/docs/rules/unit-tests)
- [Firebase Security Checklist](https://firebase.google.com/support/guides/security-checklist)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

## ✅ Pre-Launch Checklist

### Critical (MUST DO before soft launch)

- [x] Default deny rule fixed
- [ ] All manual test scenarios pass in emulator
- [ ] Rules deployed to production Firebase project
- [ ] Rules playground verification completed
- [ ] At least one admin user with custom claims set
- [ ] Backup of production rules saved
- [ ] 24-hour monitoring plan in place

### Recommended (SHOULD DO within first week)

- [ ] Audit logs enabled in Google Cloud Console
- [ ] App Check configured for abuse prevention
- [ ] Security monitoring dashboard set up
- [ ] Incident response plan documented
- [ ] Security team contact information updated

---

**Last Updated**: December 2024
**Status**: Production Ready (after manual testing)
**Next Review**: After soft launch (or 1 month)

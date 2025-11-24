# Firebase Security Rules Deployment Guide

This guide provides step-by-step instructions for deploying and testing Firebase security rules for the MzansiGig platform.

## 📋 Overview

The security rules protect two Firebase services:
1. **Firestore Database** (`firestore.rules`) - Controls access to all database collections
2. **Firebase Storage** (`storage.rules`) - Controls access to file uploads and downloads

## 🚀 Prerequisites

Before deploying security rules, ensure you have:

1. **Firebase CLI installed**
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase project configured**
   - Project ID ready
   - Owner or Editor permissions

3. **Firebase initialized in project**
   - If not already done, run `firebase init`

## 📁 Files Included

- `firestore.rules` - Firestore Database security rules
- `storage.rules` - Firebase Storage security rules
- `firebase.json` - Firebase configuration (if not exists, see below)

## 🔧 Step 1: Initialize Firebase (if needed)

If you haven't initialized Firebase in this project:

```bash
# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init
```

When prompted:
- Select **Firestore** and **Storage**
- Choose your Firebase project
- Use default options for Firestore rules file: `firestore.rules`
- Use default options for Storage rules file: `storage.rules`
- Accept defaults for Firestore indexes

## 📝 Step 2: Configure firebase.json

Create or update `firebase.json` in your project root:

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "hosting": {
    "public": "out",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ]
  }
}
```

## 🔐 Step 3: Set Up Admin Custom Claims

The security rules use custom claims to identify admin users. You need to set this up:

### Option A: Using Firebase Admin SDK (Recommended)

Create a script `scripts/setAdminClaim.js`:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('../path-to-your-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setAdminClaim(email) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log(`✅ Admin claim set for ${email}`);
  } catch (error) {
    console.error('Error setting admin claim:', error);
  }
}

// Replace with your admin email
setAdminClaim('admin@mzansigigs.co.za');
```

Run it:
```bash
node scripts/setAdminClaim.js
```

### Option B: Using Firebase Functions

Create a callable function that only super admins can invoke to set admin claims.

## 🧪 Step 4: Test Rules Locally (Optional but Recommended)

Firebase provides an emulator to test rules before deploying:

```bash
# Install emulators
firebase init emulators

# Start emulators
firebase emulators:start --only firestore,storage
```

### Running Tests

Create test files in `tests/security-rules/`:

```javascript
// Example: tests/security-rules/users.test.js
const { assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');

describe('User rules', () => {
  it('should allow users to read their own profile', async () => {
    const db = getFirestore('user123');
    const docRef = db.collection('users').doc('user123');
    await assertSucceeds(docRef.get());
  });

  it('should deny users from reading other profiles', async () => {
    const db = getFirestore('user123');
    const docRef = db.collection('users').doc('user456');
    await assertFails(docRef.get());
  });
});
```

Run tests:
```bash
npm test
```

## 🚀 Step 5: Deploy Security Rules

### Deploy All Rules

```bash
# Deploy both Firestore and Storage rules
firebase deploy --only firestore:rules,storage
```

### Deploy Individual Services

```bash
# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Deploy only Storage rules
firebase deploy --only storage
```

### Deploy to Specific Project

```bash
# Deploy to specific project
firebase deploy --only firestore:rules,storage --project your-project-id
```

## ✅ Step 6: Verify Deployment

1. **Check Firebase Console**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Navigate to your project
   - Check **Firestore Database → Rules** tab
   - Check **Storage → Rules** tab
   - Verify the rules are active and match your files

2. **Test in Production**
   - Try accessing resources as different user types
   - Verify authentication is required
   - Test permission boundaries

## 🛡️ Step 7: Security Rules Overview

### Firestore Rules Summary

| Collection | Read | Create | Update | Delete |
|-----------|------|--------|--------|--------|
| `users` | All authenticated | Owner only | Owner only | Owner/Admin |
| `gigs` | All authenticated | Authenticated | Owner only | Owner/Admin |
| `applications` | Applicant/Employer | Applicant only | Limited | Applicant/Admin |
| `reviews` | All authenticated | Reviewer only | Reviewer (24h) | Reviewer/Admin |
| `conversations` | Participants | Participants | Participants | Participants |
| `messages` | Participants | Sender | Sender only | Sender/Admin |
| `payments` | Parties/Admin | Employer | Limited | Admin only |
| `paymentMethods` | Owner | Owner | Owner | Owner |
| `withdrawals` | Owner/Admin | Owner | Limited | Owner/Admin |
| `feeConfigs` | All authenticated | Admin only | Admin only | Admin only |
| `safetyReports` | Reporter/Admin | Reporter | Admin only | Admin only |
| `safetyCheckIns` | Owner/Admin | Owner | None | Admin only |
| `backgroundChecks` | Owner/Admin | Owner | Admin only | Admin only |
| `trustScoreHistory` | Owner/Admin | Admin only | None | Admin only |

### Storage Rules Summary

| Path | Read | Write | Max Size | File Types |
|------|------|-------|----------|------------|
| `profilePhotos/{userId}/*` | All authenticated | Owner | 5MB | Images (JPEG, PNG, WebP) |
| `portfolios/{userId}/*` | All authenticated | Owner | 10MB | Images (JPEG, PNG, WebP, GIF) |
| `verificationDocuments/{userId}/*` | Owner/Admin | Owner | 10MB | Images, PDF |
| `gigs/{gigId}/attachments/*` | All authenticated | Authenticated | 20MB | Images, Documents |
| `messages/{conversationId}/*` | Authenticated | Authenticated | 25MB | Images, Documents, Media |
| `paymentReceipts/{userId}/*` | Owner/Admin | Admin | 5MB | PDF only |
| `disputeEvidence/{disputeId}/*` | Parties/Admin | Parties | 15MB | Images, PDF, Text |
| `safetyReports/{reportId}/*` | Reporter/Admin | Reporter | 10MB | Images, PDF |
| `temp/idVerification/{userId}/*` | Owner/Admin | Owner | 10MB | Images, PDF |
| `public/*` | Anyone | Admin | 10MB | Any |

## 🔧 Step 8: Configure CORS for Storage (If needed)

If you're accessing Storage from web applications, configure CORS:

Create `cors.json`:
```json
[
  {
    "origin": ["https://your-domain.com", "http://localhost:3000"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "maxAgeSeconds": 3600
  }
]
```

Apply CORS:
```bash
gsutil cors set cors.json gs://your-project-id.appspot.com
```

## 📊 Step 9: Monitor Security Rules

### Enable Audit Logs
1. Go to Firebase Console → Project Settings
2. Enable Cloud Audit Logs
3. Monitor failed security rule evaluations

### Use Firebase Security Rules Monitoring
- Check the Rules playground in Firebase Console
- Review security rule evaluation metrics
- Set up alerts for unusual patterns

## 🚨 Common Issues & Solutions

### Issue 1: "Permission Denied" after deployment

**Solution:**
- Ensure users are authenticated
- Check custom claims are set correctly
- Verify the user's authentication token is fresh (re-login if needed)

### Issue 2: Admin functions not working

**Solution:**
- Verify admin custom claims are set: `firebase.auth().currentUser.getIdTokenResult()`
- Force token refresh: `await user.getIdToken(true)`

### Issue 3: Storage uploads failing

**Solution:**
- Check file size limits
- Verify file type matches allowed types
- Ensure user is authenticated
- Check CORS configuration

### Issue 4: Conversation access denied

**Solution:**
- The participant array structure must match the rules
- Verify conversation document has correct participant format
- Check that participants field is properly indexed

## 🔄 Step 10: Updating Rules

When updating rules:

1. **Test locally first** using emulators
2. **Deploy to staging** environment (if available)
3. **Monitor logs** after deployment
4. **Have a rollback plan** (keep previous rules version)

```bash
# View deployment history
firebase deploy:history

# Rollback if needed (use version number from history)
firebase rollback:firestore:rules --version <version_number>
```

## 📚 Additional Resources

- [Firebase Security Rules Documentation](https://firebase.google.com/docs/rules)
- [Firestore Security Rules Reference](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [Storage Security Rules Reference](https://firebase.google.com/docs/storage/security)
- [Testing Security Rules](https://firebase.google.com/docs/rules/unit-tests)

## 🔐 Best Practices

1. **Never disable security rules in production**
2. **Always test rules before deploying**
3. **Use custom claims for role-based access**
4. **Implement rate limiting at application level**
5. **Monitor security rule evaluations**
6. **Keep rules version controlled**
7. **Document all rule changes**
8. **Regular security audits**

## 📝 Maintenance Checklist

- [ ] Rules deployed to Firebase
- [ ] Admin custom claims configured
- [ ] Local testing completed
- [ ] Production testing verified
- [ ] CORS configured for Storage
- [ ] Monitoring and alerts set up
- [ ] Documentation updated
- [ ] Team notified of changes

## 🆘 Support

If you encounter issues:
1. Check Firebase Console logs
2. Review security rules playground
3. Check this documentation
4. Contact the development team

---

**Last Updated:** 2025-01-28
**Version:** 1.0.0
**Maintained by:** MzansiGig Development Team

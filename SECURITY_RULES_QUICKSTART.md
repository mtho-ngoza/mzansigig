# Firebase Security Rules - Quick Start Guide

Quick reference for deploying and managing Firebase security rules for GigSA.

## 🚀 Quick Deploy (3 Steps)

### 1. Validate Rules
```bash
node scripts/validateSecurityRules.js
```

### 2. Deploy to Firebase
```bash
firebase deploy --only firestore:rules,storage
```

### 3. Set Admin Claims
```bash
node scripts/setAdminClaim.js admin@gigsa.co.za
```

## 📋 Common Commands

### Deploy Rules
```bash
# Deploy both Firestore and Storage rules
firebase deploy --only firestore:rules,storage

# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Deploy only Storage rules
firebase deploy --only storage
```

### Admin Management
```bash
# Set admin claim for a user
node scripts/setAdminClaim.js user@example.com

# Remove admin claim
node scripts/setAdminClaim.js user@example.com --remove

# List all admins
node scripts/setAdminClaim.js --list
```

### Testing Locally
```bash
# Start Firebase emulators
firebase emulators:start --only firestore,storage,auth

# Access emulator UI
# Open http://localhost:4000
```

### Validation & Debugging
```bash
# Validate security rules syntax
node scripts/validateSecurityRules.js

# View deployment history
firebase deploy:history

# Rollback to previous version
firebase rollback:firestore:rules --version <version_number>
```

## 🔑 Key Security Rules

### User Access Patterns

| Action | Users Collection | Gigs Collection | Applications |
|--------|-----------------|-----------------|--------------|
| **Read** | All authenticated | All authenticated | Parties only |
| **Create** | Owner during signup | Authenticated users | Applicants only |
| **Update** | Owner only | Owner only | Limited access |
| **Delete** | Owner/Admin | Owner/Admin | Applicant/Admin |

### File Upload Limits

| Path | Max Size | Allowed Types | Access |
|------|----------|---------------|--------|
| `profilePhotos/` | 5 MB | Images (JPEG, PNG, WebP) | Owner/Public read |
| `portfolios/` | 10 MB | Images | Owner/Public read |
| `verificationDocuments/` | 10 MB | Images, PDF | Owner/Admin only |
| `messages/` | 25 MB | All media types | Participants |
| `gigs/attachments/` | 20 MB | Documents, Images | Authenticated |

## 🛡️ Security Features

### ✅ Implemented Protections
- ✅ Authentication required for all operations
- ✅ Owner-based access control
- ✅ Role-based admin access via custom claims
- ✅ File size and type validation
- ✅ Immutable security for sensitive records
- ✅ Payment and financial data protection
- ✅ Message and conversation privacy
- ✅ Verification document security

### 🔐 Access Control Functions

**Helper Functions Available:**
- `isAuthenticated()` - User is logged in
- `isOwner(userId)` - User owns the resource
- `isAdmin()` - User has admin custom claim
- `isVerifiedUser()` - User has completed verification
- `hasRequiredFields(fields)` - Data contains required fields

## ⚠️ Important Notes

### User Sign-Out Required
After setting admin claims, users **must sign out and sign back in** for changes to take effect.

```javascript
// Force token refresh in client
await firebase.auth().currentUser.getIdToken(true);
```

### Custom Claims Setup
Admins are identified by custom claims, not a collection. Use the script:
```bash
node scripts/setAdminClaim.js admin@example.com
```

### Service Account Key
Never commit `serviceAccountKey.json` to version control. It's already in `.gitignore`.

## 🧪 Testing Checklist

Before going to production:

- [ ] Validate rules: `node scripts/validateSecurityRules.js`
- [ ] Test with emulators locally
- [ ] Set at least one admin user
- [ ] Test authenticated user access
- [ ] Test unauthenticated access (should fail)
- [ ] Test cross-user access (should fail)
- [ ] Test admin access to protected resources
- [ ] Test file upload limits
- [ ] Test file type restrictions
- [ ] Deploy to Firebase
- [ ] Verify in production with test accounts

## 📞 Troubleshooting

### "Permission Denied" Errors

**Cause:** User not authenticated or lacks permissions

**Solutions:**
1. Ensure user is logged in
2. Refresh authentication token: `getIdToken(true)`
3. Check if resource belongs to user
4. Verify admin claims are set (for admin operations)

### Admin Functions Not Working

**Cause:** Custom claims not set or not refreshed

**Solutions:**
1. Verify admin claim: `node scripts/setAdminClaim.js --list`
2. Have user sign out and sign back in
3. Force token refresh in client

### File Upload Failing

**Cause:** File size or type violation

**Solutions:**
1. Check file size against limits
2. Verify file MIME type matches allowed types
3. Ensure user is authenticated
4. Check CORS configuration for web apps

### Rules Deployment Failed

**Cause:** Syntax error or Firebase CLI not configured

**Solutions:**
1. Run validation: `node scripts/validateSecurityRules.js`
2. Check Firebase login: `firebase login`
3. Verify project: `firebase use --add`
4. Check Firebase Console for error details

## 📚 Additional Resources

- Full deployment guide: `SECURITY_RULES_DEPLOYMENT.md`
- Firebase Rules Docs: https://firebase.google.com/docs/rules
- Firestore Rules: https://firebase.google.com/docs/firestore/security/rules-conditions
- Storage Rules: https://firebase.google.com/docs/storage/security

## 🔄 Update Workflow

When updating security rules:

1. **Test Locally**
   ```bash
   firebase emulators:start --only firestore,storage
   ```

2. **Validate Changes**
   ```bash
   node scripts/validateSecurityRules.js
   ```

3. **Deploy**
   ```bash
   firebase deploy --only firestore:rules,storage
   ```

4. **Monitor**
   - Check Firebase Console for errors
   - Monitor application logs
   - Test critical user flows

5. **Rollback if Needed**
   ```bash
   firebase deploy:history
   firebase rollback:firestore:rules --version <version>
   ```

---

**Need Help?** See `SECURITY_RULES_DEPLOYMENT.md` for detailed documentation.

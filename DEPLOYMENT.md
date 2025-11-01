# GigSA Deployment Guide

This document provides step-by-step instructions for deploying GigSA to Vercel.

## Prerequisites

1. **Firebase Project** - You need a production Firebase project with:
   - Authentication enabled (Email/Password provider)
   - Firestore Database created
   - Firebase Storage enabled
   - Security rules deployed

2. **Google Cloud Project** (Optional but recommended):
   - Google Cloud Vision API enabled for OCR functionality
   - API key or service account credentials

3. **Vercel Account** - Free account at [vercel.com](https://vercel.com)

## Step 1: Set Up Production Firebase Project

### 1.1 Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Name it (e.g., "kasigig-production")
4. Follow the setup wizard

### 1.2 Enable Required Services
1. **Authentication**:
   - Go to Authentication → Sign-in method
   - Enable "Email/Password" provider

2. **Firestore Database**:
   - Go to Firestore Database
   - Click "Create database"
   - Start in **production mode** (we have security rules)
   - Choose location (preferably close to South Africa, e.g., `europe-west1`)

3. **Storage**:
   - Go to Storage
   - Click "Get started"
   - Use default security rules for now

### 1.3 Deploy Security Rules

Deploy the Firestore security rules:
\`\`\`bash
firebase deploy --only firestore:rules
\`\`\`

### 1.4 Get Firebase Configuration

1. Go to Project Settings → General
2. Scroll to "Your apps"
3. Click "Add app" → Web (</>)
4. Register app and copy the configuration values:
   - API Key
   - Auth Domain
   - Project ID
   - Storage Bucket
   - Messaging Sender ID
   - App ID

### 1.5 Add Authorized Domains

1. Go to Authentication → Settings → Authorized domains
2. Add your Vercel deployment domain (you'll get this after deploying)
3. Example: `gig-sa.vercel.app`

## Step 2: Set Up Google Cloud Vision API (Optional)

For ID document verification with OCR:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable Cloud Vision API
3. Create credentials:
   - Go to APIs & Services → Credentials
   - Create API Key or Service Account
4. Copy the API key or download the service account JSON

## Step 3: Deploy to Vercel

### 3.1 Connect GitHub Repository

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js framework

### 3.2 Configure Environment Variables

In Vercel project settings, add the following environment variables:

#### Required Firebase Variables:
\`\`\`
NEXT_PUBLIC_USE_EMULATOR=false
NEXT_PUBLIC_FIREBASE_API_KEY=<your_firebase_api_key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<your_project_id>.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<your_project_id>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<your_project_id>.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<your_sender_id>
NEXT_PUBLIC_FIREBASE_APP_ID=<your_app_id>
\`\`\`

#### Optional Google Cloud Vision API:
\`\`\`
GOOGLE_CLOUD_API_KEY=<your_google_vision_api_key>
OCR_ENABLED=true
OCR_CONFIDENCE_THRESHOLD=70
\`\`\`

**Important**:
- All variables starting with `NEXT_PUBLIC_` are exposed to the browser
- Keep `NEXT_PUBLIC_USE_EMULATOR` set to `false` in production
- Never commit production Firebase credentials to git

### 3.3 Deploy

1. Click "Deploy"
2. Vercel will build and deploy your application
3. You'll get a production URL (e.g., `https://gig-sa.vercel.app`)

### 3.4 Update Firebase Authorized Domains

1. Go back to Firebase Console → Authentication → Settings → Authorized domains
2. Add your Vercel production URL domain

## Step 4: Verify Deployment

### 4.1 Test Core Functionality

1. **Authentication**:
   - Visit your Vercel URL
   - Try registering a new account
   - Try logging in

2. **Database**:
   - Create a test gig
   - Apply to a gig
   - Check Firestore console to verify data is being written

3. **Storage**:
   - Upload a profile photo
   - Upload portfolio images
   - Check Firebase Storage console

4. **Security Rules**:
   - Try accessing data you shouldn't be able to
   - Verify rules are working correctly

### 4.2 Monitor for Errors

1. Check Vercel deployment logs
2. Check browser console for client errors
3. Check Firebase Console for any errors

## Step 5: Post-Deployment Configuration

### 5.1 Custom Domain (Optional)

1. In Vercel project settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update Firebase authorized domains

### 5.2 Environment-Specific Settings

For staging vs production environments:

1. Create separate Firebase projects for staging/production
2. Use Vercel's preview deployments for staging
3. Set different environment variables per environment

## Environment Variables Reference

### Production Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_USE_EMULATOR` | Yes | Set to `false` for production | `false` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | Firebase API key | `AIza...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | Firebase auth domain | `project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Firebase project ID | `kasigig-production` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Yes | Firebase storage bucket | `project.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase sender ID | `123456789` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | Firebase app ID | `1:123:web:abc` |
| `GOOGLE_CLOUD_API_KEY` | No | Google Vision API key for OCR | `AIza...` |
| `OCR_ENABLED` | No | Enable/disable OCR | `true` |
| `OCR_CONFIDENCE_THRESHOLD` | No | OCR confidence threshold | `70` |

## Troubleshooting

### Build Fails

**Issue**: Build fails on Vercel

**Solutions**:
1. Check build logs in Vercel dashboard
2. Verify all environment variables are set
3. Try building locally: `npm run build`
4. Check for TypeScript errors: `npx tsc --noEmit`

### Authentication Not Working

**Issue**: Users can't sign up or log in

**Solutions**:
1. Verify Firebase Auth is enabled
2. Check if your deployment domain is in Firebase authorized domains
3. Check browser console for Firebase errors
4. Verify `NEXT_PUBLIC_FIREBASE_*` variables are correct

### Database Permissions Errors

**Issue**: PERMISSION_DENIED errors in Firestore

**Solutions**:
1. Verify security rules are deployed: `firebase deploy --only firestore:rules`
2. Check Firestore Rules tab in Firebase Console
3. Test rules in Firebase Console Rules Playground
4. Ensure user is authenticated before accessing protected data

### Images/Files Not Uploading

**Issue**: Storage uploads fail

**Solutions**:
1. Verify Firebase Storage is enabled
2. Check Storage security rules
3. Verify file size limits
4. Check browser console for CORS errors

### OCR Not Working

**Issue**: ID verification OCR fails

**Solutions**:
1. Verify Google Cloud Vision API is enabled
2. Check `GOOGLE_CLOUD_API_KEY` is set correctly
3. Verify API key has correct permissions
4. Check if billing is enabled on Google Cloud project
5. Fallback: System works without OCR (manual verification)

## Rollback Procedure

If deployment has issues:

1. **Vercel**: Go to Deployments tab, select previous working deployment, click "Promote to Production"
2. **Firebase**: Rollback rules if needed: `firebase deploy --only firestore:rules` from previous git commit
3. **Environment Variables**: Revert any environment variable changes in Vercel settings

## Monitoring & Maintenance

### Regular Checks

1. **Weekly**:
   - Check Vercel deployment status
   - Monitor Firebase usage and quotas
   - Review Firebase Console for errors

2. **Monthly**:
   - Review and optimize Firebase security rules
   - Check for unused storage files
   - Review authentication methods and users

3. **Quarterly**:
   - Update dependencies: `npm update`
   - Review and update Next.js version
   - Audit security rules

### Firebase Quotas (Free Tier)

Be aware of Firebase free tier limits:
- Firestore: 50K reads, 20K writes, 20K deletes per day
- Storage: 5GB storage, 1GB/day downloads
- Authentication: Unlimited (free)

For production with significant traffic, consider upgrading to Blaze (pay-as-you-go) plan.

## Security Checklist

Before going live:

- [ ] Firestore security rules deployed and tested
- [ ] Storage security rules configured
- [ ] Firebase authenticated domains configured
- [ ] NEXT_PUBLIC_USE_EMULATOR set to `false`
- [ ] All production credentials secured (not in git)
- [ ] HTTPS enforced (Vercel does this automatically)
- [ ] Service account keys (if any) properly secured
- [ ] Rate limiting considered for API endpoints
- [ ] Error messages don't expose sensitive data

## Support

For deployment issues:
- Vercel: [vercel.com/support](https://vercel.com/support)
- Firebase: [firebase.google.com/support](https://firebase.google.com/support)
- Next.js: [nextjs.org/docs](https://nextjs.org/docs)

---

**Last Updated**: 2025-10-30

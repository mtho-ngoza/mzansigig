# KasiGig - Environment Setup Guide

This project uses a **3-tier environment strategy** for safe development and deployment.

## 🌍 Environment Overview

```
┌─────────────────────────────────────────────────────┐
│ 1. LOCAL DEVELOPMENT (Your Machine)                 │
│    - Firebase Emulators (offline)                   │
│    - Fast, free, no cloud needed                    │
│    - Data resets when stopped                       │
│    - Command: npm run dev                           │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 2. DEV/STAGING (kasigig-dev)                        │
│    - Real Firebase cloud project                    │
│    - Test cloud features & integrations             │
│    - Safe to reset/clear data                       │
│    - Command: firebase use dev                      │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 3. PRODUCTION (kasigig-production)                  │
│    - Vercel deployment ONLY                         │
│    - Real user data - DO NOT TEST HERE              │
│    - Domain: kasigig.co.za                          │
│    - Command: firebase use production               │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start: Local Development (Recommended)

**Use Firebase Emulators for local development - no cloud project needed!**

### Step 1: Copy Environment File
```bash
cp .env.example .env.local
```

### Step 2: Verify Configuration
Your `.env.local` should have:
```bash
NEXT_PUBLIC_USE_EMULATOR=true
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-kasigig
# ... other emulator settings (already configured)
```

### Step 3: Start Development
```bash
npm run dev
```

This starts:
- Firebase Emulators (Auth, Firestore, Storage)
- Next.js dev server on http://localhost:3000
- Emulator UI on http://localhost:4000

**That's it!** You're ready to develop locally.

---

## 🧪 Dev/Staging Environment (kasigig-dev)

**Use this when you need to test with real cloud Firebase services.**

### When to Use Dev Environment:
- Testing Google Cloud Vision API (ID verification)
- Testing with real email sending
- Testing Firebase Storage CORS
- Integration testing with external services
- Sharing a test deployment with beta testers

### Setup Instructions:

#### 1. Get Firebase Credentials
1. Go to: https://console.firebase.google.com/project/kasigig-dev/settings/general
2. Scroll to "Your apps" section
3. If no web app exists:
   - Click "Add app" → Web (</>) icon
   - Name: "KasiGig Dev"
   - Register app
4. Copy the config values

#### 2. Update .env.local
```bash
# Comment out emulator settings
# NEXT_PUBLIC_USE_EMULATOR=true

# Add dev environment settings
NEXT_PUBLIC_USE_EMULATOR=false
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...your_dev_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=kasigig-dev.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=kasigig-dev
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=kasigig-dev.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc
```

#### 3. Test Locally
```bash
npm run dev
```

Now you're connected to the real `kasigig-dev` Firebase project!

#### 4. Deploy to Firebase Hosting (Optional)
```bash
# Switch to dev environment
firebase use dev

# Build and deploy
npm run build
firebase deploy --only hosting
```

Your dev site will be at: `https://kasigig-dev.web.app`

---

## 🏭 Production Environment (kasigig-production)

**⚠️ CRITICAL: Never connect to production locally!**

Production environment is **ONLY for Vercel deployment** with real users.

### Production Deployment Checklist:

#### 1. Prepare Production Build
```bash
# Ensure you're NOT connected to production locally
# Your .env.local should still use emulator or dev

npm run build
npm run start  # Test production build locally with emulator
```

#### 2. Deploy to Vercel

**Set Environment Variables in Vercel Dashboard:**

Go to: Vercel Project → Settings → Environment Variables

Add these for **Production** environment:

```bash
NEXT_PUBLIC_USE_EMULATOR=false
NEXT_PUBLIC_FIREBASE_API_KEY=<production key from Firebase Console>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=kasigig-production.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=kasigig-production
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=kasigig-production.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<production sender ID>
NEXT_PUBLIC_FIREBASE_APP_ID=<production app ID>

# Optional: Google Vision API for ID verification
GOOGLE_CLOUD_API_KEY=<production Vision API key>
OCR_ENABLED=true
OCR_CONFIDENCE_THRESHOLD=70
```

#### 3. Deploy
```bash
# Deploy via Git push (automatic)
git push origin main

# Or deploy via Vercel CLI
vercel --prod
```

#### 4. Verify Deployment
- Check that Firebase is connected to `kasigig-production`
- Test user registration
- Test ID verification (if Vision API configured)
- Monitor Firebase Console for any errors

---

## 🔄 Switching Between Environments

### Firebase CLI Environment Switching

```bash
# View available environments
firebase use

# Switch to dev
firebase use dev

# Switch to production
firebase use production

# View current environment
firebase use
```

### Local Development Environment Switching

**Option A: Use Emulators (Recommended)**
```bash
# .env.local
NEXT_PUBLIC_USE_EMULATOR=true
```

**Option B: Use Dev Cloud**
```bash
# .env.local
NEXT_PUBLIC_USE_EMULATOR=false
NEXT_PUBLIC_FIREBASE_PROJECT_ID=kasigig-dev
# ... other kasigig-dev credentials
```

**Option C: Never Use Production Locally!**
❌ Don't do this - production is Vercel-only!

---

## 📋 Environment Configuration Summary

| Environment | Firebase Project | Use Case | Where to Run | Data Persistence |
|-------------|-----------------|----------|--------------|------------------|
| **Local** | Emulators (none) | Daily development | Your machine | ❌ Resets on stop |
| **Dev** | kasigig-dev | Cloud testing | Local or Firebase Hosting | ✅ Persists (can reset) |
| **Production** | kasigig-production | Real users | Vercel only | ✅ Persists (never reset) |

---

## 🛠️ Firebase Commands Reference

### Deploy Security Rules

```bash
# Deploy to dev
firebase use dev
firebase deploy --only firestore:rules,storage

# Deploy to production
firebase use production
firebase deploy --only firestore:rules,storage
```

### View Deployed Rules

```bash
# Check current environment
firebase use

# View in Firebase Console
# Firestore: https://console.firebase.google.com/project/PROJECT_ID/firestore/rules
# Storage: https://console.firebase.google.com/project/PROJECT_ID/storage/rules
```

### Clear Dev Data (Safe)

```bash
# You can safely clear dev data anytime
# Go to: https://console.firebase.google.com/project/kasigig-dev/firestore/data
# Delete collections or individual documents

# Or use Firebase CLI
firebase firestore:delete --all-collections --project kasigig-dev
```

**⚠️ NEVER clear production data!**

---

## 🔐 Security Best Practices

1. **Never commit `.env.local`** - it's in `.gitignore`
2. **Never share production credentials** in code or documentation
3. **Use emulators for daily development** - it's faster and safer
4. **Test in dev before deploying to production**
5. **Monitor production Firebase Console** for unusual activity
6. **Set up Firebase security alerts** in production

---

## 🐛 Troubleshooting

### Emulators won't start
```bash
# Kill existing emulator processes
firebase emulators:stop

# Or manually kill processes on ports 4000, 8080, 9099, 9199
# Windows:
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Then restart
npm run dev
```

### Connected to wrong Firebase project
```bash
# Check which project you're using
firebase use

# Check .env.local file
cat .env.local

# Make sure NEXT_PUBLIC_FIREBASE_PROJECT_ID matches expected environment
```

### Data not persisting in emulators
This is expected! Emulator data resets when stopped. If you need persistence, use the dev environment.

### Can't access dev Firebase project
1. Verify you have permission to the `kasigig-dev` project in Firebase Console
2. Check that Firebase credentials in `.env.local` are correct
3. Ensure `NEXT_PUBLIC_USE_EMULATOR=false` when using dev

---

## 📚 Related Documentation

- [Firebase Emulators Guide](./EMULATORS.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Security Rules](./SECURITY_RULES_DEPLOYMENT.md)
- [Main README](./README.md)

---

**Questions?** Open an issue or check the documentation!

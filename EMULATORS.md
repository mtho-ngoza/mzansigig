# Firebase Emulators for Local Development

This project uses **Firebase Emulators exclusively** for all local development and testing. No real Firebase credentials are needed for local work!

## Why Emulators Only?

- **No costs**: Completely free local development
- **No production risks**: Can't accidentally affect production data
- **Faster**: Local emulators are faster than cloud
- **Offline capable**: Work without internet
- **Consistent**: Same environment for all developers

## Quick Start

### First Time Setup

1. **Copy environment template:**
   ```bash
   cp .env.example .env.local
   ```

   This creates `.env.local` with emulator configuration already set up!

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development:**
   ```bash
   npm run dev
   ```

   This automatically:
   - Starts Firebase emulators (Auth, Firestore, Storage)
   - Starts Next.js development server
   - Opens your app at http://localhost:3000

That's it! You're now developing with emulators.

## Available Commands

### Development

```bash
npm run dev
```

Starts Firebase emulators + Next.js dev server together.

**Services running:**
- Next.js: http://localhost:3000
- Firebase Auth Emulator: http://localhost:9099
- Firestore Emulator: http://localhost:8080
- Storage Emulator: http://localhost:9199
- Emulator UI: http://localhost:4000

### Testing

```bash
npm run test              # Watch mode
npm run test:ci           # Run once with coverage
npm run test:emulator     # Run tests with emulators
```

### Emulators Only

```bash
npm run emulators
```

Just starts Firebase emulators with UI (no Next.js).

## Emulator UI

The Firebase Emulator UI provides a web interface for:

- **Firestore**: View/edit documents and collections
- **Auth**: Create test users
- **Storage**: Upload/view files
- **Clear all data**: Reset to clean state

Access at: **http://localhost:4000**

## Configuration Files

### `.env.local` (Your Local File)

Created from `.env.example`, contains:

```bash
# Emulator-friendly Firebase config
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-gig-sa
FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199
```

### `firebase.json`

Defines emulator ports:

```json
{
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "storage": { "port": 9199 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
```

## Working with Emulator Data

### Clear All Data

In Emulator UI (http://localhost:4000):
- Click "Clear all data" button

Or restart emulators:
```bash
# Stop with Ctrl+C
npm run dev
```

### Export Data (Save State)

```bash
firebase emulators:export ./emulator-data
```

Saves current emulator data to `./emulator-data/`

### Import Data (Restore State)

```bash
firebase emulators:start --import=./emulator-data
```

Restarts emulators with saved data.

## CI/CD (GitHub Actions)

CI uses Firebase emulators automatically via Docker.

See `.github/workflows/ci.yml` - no setup needed!

## Production Deployment

**For production deployment only**, you'll need real Firebase credentials configured in your hosting environment (Vercel, Netlify, etc.).

Local development **never** needs production credentials.

## Troubleshooting

### Port Already in Use

**Error**: `Port 8080 is not open`

**Solution**: Kill process on that port or change port in `firebase.json`

```bash
# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :8080
kill -9 <PID>
```

### Can't Connect to Emulators

**Error**: App tries to connect to real Firebase

**Solution**: Check `.env.local` has emulator host variables:

```bash
FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199
```

### Emulators Won't Start

**Error**: `firebase command not found`

**Solution**: Install firebase-tools:

```bash
npm install
```

Firebase tools is already in `package.json` devDependencies.

## Best Practices

1. **Always use emulators for local dev** - Never connect to production Firebase locally
2. **Clear data often** - Start fresh to avoid stale data issues
3. **Use Emulator UI** - Great for debugging and inspecting data
4. **Export test scenarios** - Save emulator state for specific test cases
5. **Don't commit emulator data** - Already in `.gitignore`

## Resources

- [Firebase Emulator Documentation](https://firebase.google.com/docs/emulator-suite)
- [Emulator UI Guide](https://firebase.google.com/docs/emulator-suite/install_and_configure#emulator_ui)
- [Testing with Emulators](https://firebase.google.com/docs/emulator-suite/connect_and_prototype)

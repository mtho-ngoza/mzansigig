# Firebase Storage CORS Configuration

## Quick Fix - Use Firebase Console Method

### Option 1: Use Google Cloud Console (Recommended)

1. **Open Google Cloud Console Storage**:
   ```
   https://console.cloud.google.com/storage/browser/kasigig-dev.appspot.com
   ```

2. **Click on the bucket name** (`kasigig-dev.appspot.com`)

3. **Click on "Permissions" tab**

4. **Click "EDIT BUCKET POLICY"** or use the Cloud Shell

5. **Run this command in Cloud Shell**:
   ```bash
   gsutil cors set cors.json gs://kasigig-dev.appspot.com
   ```

   Make sure to upload the `cors.json` file first if using Cloud Shell.

### Option 2: Install Google Cloud SDK (One-time setup)

1. **Download and Install Google Cloud SDK**:
   - Windows: https://cloud.google.com/sdk/docs/install#windows
   - This will install `gsutil` command

2. **Initialize gcloud**:
   ```bash
   gcloud init
   ```

3. **Set your project**:
   ```bash
   gcloud config set project kasigig-dev
   ```

4. **Apply CORS configuration**:
   ```bash
   gsutil cors set cors.json gs://kasigig-dev.appspot.com
   ```

### Option 3: Firebase CLI (Alternative - but not directly supported)

Unfortunately, Firebase CLI doesn't have a direct command for CORS configuration. You need to use gsutil.

## Verify CORS Configuration

After applying, verify with:
```bash
gsutil cors get gs://kasigig-dev.appspot.com
```

## Current CORS Configuration

The `cors.json` file in the project root contains:
- Allowed origins: localhost:3000-3005, mzansigigs.co.za
- Allowed methods: GET, HEAD, PUT, POST, DELETE
- Max age: 3600 seconds

## Alternative: Temporary Fix for Development

If you can't configure CORS right now, you can temporarily use the Firebase Emulator for storage:

1. Update `.env.local`:
   ```
   NEXT_PUBLIC_USE_EMULATOR=true
   ```

2. Start Firebase emulators:
   ```
   firebase emulators:start
   ```

This will bypass CORS issues during development.

# Firebase Storage CORS Setup

## Commands to run:

```bash
# 1. Set your Firebase project
gcloud config set project <PROJECT_ID>

# 2. Apply CORS configuration to your storage bucket
gsutil cors set cors.json gs://<PROJECT_ID>.appspot.com

# 3. Verify CORS configuration was applied
gsutil cors get gs://<PROJECT_ID>.appspot.com
```

Replace `<PROJECT_ID>` with your Firebase project ID:
- Development: `kasigig-dev`
- Production: `kasigig-production`

## What each command does:

1. **gcloud config set project**: Sets your active Google Cloud project to your Firebase project
2. **gsutil cors set cors.json**: Applies the CORS rules from cors.json to your storage bucket
3. **gsutil cors get**: Verifies the CORS rules were applied correctly

## Expected output after step 3:
You should see the CORS configuration that matches what's in cors.json file.

## Troubleshooting:

If you get authentication errors:
```bash
gcloud auth login
```

If you get permission errors, make sure you're logged in with an account that has access to the Firebase project.
import * as admin from 'firebase-admin'

/**
 * Firebase Admin SDK initialization for server-side operations
 *
 * Used in API routes and server components
 *
 * Supports:
 * - FIREBASE_SERVICE_ACCOUNT_KEY env var (JSON string)
 * - Application Default Credentials (local development)
 */

let app: admin.app.App

export function getFirebaseAdmin(): admin.app.App {
  if (app) {
    return app
  }

  // Initialize Firebase Admin
  if (!admin.apps.length) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

    if (!projectId) {
      throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set')
    }

    try {
      // Check for service account key (for Vercel/serverless deployments)
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY

      if (serviceAccountKey) {
        // Parse service account JSON from environment variable
        const serviceAccount = JSON.parse(serviceAccountKey)
        app = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId,
        })
        console.log('✅ Firebase Admin SDK initialized with service account')
      } else {
        // Fall back to Application Default Credentials (local development)
        app = admin.initializeApp({
          projectId,
        })
        console.log('✅ Firebase Admin SDK initialized with default credentials')
      }
    } catch (error) {
      console.error('❌ Firebase Admin initialization error:', error)
      throw error
    }
  } else {
    app = admin.app()
  }

  return app
}

// Export initialized app
export default getFirebaseAdmin

import * as admin from 'firebase-admin'

/**
 * Firebase Admin SDK initialization for server-side operations
 *
 * Used in API routes and server components
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

    // In development, use application default credentials or emulator
    // In production, set GOOGLE_APPLICATION_CREDENTIALS environment variable
    try {
      app = admin.initializeApp({
        projectId,
        // Firebase will automatically use Application Default Credentials
        // or emulator if FIRESTORE_EMULATOR_HOST is set
      })

      console.log('✅ Firebase Admin SDK initialized')
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

import { NextRequest } from 'next/server'
import { getFirebaseAdmin } from '@/lib/firebase-admin'

export interface AuthResult {
  authenticated: boolean
  userId: string | null
  error?: string
}

/**
 * Verify Firebase ID token from Authorization header
 *
 * Extracts and verifies the Bearer token from the Authorization header.
 * This is the secure way to authenticate API requests - never trust
 * user-provided headers like x-user-id which can be spoofed.
 *
 * @param request - NextRequest object
 * @returns AuthResult with userId if authenticated
 *
 * @example
 * ```ts
 * const auth = await verifyAuthToken(request)
 * if (!auth.authenticated) {
 *   return NextResponse.json({ error: auth.error }, { status: 401 })
 * }
 * // Use auth.userId safely
 * ```
 */
export async function verifyAuthToken(request: NextRequest): Promise<AuthResult> {
  try {
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        authenticated: false,
        userId: null,
        error: 'Missing or invalid Authorization header. Expected: Bearer <token>'
      }
    }

    const idToken = authHeader.substring(7) // Remove 'Bearer ' prefix

    if (!idToken || idToken.trim() === '') {
      return {
        authenticated: false,
        userId: null,
        error: 'Empty token provided'
      }
    }

    // Verify the token with Firebase Admin SDK
    const app = getFirebaseAdmin()
    const decodedToken = await app.auth().verifyIdToken(idToken)

    return {
      authenticated: true,
      userId: decodedToken.uid
    }
  } catch (error) {
    // Handle specific Firebase Auth errors
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        return {
          authenticated: false,
          userId: null,
          error: 'Token expired. Please sign in again.'
        }
      }
      if (error.message.includes('invalid') || error.message.includes('malformed')) {
        return {
          authenticated: false,
          userId: null,
          error: 'Invalid token. Please sign in again.'
        }
      }
    }

    console.error('Token verification error:', error)
    return {
      authenticated: false,
      userId: null,
      error: 'Authentication failed'
    }
  }
}

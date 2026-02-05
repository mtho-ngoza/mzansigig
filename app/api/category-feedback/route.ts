import { NextRequest, NextResponse } from 'next/server'
import { FirestoreService } from '@/lib/database/firestore'
import { verifyAuthToken } from '@/lib/auth/verifyToken'

export async function POST(request: NextRequest) {
  try {
    // Verify Firebase ID token (secure authentication)
    const auth = await verifyAuthToken(request)
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { suggestion, timestamp } = body

    if (!suggestion) {
      return NextResponse.json(
        { error: 'Missing required field: suggestion' },
        { status: 400 }
      )
    }

    // Validate suggestion length to prevent abuse
    if (typeof suggestion !== 'string' || suggestion.length > 1000) {
      return NextResponse.json(
        { error: 'Suggestion must be a string with max 1000 characters' },
        { status: 400 }
      )
    }

    // Save to categoryFeedback collection for admin review
    // Use authenticated userId from token, not from request body
    await FirestoreService.create('categoryFeedback', {
      suggestion: suggestion.trim(),
      userId: auth.userId,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      status: 'pending',
      createdAt: new Date()
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error saving category feedback:', error)
    return NextResponse.json(
      { error: 'Failed to save feedback' },
      { status: 500 }
    )
  }
}

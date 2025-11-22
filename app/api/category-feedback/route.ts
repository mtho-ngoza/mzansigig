import { NextRequest, NextResponse } from 'next/server'
import { FirestoreService } from '@/lib/database/firestore'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { suggestion, userId, timestamp } = body

    if (!suggestion || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Save to categoryFeedback collection for admin review
    await FirestoreService.create('categoryFeedback', {
      suggestion,
      userId,
      timestamp: new Date(timestamp),
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

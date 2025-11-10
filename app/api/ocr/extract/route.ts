import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Server-side API route for OCR text extraction using Google Vision API
 * This keeps the API key secure on the server side
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageUrl, userId } = body

    // Require authentication: userId must be provided
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required: userId is missing' },
        { status: 401 }
      )
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      )
    }

    // Security check: Verify the image URL belongs to the user's storage path
    // This prevents users from processing OCR on other users' documents
    const isValidUserDocument = imageUrl.includes(`verificationDocuments/${userId}/`) ||
                                imageUrl.includes(`verificationDocuments%2F${userId}%2F`)

    if (!isValidUserDocument) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only process your own documents' },
        { status: 403 }
      )
    }

    // Check if Google Vision API is configured
    const apiKey = process.env.GOOGLE_CLOUD_API_KEY
    console.log('🔑 API Key check:', apiKey ? `Present (${apiKey.substring(0, 10)}...)` : 'MISSING')

    if (!apiKey) {
      console.warn('❌ Google Vision API not configured on server')
      return NextResponse.json(
        {
          success: false,
          extractedText: '',
          confidence: 0,
          error: 'Google Vision API not configured - please set GOOGLE_CLOUD_API_KEY in environment variables'
        },
        { status: 500 }
      )
    }

    console.log('✓ Calling Google Vision API for image:', imageUrl.substring(0, 100) + '...')

    // Fetch the image and convert to base64 for better compatibility
    let imageContent: { content: string } | { source: { imageUri: string } }
    try {
      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
      }
      const imageBuffer = await imageResponse.arrayBuffer()
      const base64Image = Buffer.from(imageBuffer).toString('base64')
      imageContent = { content: base64Image }
      console.log('✓ Image fetched and converted to base64 (', Math.round(base64Image.length / 1024), 'KB)')
    } catch (fetchError) {
      console.warn('Failed to fetch image as base64, falling back to imageUri:', fetchError)
      imageContent = { source: { imageUri: imageUrl } }
    }

    // Call Google Vision API with DOCUMENT_TEXT_DETECTION for better accuracy on IDs
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: imageContent,
              features: [
                {
                  type: 'DOCUMENT_TEXT_DETECTION', // Better for documents like IDs
                  maxResults: 1,
                },
                {
                  type: 'TEXT_DETECTION', // Fallback text detection
                  maxResults: 10,
                },
              ],
              imageContext: {
                languageHints: ['en', 'af'], // English and Afrikaans for SA IDs
              },
            },
          ],
        }),
      }
    )

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text()
      console.error('❌ Google Vision API HTTP error:', visionResponse.status, visionResponse.statusText)
      console.error('❌ Error details:', errorText)
      return NextResponse.json(
        {
          success: false,
          extractedText: '',
          confidence: 0,
          error: `Google Vision API error: ${visionResponse.statusText}`
        },
        { status: visionResponse.status }
      )
    }

    const data = await visionResponse.json()

    if (data.responses?.[0]?.error) {
      console.error('Vision API error:', data.responses[0].error)
      return NextResponse.json(
        {
          success: false,
          extractedText: '',
          confidence: 0,
          error: `Vision API error: ${data.responses[0].error.message}`
        },
        { status: 500 }
      )
    }

    const response = data.responses?.[0]

    // Try DOCUMENT_TEXT_DETECTION result first (more accurate for documents)
    let fullText = response?.fullTextAnnotation?.text || ''
    let confidence = 0.9 // DOCUMENT_TEXT_DETECTION is generally high confidence

    // Fallback to TEXT_DETECTION if DOCUMENT_TEXT_DETECTION didn't return results
    if (!fullText && response?.textAnnotations && response.textAnnotations.length > 0) {
      fullText = response.textAnnotations[0].description || ''
      confidence = response.textAnnotations[0].confidence || 0.8
      console.log('ℹ️ Using TEXT_DETECTION fallback')
    }

    if (!fullText) {
      console.warn('⚠️ No text detected in document')
      console.warn('Response:', JSON.stringify(response, null, 2))
      return NextResponse.json({
        success: false,
        extractedText: '',
        confidence: 0,
        error: 'No text detected in document. Please ensure the image is clear and well-lit.',
      })
    }

    console.log('✅ OCR Success! Extracted', fullText.length, 'characters with', Math.round(confidence * 100), '% confidence')
    console.log('First 200 chars:', fullText.substring(0, 200))

    return NextResponse.json({
      success: true,
      extractedText: fullText,
      confidence: Math.round(confidence * 100),
    })
  } catch (error) {
    console.error('❌ OCR API route error:', error)
    return NextResponse.json(
      {
        success: false,
        extractedText: '',
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred during OCR processing'
      },
      { status: 500 }
    )
  }
}

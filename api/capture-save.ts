import type { VercelRequest, VercelResponse } from '@vercel/node'
import { db } from '../lib/firebase'

interface FirestoreResult {
  success: boolean
  documentId?: string
  message: string
  error?: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed. Only POST requests are accepted.',
      allowedMethod: 'POST',
      receivedMethod: req.method
    })
  }

  try {
    // Get body data - handle different formats
    let bodyData = req.body
    let rawBody = ''
    
    // Convert body to string for raw capture
    if (bodyData) {
      if (typeof bodyData === 'string') {
        rawBody = bodyData
      } else if (typeof bodyData === 'object') {
        rawBody = JSON.stringify(bodyData, null, 2)
      }
    }

    // If body is empty, try to get it from the raw request
    if (!bodyData && !rawBody) {
      // For cases where body parser didn't work
      const chunks: any[] = []
      req.on('data', (chunk) => {
        chunks.push(chunk)
      })
      
      req.on('end', () => {
        if (chunks.length > 0) {
          rawBody = Buffer.concat(chunks).toString('utf8')
          bodyData = rawBody
        }
      })
    }

    // Detect content type and format
    const contentType = req.headers['content-type'] || ''
    const isJSON = contentType.includes('application/json')
    const isXML = contentType.includes('xml') || 
                  contentType.includes('text/plain') && rawBody.trim().startsWith('<?xml') ||
                  rawBody.trim().startsWith('<?xml')
    const isFormData = contentType.includes('application/x-www-form-urlencoded') || 
                       contentType.includes('multipart/form-data')
    const isTextPlain = contentType.includes('text/plain')

    // Try to parse body based on content type
    let parsedBody = bodyData
    if (isJSON && typeof bodyData === 'string') {
      try {
        parsedBody = JSON.parse(bodyData)
      } catch (e) {
        // Keep as string if JSON parsing fails
        parsedBody = bodyData
      }
    } else if (isFormData && typeof bodyData === 'string') {
      // Parse form data
      try {
        const formData = new URLSearchParams(bodyData)
        parsedBody = Object.fromEntries(formData)
      } catch (e) {
        parsedBody = bodyData
      }
    }

    // Capture all request data
    const capturedData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      headers: req.headers,
      query: req.query,
      // Body data - multiple formats for better capture
      body: parsedBody,
      rawBody: rawBody || null,
      bodyType: isJSON ? 'json' : isXML ? 'xml' : isFormData ? 'form' : isTextPlain ? 'text' : 'unknown',
      // Content type and format detection
      contentType: contentType,
      isJSON: isJSON,
      isXML: isXML,
      isFormData: isFormData,
      isTextPlain: isTextPlain,
      // Additional request information
      ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
      contentLength: req.headers['content-length'],
      // Debug info
      bodyExists: !!bodyData,
      rawBodyExists: !!rawBody,
      bodyDataType: typeof bodyData,
      rawBodyLength: rawBody ? rawBody.length : 0
    }

    // Set CORS headers for cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      return res.status(200).end()
    }

    // Save to Firestore
    let firestoreResult: FirestoreResult
    try {
      const docRef = await db.collection('api_requests').add({
        ...capturedData,
        createdAt: new Date(),
        // Add a unique identifier for this request
        requestId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      })
      
      firestoreResult = {
        success: true,
        documentId: docRef.id,
        message: 'Data saved to Firestore successfully'
      }
    } catch (firestoreError) {
      console.error('Firestore error:', firestoreError)
      firestoreResult = {
        success: false,
        error: 'Failed to save to Firestore',
        message: firestoreError instanceof Error ? firestoreError.message : 'Unknown Firestore error'
      }
    }

    // Return the captured data along with Firestore result
    return res.status(200).json({
      success: true,
      message: 'Request data captured successfully',
      data: capturedData,
      firestore: firestoreResult
    })

  } catch (error) {
    console.error('Error capturing request data:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 
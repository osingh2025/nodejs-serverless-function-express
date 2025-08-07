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
    // Capture all request data
    const capturedData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      headers: req.headers,
      query: req.query,
      body: req.body,
      // Additional request information
      ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length'],
      // Vercel specific headers
      vercelHeaders: {
        'x-vercel-id': req.headers['x-vercel-id'],
        'x-real-ip': req.headers['x-real-ip'],
        'x-forwarded-proto': req.headers['x-forwarded-proto'],
        'x-forwarded-host': req.headers['x-forwarded-host']
      }
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
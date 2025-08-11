import type { VercelRequest, VercelResponse } from '@vercel/node'
import { db } from '../lib/firebase'

interface FirestoreResult {
  success: boolean
  documentId?: string
  message: string
  error?: string
}

interface XMLMetadata {
  declaration: string
  rootElement: string
  length: number
  hasDoctype: boolean
  encoding: string
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
    // Get raw body data - this is crucial for XML
    let rawBody = ''
    
    // Handle different body formats
    if (req.body) {
      if (typeof req.body === 'string') {
        rawBody = req.body
      } else if (typeof req.body === 'object') {
        // If it's a Buffer or stream-like object
        if (req.body.toString) {
          rawBody = req.body.toString('utf8')
        } else {
          // If it's a parsed object, stringify it
          rawBody = JSON.stringify(req.body, null, 2)
        }
      }
    }

    // Detect XML content
    const contentType = req.headers['content-type'] || ''
    const isXML = contentType.includes('xml') || 
                  contentType.includes('text/plain') && rawBody.trim().startsWith('<?xml') ||
                  rawBody.trim().startsWith('<?xml')

    // Extract XML metadata if present
    let xmlMetadata: XMLMetadata | null = null
    if (isXML && rawBody) {
      try {
        // Extract basic XML info
        const xmlStart = rawBody.indexOf('<?xml')
        const xmlEnd = rawBody.indexOf('?>')
        if (xmlStart !== -1 && xmlEnd !== -1) {
          const xmlDeclaration = rawBody.substring(xmlStart, xmlEnd + 2)
          
          // Try to extract root element
          const rootMatch = rawBody.match(/<([a-zA-Z][a-zA-Z0-9]*)/)
          const rootElement = rootMatch ? rootMatch[1] : 'unknown'
          
          xmlMetadata = {
            declaration: xmlDeclaration,
            rootElement: rootElement,
            length: rawBody.length,
            hasDoctype: rawBody.includes('<!DOCTYPE'),
            encoding: xmlDeclaration.includes('encoding="UTF-8"') ? 'UTF-8' : 'unknown'
          }
        }
      } catch (error) {
        console.error('Error parsing XML metadata:', error)
      }
    }

    // Capture all request data with enhanced XML support
    const capturedData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      headers: req.headers,
      query: req.query,
      body: req.body,
      // Raw body data (important for XML)
      rawBody: rawBody || null,
      // Content type and format detection
      contentType: contentType,
      isXML: isXML,
      xmlMetadata: xmlMetadata,
      // Additional request information
      ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
      contentLength: req.headers['content-length']
      // Vercel specific headers
    //   vercelHeaders: {
    //     'x-vercel-id': req.headers['x-vercel-id'],
    //     'x-real-ip': req.headers['x-real-ip'],
    //     'x-forwarded-proto': req.headers['x-forwarded-proto'],
    //     'x-forwarded-host': req.headers['x-forwarded-host']
    //   }
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
        requestId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        // Add collection type for better organization
        collectionType: 'xml_capture'
      })
      
      firestoreResult = {
        success: true,
        documentId: docRef.id,
        message: 'XML data saved to Firestore successfully'
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
      message: isXML ? 'XML data captured successfully' : 'Request data captured successfully',
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
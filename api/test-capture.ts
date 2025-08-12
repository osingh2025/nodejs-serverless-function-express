import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow all methods for testing
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }

  try {
    // Get all possible body representations
    const bodyData = req.body
    const bodyType = typeof bodyData
    const bodyString = bodyData ? String(bodyData) : null
    const bodyJSON = bodyData ? JSON.stringify(bodyData, null, 2) : null
    
    // Get raw headers
    const headers = req.headers
    const contentType = headers['content-type'] || 'not-set'
    const contentLength = headers['content-length'] || 'not-set'
    
    // Create detailed response
    const response = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      
      // Body analysis
      body: {
        data: bodyData,
        type: bodyType,
        string: bodyString,
        json: bodyJSON,
        exists: !!bodyData,
        length: bodyString ? bodyString.length : 0
      },
      
      // Headers analysis
      headers: {
        all: headers,
        contentType: contentType,
        contentLength: contentLength,
        userAgent: headers['user-agent'] || 'not-set'
      },
      
      // Request info
      query: req.query,
      ip: headers['x-forwarded-for'] || req.connection?.remoteAddress,
      
      // Debug info
      debug: {
        bodyIsNull: bodyData === null,
        bodyIsUndefined: bodyData === undefined,
        bodyIsEmptyString: bodyData === '',
        bodyIsEmptyObject: JSON.stringify(bodyData) === '{}',
        contentTypeIncludesJson: contentType.includes('json'),
        contentTypeIncludesForm: contentType.includes('form'),
        contentTypeIncludesText: contentType.includes('text')
      }
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    return res.status(200).json({
      success: true,
      message: 'Test capture completed',
      data: response
    })

  } catch (error) {
    console.error('Error in test capture:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 
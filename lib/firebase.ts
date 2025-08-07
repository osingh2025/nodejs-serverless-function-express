import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  if (getApps().length === 0) {
    // For Vercel deployment, use service account from environment variables
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      initializeApp({
        credential: cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      })
    } else {
      // For local development, you can use a service account key file
      // Make sure to add FIREBASE_SERVICE_ACCOUNT_KEY_PATH to your .env file
      console.warn('Firebase service account not configured. Please set FIREBASE_SERVICE_ACCOUNT environment variable.')
    }
  }
  
  return getFirestore()
}

export const db = initializeFirebase() 

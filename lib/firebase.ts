import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, Settings } from 'firebase-admin/firestore'

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  if (getApps().length === 0) {
    // For Vercel deployment, use service account from environment variables
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        const appConfig: any = {
          credential: cert(serviceAccount)
        }
        
        // Add database URL if provided (optional for Firestore)
        if (process.env.FIREBASE_DATABASE_URL) {
          appConfig.databaseURL = process.env.FIREBASE_DATABASE_URL
        }
        
        initializeApp(appConfig)
        console.log('Firebase Admin SDK initialized successfully')
      } catch (error) {
        console.error('Error initializing Firebase:', error)
        throw new Error('Failed to initialize Firebase Admin SDK')
      }
    } else {
      // For local development, you can use a service account key file
      // Make sure to add FIREBASE_SERVICE_ACCOUNT_KEY_PATH to your .env file
      console.warn('Firebase service account not configured. Please set FIREBASE_SERVICE_ACCOUNT environment variable.')
      throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is required')
    }
  }
  
  // Configure Firestore settings
  const firestoreSettings: Settings = {
    ignoreUndefinedProperties: true
  }
  
  const db = getFirestore()
  db.settings(firestoreSettings)
  
  return db
}

export const db = initializeFirebase() 

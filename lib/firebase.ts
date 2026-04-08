import * as admin from 'firebase-admin'

// Initialize Firebase Admin SDK
let firebaseApp: admin.app.App | null = null

export function initializeFirebase() {
  if (firebaseApp) {
    return firebaseApp
  }

  // Check if Firebase is already initialized by checking for service account
  if (admin.apps.length > 0) {
    firebaseApp = admin.app()
    return firebaseApp
  }

  try {
    // Try to initialize with environment variables
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }

    // Check if all required fields are present
    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
      console.warn('Firebase credentials not fully configured in environment variables')
      return null
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    })

    console.log('Firebase initialized successfully')
    return firebaseApp
  } catch (error) {
    console.error('Firebase initialization error:', error)
    return null
  }
}

export function getFirebaseMessaging() {
  const app = initializeFirebase()
  if (!app) {
    return null
  }
  return admin.messaging(app)
}

export function isFirebaseConfigured() {
  return !!process.env.FIREBASE_PROJECT_ID && 
         !!process.env.FIREBASE_CLIENT_EMAIL && 
         !!process.env.FIREBASE_PRIVATE_KEY
}

let auth;
let adminApp;

if (process.env.NODE_ENV === 'test') {
  auth = { verifyIdToken: async () => ({ uid: 'test_uid' }) };
} else {
  const { initializeApp, cert } = require('firebase-admin/app');
  const { getAuth } = require('firebase-admin/auth');
  try {
    const serviceAccount = require('./serviceAccountKey.json');
    adminApp = initializeApp({
      credential: cert(serviceAccount)
    });
    auth = getAuth(adminApp);
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Firebase Admin not configured. Using Mock Auth.');
    auth = { verifyIdToken: async () => ({ uid: 'mock_uid' }) };
  }
}

// Mock Firestore DB for development until real credentials are provided
const db = {
  collection: (colName) => ({
    doc: (docId) => ({
      set: async (data) => console.log(`[Firestore Mock] SET ${colName}/${docId}:`, data),
      update: async (data) => console.log(`[Firestore Mock] UPDATE ${colName}/${docId}:`, data),
      get: async () => ({ exists: true, data: () => ({ status: 'dispatched' }) }),
    }),
    add: async (data) => console.log(`[Firestore Mock] ADD ${colName}:`, data)
  })
};

module.exports = { auth, db };

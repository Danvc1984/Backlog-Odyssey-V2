
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const getAdminApp = (): App => {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccount) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_KEY environment variable');
  }

  const serviceAccountJson = JSON.parse(
    Buffer.from(serviceAccount, 'base64').toString('utf-8')
  );

  return initializeApp({
    credential: cert(serviceAccountJson),
    projectId: 'studio-8063658966-c0f00',
  });
};

function getAdminAuth() {
  return getAuth(getAdminApp());
}

function getAdminFirestore() {
  return getFirestore(getAdminApp());
}

export { getAdminApp, getAdminAuth, getAdminFirestore };

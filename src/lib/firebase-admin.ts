
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccount) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_KEY environment variable');
}

const serviceAccountJson = JSON.parse(
  Buffer.from(serviceAccount, 'base64').toString('utf-8')
);


let adminApp: App;

if (!getApps().length) {
  adminApp = initializeApp({
    credential: cert(serviceAccountJson),
    projectId: 'studio-8063658966-c0f00',
  });
} else {
  adminApp = getApps()[0];
}

export { adminApp };

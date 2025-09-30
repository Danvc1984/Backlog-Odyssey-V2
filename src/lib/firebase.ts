import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  "projectId": "studio-8063658966-c0f00",
  "appId": "1:1074354689225:web:95ec2c7882013571bb2918",
  "apiKey": "AIzaSyCXBN3lAJDD-rT3AuoIptguj_JEK9hQRzc",
  "authDomain": "studio-8063658966-c0f00.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "1074354689225"
};

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
}

const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider };

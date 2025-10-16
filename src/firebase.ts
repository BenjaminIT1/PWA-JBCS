import { initializeApp, getApps } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';

// Your web app's Firebase configuration provided by the user
const firebaseConfig = {
  apiKey: "AIzaSyA4hsz6qAOmSgZ5-s_7nGjfLHFXN9ph3RY",
  authDomain: "pwa-jbc.firebaseapp.com",
  projectId: "pwa-jbc",
  storageBucket: "pwa-jbc.firebasestorage.app",
  messagingSenderId: "173833703081",
  appId: "1:173833703081:web:228e6fcabc3b16612e63b8"
};

let app: FirebaseApp;

export function initFirebase(): FirebaseApp {
  if (getApps().length > 0) {
    app = getApps()[0];
    return app;
  }
  app = initializeApp(firebaseConfig);
  return app;
}

export async function getFcmToken(): Promise<string | null> {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.log('Firebase Messaging is not supported in this browser.');
      return null;
    }
    
    const messaging = getMessaging(app);
    const vapidKey = "BARa5dKTg-dwJ3lTeohN3DCG_2E5HbkKauUOyzc1MdDFsEyUZW2rcU-B6JnYRVdb11-jINwIryDDHnxLf07eTr8";
    
    console.log('Requesting permission for notifications...');
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      const token = await getToken(messaging, { vapidKey });
      return token;
    } else {
      console.log('Unable to get permission to notify.');
      return null;
    }
  } catch (err) {
    console.error('An error occurred while retrieving token.', err);
    return null;
  }
}  

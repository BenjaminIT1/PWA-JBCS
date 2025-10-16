// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
// with the same config as in the client
const firebaseConfig = {
  apiKey: "AIzaSyA4hsz6qAOmSgZ5-s_7nGjfLHFXN9ph3RY",
  authDomain: "pwa-jbc.firebaseapp.com",
  projectId: "pwa-jbc",
  storageBucket: "pwa-jbc.appspot.com",
  messagingSenderId: "173833703081",
  appId: "1:173833703081:web:228e6fcabc3b16612e63b8"
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo/logo.png'
  };

  self.registration.showNotification(notificationTitle,
    notificationOptions);
});

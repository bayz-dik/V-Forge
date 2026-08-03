// Konfigurasi Firebase project V-Forge.
// Nilai ini adalah identitas project publik; keamanan data tetap diatur melalui Firebase Rules.

const firebaseConfig = {
  apiKey: "AIzaSyCwWZAjEizBHWmMcz8SIGc68DEwizB0tW4",
  authDomain: "v-forge-app.firebaseapp.com",
  projectId: "v-forge-app",
  storageBucket: "v-forge-app.firebasestorage.app",
  messagingSenderId: "822523087326",
  appId: "1:822523087326:web:590e8c11aac0b9c2e8f54f"
};

// Tetap memakai SDK compat supaya project bisa dijalankan tanpa build tool di HP.
let auth = null;
let db = null;
let firebaseInitError = null;

try {
  if (typeof firebase === 'undefined') {
    throw new Error('Firebase SDK tidak berhasil dimuat.');
  }

  if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  auth = firebase.auth();
  db = firebase.firestore();
} catch (error) {
  firebaseInitError = error;
  console.error('Firebase gagal diinisialisasi:', error);
}

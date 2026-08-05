// Konfigurasi Firebase project V-Forge
// Config ini aman untuk publik (bukan rahasia) - keamanan diatur lewat Firestore Security Rules, bukan config ini

const firebaseConfig = {
  apiKey: "AIzaSyCwWZAjEizBHWmMcz8SIGc68DEwizB0tW4",
  authDomain: "v-forge-app.firebaseapp.com",
  projectId: "v-forge-app",
  storageBucket: "v-forge-app.firebasestorage.app",
  messagingSenderId: "822523087326",
  appId: "1:822523087326:web:590e8c11aac0b9c2e8f54f"
};

// Inisialisasi Firebase (pakai versi compat biar gampang dipakai tanpa build tool/import)
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// Firebase Cloud Functions dipakai untuk hadiah misi dan aktivasi Premium
// secara aman dari backend. Jika Functions belum dideploy, variabel ini null
// dan UI akan memberi penjelasan tanpa mengubah entitlement di sisi klien.
const functions = (typeof firebase.app === 'function' && typeof firebase.app().functions === 'function')
  ? firebase.app().functions('asia-southeast2')
  : null;

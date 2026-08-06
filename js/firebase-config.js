// ============================================================
// V-FORGE v9.1.4 — SAFE FIREBASE BOOTSTRAP + STARTUP WATCHDOG
// Firebase web config is public by design. Security remains in Rules/Auth.
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyCwWZAjEizBHWmMcz8SIGc68DEwizB0tW4",
  authDomain: "v-forge-app.firebaseapp.com",
  projectId: "v-forge-app",
  storageBucket: "v-forge-app.firebasestorage.app",
  messagingSenderId: "822523087326",
  appId: "1:822523087326:web:590e8c11aac0b9c2e8f54f"
};

// Gunakan var agar auth.js tetap memiliki fallback global ketika SDK eksternal
// gagal dimuat atau diblokir browser.
var auth = null;
var db = null;
var functions = null;
var VFORGE_FIREBASE_PLAN = 'spark';
var VFORGE_FIREBASE_READY = false;
var VFORGE_FIREBASE_ERROR = null;

try {
  if (!window.firebase || typeof window.firebase.initializeApp !== 'function') {
    throw new Error('Firebase SDK tidak tersedia.');
  }

  if (!firebase.apps || firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
  }

  auth = firebase.auth();
  db = firebase.firestore();
  VFORGE_FIREBASE_READY = true;
} catch (error) {
  VFORGE_FIREBASE_ERROR = error;
  console.error('[V-Forge] Firebase bootstrap gagal:', error);

  try {
    window.dispatchEvent(new CustomEvent('vforge:firebase-error', {
      detail: { message: String(error?.message || error || 'Firebase gagal dimuat') }
    }));
  } catch (_) {}
}

// Cloud Functions belum dipanggil pada Firebase Spark.
functions = null;

(function installVForgeStartupWatchdog() {
  const TIMEOUT_MS = 10000;
  let released = false;

  function getCurrentUser() {
    try {
      return auth && auth.currentUser ? auth.currentUser : null;
    } catch (_) {
      return null;
    }
  }

  function hideLoadingScreen() {
    const loading = document.getElementById('auth-loading-screen');
    if (!loading) return;
    loading.classList.add('hidden');
    loading.setAttribute('aria-hidden', 'true');
    loading.style.setProperty('display', 'none', 'important');
    loading.style.setProperty('pointer-events', 'none', 'important');
  }

  function openFallbackPage(pageId, navIndex) {
    try {
      if (typeof window.goToPage === 'function') {
        window.goToPage(pageId, navIndex);
        return;
      }
    } catch (_) {}

    document.querySelectorAll('.page').forEach((page) => page.classList.remove('active'));
    document.getElementById(pageId)?.classList.add('active');
    document.body?.classList.toggle('auth-mode', pageId === 'page-login');
  }

  function releaseStartup(reason) {
    if (released) return;
    const loading = document.getElementById('auth-loading-screen');
    if (!loading || loading.classList.contains('hidden') || loading.getAttribute('aria-hidden') === 'true') {
      released = true;
      return;
    }

    released = true;
    const user = getCurrentUser();

    if (user) {
      try {
        if (typeof window.buildDefaultUserData === 'function' && typeof window.applyUserDataToApp === 'function') {
          window.applyUserDataToApp(window.buildDefaultUserData(user), user);
        }
      } catch (_) {}

      hideLoadingScreen();
      openFallbackPage('page-home', 0);

      setTimeout(() => {
        const message = 'Aplikasi dibuka dalam mode lokal. Sinkronisasi Firebase akan mencoba kembali otomatis.';
        if (typeof window.v9Toast === 'function') window.v9Toast(message, 'info');
        else if (typeof window.safeShowToast === 'function') window.safeShowToast(message, 'info');
      }, 250);
    } else {
      hideLoadingScreen();
      openFallbackPage('page-login', -1);
      const error = document.getElementById('login-error');
      if (error) {
        error.textContent = VFORGE_FIREBASE_READY
          ? 'Pemeriksaan sesi terlalu lama. Silakan masuk kembali.'
          : 'Firebase belum berhasil dimuat. Muat ulang atau coba jaringan lain.';
      }
    }

    console.warn('[V-Forge] Startup watchdog melepas layar loading:', reason);
  }

  window.VForgeStartupWatchdog = {
    version: '9.1.4',
    release: releaseStartup,
    get released() { return released; }
  };

  // Jangan pernah membiarkan splash screen mengunci aplikasi tanpa batas.
  window.setTimeout(() => releaseStartup('timeout-10s'), TIMEOUT_MS);

  // Bila SDK Firebase tidak tersedia, auth.js akan memakai fallback global null.
  // Watchdog tetap menjadi lapisan pengaman kedua.
  window.addEventListener('vforge:firebase-error', () => {
    window.setTimeout(() => releaseStartup('firebase-sdk-error'), 1200);
  }, { once: true });

  window.addEventListener('unhandledrejection', (event) => {
    const text = String(event?.reason?.message || event?.reason || '');
    if (/firebase|firestore|auth|network/i.test(text)) {
      window.setTimeout(() => releaseStartup('firebase-promise-error'), 400);
    }
  });
})();

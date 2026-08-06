// ============================================================
// V-FORGE v9.1.5 — EARLY BOOT GUARD
// Must be loaded in <head>, before Firebase CDN scripts.
// Prevents the splash screen from locking the app forever.
// ============================================================

(function () {
  'use strict';

  const VERSION = '9.1.5';
  const TIMEOUT_MS = 8000;
  let released = false;

  function isAlreadyOpened() {
    const loading = document.getElementById('auth-loading-screen');
    return !loading
      ? false
      : loading.classList.contains('hidden')
        || loading.getAttribute('aria-hidden') === 'true'
        || getComputedStyle(loading).display === 'none';
  }

  function showLogin(message) {
    if (released || isAlreadyOpened()) {
      released = true;
      return;
    }

    const loading = document.getElementById('auth-loading-screen');
    if (loading) {
      loading.classList.add('hidden');
      loading.setAttribute('aria-hidden', 'true');
      loading.style.setProperty('display', 'none', 'important');
      loading.style.setProperty('visibility', 'hidden', 'important');
      loading.style.setProperty('pointer-events', 'none', 'important');
    }

    document.querySelectorAll('.page').forEach((page) => {
      page.classList.remove('active');
    });

    const login = document.getElementById('page-login');
    if (login) login.classList.add('active');

    if (document.body) {
      document.body.classList.add('auth-mode');
      document.body.classList.remove('hide-nav', 'vf-editor-open', 'v911-editor-open');
    }

    const error = document.getElementById('login-error');
    if (error && message) error.textContent = message;

    released = true;
    console.warn(`[V-Forge ${VERSION}] Early boot guard released startup.`);
  }

  window.VForgeEarlyBootGuard = {
    version: VERSION,
    release: showLogin,
    get released() {
      return released;
    }
  };

  // Works even when a parser-blocking Firebase CDN script is still waiting.
  window.setTimeout(() => {
    showLogin('Firebase terlalu lama dimuat. Halaman dibuka dalam mode pemulihan; muat ulang untuk mencoba lagi.');
  }, TIMEOUT_MS);

  // Catch direct script loading failures.
  window.addEventListener('error', (event) => {
    const source = String(event?.target?.src || '');
    if (/gstatic\.com\/firebasejs/i.test(source)) {
      window.setTimeout(() => {
        showLogin('Firebase SDK gagal dimuat. Periksa pemblokiran domain Google/Firebase di browser atau DNS.');
      }, 100);
    }
  }, true);
})();

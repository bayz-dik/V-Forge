// ===============================================
// AUTH.JS - Authentication v1 V-Forge (Firebase)
// Login, register, reset password, session, guard, dan logout.
// ===============================================

const AUTH_PUBLIC_PAGES = ['page-login', 'page-register', 'page-forgot-password'];
let registrationInProgress = false;
let authRouteToken = 0;
let lastFocusedBeforeDialog = null;

function setAuthButtonLoading(btnId, isLoading, originalText) {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    const label = btn.querySelector('.auth-button-label');
    if (!btn.dataset.originalText && label) {
        btn.dataset.originalText = label.textContent.trim();
    }

    btn.disabled = isLoading;
    btn.setAttribute('aria-busy', String(isLoading));
    btn.classList.toggle('loading', isLoading);

    if (label) {
        label.textContent = isLoading
            ? 'Memproses...'
            : (originalText || btn.dataset.originalText || 'Lanjutkan');
    }
}

function showAuthMessage(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = message || '';
}

function showAuthError(elementId, message) {
    showAuthMessage(elementId, message);
}

function clearAuthMessages() {
    ['login-error', 'register-error', 'reset-error', 'reset-success'].forEach((id) => {
        showAuthMessage(id, '');
    });
}

function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isOffline() {
    return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function safeShowToast(message, type = 'info') {
    if (typeof showToast === 'function') showToast(message, type);
}

function serverTimestamp() {
    try {
        return firebase.firestore.FieldValue.serverTimestamp();
    } catch (error) {
        return new Date().toISOString();
    }
}

function translateFirebaseError(errorCode) {
    const map = {
        'auth/email-already-in-use': 'Email ini sudah terdaftar. Silakan masuk atau reset password.',
        'auth/invalid-email': 'Format email tidak valid.',
        'auth/weak-password': 'Password terlalu lemah. Gunakan minimal 6 karakter.',
        'auth/password-does-not-meet-requirements': 'Password belum memenuhi persyaratan keamanan.',
        'auth/user-not-found': 'Email atau password salah.',
        'auth/wrong-password': 'Email atau password salah.',
        'auth/invalid-credential': 'Email atau password salah.',
        'auth/invalid-login-credentials': 'Email atau password salah.',
        'auth/user-disabled': 'Akun ini dinonaktifkan. Hubungi dukungan V-Forge.',
        'auth/too-many-requests': 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.',
        'auth/network-request-failed': 'Koneksi internet bermasalah. Periksa jaringan lalu coba lagi.',
        'auth/operation-not-allowed': 'Metode login email belum diaktifkan di Firebase.',
        'auth/missing-password': 'Password wajib diisi.',
        'auth/internal-error': 'Layanan login sedang bermasalah. Coba beberapa saat lagi.'
    };
    return map[errorCode] || 'Terjadi kesalahan. Silakan coba lagi.';
}

function navigateToPage(pageId, navIndex = -1, attempt = 0) {
    if (typeof goToPage === 'function') {
        goToPage(pageId, navIndex);
        document.body.classList.toggle('auth-mode', AUTH_PUBLIC_PAGES.includes(pageId));
        setTimeout(updateOnlineStatus, 0);
        return;
    }

    if (attempt < 20) {
        setTimeout(() => navigateToPage(pageId, navIndex, attempt + 1), 0);
        return;
    }

    // Fallback jika script aplikasi utama gagal dimuat.
    document.querySelectorAll('.page').forEach((page) => page.classList.remove('active'));
    document.getElementById(pageId)?.classList.add('active');
    document.body.classList.toggle('auth-mode', AUTH_PUBLIC_PAGES.includes(pageId));
}

// Membungkus navigasi lama agar halaman privat tidak dapat dibuka tanpa sesi Firebase.
function installAuthNavigationGuard(attempt = 0) {
    const originalGoToPage = window.goToPage;

    if (typeof originalGoToPage !== 'function') {
        if (attempt < 30) setTimeout(() => installAuthNavigationGuard(attempt + 1), 0);
        return;
    }

    if (originalGoToPage.authGuardInstalled) return;

    const guardedGoToPage = function(pageId, navIndex) {
        const isPublicPage = AUTH_PUBLIC_PAGES.includes(pageId);
        const hasSignedInUser = Boolean(auth?.currentUser);

        if (!isPublicPage && !hasSignedInUser) {
            pageId = 'page-login';
            navIndex = -1;
        }

        originalGoToPage(pageId, navIndex);
        document.body.classList.toggle('auth-mode', AUTH_PUBLIC_PAGES.includes(pageId));
        setTimeout(updateOnlineStatus, 0);
    };

    guardedGoToPage.authGuardInstalled = true;
    window.goToPage = guardedGoToPage;
}

function switchAuthPage(pageId) {
    if (!AUTH_PUBLIC_PAGES.includes(pageId)) return;

    if (auth && auth.currentUser) {
        navigateToPage('page-home', 0);
        return;
    }

    clearAuthMessages();

    if (pageId === 'page-forgot-password') {
        const loginEmail = normalizeEmail(document.getElementById('login-email')?.value);
        const resetEmail = document.getElementById('reset-email');
        if (resetEmail && loginEmail) resetEmail.value = loginEmail;
    }

    navigateToPage(pageId, -1);
}

function togglePasswordVisibility(button) {
    const inputId = button?.dataset?.target;
    const input = inputId ? document.getElementById(inputId) : null;
    if (!input) return;

    const willShow = input.type === 'password';
    input.type = willShow ? 'text' : 'password';
    button.setAttribute('aria-label', willShow ? 'Sembunyikan password' : 'Tampilkan password');

    const icon = button.querySelector('.material-icons-round');
    if (icon) icon.textContent = willShow ? 'visibility_off' : 'visibility';
}

async function setSessionPersistence(rememberUser) {
    if (!auth || typeof auth.setPersistence !== 'function') return;

    try {
        const persistence = rememberUser
            ? firebase.auth.Auth.Persistence.LOCAL
            : firebase.auth.Auth.Persistence.SESSION;
        await auth.setPersistence(persistence);
    } catch (error) {
        // Login tetap dilanjutkan bila browser menolak penyimpanan persistence.
        console.warn('Persistence Firebase tidak dapat diubah:', error);
    }
}

function generateUsername(name, email) {
    const fromName = String(name || '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 24);
    const fromEmail = normalizeEmail(email).split('@')[0].replace(/[^a-z0-9]/g, '').slice(0, 24);
    return `@${fromName || fromEmail || 'vforgeuser'}`;
}

function buildDefaultUserData(user, overrides = {}) {
    const email = normalizeEmail(overrides.email || user?.email);
    const name = String(overrides.name || user?.displayName || email.split('@')[0] || 'V-Forge User').trim();
    return {
        name,
        username: overrides.username || generateUsername(name, email),
        email,
        points: 0,
        isPremium: false,
        completedTasks: 0,
        schemaVersion: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...overrides
    };
}

function applyUserDataToApp(data, user) {
    const safeData = data || {};

    try { userPoints = Number.isFinite(safeData.points) ? safeData.points : 0; } catch (error) {}
    try { isPremium = safeData.isPremium === true; } catch (error) {}
    try { completedTasks = Number.isFinite(safeData.completedTasks) ? safeData.completedTasks : 0; } catch (error) {}

    const fallbackName = user?.displayName || normalizeEmail(user?.email).split('@')[0] || 'V-Forge User';
    const name = String(safeData.name || fallbackName).trim();
    const username = safeData.username || generateUsername(name, user?.email);

    const nameInput = document.getElementById('input-name');
    const usernameInput = document.getElementById('input-username');
    const dobInput = document.getElementById('input-dob');

    if (nameInput) nameInput.value = name;
    if (usernameInput) usernameInput.value = username;
    if (dobInput && safeData.dateOfBirth) dobInput.value = safeData.dateOfBirth;

    const displayName = document.getElementById('display-name');
    const displayUsername = document.getElementById('display-username');
    const settingsName = document.getElementById('settings-display-name');
    const greeting = document.getElementById('editor-greeting-title');

    if (displayName) displayName.textContent = name;
    if (displayUsername) displayUsername.textContent = username;
    if (settingsName) settingsName.textContent = name;
    if (greeting) greeting.textContent = `Hey, ${name.split(' ')[0]}`;
}

// Memuat dokumen user. Jika akun lama belum punya dokumen Firestore, dokumen dibuat otomatis.
async function loadUserDataFromFirestore(uid) {
    const user = auth?.currentUser;
    if (!db || !user || user.uid !== uid) {
        throw new Error('Firestore belum siap.');
    }

    const userRef = db.collection('users').doc(uid);
    const snapshot = await userRef.get();

    if (snapshot.exists) {
        const data = snapshot.data() || {};
        applyUserDataToApp(data, user);
        return data;
    }

    const defaultData = buildDefaultUserData(user);
    await userRef.set(defaultData, { merge: true });
    applyUserDataToApp(defaultData, user);
    return defaultData;
}

// Dipakai sementara oleh fitur poin/premium lama. Validasi server akan ditambahkan di tahap backend terkait.
function syncUserDataToFirestore() {
    const user = auth?.currentUser;
    if (!user || !db) return Promise.resolve();

    let payload;
    try {
        payload = {
            points: userPoints,
            isPremium,
            completedTasks,
            updatedAt: serverTimestamp()
        };
    } catch (error) {
        return Promise.reject(error);
    }

    return db.collection('users').doc(user.uid).set(payload, { merge: true }).catch((error) => {
        console.warn('Data akun belum tersinkron:', error);
        throw error;
    });
}

async function handleLogin(event) {
    event?.preventDefault();

    const email = normalizeEmail(document.getElementById('login-email')?.value);
    const password = document.getElementById('login-password')?.value || '';
    const rememberUser = document.getElementById('login-remember')?.checked !== false;

    showAuthError('login-error', '');

    if (!auth) {
        showAuthError('login-error', 'Layanan login belum dapat dimuat. Muat ulang aplikasi saat internet stabil.');
        return;
    }
    if (!email || !password) {
        showAuthError('login-error', 'Email dan password wajib diisi.');
        return;
    }
    if (!isValidEmail(email)) {
        showAuthError('login-error', 'Format email belum benar. Contoh: nama@email.com');
        return;
    }
    if (isOffline()) {
        showAuthError('login-error', 'Kamu sedang offline. Sambungkan internet untuk masuk.');
        return;
    }

    setAuthButtonLoading('login-submit-btn', true, 'Masuk');

    try {
        await setSessionPersistence(rememberUser);
        await auth.signInWithEmailAndPassword(email, password);
        safeShowToast('Berhasil masuk. Selamat datang kembali!', 'check');
        // Listener onAuthStateChanged menangani pemuatan data dan perpindahan ke Home.
    } catch (error) {
        showAuthError('login-error', translateFirebaseError(error?.code));
    } finally {
        setAuthButtonLoading('login-submit-btn', false, 'Masuk');
    }
}

async function handleRegister(event) {
    event?.preventDefault();

    const name = String(document.getElementById('register-name')?.value || '').trim().replace(/\s+/g, ' ');
    const email = normalizeEmail(document.getElementById('register-email')?.value);
    const password = document.getElementById('register-password')?.value || '';
    const confirmPassword = document.getElementById('register-confirm-password')?.value || '';

    showAuthError('register-error', '');

    if (!auth) {
        showAuthError('register-error', 'Layanan pendaftaran belum dapat dimuat. Muat ulang aplikasi saat internet stabil.');
        return;
    }
    if (!name || !email || !password || !confirmPassword) {
        showAuthError('register-error', 'Semua kolom wajib diisi.');
        return;
    }
    if (name.length < 2) {
        showAuthError('register-error', 'Nama lengkap minimal 2 karakter.');
        return;
    }
    if (!isValidEmail(email)) {
        showAuthError('register-error', 'Format email belum benar. Contoh: nama@email.com');
        return;
    }
    if (password.length < 6) {
        showAuthError('register-error', 'Password minimal 6 karakter.');
        return;
    }
    if (password !== confirmPassword) {
        showAuthError('register-error', 'Konfirmasi password belum sama.');
        return;
    }
    if (isOffline()) {
        showAuthError('register-error', 'Kamu sedang offline. Sambungkan internet untuk membuat akun.');
        return;
    }

    setAuthButtonLoading('register-submit-btn', true, 'Buat akun');
    registrationInProgress = true;
    let createdUser = null;

    try {
        await setSessionPersistence(true);
        const credential = await auth.createUserWithEmailAndPassword(email, password);
        createdUser = credential.user;

        await createdUser.updateProfile({ displayName: name });

        if (!db) throw new Error('Firestore belum siap.');
        await db.collection('users').doc(createdUser.uid).set(
            buildDefaultUserData(createdUser, {
                name,
                username: generateUsername(name, email),
                email
            }),
            { merge: true }
        );

        registrationInProgress = false;
        document.getElementById('register-password').value = '';
        document.getElementById('register-confirm-password').value = '';
        safeShowToast('Akun berhasil dibuat. Selamat datang!', 'check');
        await openAuthenticatedSession(createdUser);
    } catch (error) {
        registrationInProgress = false;

        if (createdUser) {
            // Akun Auth sudah berhasil dibuat walau profil Firestore tertunda.
            applyUserDataToApp(buildDefaultUserData(createdUser, { name, email }), createdUser);
            safeShowToast('Akun dibuat, tetapi profil belum tersinkron. Kami akan mencoba lagi.', 'info');
            await openAuthenticatedSession(createdUser, true);
        } else {
            showAuthError('register-error', translateFirebaseError(error?.code));
        }
    } finally {
        registrationInProgress = false;
        setAuthButtonLoading('register-submit-btn', false, 'Buat akun');
    }
}

async function handlePasswordReset(event) {
    event?.preventDefault();

    const email = normalizeEmail(document.getElementById('reset-email')?.value);
    showAuthError('reset-error', '');
    showAuthMessage('reset-success', '');

    if (!auth) {
        showAuthError('reset-error', 'Layanan reset password belum dapat dimuat.');
        return;
    }
    if (!email) {
        showAuthError('reset-error', 'Email wajib diisi.');
        return;
    }
    if (!isValidEmail(email)) {
        showAuthError('reset-error', 'Format email belum benar. Contoh: nama@email.com');
        return;
    }
    if (isOffline()) {
        showAuthError('reset-error', 'Kamu sedang offline. Sambungkan internet untuk mengirim link reset.');
        return;
    }

    setAuthButtonLoading('reset-submit-btn', true, 'Kirim link reset');

    try {
        await auth.sendPasswordResetEmail(email);
        const loginEmail = document.getElementById('login-email');
        if (loginEmail) loginEmail.value = email;
        showAuthMessage('reset-success', 'Jika email terdaftar, link reset sudah dikirim. Periksa Inbox atau folder Spam.');
    } catch (error) {
        // Pesan user-not-found tetap dibuat netral agar status akun tidak mudah ditebak.
        if (error?.code === 'auth/user-not-found') {
            showAuthMessage('reset-success', 'Jika email terdaftar, link reset sudah dikirim. Periksa Inbox atau folder Spam.');
        } else {
            showAuthError('reset-error', translateFirebaseError(error?.code));
        }
    } finally {
        setAuthButtonLoading('reset-submit-btn', false, 'Kirim link reset');
    }
}

function handleLogout() {
    if (!auth?.currentUser) {
        switchAuthPage('page-login');
        return;
    }

    const modal = document.getElementById('logout-confirm-modal');
    if (!modal) {
        confirmLogout();
        return;
    }

    lastFocusedBeforeDialog = document.activeElement;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => modal.querySelector('.auth-dialog-cancel')?.focus(), 50);
}

function closeLogoutConfirm() {
    const modal = document.getElementById('logout-confirm-modal');
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    if (lastFocusedBeforeDialog?.focus) lastFocusedBeforeDialog.focus();
}

function handleLogoutBackdrop(event) {
    if (event.target === event.currentTarget) closeLogoutConfirm();
}

async function confirmLogout() {
    if (!auth) return;

    setAuthButtonLoading('logout-confirm-btn', true, 'Keluar');
    try {
        await auth.signOut();
        closeLogoutConfirm();
        safeShowToast('Kamu sudah keluar dengan aman.', 'info');
        // onAuthStateChanged memindahkan aplikasi ke layar Login.
    } catch (error) {
        safeShowToast('Gagal keluar. Periksa koneksi lalu coba lagi.', 'info');
    } finally {
        setAuthButtonLoading('logout-confirm-btn', false, 'Keluar');
    }
}

function resetSensitiveAuthFields() {
    const loginPassword = document.getElementById('login-password');
    const registerPassword = document.getElementById('register-password');
    const registerConfirm = document.getElementById('register-confirm-password');
    if (loginPassword) loginPassword.value = '';
    if (registerPassword) registerPassword.value = '';
    if (registerConfirm) registerConfirm.value = '';
    clearAuthMessages();
}

function hideAuthLoadingScreen() {
    const loadingScreen = document.getElementById('auth-loading-screen');
    if (!loadingScreen) return;
    loadingScreen.classList.add('hidden');
    loadingScreen.setAttribute('aria-hidden', 'true');
}

async function openAuthenticatedSession(user, alreadyHasSyncWarning = false) {
    if (!user) return;

    const routeToken = ++authRouteToken;
    let syncWarning = alreadyHasSyncWarning;

    try {
        await loadUserDataFromFirestore(user.uid);
    } catch (error) {
        syncWarning = true;
        applyUserDataToApp(buildDefaultUserData(user), user);
        console.warn('Profil Firestore belum dapat dimuat:', error);
    }

    if (routeToken !== authRouteToken || auth?.currentUser?.uid !== user.uid) return;

    hideAuthLoadingScreen();
    navigateToPage('page-home', 0);

    if (typeof initRealTime === 'function') initRealTime();
    if (typeof renderPremiumUI === 'function') renderPremiumUI();

    if (syncWarning) {
        setTimeout(() => safeShowToast('Akun masuk, tetapi sinkronisasi profil sedang tertunda.', 'info'), 250);
    }
}

function updateOnlineStatus() {
    const banner = document.getElementById('auth-network-banner');
    if (!banner) return;
    const shouldShow = isOffline() && document.body.classList.contains('auth-mode');
    banner.classList.toggle('show', shouldShow);
}

function initializeAuthentication() {
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeLogoutConfirm();
    });

    updateOnlineStatus();
    installAuthNavigationGuard();

    if (!auth) {
        setTimeout(() => {
            hideAuthLoadingScreen();
            navigateToPage('page-login', -1);
            showAuthError('login-error', 'Firebase tidak berhasil dimuat. Pastikan internet aktif lalu muat ulang aplikasi.');
        }, 0);
        return;
    }

    auth.onAuthStateChanged(
        async (user) => {
            if (user) {
                if (!registrationInProgress) await openAuthenticatedSession(user);
                return;
            }

            authRouteToken += 1;
            closeLogoutConfirm();
            resetSensitiveAuthFields();
            hideAuthLoadingScreen();
            navigateToPage('page-login', -1);
        },
        (error) => {
            console.error('Listener autentikasi gagal:', error);
            hideAuthLoadingScreen();
            navigateToPage('page-login', -1);
            showAuthError('login-error', 'Status akun gagal diperiksa. Muat ulang aplikasi dan coba lagi.');
        }
    );
}

initializeAuthentication();

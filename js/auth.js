// ===============================================
// AUTH.JS - Authentication v1 + Profile Sync v1 + Project Sync v1 (Firebase)
// Login, register, reset password, session, guard, profil, dan lifecycle proyek real-time.
// ===============================================

const AUTH_PUBLIC_PAGES = ['page-login', 'page-register', 'page-forgot-password'];
let registrationInProgress = false;
let authRouteToken = 0;
let lastFocusedBeforeDialog = null;
let activeProfileData = null;
let profileUnsubscribe = null;
let profileFormDirty = false;
let profileSaveInProgress = false;

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

function normalizeProfileUsername(value) {
    return String(value || '').trim().toLowerCase().replace(/^@+/, '');
}

function formatProfileUsername(value, name, email) {
    const raw = normalizeProfileUsername(value || generateUsername(name, email));
    return `@${raw || 'vforgeuser'}`;
}

function isValidProfileUsername(value) {
    const raw = normalizeProfileUsername(value);
    return /^[a-z0-9](?:[a-z0-9._]{1,22}[a-z0-9])$/.test(raw) && !/[._]{2}/.test(raw);
}

function getProfileInitials(name) {
    const parts = String(name || 'V Forge').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'VF';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function isValidDateOfBirth(value) {
    if (!value) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const date = new Date(`${value}T00:00:00`);
    const today = new Date();
    const earliest = new Date('1900-01-01T00:00:00');
    return !Number.isNaN(date.getTime()) && date >= earliest && date <= today;
}

function setProfileSyncStatus(state, customLabel) {
    const config = {
        synced: { label: 'Tersinkron dengan akun', icon: 'cloud_done' },
        syncing: { label: 'Menyinkronkan...', icon: 'sync' },
        unsaved: { label: 'Perubahan belum disimpan', icon: 'edit_note' },
        offline: { label: 'Offline — perubahan belum tersimpan', icon: 'cloud_off' },
        error: { label: 'Sinkronisasi bermasalah', icon: 'sync_problem' }
    };
    const selected = config[state] || config.syncing;

    document.querySelectorAll('.profile-sync-line, .profile-sync-status').forEach((element) => {
        element.dataset.state = state;
    });
    document.querySelectorAll('[data-profile-sync-label]').forEach((element) => {
        element.textContent = customLabel || selected.label;
    });
    document.querySelectorAll('[data-profile-sync-icon]').forEach((element) => {
        element.textContent = selected.icon;
        element.classList.toggle('sync-spin', state === 'syncing');
    });
}

function setProfileButtonLoading(isLoading) {
    const button = document.getElementById('profile-save-btn');
    if (!button) return;

    const label = button.querySelector('.profile-button-label');
    button.disabled = isLoading;
    button.setAttribute('aria-busy', String(isLoading));
    button.classList.toggle('loading', isLoading);
    if (label) label.textContent = isLoading ? 'Menyimpan...' : 'Simpan perubahan';
}

function showProfileError(message) {
    const errorElement = document.getElementById('profile-form-error');
    if (errorElement) errorElement.textContent = message || '';
}

function applyProfileAvatar(name, photoURL) {
    const initials = getProfileInitials(name);

    document.querySelectorAll('[data-profile-avatar]').forEach((avatar) => {
        const image = avatar.querySelector('.profile-avatar-photo');
        const fallback = avatar.querySelector('.profile-avatar-initials');

        if (image && photoURL) {
            image.src = photoURL;
            image.hidden = false;
            if (fallback) fallback.hidden = true;
        } else {
            if (image) {
                image.hidden = true;
                image.removeAttribute('src');
            }
            if (fallback) {
                fallback.hidden = false;
                fallback.textContent = initials;
            }
        }

        avatar.setAttribute('aria-label', `Avatar ${name}`);
    });
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
        subscriptionStatus: 'inactive',
        completedTasks: 0,
        profileSchemaVersion: 1,
        schemaVersion: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...overrides
    };
}

function applyUserDataToApp(data, user, options = {}) {
    const safeData = data || {};

    try { userPoints = Number.isFinite(safeData.points) ? safeData.points : 0; } catch (error) {}
    try {
        const expiry = safeData.subscriptionExpiresAt;
        const expiryMs = expiry && typeof expiry.toMillis === 'function'
            ? expiry.toMillis()
            : (expiry && Number.isFinite(expiry.seconds) ? expiry.seconds * 1000 : new Date(expiry || 0).getTime());
        const hasExpiry = Number.isFinite(expiryMs) && expiryMs > 0;
        isPremium = safeData.isPremium === true
            && safeData.subscriptionStatus === 'active'
            && (!hasExpiry || expiryMs > Date.now());
    } catch (error) { isPremium = false; }
    try { completedTasks = Number.isFinite(safeData.completedTasks) ? safeData.completedTasks : 0; } catch (error) {}

    const fallbackName = user?.displayName || normalizeEmail(user?.email).split('@')[0] || 'V-Forge User';
    const name = String(safeData.name || fallbackName).trim();
    const username = formatProfileUsername(safeData.username, name, user?.email);
    const email = normalizeEmail(safeData.email || user?.email);
    const dateOfBirth = typeof safeData.dateOfBirth === 'string' ? safeData.dateOfBirth : '';
    const photoURL = String(safeData.photoURL || user?.photoURL || '').trim();

    activeProfileData = {
        ...safeData,
        name,
        username,
        email,
        dateOfBirth,
        photoURL
    };

    const nameInput = document.getElementById('input-name');
    const usernameInput = document.getElementById('input-username');
    const dobInput = document.getElementById('input-dob');
    const emailInput = document.getElementById('input-email');

    if (options.forceForm === true || !profileFormDirty) {
        if (nameInput) nameInput.value = name;
        if (usernameInput) usernameInput.value = normalizeProfileUsername(username);
        if (dobInput) dobInput.value = dateOfBirth;
        if (emailInput) emailInput.value = email;
    }

    const displayName = document.getElementById('display-name');
    const displayUsername = document.getElementById('display-username');
    const settingsName = document.getElementById('settings-display-name');
    const greeting = document.getElementById('editor-greeting-title');

    if (displayName) displayName.textContent = name;
    if (displayUsername) displayUsername.textContent = username;
    if (settingsName) settingsName.textContent = name;
    if (greeting) greeting.textContent = `Hey, ${name.split(' ')[0]}`;
    applyProfileAvatar(name, photoURL);

    if (typeof updatePointsDisplay === 'function') updatePointsDisplay();
    if (typeof renderPremiumUI === 'function') renderPremiumUI();
    if (typeof renderV83Missions === 'function') renderV83Missions();
}

// Memuat dokumen user. Jika akun lama belum punya dokumen Firestore, dokumen dibuat otomatis.
async function loadUserDataFromFirestore(uid) {
    const user = auth?.currentUser;
    if (!db || !user || user.uid !== uid) {
        throw new Error('Firestore belum siap.');
    }

    setProfileSyncStatus('syncing');
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

function stopProfileRealtimeSync() {
    if (typeof profileUnsubscribe === 'function') profileUnsubscribe();
    profileUnsubscribe = null;
}

function startProfileRealtimeSync(uid) {
    stopProfileRealtimeSync();

    const user = auth?.currentUser;
    if (!db || !user || user.uid !== uid) return;

    const userRef = db.collection('users').doc(uid);
    if (typeof userRef.onSnapshot !== 'function') {
        setProfileSyncStatus('synced');
        return;
    }

    profileUnsubscribe = userRef.onSnapshot(
        (snapshot) => {
            if (auth?.currentUser?.uid !== uid || !snapshot.exists) return;
            applyUserDataToApp(snapshot.data() || {}, auth.currentUser);
            if (!profileFormDirty) {
                const hasPendingWrites = snapshot.metadata?.hasPendingWrites === true;
                setProfileSyncStatus(hasPendingWrites ? 'syncing' : 'synced');
            }
        },
        (error) => {
            console.warn('Sinkronisasi profil real-time terputus:', error);
            setProfileSyncStatus(isOffline() ? 'offline' : 'error');
        }
    );
}

function openProfileEditor() {
    const user = auth?.currentUser;
    if (!user) {
        navigateToPage('page-login', -1);
        return;
    }

    profileFormDirty = false;
    showProfileError('');
    applyUserDataToApp(activeProfileData || buildDefaultUserData(user), user, { forceForm: true });
    setProfileSyncStatus(isOffline() ? 'offline' : 'synced');
    navigateToPage('page-edit-profile', -1);
}

function closeProfileEditor() {
    if (profileSaveInProgress) return;

    profileFormDirty = false;
    showProfileError('');
    if (auth?.currentUser && activeProfileData) {
        applyUserDataToApp(activeProfileData, auth.currentUser, { forceForm: true });
    }
    setProfileSyncStatus(isOffline() ? 'offline' : 'synced');
    navigateToPage('page-profile', 3);
}

function markProfileFormDirty() {
    profileFormDirty = true;
    showProfileError('');
    setProfileSyncStatus(isOffline() ? 'offline' : 'unsaved');
}

function normalizeProfileUsernameField() {
    const input = document.getElementById('input-username');
    if (!input) return;
    input.value = normalizeProfileUsername(input.value).replace(/[^a-z0-9._]/g, '').slice(0, 24);
}

function translateProfileSaveError(error) {
    const map = {
        'permission-denied': 'Profil tidak dapat disimpan karena izin Firestore ditolak.',
        'unavailable': 'Layanan sinkronisasi sedang tidak tersedia. Coba lagi beberapa saat.',
        'failed-precondition': 'Firestore belum siap menerima perubahan profil.',
        'auth/network-request-failed': 'Koneksi internet bermasalah. Periksa jaringan lalu coba lagi.'
    };
    return map[error?.code] || 'Profil belum berhasil disimpan. Periksa koneksi lalu coba lagi.';
}

async function saveProfile(event) {
    event?.preventDefault();
    if (profileSaveInProgress) return;

    const user = auth?.currentUser;
    const name = String(document.getElementById('input-name')?.value || '').trim().replace(/\s+/g, ' ');
    const usernameRaw = normalizeProfileUsername(document.getElementById('input-username')?.value);
    const dateOfBirth = document.getElementById('input-dob')?.value || '';

    showProfileError('');

    if (!user || !db) {
        showProfileError('Sesi akun tidak ditemukan. Silakan masuk kembali.');
        return;
    }
    if (isOffline()) {
        showProfileError('Kamu sedang offline. Sambungkan internet sebelum menyimpan profil.');
        setProfileSyncStatus('offline');
        return;
    }
    if (name.length < 2 || name.length > 50) {
        showProfileError('Nama lengkap harus terdiri dari 2–50 karakter.');
        return;
    }
    if (!isValidProfileUsername(usernameRaw)) {
        showProfileError('Username harus 3–24 karakter, tidak boleh diawali/diakhiri titik atau memakai simbol berurutan.');
        return;
    }
    if (!isValidDateOfBirth(dateOfBirth)) {
        showProfileError('Tanggal lahir tidak valid atau berada di masa depan.');
        return;
    }

    const profilePayload = {
        name,
        username: `@${usernameRaw}`,
        email: normalizeEmail(user.email),
        dateOfBirth: dateOfBirth || null,
        profileSchemaVersion: 1,
        updatedAt: serverTimestamp()
    };

    profileSaveInProgress = true;
    setProfileButtonLoading(true);
    setProfileSyncStatus('syncing', 'Menyimpan perubahan...');

    try {
        await db.collection('users').doc(user.uid).set(profilePayload, { merge: true });

        try {
            if (typeof user.updateProfile === 'function' && user.displayName !== name) {
                await user.updateProfile({ displayName: name });
            }
        } catch (authProfileError) {
            console.warn('Nama Auth belum ikut diperbarui:', authProfileError);
        }

        profileFormDirty = false;
        activeProfileData = { ...(activeProfileData || {}), ...profilePayload };
        applyUserDataToApp(activeProfileData, user, { forceForm: true });
        setProfileSyncStatus('synced');
        safeShowToast('Profil berhasil disimpan dan disinkronkan.', 'check');
        navigateToPage('page-profile', 3);
    } catch (error) {
        console.warn('Profil gagal disimpan:', error);
        showProfileError(translateProfileSaveError(error));
        setProfileSyncStatus(isOffline() ? 'offline' : 'error');
    } finally {
        profileSaveInProgress = false;
        setProfileButtonLoading(false);
    }
}

// Hanya menyinkronkan progres lokal non-entitlement. Status Premium dikelola
// oleh backend subscription dan tidak pernah ditulis dari aplikasi klien.
function syncUserDataToFirestore() {
    const user = auth?.currentUser;
    if (!user || !db) return Promise.resolve();

    // Points, mission claims, completedTasks, and Premium entitlement are
    // server-managed in v8.3. The client only refreshes the profile timestamp.
    const payload = { updatedAt: serverTimestamp() };
    return db.collection('users').doc(user.uid).set(payload, { merge: true }).catch((error) => {
        console.warn('Status akun belum tersinkron:', error);
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
        // Batas waktu maksimal 8 detik. Kalau Firestore lambat/nyangkut,
        // jangan bikin loading screen nyangkut selamanya — lanjut pakai data fallback.
        await Promise.race([
            loadUserDataFromFirestore(user.uid),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Sinkronisasi Firestore timeout (8s)')), 8000))
        ]);
    } catch (error) {
        syncWarning = true;
        applyUserDataToApp(buildDefaultUserData(user), user);
        console.warn('Profil Firestore belum dapat dimuat:', error);
    }

    if (routeToken !== authRouteToken || auth?.currentUser?.uid !== user.uid) return;

    startProfileRealtimeSync(user.uid);
    if (typeof startProjectsRealtimeSync === 'function') {
        startProjectsRealtimeSync(user.uid);
    }

    hideAuthLoadingScreen();
    navigateToPage('page-home', 0);

    if (typeof initRealTime === 'function') initRealTime();
    if (typeof renderPremiumUI === 'function') renderPremiumUI();
    if (typeof syncV83MissionBackend === 'function') syncV83MissionBackend();

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

function updateProfileConnectionStatus() {
    updateOnlineStatus();
    if (!auth?.currentUser) return;

    if (isOffline()) {
        setProfileSyncStatus('offline');
    } else if (profileFormDirty) {
        setProfileSyncStatus('unsaved');
    } else {
        setProfileSyncStatus('syncing', 'Menghubungkan kembali...');
    }
}

function initializeAuthentication() {
    window.addEventListener('online', updateProfileConnectionStatus);
    window.addEventListener('offline', updateProfileConnectionStatus);
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
            stopProfileRealtimeSync();
            if (typeof stopProjectsRealtimeSync === 'function') stopProjectsRealtimeSync({ clear: true });
            activeProfileData = null;
            profileFormDirty = false;
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

// --- JARING PENGAMAN GLOBAL ---
// Kalau karena alasan apapun loading screen masih nyangkut setelah 12 detik
// (misal Firebase Auth sendiri gak pernah "notice" status login karena
// masalah storage/privacy di browser), paksa tutup dan arahkan ke Login
// biar app gak nyangkut selamanya di layar "Menyiapkan V-Forge...".
setTimeout(() => {
    const loadingScreen = document.getElementById('auth-loading-screen');
    const stillStuck = loadingScreen && !loadingScreen.classList.contains('hidden');
    if (stillStuck) {
        console.warn('Loading screen macet >12s, memaksa fallback ke halaman login.');
        hideAuthLoadingScreen();
        if (!auth?.currentUser) {
            navigateToPage('page-login', -1);
            showAuthError('login-error', 'Koneksi lambat atau bermasalah. Coba muat ulang aplikasi.');
        }
    }
}, 12000);

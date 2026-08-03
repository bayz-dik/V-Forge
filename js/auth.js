// ===============================================
// AUTH.JS - Sistem Login/Register V-Forge (Firebase)
// ===============================================

function setAuthButtonLoading(btnId, isLoading, originalText) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (isLoading) {
        btn.classList.add('loading');
        btn.innerText = 'Memproses...';
    } else {
        btn.classList.remove('loading');
        btn.innerText = originalText;
    }
}

function showAuthError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) el.innerText = message;
}

// Terjemahkan kode error Firebase ke pesan yang gampang dipahami
function translateFirebaseError(errorCode) {
    const map = {
        'auth/email-already-in-use': 'Email ini sudah terdaftar. Coba masuk saja.',
        'auth/invalid-email': 'Format email tidak valid.',
        'auth/weak-password': 'Password minimal 6 karakter.',
        'auth/user-not-found': 'Email belum terdaftar. Daftar dulu, yuk.',
        'auth/wrong-password': 'Password salah. Coba lagi.',
        'auth/invalid-credential': 'Email atau password salah.',
        'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.',
        'auth/network-request-failed': 'Koneksi internet bermasalah. Cek jaringan kamu.'
    };
    return map[errorCode] || 'Terjadi kesalahan. Coba lagi.';
}

// ========== REGISTER ==========
function handleRegister() {
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;

    showAuthError('register-error', '');

    if (!name || !email || !password) {
        showAuthError('register-error', 'Semua kolom wajib diisi.');
        return;
    }
    if (password.length < 6) {
        showAuthError('register-error', 'Password minimal 6 karakter.');
        return;
    }

    setAuthButtonLoading('register-submit-btn', true);

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            // Simpan nama ke profil Firebase Auth
            return user.updateProfile({ displayName: name }).then(() => user);
        })
        .then((user) => {
            // Buat dokumen user baru di Firestore dengan data default
            return db.collection('users').doc(user.uid).set({
                name: name,
                username: '@' + name.toLowerCase().replace(/\s+/g, ''),
                email: email,
                points: 0,
                isPremium: false,
                completedTasks: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            showToast('Akun berhasil dibuat! Selamat datang 🎉', 'check');
            // onAuthStateChanged akan otomatis handle pindah ke home
        })
        .catch((error) => {
            showAuthError('register-error', translateFirebaseError(error.code));
        })
        .finally(() => {
            setAuthButtonLoading('register-submit-btn', false, 'Daftar');
        });
}

// ========== LOGIN ==========
function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    showAuthError('login-error', '');

    if (!email || !password) {
        showAuthError('login-error', 'Email dan password wajib diisi.');
        return;
    }

    setAuthButtonLoading('login-submit-btn', true);

    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            // onAuthStateChanged akan otomatis handle pindah ke home
        })
        .catch((error) => {
            showAuthError('login-error', translateFirebaseError(error.code));
        })
        .finally(() => {
            setAuthButtonLoading('login-submit-btn', false, 'Masuk');
        });
}

// ========== LOGOUT ==========
function handleLogout() {
    auth.signOut().then(() => {
        showToast('Berhasil keluar', 'info');
    }).catch(() => {
        showToast('Gagal keluar, coba lagi', 'info');
    });
}

// ========== LOAD DATA USER DARI FIRESTORE KE VARIABLE APP.JS ==========
function loadUserDataFromFirestore(uid) {
    return db.collection('users').doc(uid).get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            // Isi ke variable global yang sudah ada di app.js
            userPoints = data.points || 0;
            isPremium = data.isPremium || false;
            completedTasks = data.completedTasks || 0;

            // Update juga tampilan nama/username di form edit profile
            const nameInput = document.getElementById('input-name');
            const usernameInput = document.getElementById('input-username');
            if (nameInput) nameInput.value = data.name || '';
            if (usernameInput) usernameInput.value = data.username || '';
        }
    });
}

// Simpan perubahan poin/status premium balik ke Firestore
// Panggil fungsi ini tiap kali userPoints atau isPremium berubah di app.js
function syncUserDataToFirestore() {
    const user = auth.currentUser;
    if (!user) return;
    db.collection('users').doc(user.uid).update({
        points: userPoints,
        isPremium: isPremium,
        completedTasks: completedTasks
    }).catch((err) => console.log('Gagal sync ke Firestore:', err));
}

// ========== LISTENER UTAMA: PANTAU STATUS LOGIN ==========
auth.onAuthStateChanged((user) => {
    const loadingScreen = document.getElementById('auth-loading-screen');

    if (user) {
        // User sudah login -> load data, lalu tampilkan halaman utama
        loadUserDataFromFirestore(user.uid).then(() => {
            if (loadingScreen) loadingScreen.style.display = 'none';
            goToPage('page-home', 0);
            if (typeof initRealTime === 'function') initRealTime();
            if (typeof renderPremiumUI === 'function') renderPremiumUI();
        });
    } else {
        // Belum login -> tampilkan halaman login
        if (loadingScreen) loadingScreen.style.display = 'none';
        goToPage('page-login', -1);
    }
});

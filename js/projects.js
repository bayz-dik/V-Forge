// ===============================================
// PROJECTS.JS - Project & History v1 V-Forge
// Metadata proyek tersimpan di Firestore per akun dan diperbarui real-time.
// File video BELUM diunggah pada tahap ini.
// ===============================================

const PROJECT_STATUS = Object.freeze({
    draft: { label: 'Draft', icon: 'edit_note', tone: 'draft' },
    uploading: { label: 'Mengunggah', icon: 'cloud_upload', tone: 'active' },
    processing: { label: 'Diproses', icon: 'autorenew', tone: 'active' },
    completed: { label: 'Selesai', icon: 'check_circle', tone: 'completed' },
    failed: { label: 'Gagal', icon: 'error_outline', tone: 'failed' }
});

let projectRecords = [];
let projectsUnsubscribe = null;
let projectsListenerUid = null;
let projectSyncState = 'idle';
let projectSyncError = '';
let activeProjectFilter = 'all';
let activeProjectSearch = '';
let pendingProjectFile = null;
let projectCreateInProgress = false;
let selectedProjectId = null;

function getProjectStatus(status) {
    return PROJECT_STATUS[status] || PROJECT_STATUS.draft;
}

function escapeProjectHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function projectTimestampToMillis(value) {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.toDate === 'function') return value.toDate().getTime();
    if (Number.isFinite(value.seconds)) return value.seconds * 1000;
    if (Number.isFinite(value)) return value;
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
}

function formatProjectDate(value, withTime = false) {
    const millis = projectTimestampToMillis(value);
    if (!millis) return 'Baru saja';
    const options = withTime
        ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
        : { day: '2-digit', month: 'short', year: 'numeric' };
    try {
        return new Intl.DateTimeFormat('id-ID', options).format(new Date(millis));
    } catch (error) {
        return new Date(millis).toLocaleDateString();
    }
}

function formatProjectFileSize(bytes) {
    const size = Number(bytes);
    if (!Number.isFinite(size) || size <= 0) return 'Ukuran tidak diketahui';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
    const value = size / (1024 ** index);
    return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

function normalizeProjectRecord(id, data = {}) {
    const status = PROJECT_STATUS[data.status] ? data.status : 'draft';
    return {
        id: String(id || ''),
        ownerId: String(data.ownerId || ''),
        name: String(data.name || data.sourceFileName || 'Proyek tanpa nama').trim().slice(0, 80),
        sourceFileName: String(data.sourceFileName || 'Belum ada file').trim().slice(0, 180),
        sourceFileSize: Number.isFinite(data.sourceFileSize) ? data.sourceFileSize : 0,
        sourceMimeType: String(data.sourceMimeType || 'video/*').slice(0, 100),
        sourceLastModified: Number.isFinite(data.sourceLastModified) ? data.sourceLastModified : null,
        status,
        progress: Number.isFinite(data.progress) ? Math.max(0, Math.min(100, data.progress)) : 0,
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || data.createdAt || null,
        schemaVersion: Number.isFinite(data.schemaVersion) ? data.schemaVersion : 1
    };
}

function getProjectsCollection(uid) {
    if (!db || !uid) return null;
    const userDocument = db.collection('users').doc(uid);
    if (!userDocument || typeof userDocument.collection !== 'function') return null;
    return userDocument.collection('projects');
}

function translateProjectError(error) {
    const map = {
        'permission-denied': 'Akses proyek ditolak. Pastikan Rules Project v1 sudah dipublikasikan di Firebase.',
        'unavailable': 'Firestore sedang tidak tersedia. Periksa internet lalu coba lagi.',
        'failed-precondition': 'Database proyek belum siap. Coba muat ulang setelah beberapa saat.',
        'resource-exhausted': 'Batas layanan Firebase sementara tercapai. Coba lagi nanti.'
    };
    return map[error?.code] || 'Proyek belum dapat disinkronkan. Periksa koneksi lalu coba lagi.';
}

function setProjectSyncStatus(state, customMessage = '') {
    projectSyncState = state;
    const config = {
        idle: { label: 'Menunggu', icon: 'cloud_queue' },
        loading: { label: 'Memuat', icon: 'sync' },
        synced: { label: 'Real-time', icon: 'cloud_done' },
        offline: { label: 'Offline', icon: 'cloud_off' },
        error: { label: 'Bermasalah', icon: 'sync_problem' }
    };
    const selected = config[state] || config.idle;
    const pill = document.getElementById('project-sync-pill');
    if (pill) {
        pill.dataset.state = state;
        const icon = pill.querySelector('.material-icons-round');
        const label = pill.querySelector('span:last-child');
        if (icon) {
            icon.textContent = selected.icon;
            icon.classList.toggle('sync-spin', state === 'loading');
        }
        if (label) label.textContent = customMessage || selected.label;
    }
}

function getFilteredProjects() {
    const query = activeProjectSearch.trim().toLowerCase();
    return projectRecords.filter((project) => {
        let matchesStatus = true;
        if (activeProjectFilter === 'active') {
            matchesStatus = project.status === 'uploading' || project.status === 'processing';
        } else if (activeProjectFilter !== 'all') {
            matchesStatus = project.status === activeProjectFilter;
        }

        const haystack = `${project.name} ${project.sourceFileName}`.toLowerCase();
        return matchesStatus && (!query || haystack.includes(query));
    });
}

function updateProjectLinkedStats() {
    const total = projectRecords.length;
    const active = projectRecords.filter((project) => project.status === 'uploading' || project.status === 'processing').length;
    const completed = projectRecords.filter((project) => project.status === 'completed').length;

    const totalElement = document.getElementById('project-total-count');
    const activeElement = document.getElementById('project-active-count');
    const completedElement = document.getElementById('project-completed-count');
    const analyticsExported = document.getElementById('analytics-exported-count');
    const cloudExports = document.getElementById('cloud-exported-videos');
    const cloudProjects = document.getElementById('cloud-project-files');

    if (totalElement) totalElement.textContent = total;
    if (activeElement) activeElement.textContent = active;
    if (completedElement) completedElement.textContent = completed;
    if (analyticsExported) analyticsExported.textContent = completed;
    if (cloudExports) cloudExports.textContent = `${completed} item`;
    if (cloudProjects) cloudProjects.textContent = `${total} tersinkron`;
    try { globalExportedVideos = completed; } catch (error) {}
}

function projectListStateMarkup(type) {
    if (type === 'loading') {
        return '<span class="project-loading-spinner"></span><p>Memuat proyek dari akunmu...</p>';
    }
    if (type === 'error') {
        return `<span class="material-icons-round project-state-icon">sync_problem</span><h4>Sinkronisasi terhenti</h4><p>${escapeProjectHtml(projectSyncError)}</p><button type="button" onclick="restartProjectsRealtimeSync()">Coba lagi</button>`;
    }
    if (type === 'empty-all') {
        return '<span class="material-icons-round project-state-icon">video_library</span><h4>Belum ada proyek</h4><p>Pilih video untuk membuat draft pertamamu. File belum akan diunggah.</p><button type="button" onclick="goToPage(\'page-enhancer\', -1)">Buat proyek pertama</button>';
    }
    return '<span class="material-icons-round project-state-icon">search_off</span><h4>Proyek tidak ditemukan</h4><p>Coba ubah kata pencarian atau filter status.</p><button type="button" onclick="resetProjectFilters()">Reset filter</button>';
}

function projectCardMarkup(project) {
    const status = getProjectStatus(project.status);
    const meta = `${formatProjectDate(project.updatedAt)} • ${formatProjectFileSize(project.sourceFileSize)}`;
    return `<button type="button" class="project-item project-record" data-project-id="${escapeProjectHtml(project.id)}">
        <span class="project-icon tone-${status.tone}"><span class="material-icons-round">${status.icon}</span></span>
        <span class="project-details"><span class="project-card-top"><span class="project-title">${escapeProjectHtml(project.name)}</span><span class="project-status-chip tone-${status.tone}">${status.label}</span></span><span class="project-meta">${escapeProjectHtml(meta)}</span><span class="project-source-name">${escapeProjectHtml(project.sourceFileName)}</span></span>
        <span class="material-icons-round project-chevron">chevron_right</span>
    </button>`;
}

function attachProjectOpenHandlers(container) {
    if (!container) return;
    container.querySelectorAll('[data-project-id]').forEach((button) => {
        button.addEventListener('click', () => openProjectDetails(button.dataset.projectId));
    });
}

function renderProjectLibrary() {
    const state = document.getElementById('project-list-state');
    const list = document.getElementById('project-list');
    const count = document.getElementById('project-result-count');
    const heading = document.getElementById('project-list-heading');
    if (!state || !list) return;

    const filtered = getFilteredProjects();
    const labels = { all: 'Semua proyek', draft: 'Draft', active: 'Sedang diproses', completed: 'Proyek selesai', failed: 'Proyek gagal' };
    if (heading) heading.textContent = labels[activeProjectFilter] || labels.all;
    if (count) count.textContent = `${filtered.length} proyek`;

    let stateType = '';
    if (projectSyncState === 'loading' && projectRecords.length === 0) stateType = 'loading';
    else if (projectSyncState === 'error' && projectRecords.length === 0) stateType = 'error';
    else if (filtered.length === 0) stateType = projectRecords.length === 0 && !activeProjectSearch && activeProjectFilter === 'all' ? 'empty-all' : 'empty-filter';

    if (stateType) {
        state.hidden = false;
        state.dataset.state = stateType;
        state.innerHTML = projectListStateMarkup(stateType);
        list.innerHTML = '';
        return;
    }

    state.hidden = true;
    state.innerHTML = '';
    list.innerHTML = filtered.map(projectCardMarkup).join('');
    attachProjectOpenHandlers(list);
}

function editorProjectCardMarkup(project, index) {
    const status = getProjectStatus(project.status);
    const gradients = ['violet', 'blue', 'orange', 'green'];
    return `<button type="button" class="rc-item" data-project-id="${escapeProjectHtml(project.id)}">
        <span class="rc-thumb project-thumb tone-${gradients[index % gradients.length]}"><span class="material-icons-round project-thumb-icon">movie_filter</span><span class="rc-status tone-${status.tone}">${status.label}</span></span>
        <span class="rc-info"><strong>${escapeProjectHtml(project.name)}</strong><small>${escapeProjectHtml(formatProjectDate(project.updatedAt))}</small></span>
    </button>`;
}

function renderProjectEditorHistory() {
    const container = document.getElementById('editor-history-list');
    if (!container) return;

    if (projectSyncState === 'loading' && projectRecords.length === 0) {
        container.innerHTML = '<div class="editor-project-loading"><span class="project-loading-spinner"></span><p>Memuat proyek...</p></div>';
        return;
    }

    if (projectSyncState === 'error' && projectRecords.length === 0) {
        container.innerHTML = '<div class="editor-project-empty"><span class="material-icons-round">cloud_off</span><strong>Riwayat belum tersambung</strong><p>Buka Library untuk mencoba sinkronisasi lagi.</p></div>';
        return;
    }

    if (projectRecords.length === 0) {
        container.innerHTML = '<div class="editor-project-empty"><span class="material-icons-round">video_call</span><strong>Belum ada draft</strong><p>Tekan “Buat Draft Proyek” untuk memulai.</p></div>';
        return;
    }

    container.innerHTML = projectRecords.slice(0, 4).map(editorProjectCardMarkup).join('');
    attachProjectOpenHandlers(container);
}

function renderProjectsUI() {
    updateProjectLinkedStats();
    renderProjectLibrary();
    renderProjectEditorHistory();
}

function stopProjectsRealtimeSync(options = {}) {
    if (typeof projectsUnsubscribe === 'function') projectsUnsubscribe();
    projectsUnsubscribe = null;
    projectsListenerUid = null;
    selectedProjectId = null;

    if (options.clear === true) {
        projectRecords = [];
        projectSyncError = '';
        setProjectSyncStatus('idle');
        renderProjectsUI();
    }
}

function startProjectsRealtimeSync(uid) {
    if (!uid || auth?.currentUser?.uid !== uid) return;
    if (projectsListenerUid === uid && typeof projectsUnsubscribe === 'function') return;

    stopProjectsRealtimeSync();
    projectsListenerUid = uid;
    projectSyncError = '';
    setProjectSyncStatus(isOffline() ? 'offline' : 'loading');
    renderProjectsUI();

    const collection = getProjectsCollection(uid);
    if (!collection) {
        projectSyncError = 'Modul database proyek belum siap.';
        setProjectSyncStatus('error');
        renderProjectsUI();
        return;
    }

    let query = collection;
    if (typeof query.orderBy === 'function') query = query.orderBy('updatedAt', 'desc');
    if (typeof query.limit === 'function') query = query.limit(100);

    if (typeof query.onSnapshot !== 'function') {
        projectSyncError = 'Sinkronisasi real-time tidak tersedia di browser ini.';
        setProjectSyncStatus('error');
        renderProjectsUI();
        return;
    }

    projectsUnsubscribe = query.onSnapshot(
        (snapshot) => {
            if (auth?.currentUser?.uid !== uid || projectsListenerUid !== uid) return;
            const docs = Array.isArray(snapshot?.docs) ? snapshot.docs : [];
            projectRecords = docs
                .map((documentSnapshot) => normalizeProjectRecord(documentSnapshot.id, documentSnapshot.data?.() || {}))
                .filter((project) => !project.ownerId || project.ownerId === uid)
                .sort((a, b) => projectTimestampToMillis(b.updatedAt) - projectTimestampToMillis(a.updatedAt));

            projectSyncError = '';
            const fromOfflineCache = snapshot?.metadata?.fromCache === true && isOffline();
            setProjectSyncStatus(fromOfflineCache ? 'offline' : 'synced');
            renderProjectsUI();
        },
        (error) => {
            if (auth?.currentUser?.uid !== uid) return;
            projectSyncError = translateProjectError(error);
            setProjectSyncStatus(isOffline() ? 'offline' : 'error');
            renderProjectsUI();
            console.warn('Sinkronisasi proyek real-time terputus:', error);
        }
    );
}

function restartProjectsRealtimeSync() {
    const user = auth?.currentUser;
    if (!user) return;
    stopProjectsRealtimeSync();
    startProjectsRealtimeSync(user.uid);
}

function setProjectSearch(value) {
    activeProjectSearch = String(value || '').slice(0, 80);
    const clearButton = document.getElementById('project-search-clear');
    if (clearButton) clearButton.hidden = !activeProjectSearch;
    renderProjectLibrary();
}

function clearProjectSearch() {
    const input = document.getElementById('project-search-input');
    if (input) input.value = '';
    setProjectSearch('');
}

function setProjectFilter(filter, button) {
    if (!['all', 'draft', 'active', 'completed', 'failed'].includes(filter)) return;
    activeProjectFilter = filter;
    document.querySelectorAll('[data-project-filter]').forEach((item) => item.classList.toggle('active', item === button || item.dataset.projectFilter === filter));
    renderProjectLibrary();
}

function resetProjectFilters() {
    activeProjectFilter = 'all';
    clearProjectSearch();
    const allButton = document.querySelector('[data-project-filter="all"]');
    document.querySelectorAll('[data-project-filter]').forEach((item) => item.classList.toggle('active', item === allButton));
    renderProjectLibrary();
}

function isSupportedProjectVideo(file) {
    if (!file) return false;
    if (String(file.type || '').startsWith('video/')) return true;
    return /\.(mp4|mov|m4v|mkv|webm|avi|3gp)$/i.test(file.name || '');
}

function defaultProjectName(fileName) {
    return String(fileName || 'Proyek baru')
        .replace(/\.[^.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80) || 'Proyek baru';
}

function setProjectCreateLoading(isLoading) {
    const button = document.getElementById('project-create-submit');
    if (!button) return;
    button.disabled = isLoading;
    button.setAttribute('aria-busy', String(isLoading));
    button.classList.toggle('loading', isLoading);
    const label = button.querySelector('.project-button-label');
    if (label) label.textContent = isLoading ? 'Menyimpan...' : 'Simpan draft';
}

function showProjectCreateError(message) {
    const element = document.getElementById('project-create-error');
    if (element) element.textContent = message || '';
}

function handleProjectFileSelected(input) {
    const file = input?.files?.[0];
    if (!file) return;

    if (!auth?.currentUser) {
        input.value = '';
        navigateToPage('page-login', -1);
        return;
    }
    if (!isSupportedProjectVideo(file)) {
        input.value = '';
        safeShowToast('Pilih file video yang didukung.', 'info');
        return;
    }

    pendingProjectFile = file;
    showProjectCreateError('');

    const modal = document.getElementById('project-create-modal');
    const nameInput = document.getElementById('project-name-input');
    const fileName = document.getElementById('project-file-name');
    const fileMeta = document.getElementById('project-file-meta');
    if (nameInput) nameInput.value = defaultProjectName(file.name);
    if (fileName) fileName.textContent = file.name;
    if (fileMeta) fileMeta.textContent = `${formatProjectFileSize(file.size)} • ${file.type || 'Video'}`;
    if (modal) {
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('project-sheet-open');
        setTimeout(() => nameInput?.focus(), 120);
    }
}

function closeProjectCreateSheet(options = {}) {
    if (projectCreateInProgress) return;
    const modal = document.getElementById('project-create-modal');
    if (modal) {
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('project-sheet-open');
    showProjectCreateError('');
    pendingProjectFile = null;
    const fileInput = document.getElementById('video-editor-input');
    if (fileInput && options.keepInput !== true) fileInput.value = '';
}

function handleProjectSheetBackdrop(event) {
    if (event.target === event.currentTarget) closeProjectCreateSheet();
}

async function createProjectDraft(event) {
    event?.preventDefault();
    if (projectCreateInProgress) return;

    const user = auth?.currentUser;
    const file = pendingProjectFile;
    const name = String(document.getElementById('project-name-input')?.value || '').trim().replace(/\s+/g, ' ');
    showProjectCreateError('');

    if (!user || !db) {
        showProjectCreateError('Sesi akun tidak ditemukan. Silakan masuk kembali.');
        return;
    }
    if (isOffline()) {
        showProjectCreateError('Kamu sedang offline. Sambungkan internet untuk menyimpan draft.');
        return;
    }
    if (!file) {
        showProjectCreateError('File video tidak ditemukan. Pilih ulang videonya.');
        return;
    }
    if (name.length < 2 || name.length > 80) {
        showProjectCreateError('Nama proyek harus terdiri dari 2–80 karakter.');
        return;
    }

    const collection = getProjectsCollection(user.uid);
    if (!collection || typeof collection.doc !== 'function') {
        showProjectCreateError('Database proyek belum siap. Muat ulang aplikasi lalu coba lagi.');
        return;
    }

    projectCreateInProgress = true;
    setProjectCreateLoading(true);

    try {
        const projectReference = collection.doc();
        await projectReference.set({
            ownerId: user.uid,
            name,
            sourceFileName: String(file.name || 'video').slice(0, 180),
            sourceFileSize: Number(file.size) || 0,
            sourceMimeType: String(file.type || 'video/*').slice(0, 100),
            sourceLastModified: Number(file.lastModified) || null,
            status: 'draft',
            progress: 0,
            schemaVersion: 1,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        safeShowToast('Draft proyek berhasil disimpan.', 'check');
        projectCreateInProgress = false;
        closeProjectCreateSheet();
    } catch (error) {
        console.warn('Draft proyek gagal disimpan:', error);
        showProjectCreateError(translateProjectError(error));
    } finally {
        projectCreateInProgress = false;
        setProjectCreateLoading(false);
    }
}

function openProjectDetails(projectId) {
    const project = projectRecords.find((item) => item.id === projectId);
    if (!project) {
        safeShowToast('Proyek tidak ditemukan atau sudah berubah.', 'info');
        return;
    }

    selectedProjectId = project.id;
    const status = getProjectStatus(project.status);
    const title = document.getElementById('project-detail-title');
    const statusElement = document.getElementById('project-detail-status');
    const updated = document.getElementById('project-detail-updated');
    const file = document.getElementById('project-detail-file');
    const size = document.getElementById('project-detail-size');
    const created = document.getElementById('project-detail-created');
    if (title) title.textContent = project.name;
    if (statusElement) {
        statusElement.textContent = status.label;
        statusElement.className = `project-status-chip tone-${status.tone}`;
    }
    if (updated) updated.textContent = `Diperbarui ${formatProjectDate(project.updatedAt, true)}`;
    if (file) file.textContent = project.sourceFileName;
    if (size) size.textContent = formatProjectFileSize(project.sourceFileSize);
    if (created) created.textContent = formatProjectDate(project.createdAt, true);

    const modal = document.getElementById('project-detail-modal');
    if (modal) {
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('project-sheet-open');
    }
}

function closeProjectDetailSheet() {
    const modal = document.getElementById('project-detail-modal');
    if (modal) {
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
    }
    selectedProjectId = null;
    document.body.classList.remove('project-sheet-open');
}

function handleProjectDetailBackdrop(event) {
    if (event.target === event.currentTarget) closeProjectDetailSheet();
}

function handleProjectsConnectionChange() {
    if (!auth?.currentUser) return;
    if (isOffline()) {
        setProjectSyncStatus('offline');
        renderProjectsUI();
    } else if (projectSyncState === 'offline' || projectSyncState === 'error') {
        restartProjectsRealtimeSync();
    }
}

window.addEventListener('online', handleProjectsConnectionChange);
window.addEventListener('offline', handleProjectsConnectionChange);
document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    closeProjectDetailSheet();
    closeProjectCreateSheet();
});


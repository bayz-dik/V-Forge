// ===============================================
// PROJECTS.JS - Project, Workspace, dan Video Processing v1.2 V-Forge
// Metadata proyek, setelan, dan catatan ekspor tersimpan di Firestore per akun.
// File sumber maupun hasil video tetap lokal dan tidak diunggah oleh modul ini.
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

function formatProjectDuration(milliseconds) {
    const totalSeconds = Math.max(0, Math.round(Number(milliseconds) / 1000));
    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return 'Belum terbaca';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatProjectSourceResolution(width, height) {
    const safeWidth = Number(width);
    const safeHeight = Number(height);
    if (!Number.isFinite(safeWidth) || !Number.isFinite(safeHeight) || safeWidth <= 0 || safeHeight <= 0) return 'Belum terbaca';
    return `${Math.round(safeWidth)} × ${Math.round(safeHeight)}`;
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
        sourceDurationMs: Number.isFinite(data.sourceDurationMs) ? Math.max(0, data.sourceDurationMs) : 0,
        sourceWidth: Number.isFinite(data.sourceWidth) ? Math.max(0, data.sourceWidth) : 0,
        sourceHeight: Number.isFinite(data.sourceHeight) ? Math.max(0, data.sourceHeight) : 0,
        aspectRatio: ['original', '9:16', '16:9', '1:1'].includes(data.aspectRatio) ? data.aspectRatio : 'original',
        outputResolution: ['720p', '1080p', '2160p', 'source'].includes(data.outputResolution) ? data.outputResolution : '1080p',
        outputFrameRate: ['30', '60', '120', 'source'].includes(String(data.outputFrameRate)) ? String(data.outputFrameRate) : '30',
        audioEnabled: data.audioEnabled !== false,
        audioQuality: ['standard', 'hires-lossless'].includes(data.audioQuality) ? data.audioQuality : 'standard',
        status,
        progress: Number.isFinite(data.progress) ? Math.max(0, Math.min(100, data.progress)) : 0,
        lastExportFileName: String(data.lastExportFileName || '').slice(0, 180),
        lastExportFileSize: Number.isFinite(data.lastExportFileSize) ? Math.max(0, data.lastExportFileSize) : 0,
        lastExportMimeType: String(data.lastExportMimeType || '').slice(0, 100),
        lastExportWidth: Number.isFinite(data.lastExportWidth) ? Math.max(0, data.lastExportWidth) : 0,
        lastExportHeight: Number.isFinite(data.lastExportHeight) ? Math.max(0, data.lastExportHeight) : 0,
        lastExportFrameRate: String(data.lastExportFrameRate || '').slice(0, 20),
        lastExportAudioEnabled: data.lastExportAudioEnabled !== false,
        lastExportAudioQuality: ['standard', 'hires-lossless'].includes(data.lastExportAudioQuality) ? data.lastExportAudioQuality : 'standard',
        lastExportLosslessAudioFileName: String(data.lastExportLosslessAudioFileName || '').slice(0, 180),
        lastExportLosslessAudioFileSize: Number.isFinite(data.lastExportLosslessAudioFileSize) ? Math.max(0, data.lastExportLosslessAudioFileSize) : 0,
        lastExportLosslessAudioSampleRate: Number.isFinite(data.lastExportLosslessAudioSampleRate) ? Math.max(0, data.lastExportLosslessAudioSampleRate) : 0,
        lastExportLosslessAudioBitDepth: Number.isFinite(data.lastExportLosslessAudioBitDepth) ? Math.max(0, data.lastExportLosslessAudioBitDepth) : 0,
        lastExportedAt: data.lastExportedAt || null,
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
        container.innerHTML = '<div class="editor-project-empty"><span class="material-icons-round">video_call</span><strong>Belum ada draft</strong><p>Tekan “Pilih Video & Buka Workspace” untuk memulai.</p></div>';
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
        if (typeof closeVideoWorkspace === 'function') closeVideoWorkspace({ navigate: false, force: true });
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

function getProjectRecord(projectId) {
    return projectRecords.find((item) => item.id === projectId) || null;
}

function canOpenProjectInWorkspace(project) {
    return Boolean(project && ['draft', 'completed', 'failed'].includes(project.status));
}

async function saveWorkspaceProject({ projectId = null, file, name, metadata = {}, settings = {} }) {
    const user = auth?.currentUser;
    if (!user || !db) throw new Error('workspace/no-session');
    if (isOffline()) throw new Error('workspace/offline');
    if (!isSupportedProjectVideo(file)) throw new Error('workspace/invalid-video');

    const normalizedName = String(name || '').trim().replace(/\s+/g, ' ');
    if (normalizedName.length < 2 || normalizedName.length > 80) throw new Error('workspace/invalid-name');

    const collection = getProjectsCollection(user.uid);
    if (!collection || typeof collection.doc !== 'function') throw new Error('workspace/database-unavailable');

    const existing = projectId ? getProjectRecord(projectId) : null;
    if (projectId && (!existing || existing.ownerId !== user.uid || !canOpenProjectInWorkspace(existing))) {
        throw new Error('workspace/project-unavailable');
    }

    const payload = {
        ownerId: user.uid,
        name: normalizedName,
        sourceFileName: String(file.name || 'video').slice(0, 180),
        sourceFileSize: Number(file.size) || 0,
        sourceMimeType: String(file.type || 'video/*').slice(0, 100),
        sourceLastModified: Number(file.lastModified) || null,
        sourceDurationMs: Math.max(0, Math.round(Number(metadata.durationMs) || 0)),
        sourceWidth: Math.max(0, Math.round(Number(metadata.width) || 0)),
        sourceHeight: Math.max(0, Math.round(Number(metadata.height) || 0)),
        aspectRatio: ['original', '9:16', '16:9', '1:1'].includes(settings.aspectRatio) ? settings.aspectRatio : 'original',
        outputResolution: ['720p', '1080p', '2160p', 'source'].includes(settings.outputResolution) ? settings.outputResolution : '1080p',
        outputFrameRate: ['30', '60', '120', 'source'].includes(String(settings.frameRate)) ? String(settings.frameRate) : '30',
        audioEnabled: settings.audioEnabled !== false,
        audioQuality: ['standard', 'hires-lossless'].includes(settings.audioQuality) ? settings.audioQuality : 'standard',
        status: 'draft',
        progress: 0,
        schemaVersion: 4,
        updatedAt: serverTimestamp()
    };

    const reference = projectId ? collection.doc(projectId) : collection.doc();
    if (!projectId) payload.createdAt = serverTimestamp();
    if (projectId) await reference.set(payload, { merge: true });
    else await reference.set(payload);
    return reference.id || projectId;
}

async function markWorkspaceProjectExported(projectId, result = {}) {
    const user = auth?.currentUser;
    if (!user || !db || !projectId) return false;
    if (isOffline()) return false;

    const existing = getProjectRecord(projectId);
    if (existing && existing.ownerId && existing.ownerId !== user.uid) {
        throw new Error('workspace/project-unavailable');
    }

    const collection = getProjectsCollection(user.uid);
    if (!collection || typeof collection.doc !== 'function') return false;

    await collection.doc(projectId).set({
        ownerId: user.uid,
        status: 'completed',
        progress: 100,
        lastExportFileName: String(result.fileName || '').slice(0, 180),
        lastExportFileSize: Math.max(0, Math.round(Number(result.fileSize) || 0)),
        lastExportMimeType: String(result.mimeType || '').slice(0, 100),
        lastExportWidth: Math.max(0, Math.round(Number(result.width) || 0)),
        lastExportHeight: Math.max(0, Math.round(Number(result.height) || 0)),
        lastExportFrameRate: String(result.frameRate || '').slice(0, 20),
        lastExportAudioEnabled: result.audioEnabled !== false,
        lastExportAudioQuality: ['standard', 'hires-lossless'].includes(result.audioQuality) ? result.audioQuality : 'standard',
        lastExportLosslessAudioFileName: String(result.losslessAudioFileName || '').slice(0, 180),
        lastExportLosslessAudioFileSize: Math.max(0, Math.round(Number(result.losslessAudioFileSize) || 0)),
        lastExportLosslessAudioSampleRate: Math.max(0, Math.round(Number(result.losslessAudioSampleRate) || 0)),
        lastExportLosslessAudioBitDepth: Math.max(0, Math.round(Number(result.losslessAudioBitDepth) || 0)),
        lastExportedAt: serverTimestamp(),
        schemaVersion: 4,
        updatedAt: serverTimestamp()
    }, { merge: true });
    return true;
}

function continueProjectInWorkspace() {
    const project = getProjectRecord(selectedProjectId);
    if (!canOpenProjectInWorkspace(project)) {
        safeShowToast('Proyek ini belum bisa dibuka kembali di workspace.', 'info');
        return;
    }
    const projectId = project.id;
    closeProjectDetailSheet();
    if (typeof openVideoPicker === 'function') openVideoPicker(projectId);
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
    const duration = document.getElementById('project-detail-duration');
    const resolution = document.getElementById('project-detail-resolution');
    const output = document.getElementById('project-detail-output');
    const lastExport = document.getElementById('project-detail-export');
    const created = document.getElementById('project-detail-created');
    const continueButton = document.getElementById('project-continue-button');
    const continueLabel = document.getElementById('project-continue-label');
    const continueIcon = continueButton?.querySelector('.material-icons-round');
    const nextStepTitle = document.getElementById('project-next-step-title');
    const nextStepText = document.getElementById('project-next-step-text');
    const detailActions = continueButton?.parentElement;
    if (title) title.textContent = project.name;
    if (statusElement) {
        statusElement.textContent = status.label;
        statusElement.className = `project-status-chip tone-${status.tone}`;
    }
    if (updated) updated.textContent = `Diperbarui ${formatProjectDate(project.updatedAt, true)}`;
    if (file) file.textContent = project.sourceFileName;
    if (size) size.textContent = formatProjectFileSize(project.sourceFileSize);
    if (duration) duration.textContent = formatProjectDuration(project.sourceDurationMs);
    if (resolution) resolution.textContent = formatProjectSourceResolution(project.sourceWidth, project.sourceHeight);
    if (output) {
        if (project.schemaVersion < 2) output.textContent = 'Belum diatur';
        else {
            const ratio = project.aspectRatio === 'original' ? 'Asli' : project.aspectRatio;
            const fps = project.outputFrameRate === 'source' ? 'FPS asli' : `${project.outputFrameRate} FPS`;
            const audio = !project.audioEnabled
                ? 'Mute'
                : (project.audioQuality === 'hires-lossless' ? 'Hi-Res Lossless + WAV' : 'Audio');
            output.textContent = `${ratio} • ${project.outputResolution} • ${fps} • ${audio}`;
        }
    }
    if (lastExport) {
        if (!project.lastExportFileName) lastExport.textContent = 'Belum diekspor';
        else {
            const exportSize = formatProjectFileSize(project.lastExportFileSize);
            const lossless = project.lastExportLosslessAudioFileName
                ? ` • WAV ${formatProjectFileSize(project.lastExportLosslessAudioFileSize)}`
                : '';
            lastExport.textContent = `${project.lastExportFileName} • ${exportSize}${lossless}`;
        }
    }
    if (created) created.textContent = formatProjectDate(project.createdAt, true);
    const canContinue = canOpenProjectInWorkspace(project);
    if (continueButton) continueButton.hidden = !canContinue;
    if (continueLabel) continueLabel.textContent = project.status === 'completed' ? 'Proses ulang' : (project.status === 'failed' ? 'Coba lagi' : 'Lanjutkan');
    if (continueIcon) continueIcon.textContent = project.status === 'completed' ? 'replay' : 'movie_edit';
    if (detailActions) detailActions.classList.toggle('single', !canContinue);
    if (nextStepTitle) nextStepTitle.textContent = project.status === 'completed' ? 'Hasil tersimpan di perangkatmu' : 'Video tetap aman di perangkat';
    if (nextStepText) nextStepText.textContent = project.status === 'completed'
        ? 'Firestore hanya menyimpan catatan ekspor. File hasil tidak disimpan di cloud; pilih ulang sumber untuk memproses lagi.'
        : 'Firestore hanya menyimpan metadata dan setelan. Setelah aplikasi ditutup, pilih ulang file yang sama untuk melanjutkan workspace.';

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
});

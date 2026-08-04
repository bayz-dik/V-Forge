// ===============================================
// WORKSPACE.JS - Video Workspace v1 V-Forge
// Video dipreview dari Object URL lokal. Hanya metadata dan setelan yang
// disimpan ke Firestore; byte video tidak dikirim ke jaringan.
// ===============================================

const VIDEO_WORKSPACE_DEFAULTS = Object.freeze({
    aspectRatio: 'original',
    outputResolution: '1080p',
    frameRate: '30',
    audioEnabled: true
});

let videoWorkspaceRequestedProjectId = null;
let videoWorkspaceSaving = false;
let videoWorkspaceState = createEmptyVideoWorkspaceState();

function createEmptyVideoWorkspaceState() {
    return {
        projectId: null,
        file: null,
        objectUrl: '',
        previewReady: false,
        metadata: { durationMs: 0, width: 0, height: 0 },
        settings: { ...VIDEO_WORKSPACE_DEFAULTS }
    };
}

function showWorkspaceError(message = '') {
    const element = document.getElementById('workspace-form-error');
    if (element) element.textContent = message;
}

function setWorkspacePreviewError(message = '') {
    const element = document.getElementById('workspace-preview-error');
    if (element) element.textContent = message;
}

function setWorkspaceLoading(isLoading) {
    const loading = document.getElementById('workspace-video-loading');
    if (loading) loading.hidden = !isLoading;
}

function setWorkspaceSaveLoading(isLoading) {
    videoWorkspaceSaving = isLoading;
    const button = document.getElementById('workspace-save-button');
    if (!button) return;
    button.disabled = isLoading || !videoWorkspaceState.previewReady;
    button.classList.toggle('loading', isLoading);
    button.setAttribute('aria-busy', String(isLoading));
    const label = button.querySelector('.workspace-button-label');
    if (label) label.textContent = isLoading ? 'Menyimpan...' : (videoWorkspaceState.projectId ? 'Perbarui draft' : 'Simpan draft');
}

function releaseWorkspaceObjectUrl() {
    if (!videoWorkspaceState.objectUrl) return;
    try { URL.revokeObjectURL(videoWorkspaceState.objectUrl); } catch (error) {}
    videoWorkspaceState.objectUrl = '';
}

function resetWorkspaceVideoElement() {
    const video = document.getElementById('workspace-video');
    if (!video) return;
    if (!video.getAttribute('src') && !video.currentSrc) return;
    try { video.pause(); } catch (error) {}
    video.removeAttribute('src');
    try { video.load(); } catch (error) {}
}

function openVideoPicker(projectId = null) {
    if (!auth?.currentUser) {
        if (typeof goToPage === 'function') goToPage('page-login', -1);
        return;
    }

    if (projectId) {
        const project = typeof getProjectRecord === 'function' ? getProjectRecord(projectId) : null;
        if (!project || project.status !== 'draft') {
            safeShowToast('Draft tidak tersedia untuk dilanjutkan.', 'info');
            return;
        }
    }

    videoWorkspaceRequestedProjectId = projectId || null;
    const input = document.getElementById('video-editor-input');
    if (!input) {
        safeShowToast('Pemilih video belum siap. Muat ulang aplikasi.', 'info');
        return;
    }
    input.value = '';
    input.click();
}

function replaceWorkspaceVideo() {
    if (videoWorkspaceSaving) return;
    openVideoPicker(videoWorkspaceState.projectId);
}

function handleWorkspaceFileSelected(input) {
    const file = input?.files?.[0];
    const projectId = videoWorkspaceRequestedProjectId;
    videoWorkspaceRequestedProjectId = null;
    if (!file) return;

    if (!auth?.currentUser) {
        input.value = '';
        if (typeof goToPage === 'function') goToPage('page-login', -1);
        return;
    }
    if (typeof isSupportedProjectVideo !== 'function' || !isSupportedProjectVideo(file)) {
        input.value = '';
        safeShowToast('Pilih file video yang didukung.', 'info');
        return;
    }

    openVideoWorkspace(file, projectId);
}

function openVideoWorkspace(file, projectId = null) {
    const existing = projectId && typeof getProjectRecord === 'function' ? getProjectRecord(projectId) : null;
    releaseWorkspaceObjectUrl();
    resetWorkspaceVideoElement();

    videoWorkspaceState = createEmptyVideoWorkspaceState();
    videoWorkspaceState.projectId = existing?.id || null;
    videoWorkspaceState.file = file;
    videoWorkspaceState.settings = existing ? {
        aspectRatio: existing.aspectRatio,
        outputResolution: existing.outputResolution,
        frameRate: existing.outputFrameRate,
        audioEnabled: existing.audioEnabled
    } : { ...VIDEO_WORKSPACE_DEFAULTS };

    showWorkspaceError('');
    setWorkspacePreviewError('');
    setWorkspaceLoading(true);

    const nameInput = document.getElementById('workspace-project-name');
    if (nameInput) nameInput.value = existing?.name || defaultProjectName(file.name);

    const fileName = document.getElementById('workspace-file-name');
    const fileType = document.getElementById('workspace-file-type');
    const fileSize = document.getElementById('workspace-file-size');
    if (fileName) fileName.textContent = file.name || 'Video tanpa nama';
    if (fileType) fileType.textContent = file.type || 'Format video';
    if (fileSize) fileSize.textContent = formatProjectFileSize(file.size);
    setWorkspaceMetadataText();
    renderWorkspaceSettings();

    const video = document.getElementById('workspace-video');
    if (!video || typeof URL.createObjectURL !== 'function') {
        handleWorkspacePreviewError('Browser ini belum dapat membuat preview lokal. Coba buka V-Forge di Chrome terbaru.');
        if (typeof goToPage === 'function') goToPage('page-video-workspace', -1);
        return;
    }

    try {
        videoWorkspaceState.objectUrl = URL.createObjectURL(file);
        video.src = videoWorkspaceState.objectUrl;
    } catch (error) {
        handleWorkspacePreviewError('Preview lokal gagal dibuat. Coba pilih ulang videonya atau gunakan Chrome terbaru.');
        if (typeof goToPage === 'function') goToPage('page-video-workspace', -1);
        return;
    }
    if (typeof goToPage === 'function') goToPage('page-video-workspace', -1);
    try { video.load(); } catch (error) {}
}

function setWorkspaceMetadataText() {
    const duration = document.getElementById('workspace-duration');
    const resolution = document.getElementById('workspace-resolution');
    if (duration) duration.textContent = formatProjectDuration(videoWorkspaceState.metadata.durationMs);
    if (resolution) resolution.textContent = formatProjectSourceResolution(videoWorkspaceState.metadata.width, videoWorkspaceState.metadata.height);
}

function handleWorkspaceMetadataLoaded() {
    const video = document.getElementById('workspace-video');
    if (!video || !videoWorkspaceState.file) return;

    const durationMs = Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : 0;
    const width = Math.round(Number(video.videoWidth) || 0);
    const height = Math.round(Number(video.videoHeight) || 0);
    if (durationMs <= 0 || width <= 0 || height <= 0) {
        handleWorkspacePreviewError('Metadata video belum dapat dibaca. Coba pilih video MP4, MOV, WebM, atau 3GP lain.');
        return;
    }

    videoWorkspaceState.metadata = { durationMs, width, height };
    videoWorkspaceState.previewReady = true;
    const frame = document.getElementById('workspace-video-frame');
    if (frame) frame.style.setProperty('--workspace-source-ratio', `${width} / ${height}`);
    setWorkspaceLoading(false);
    setWorkspacePreviewError('');
    setWorkspaceMetadataText();
    renderWorkspaceSettings();
    setWorkspaceSaveLoading(false);
}

function handleWorkspacePreviewError(customMessage = '') {
    videoWorkspaceState.previewReady = false;
    setWorkspaceLoading(false);
    setWorkspacePreviewError(customMessage || 'Video tidak dapat diputar di browser ini. Coba gunakan MP4 (H.264) agar preview kompatibel.');
    setWorkspaceSaveLoading(false);
}

function selectWorkspaceSetting(key, value) {
    const allowed = {
        aspectRatio: ['original', '9:16', '16:9', '1:1'],
        outputResolution: ['720p', '1080p', 'source'],
        frameRate: ['30', '60', 'source']
    };
    const normalizedValue = String(value);
    if (!allowed[key]?.includes(normalizedValue)) return;
    videoWorkspaceState.settings[key] = normalizedValue;
    renderWorkspaceSettings();
}

function toggleWorkspaceAudio(button) {
    videoWorkspaceState.settings.audioEnabled = !videoWorkspaceState.settings.audioEnabled;
    renderWorkspaceSettings();
    if (button) button.focus({ preventScroll: true });
}

function renderWorkspaceSettings() {
    const settings = videoWorkspaceState.settings;
    document.querySelectorAll('[data-workspace-setting="aspectRatio"]').forEach((button) => {
        const active = button.dataset.value === settings.aspectRatio;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
    });

    const resolutionSelect = document.getElementById('workspace-resolution-select');
    const fpsSelect = document.getElementById('workspace-fps-select');
    if (resolutionSelect) resolutionSelect.value = settings.outputResolution;
    if (fpsSelect) fpsSelect.value = settings.frameRate;

    const audioButton = document.getElementById('workspace-audio-toggle');
    const audioLabel = document.getElementById('workspace-audio-label');
    if (audioButton) {
        audioButton.classList.toggle('active', settings.audioEnabled);
        audioButton.setAttribute('aria-pressed', String(settings.audioEnabled));
        const icon = audioButton.querySelector('.material-icons-round');
        if (icon) icon.textContent = settings.audioEnabled ? 'volume_up' : 'volume_off';
    }
    if (audioLabel) audioLabel.textContent = settings.audioEnabled ? 'Audio akan disertakan' : 'Output akan tanpa audio';

    const frame = document.getElementById('workspace-video-frame');
    if (frame) {
        frame.classList.remove('ratio-original', 'ratio-portrait', 'ratio-landscape', 'ratio-square');
        const ratioClass = { original: 'ratio-original', '9:16': 'ratio-portrait', '16:9': 'ratio-landscape', '1:1': 'ratio-square' };
        frame.classList.add(ratioClass[settings.aspectRatio] || 'ratio-original');
    }

    const headerMode = document.getElementById('workspace-header-mode');
    if (headerMode) headerMode.textContent = videoWorkspaceState.projectId ? 'Perbarui draft' : 'Proyek baru';
    setWorkspaceSaveLoading(videoWorkspaceSaving);
}

function translateWorkspaceError(error) {
    const message = error?.message || '';
    const customMessages = {
        'workspace/no-session': 'Sesi akun tidak ditemukan. Silakan masuk kembali.',
        'workspace/offline': 'Kamu sedang offline. Sambungkan internet untuk menyimpan draft.',
        'workspace/invalid-video': 'File video tidak valid. Pilih ulang videonya.',
        'workspace/invalid-name': 'Nama proyek harus terdiri dari 2–80 karakter.',
        'workspace/database-unavailable': 'Database proyek belum siap. Muat ulang aplikasi lalu coba lagi.',
        'workspace/project-unavailable': 'Draft ini sudah berubah atau tidak tersedia. Buka kembali dari Library.'
    };
    if (customMessages[message]) return customMessages[message];
    return typeof translateProjectError === 'function' ? translateProjectError(error) : 'Draft belum dapat disimpan. Coba lagi.';
}

async function saveVideoWorkspace(event) {
    event?.preventDefault();
    if (videoWorkspaceSaving) return;

    showWorkspaceError('');
    const name = String(document.getElementById('workspace-project-name')?.value || '').trim().replace(/\s+/g, ' ');
    if (!videoWorkspaceState.file) {
        showWorkspaceError('File video tidak ditemukan. Pilih ulang videonya.');
        return;
    }
    if (!videoWorkspaceState.previewReady) {
        showWorkspaceError('Tunggu sampai metadata dan preview video selesai dibaca.');
        return;
    }
    if (name.length < 2 || name.length > 80) {
        showWorkspaceError('Nama proyek harus terdiri dari 2–80 karakter.');
        return;
    }

    setWorkspaceSaveLoading(true);
    try {
        const projectId = await saveWorkspaceProject({
            projectId: videoWorkspaceState.projectId,
            file: videoWorkspaceState.file,
            name,
            metadata: videoWorkspaceState.metadata,
            settings: videoWorkspaceState.settings
        });
        safeShowToast(videoWorkspaceState.projectId ? 'Draft berhasil diperbarui.' : 'Draft workspace berhasil disimpan.', 'check');
        videoWorkspaceState.projectId = projectId || videoWorkspaceState.projectId;
        closeVideoWorkspace({ navigate: false, force: true });
        if (typeof goToPage === 'function') goToPage('page-search', 2);
    } catch (error) {
        console.warn('Workspace gagal menyimpan draft:', error);
        showWorkspaceError(translateWorkspaceError(error));
    } finally {
        setWorkspaceSaveLoading(false);
    }
}

function closeVideoWorkspace(options = {}) {
    if (videoWorkspaceSaving && options.force !== true) return;
    resetWorkspaceVideoElement();
    releaseWorkspaceObjectUrl();
    videoWorkspaceState = createEmptyVideoWorkspaceState();
    videoWorkspaceRequestedProjectId = null;
    const input = document.getElementById('video-editor-input');
    if (input) input.value = '';
    showWorkspaceError('');
    setWorkspacePreviewError('');
    setWorkspaceLoading(false);
    setWorkspaceMetadataText();
    renderWorkspaceSettings();
    if (options.navigate !== false && typeof goToPage === 'function') goToPage('page-enhancer', -1);
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && currentPage === 'page-video-workspace') closeVideoWorkspace();
});
window.addEventListener('pagehide', () => {
    resetWorkspaceVideoElement();
    releaseWorkspaceObjectUrl();
});

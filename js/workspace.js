// ===============================================
// WORKSPACE.JS - Video Workspace + Video Processing v1.2 V-Forge
// Video dipreview dari Object URL lokal. Metadata dan catatan ekspor dapat
// disimpan ke Firestore, tetapi byte video sumber/hasil tidak dikirim.
// ===============================================

const VIDEO_WORKSPACE_DEFAULTS = Object.freeze({
    aspectRatio: 'original',
    outputResolution: '1080p',
    frameRate: '30',
    audioEnabled: true,
    audioQuality: 'standard',
    templateId: 'clean-cut',
    transitionId: 'cross-dissolve',
    effectId: 'natural',
    motionIntensity: 48
});

let videoWorkspaceRequestedProjectId = null;
let videoWorkspaceSaving = false;
let videoWorkspaceReturnPage = 'page-home';
let videoWorkspaceState = createEmptyVideoWorkspaceState();


function setVideoWorkspaceReturnPage(pageId) {
    const allowed = ['page-home', 'page-enhancer', 'page-search', 'page-profile'];
    videoWorkspaceReturnPage = allowed.includes(pageId) ? pageId : 'page-home';
}

function getVideoWorkspaceReturnNavIndex() {
    const map = { 'page-home': 0, 'page-search': 1, 'page-enhancer': 2, 'page-profile': 3 };
    return map[videoWorkspaceReturnPage] ?? 0;
}

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

function workspaceHasPremiumAccess() {
    return typeof hasPremiumAccess === 'function' ? hasPremiumAccess() : false;
}

function getWorkspacePremiumFeature(settings = videoWorkspaceState.settings) {
    return typeof getPremiumVideoFeature === 'function'
        ? getPremiumVideoFeature(settings, videoWorkspaceState.metadata)
        : '';
}

function renderWorkspacePremiumAccess() {
    const premium = workspaceHasPremiumAccess();
    const panel = document.getElementById('workspace-premium-access');
    const icon = document.getElementById('workspace-premium-icon');
    const title = document.getElementById('workspace-premium-title');
    const description = document.getElementById('workspace-premium-description');
    const action = document.getElementById('workspace-premium-action');
    if (panel) {
        panel.classList.toggle('active', premium);
        panel.classList.toggle('locked', !premium);
        panel.setAttribute('role', premium ? 'status' : 'button');
        panel.setAttribute('tabindex', premium ? '-1' : '0');
        panel.setAttribute('aria-label', premium
            ? 'Premium aktif. Fitur output Ultra terbuka.'
            : 'Buka halaman Premium untuk mengakses output Ultra.');
    }
    if (icon) icon.textContent = premium ? 'verified' : 'lock';
    if (title) title.textContent = premium ? 'Premium aktif' : 'Output Ultra dikunci';
    if (description) description.textContent = premium
        ? '4K, 120 FPS, dan Hi-Res Lossless dapat dipilih.'
        : '4K, 120 FPS, dan Hi-Res Lossless khusus akun Premium.';
    if (action) {
        action.hidden = premium;
        action.textContent = 'Lihat Premium';
    }

    const premiumOptions = [
        ['workspace-resolution-select', '2160p', '4K Ultra HD — Premium'],
        ['workspace-fps-select', '120', '120 FPS — Premium'],
        ['workspace-audio-quality-select', 'hires-lossless', 'Hi-Res Lossless — WAV 24-bit — Premium']
    ];
    premiumOptions.forEach(([selectId, value, lockedLabel]) => {
        const option = document.querySelector(`#${selectId} option[value="${value}"]`);
        if (!option) return;
        option.textContent = premium ? lockedLabel.replace(' — Premium', '') : lockedLabel;
        option.dataset.premiumLocked = String(!premium);
    });
}

function openWorkspacePremiumPage() {
    if (workspaceHasPremiumAccess()) return;
    if (typeof openSubscription === 'function') openSubscription('page-video-workspace');
}

function handleWorkspacePremiumKey(event) {
    if (event?.key === 'Enter' || event?.key === ' ') {
        event.preventDefault();
        openWorkspacePremiumPage();
    }
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
    const processorBusy = typeof isVideoProcessingActive === 'function' && isVideoProcessingActive();
    button.disabled = isLoading || processorBusy || !videoWorkspaceState.previewReady;
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
    if (typeof syncV83EditorAttraction === 'function') syncV83EditorAttraction();
}

function openVideoPicker(projectId = null) {
    if (typeof currentPage === 'string' && currentPage !== 'page-video-workspace') {
        setVideoWorkspaceReturnPage(currentPage);
    }
    if (!auth?.currentUser) {
        if (typeof goToPage === 'function') goToPage('page-login', -1);
        return;
    }

    if (projectId) {
        const project = typeof getProjectRecord === 'function' ? getProjectRecord(projectId) : null;
        const canOpen = typeof canOpenProjectInWorkspace === 'function'
            ? canOpenProjectInWorkspace(project)
            : project?.status === 'draft';
        if (!canOpen) {
            safeShowToast('Proyek tidak tersedia untuk dibuka di workspace.', 'info');
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
    if (typeof isVideoProcessingActive === 'function' && isVideoProcessingActive()) {
        safeShowToast('Batalkan pemrosesan sebelum mengganti video.', 'info');
        return;
    }
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
    if (typeof resetVideoProcessor === 'function') resetVideoProcessor({ silent: true });
    releaseWorkspaceObjectUrl();
    resetWorkspaceVideoElement();

    videoWorkspaceState = createEmptyVideoWorkspaceState();
    videoWorkspaceState.projectId = existing?.id || null;
    videoWorkspaceState.file = file;
    const selectedStudioPreset = !existing && typeof getStudioTemplatePreset === 'function'
        ? getStudioTemplatePreset()
        : null;
    videoWorkspaceState.settings = existing ? {
        aspectRatio: existing.aspectRatio,
        outputResolution: existing.outputResolution,
        frameRate: existing.outputFrameRate,
        audioEnabled: existing.audioEnabled,
        audioQuality: existing.audioQuality || 'standard',
        templateId: existing.templateId || 'clean-cut',
        transitionId: existing.transitionId || 'cross-dissolve',
        effectId: existing.effectId || 'natural',
        motionIntensity: Number.isFinite(existing.motionIntensity) ? existing.motionIntensity : 48
    } : { ...VIDEO_WORKSPACE_DEFAULTS, ...(selectedStudioPreset || {}) };

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
    const lockedFeature = getWorkspacePremiumFeature();
    if (lockedFeature && !workspaceHasPremiumAccess()) {
        showWorkspaceError(`${lockedFeature} pada draft ini terkunci. Aktifkan Premium atau pilih setelan standar.`);
    }

    const video = document.getElementById('workspace-video');
    if (!video || typeof URL.createObjectURL !== 'function') {
        handleWorkspacePreviewError('Browser ini belum dapat membuat preview lokal. Coba buka V-Forge di Chrome terbaru.');
        if (typeof goToPage === 'function') goToPage('page-video-workspace', -1);
        return;
    }

    try {
        videoWorkspaceState.objectUrl = URL.createObjectURL(file);
        video.src = videoWorkspaceState.objectUrl;
        if (typeof syncV83EditorAttraction === 'function') syncV83EditorAttraction();
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
    if (typeof syncV83EditorAttraction === 'function') syncV83EditorAttraction();
    const frame = document.getElementById('workspace-video-frame');
    if (frame) frame.style.setProperty('--workspace-source-ratio', `${width} / ${height}`);
    setWorkspaceLoading(false);
    setWorkspacePreviewError('');
    setWorkspaceMetadataText();
    renderWorkspaceSettings();
    setWorkspaceSaveLoading(false);
    if (typeof refreshVideoProcessorUI === 'function') refreshVideoProcessorUI();
}

function handleWorkspacePreviewError(customMessage = '') {
    videoWorkspaceState.previewReady = false;
    setWorkspaceLoading(false);
    setWorkspacePreviewError(customMessage || 'Video tidak dapat diputar di browser ini. Coba gunakan MP4 (H.264) agar preview kompatibel.');
    setWorkspaceSaveLoading(false);
    if (typeof refreshVideoProcessorUI === 'function') refreshVideoProcessorUI();
}

function selectWorkspaceSetting(key, value) {
    if (typeof isVideoProcessingActive === 'function' && isVideoProcessingActive()) return;
    const allowed = {
        aspectRatio: ['original', '9:16', '16:9', '1:1'],
        outputResolution: ['720p', '1080p', '2160p', 'source'],
        frameRate: ['30', '60', '120', 'source'],
        audioQuality: ['standard', 'hires-lossless']
    };
    const normalizedValue = String(value);
    if (!allowed[key]?.includes(normalizedValue)) return;
    let premiumFeature = typeof getPremiumVideoFeatureForChoice === 'function'
        ? getPremiumVideoFeatureForChoice(key, normalizedValue)
        : '';
    if (!premiumFeature && key === 'outputResolution' && normalizedValue === 'source' && typeof getPremiumVideoFeature === 'function') {
        premiumFeature = getPremiumVideoFeature(
            { ...videoWorkspaceState.settings, outputResolution: normalizedValue },
            videoWorkspaceState.metadata
        );
    }
    if (premiumFeature && !workspaceHasPremiumAccess()) {
        renderWorkspaceSettings();
        showWorkspaceError(`${premiumFeature} hanya tersedia untuk akun Premium.`);
        if (typeof showPremiumRequired === 'function') showPremiumRequired(premiumFeature);
        return;
    }
    const changed = videoWorkspaceState.settings[key] !== normalizedValue;
    videoWorkspaceState.settings[key] = normalizedValue;
    showWorkspaceError('');
    if (changed && typeof invalidateVideoProcessorResult === 'function') invalidateVideoProcessorResult();
    renderWorkspaceSettings();
}

function toggleWorkspaceAudio(button) {
    if (typeof isVideoProcessingActive === 'function' && isVideoProcessingActive()) return;
    const nextEnabled = !videoWorkspaceState.settings.audioEnabled;
    if (nextEnabled && videoWorkspaceState.settings.audioQuality === 'hires-lossless' && !workspaceHasPremiumAccess()) {
        videoWorkspaceState.settings.audioQuality = 'standard';
        showWorkspaceError('Hi-Res Lossless dikembalikan ke Standar karena akun ini belum Premium.');
    }
    videoWorkspaceState.settings.audioEnabled = nextEnabled;
    if (typeof invalidateVideoProcessorResult === 'function') invalidateVideoProcessorResult();
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
    const audioQualitySelect = document.getElementById('workspace-audio-quality-select');
    if (resolutionSelect) resolutionSelect.value = settings.outputResolution;
    if (fpsSelect) fpsSelect.value = settings.frameRate;
    if (audioQualitySelect) {
        audioQualitySelect.value = settings.audioQuality;
        audioQualitySelect.disabled = !settings.audioEnabled;
    }

    const audioButton = document.getElementById('workspace-audio-toggle');
    const audioLabel = document.getElementById('workspace-audio-label');
    const audioQualityField = document.getElementById('workspace-audio-quality-field');
    const audioQualityNote = document.getElementById('workspace-audio-quality-note');
    if (audioButton) {
        audioButton.classList.toggle('active', settings.audioEnabled);
        audioButton.setAttribute('aria-pressed', String(settings.audioEnabled));
        const icon = audioButton.querySelector('.material-icons-round');
        if (icon) icon.textContent = settings.audioEnabled ? 'volume_up' : 'volume_off';
    }
    if (audioLabel) {
        if (!settings.audioEnabled) audioLabel.textContent = 'Output akan tanpa audio';
        else if (settings.audioQuality === 'hires-lossless') audioLabel.textContent = 'Video + audio WAV lossless';
        else audioLabel.textContent = 'Audio akan disertakan';
    }
    if (audioQualityField) audioQualityField.classList.toggle('disabled', !settings.audioEnabled);
    if (audioQualityNote) {
        audioQualityNote.textContent = settings.audioQuality === 'hires-lossless'
            ? 'Menghasilkan audio WAV PCM 24-bit terpisah, hingga 96 kHz sesuai dukungan HP. Audio di dalam video tetap mengikuti encoder browser.'
            : 'Audio menyatu dengan video mengikuti encoder browser.';
    }

    const frame = document.getElementById('workspace-video-frame');
    if (frame) {
        frame.classList.remove('ratio-original', 'ratio-portrait', 'ratio-landscape', 'ratio-square');
        const ratioClass = { original: 'ratio-original', '9:16': 'ratio-portrait', '16:9': 'ratio-landscape', '1:1': 'ratio-square' };
        frame.classList.add(ratioClass[settings.aspectRatio] || 'ratio-original');
    }

    const headerMode = document.getElementById('workspace-header-mode');
    if (headerMode) headerMode.textContent = videoWorkspaceState.projectId ? 'Perbarui draft' : 'Proyek baru';
    renderWorkspacePremiumAccess();
    setWorkspaceSaveLoading(videoWorkspaceSaving);
    if (typeof refreshVideoProcessorUI === 'function') refreshVideoProcessorUI();
    if (typeof renderStudioWorkspaceControls === 'function') renderStudioWorkspaceControls();
}

function handleWorkspaceNameChanged() {
    if (typeof refreshVideoProcessorUI === 'function') refreshVideoProcessorUI();
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
    if (typeof isVideoProcessingActive === 'function' && isVideoProcessingActive()) return;

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
    const premiumFeature = getWorkspacePremiumFeature();
    if (premiumFeature && !workspaceHasPremiumAccess()) {
        showWorkspaceError(`${premiumFeature} hanya dapat disimpan oleh akun Premium.`);
        if (typeof showPremiumRequired === 'function') showPremiumRequired(premiumFeature);
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
    if (typeof isVideoProcessingActive === 'function' && isVideoProcessingActive() && options.force !== true) {
        safeShowToast('Batalkan pemrosesan sebelum keluar dari workspace.', 'info');
        return;
    }
    if (typeof resetVideoProcessor === 'function') resetVideoProcessor({ silent: true });
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
    if (typeof syncV83EditorAttraction === 'function') syncV83EditorAttraction();
    if (options.navigate !== false && typeof goToPage === 'function') {
        goToPage(videoWorkspaceReturnPage, getVideoWorkspaceReturnNavIndex());
    }
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && currentPage === 'page-video-workspace') closeVideoWorkspace();
});
window.addEventListener('pagehide', () => {
    if (typeof disposeVideoProcessor === 'function') disposeVideoProcessor();
    resetWorkspaceVideoElement();
    releaseWorkspaceObjectUrl();
});

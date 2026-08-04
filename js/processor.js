// ===============================================
// PROCESSOR.JS - Video Processing v1.2 V-Forge
// Pemrosesan nyata berjalan lokal di browser menggunakan Canvas +
// MediaRecorder. Tidak ada byte video yang dikirim ke server.
// ===============================================

const VIDEO_PROCESSOR_LIMITS = Object.freeze({
    maxDurationMs: 5 * 60 * 1000,
    maxUltraDurationMs: 60 * 1000,
    maxSourceBytes: 1024 * 1024 * 1024,
    maxLongEdge: 3840,
    maxPixels: 3840 * 2160
});

let videoProcessorAudioContext = null;
let videoProcessorAudioSource = null;
let videoProcessorMonitorGain = null;
let videoProcessorState = createEmptyVideoProcessorState();

function createEmptyVideoProcessorState() {
    return {
        status: 'idle',
        recorder: null,
        mediaStream: null,
        canvas: null,
        context: null,
        chunks: [],
        outputBlob: null,
        outputUrl: '',
        outputFileName: '',
        mimeType: '',
        width: 0,
        height: 0,
        frameRate: '30',
        audioEnabled: true,
        audioQuality: 'standard',
        videoBitsPerSecond: 0,
        frameCallbackId: null,
        frameCallbackMode: '',
        progressTimer: null,
        endedHandler: null,
        audioDestination: null,
        losslessAudioNode: null,
        losslessAudioSink: null,
        losslessAudioChunks: [],
        losslessAudioChannels: 0,
        losslessAudioSampleRate: 0,
        losslessAudioBitDepth: 24,
        losslessOutputBlob: null,
        losslessOutputUrl: '',
        losslessOutputFileName: '',
        previousVideoState: null,
        cancelled: false,
        failure: null,
        pausedByVisibility: false,
        historySynced: false,
        downloaded: false,
        wakeLock: null,
        startedAt: 0
    };
}

function isVideoProcessingActive() {
    return ['preparing', 'processing', 'paused', 'stopping'].includes(videoProcessorState.status);
}

function getVideoProcessorMimeCandidates(audioEnabled) {
    return audioEnabled ? [
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm'
    ] : [
        'video/mp4;codecs=avc1.42E01E',
        'video/mp4',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
    ];
}

function getSupportedVideoProcessorMime(audioEnabled = true) {
    if (typeof MediaRecorder === 'undefined') return '';
    const canCheck = typeof MediaRecorder.isTypeSupported === 'function';
    const candidates = getVideoProcessorMimeCandidates(audioEnabled);
    if (!canCheck) return '';
    return candidates.find((type) => {
        try { return MediaRecorder.isTypeSupported(type); } catch (error) { return false; }
    }) || '';
}

function getVideoProcessorCapability(audioEnabled = true, audioQuality = 'standard') {
    if (typeof MediaRecorder === 'undefined') {
        return { supported: false, reason: 'Browser ini belum mendukung perekaman hasil video.' };
    }
    if (typeof HTMLCanvasElement === 'undefined' || typeof HTMLCanvasElement.prototype.captureStream !== 'function') {
        return { supported: false, reason: 'Browser ini belum mendukung ekspor video dari canvas.' };
    }
    if (audioEnabled) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass || typeof AudioContextClass.prototype.createMediaElementSource !== 'function') {
            return { supported: false, reason: 'Ekspor audio belum didukung browser ini. Matikan audio untuk melanjutkan.' };
        }
        if (audioQuality === 'hires-lossless' && typeof AudioContextClass.prototype.createScriptProcessor !== 'function') {
            return { supported: false, reason: 'Pembuatan WAV lossless belum didukung browser ini. Pilih audio Standar untuk melanjutkan.' };
        }
    }

    const mimeType = getSupportedVideoProcessorMime(audioEnabled);
    const format = mimeType.includes('mp4') ? 'MP4' : (mimeType.includes('webm') ? 'WebM' : 'format browser');
    return { supported: true, mimeType, format };
}

function makeEvenDimension(value) {
    return Math.max(2, Math.round(Number(value) / 2) * 2);
}

function getVideoProcessorOutputDimensions(metadata = {}, settings = {}) {
    const sourceWidth = Math.max(2, Number(metadata.width) || 2);
    const sourceHeight = Math.max(2, Number(metadata.height) || 2);
    const ratioMap = { '9:16': 9 / 16, '16:9': 16 / 9, '1:1': 1 };
    const targetRatio = ratioMap[settings.aspectRatio] || (sourceWidth / sourceHeight);
    const quality = ['720p', '1080p', '2160p', 'source'].includes(settings.outputResolution)
        ? settings.outputResolution
        : '1080p';

    let width;
    let height;
    if (quality === 'source' && settings.aspectRatio === 'original') {
        width = sourceWidth;
        height = sourceHeight;
    } else {
        const shortEdge = quality === '720p'
            ? 720
            : (quality === '1080p' ? 1080 : (quality === '2160p' ? 2160 : Math.min(sourceWidth, sourceHeight)));
        if (targetRatio >= 1) {
            height = shortEdge;
            width = height * targetRatio;
        } else {
            width = shortEdge;
            height = width / targetRatio;
        }
    }

    const qualityLongEdge = quality === '720p'
        ? 1280
        : (quality === '1080p' ? 1920 : VIDEO_PROCESSOR_LIMITS.maxLongEdge);
    const longEdge = Math.max(width, height);
    if (longEdge > qualityLongEdge) {
        const scale = qualityLongEdge / longEdge;
        width *= scale;
        height *= scale;
    }

    const pixels = width * height;
    if (pixels > VIDEO_PROCESSOR_LIMITS.maxPixels) {
        const scale = Math.sqrt(VIDEO_PROCESSOR_LIMITS.maxPixels / pixels);
        width *= scale;
        height *= scale;
    }

    return { width: makeEvenDimension(width), height: makeEvenDimension(height) };
}

function getVideoProcessorCrop(sourceWidth, sourceHeight, targetWidth, targetHeight) {
    const sourceRatio = sourceWidth / sourceHeight;
    const targetRatio = targetWidth / targetHeight;
    if (sourceRatio > targetRatio) {
        const width = sourceHeight * targetRatio;
        return { x: (sourceWidth - width) / 2, y: 0, width, height: sourceHeight };
    }
    const height = sourceWidth / targetRatio;
    return { x: 0, y: (sourceHeight - height) / 2, width: sourceWidth, height };
}

function getVideoProcessorFrameRate(settings = {}) {
    return ['30', '60', '120', 'source'].includes(String(settings.frameRate)) ? String(settings.frameRate) : '30';
}

function getVideoProcessorBitrate(width, height, frameRate) {
    const numericFps = ['30', '60', '120'].includes(String(frameRate)) ? Number(frameRate) : 30;
    const relativePixels = (width * height) / (1920 * 1080);
    const relativeFps = numericFps / 30;
    return Math.round(Math.max(2_000_000, Math.min(50_000_000, 8_000_000 * relativePixels * relativeFps)));
}

function getVideoProcessorDurationLimit(settings = {}) {
    const ultra = settings.outputResolution === '2160p'
        || String(settings.frameRate) === '120'
        || (settings.audioEnabled !== false && settings.audioQuality === 'hires-lossless');
    return ultra ? VIDEO_PROCESSOR_LIMITS.maxUltraDurationMs : VIDEO_PROCESSOR_LIMITS.maxDurationMs;
}

function getVideoProcessorExtension(mimeType = '') {
    return String(mimeType).toLowerCase().includes('mp4') ? 'mp4' : 'webm';
}

function getVideoProcessorFormatLabel(mimeType = '') {
    return getVideoProcessorExtension(mimeType) === 'mp4' ? 'MP4' : 'WebM';
}

function getVideoProcessorOutputFileName(mimeType = videoProcessorState.mimeType) {
    const inputName = String(document.getElementById('workspace-project-name')?.value || '').trim();
    const sourceName = String(videoWorkspaceState.file?.name || 'video').replace(/\.[^.]+$/, '');
    const safeName = (inputName || sourceName || 'video')
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
        .replace(/\s+/g, ' ')
        .replace(/[. ]+$/g, '')
        .slice(0, 100) || 'video';
    return `${safeName}-V-Forge.${getVideoProcessorExtension(mimeType)}`;
}

function getVideoProcessorLosslessAudioFileName() {
    return getVideoProcessorOutputFileName('video/webm').replace(/\.webm$/i, '-Hi-Res-24bit.wav');
}

function formatVideoProcessorTime(seconds) {
    const safeSeconds = Math.max(0, Math.round(Number(seconds) || 0));
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;
    return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function setVideoProcessorError(message = '') {
    const element = document.getElementById('processor-error');
    if (element) element.textContent = message;
}

function translateVideoProcessorError(error) {
    const code = error?.message || '';
    const messages = {
        'processor/no-video': 'Pilih video dan tunggu preview selesai dibaca.',
        'processor/premium-required': 'Setelan 4K, 120 FPS, dan Hi-Res Lossless hanya dapat diproses oleh akun Premium.',
        'processor/too-long': 'Video Processing v1.2 mendukung durasi maksimal 5 menit agar memori HP tetap aman.',
        'processor/ultra-too-long': 'Mode 4K, 120 FPS, atau Hi-Res Lossless mendukung durasi maksimal 60 detik agar memori HP tetap aman.',
        'processor/file-too-large': 'File sumber terlalu besar untuk diproses aman di browser HP (maksimal 1 GB).',
        'processor/unsupported': 'Browser ini belum mendukung pemrosesan video lokal. Gunakan Chrome versi terbaru.',
        'processor/audio-unsupported': 'Audio tidak dapat diproses di browser ini. Matikan audio lalu coba lagi.',
        'processor/context-unavailable': 'Canvas video gagal disiapkan. Muat ulang aplikasi lalu coba lagi.',
        'processor/recorder-unavailable': 'Encoder video tidak tersedia untuk setelan ini. Coba 720p, 30 FPS, atau matikan audio.',
        'processor/play-blocked': 'Video tidak dapat diputar untuk diproses. Tekan Play sekali, lalu coba lagi.',
        'processor/empty-output': 'Encoder tidak menghasilkan file. Coba 720p, 30 FPS, atau gunakan video MP4 (H.264).'
    };
    if (messages[code]) return messages[code];
    return 'Pemrosesan terhenti. Coba gunakan video lebih pendek atau setelan 720p • 30 FPS.';
}

function invalidateVideoProcessorResult() {
    if (isVideoProcessingActive()) return;
    if (videoProcessorState.outputUrl) {
        try { URL.revokeObjectURL(videoProcessorState.outputUrl); } catch (error) {}
    }
    if (videoProcessorState.losslessOutputUrl) {
        try { URL.revokeObjectURL(videoProcessorState.losslessOutputUrl); } catch (error) {}
    }
    videoProcessorState.outputBlob = null;
    videoProcessorState.outputUrl = '';
    videoProcessorState.outputFileName = '';
    videoProcessorState.losslessOutputBlob = null;
    videoProcessorState.losslessOutputUrl = '';
    videoProcessorState.losslessOutputFileName = '';
    videoProcessorState.downloaded = false;
    videoProcessorState.historySynced = false;
    if (['completed', 'error'].includes(videoProcessorState.status)) videoProcessorState.status = 'idle';
    const resultVideo = document.getElementById('processor-result-video');
    if (resultVideo) {
        const hadSource = Boolean(resultVideo.getAttribute('src') || resultVideo.currentSrc);
        try { resultVideo.pause(); } catch (error) {}
        resultVideo.removeAttribute('src');
        if (hadSource) {
            try { resultVideo.load(); } catch (error) {}
        }
    }
    setVideoProcessorError('');
    refreshVideoProcessorUI();
}

function getVideoProcessorSummary() {
    if (!videoWorkspaceState.previewReady) return null;
    const dimensions = getVideoProcessorOutputDimensions(videoWorkspaceState.metadata, videoWorkspaceState.settings);
    const frameRate = getVideoProcessorFrameRate(videoWorkspaceState.settings);
    const capability = getVideoProcessorCapability(videoWorkspaceState.settings.audioEnabled, videoWorkspaceState.settings.audioQuality);
    return { ...dimensions, frameRate, capability };
}

function refreshVideoProcessorUI() {
    const startButton = document.getElementById('processor-start-button');
    if (!startButton) return;

    const summary = getVideoProcessorSummary();
    const settings = videoWorkspaceState.settings;
    const capability = summary?.capability || getVideoProcessorCapability(settings.audioEnabled, settings.audioQuality);
    const active = isVideoProcessingActive();
    const premiumFeature = typeof getPremiumVideoFeature === 'function'
        ? getPremiumVideoFeature(settings, videoWorkspaceState.metadata)
        : '';
    const premiumLocked = Boolean(premiumFeature)
        && !(typeof hasPremiumAccess === 'function' && hasPremiumAccess());
    const durationLimit = getVideoProcessorDurationLimit(settings);
    const ultraMode = durationLimit === VIDEO_PROCESSOR_LIMITS.maxUltraDurationMs;
    const durationTooLong = videoWorkspaceState.metadata.durationMs > durationLimit;
    const fileTooLarge = Number(videoWorkspaceState.file?.size || 0) > VIDEO_PROCESSOR_LIMITS.maxSourceBytes;

    const format = document.getElementById('processor-output-format');
    const resolution = document.getElementById('processor-output-resolution');
    const fps = document.getElementById('processor-output-fps');
    const audio = document.getElementById('processor-output-audio');
    const capabilityText = document.getElementById('processor-capability-text');
    if (format) format.textContent = capability.supported ? capability.format : 'Tidak tersedia';
    if (resolution) resolution.textContent = summary ? `${summary.width} × ${summary.height}` : '—';
    if (fps) fps.textContent = summary ? (summary.frameRate === 'source' ? 'FPS sumber' : `${summary.frameRate} FPS`) : '—';
    if (audio) {
        audio.textContent = !settings.audioEnabled
            ? 'Mute'
            : (settings.audioQuality === 'hires-lossless' ? 'WAV 24-bit' : 'Standar');
    }
    if (capabilityText) {
        if (premiumLocked) capabilityText.textContent = `${premiumFeature} terkunci. Aktifkan Premium atau pilih setelan standar.`;
        else if (!capability.supported) capabilityText.textContent = capability.reason;
        else if (durationTooLong) capabilityText.textContent = ultraMode
            ? 'Mode ultra dibatasi 60 detik untuk menjaga memori dan suhu HP.'
            : 'Durasi melebihi batas aman 5 menit untuk versi ini.';
        else if (fileTooLarge) capabilityText.textContent = 'Ukuran file melebihi batas aman 1 GB untuk versi ini.';
        else if (ultraMode) capabilityText.textContent = `${capability.format} dipilih otomatis. 4K/120 FPS adalah target; hasil nyata mengikuti encoder dan kemampuan HP.`;
        else capabilityText.textContent = `${capability.format} dipilih otomatis. Proses berjalan real-time dan file tidak diunggah.`;
    }

    startButton.disabled = active || premiumLocked || !videoWorkspaceState.previewReady || !capability.supported || durationTooLong || fileTooLarge;
    startButton.setAttribute('aria-busy', String(videoProcessorState.status === 'preparing'));
    const startLabel = startButton.querySelector('.processor-button-label');
    if (startLabel) startLabel.textContent = videoProcessorState.status === 'preparing'
        ? 'Menyiapkan...'
        : (premiumLocked ? 'Khusus Premium' : 'Proses & ekspor video');

    const workspaceControls = document.querySelectorAll('[data-workspace-setting], #workspace-resolution-select, #workspace-fps-select, #workspace-audio-quality-select, #workspace-audio-toggle, #workspace-project-name, #workspace-save-button, .workspace-source-meta button, .workspace-header .workspace-icon-button');
    workspaceControls.forEach((control) => {
        const needsPreview = control.id === 'workspace-save-button' && !videoWorkspaceState.previewReady;
        const audioQualityDisabled = control.id === 'workspace-audio-quality-select' && !settings.audioEnabled;
        control.disabled = active || needsPreview || audioQualityDisabled;
    });

    const progressPanel = document.getElementById('processor-progress-panel');
    const resultPanel = document.getElementById('processor-result-panel');
    if (progressPanel) progressPanel.hidden = !active;
    if (resultPanel) resultPanel.hidden = videoProcessorState.status !== 'completed' || !videoProcessorState.outputBlob;

    const page = document.getElementById('page-video-workspace');
    if (page) page.classList.toggle('processor-active', active);

    const pauseButton = document.getElementById('processor-pause-button');
    if (pauseButton) {
        const paused = videoProcessorState.status === 'paused';
        pauseButton.disabled = !['processing', 'paused'].includes(videoProcessorState.status);
        pauseButton.innerHTML = `<span class="material-icons-round">${paused ? 'play_arrow' : 'pause'}</span>${paused ? 'Lanjutkan' : 'Jeda'}`;
    }

    updateVideoProcessorProgressUI();
    updateVideoProcessorResultUI();
}

function updateVideoProcessorProgressUI() {
    const video = document.getElementById('workspace-video');
    const duration = Math.max(0, Number(video?.duration) || (videoWorkspaceState.metadata.durationMs / 1000));
    const current = Math.max(0, Math.min(duration || 0, Number(video?.currentTime) || 0));
    const percent = duration > 0 ? Math.max(0, Math.min(100, (current / duration) * 100)) : 0;
    const rounded = videoProcessorState.status === 'stopping' && !videoProcessorState.cancelled ? 100 : Math.round(percent);

    const bar = document.getElementById('processor-progress-bar');
    const percentLabel = document.getElementById('processor-progress-percent');
    const timeLabel = document.getElementById('processor-progress-time');
    const statusLabel = document.getElementById('processor-progress-status');
    if (bar) {
        bar.style.width = `${rounded}%`;
        bar.parentElement?.setAttribute('aria-valuenow', String(rounded));
    }
    if (percentLabel) percentLabel.textContent = `${rounded}%`;
    if (timeLabel) timeLabel.textContent = `${formatVideoProcessorTime(current)} / ${formatVideoProcessorTime(duration)}`;
    if (statusLabel) {
        const labels = {
            preparing: 'Menyiapkan encoder di HP…',
            processing: 'Memproses video secara real-time…',
            paused: videoProcessorState.pausedByVisibility ? 'Dijeda saat aplikasi tidak terlihat' : 'Pemrosesan dijeda',
            stopping: 'Menyusun file hasil…'
        };
        statusLabel.textContent = labels[videoProcessorState.status] || '';
    }
}

function updateVideoProcessorResultUI() {
    if (!videoProcessorState.outputBlob) return;
    const fileName = document.getElementById('processor-result-file-name');
    const details = document.getElementById('processor-result-details');
    const sync = document.getElementById('processor-result-sync');
    const shareButton = document.getElementById('processor-share-button');
    const audioButton = document.getElementById('processor-audio-download-button');
    const audioDetails = document.getElementById('processor-result-audio');
    const resultActions = shareButton?.parentElement;
    const resultVideo = document.getElementById('processor-result-video');
    if (fileName) fileName.textContent = videoProcessorState.outputFileName;
    if (details) {
        const fps = videoProcessorState.frameRate === 'source' ? 'FPS sumber' : `${videoProcessorState.frameRate} FPS`;
        details.textContent = `${getVideoProcessorFormatLabel(videoProcessorState.mimeType)} • ${videoProcessorState.width} × ${videoProcessorState.height} • ${fps} • ${formatProjectFileSize(videoProcessorState.outputBlob.size)}`;
    }
    if (audioDetails) {
        const hasLossless = Boolean(videoProcessorState.losslessOutputBlob);
        audioDetails.hidden = !hasLossless;
        if (hasLossless) {
            const rateKhz = Math.round(videoProcessorState.losslessAudioSampleRate / 100) / 10;
            audioDetails.textContent = `Audio lossless siap: WAV PCM ${videoProcessorState.losslessAudioBitDepth}-bit • ${rateKhz} kHz • ${formatProjectFileSize(videoProcessorState.losslessOutputBlob.size)}. Simpan terpisah dari video.`;
        }
    }
    if (sync) {
        if (videoProcessorState.historySynced) sync.textContent = 'Ekspor tercatat di Library. File video tetap hanya di perangkatmu.';
        else if (videoWorkspaceState.projectId) sync.textContent = 'Hasil siap. Catatan Library belum tersinkron; file video tetap aman di perangkatmu.';
        else sync.textContent = 'Hasil siap. Simpan draft jika ingin proyek tercatat di Library.';
    }
    if (resultVideo && resultVideo.getAttribute('src') !== videoProcessorState.outputUrl) {
        resultVideo.src = videoProcessorState.outputUrl;
    }
    if (shareButton) {
        const canShare = canShareProcessedVideo();
        shareButton.hidden = !canShare;
        resultActions?.classList.toggle('has-share', canShare);
    }
    if (audioButton) {
        const hasLossless = Boolean(videoProcessorState.losslessOutputBlob);
        audioButton.hidden = !hasLossless;
        resultActions?.classList.toggle('has-audio', hasLossless);
    }
}

function drawVideoProcessorFrame() {
    const video = document.getElementById('workspace-video');
    const context = videoProcessorState.context;
    const canvas = videoProcessorState.canvas;
    if (!video || !context || !canvas || video.readyState < 2) return;
    const crop = getVideoProcessorCrop(video.videoWidth, video.videoHeight, canvas.width, canvas.height);
    context.fillStyle = '#000000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(video, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
}

function stopVideoProcessorFrameLoop() {
    const video = document.getElementById('workspace-video');
    if (videoProcessorState.frameCallbackId === null) return;
    try {
        if (videoProcessorState.frameCallbackMode === 'video' && typeof video?.cancelVideoFrameCallback === 'function') {
            video.cancelVideoFrameCallback(videoProcessorState.frameCallbackId);
        } else {
            cancelAnimationFrame(videoProcessorState.frameCallbackId);
        }
    } catch (error) {}
    videoProcessorState.frameCallbackId = null;
    videoProcessorState.frameCallbackMode = '';
}

function startVideoProcessorFrameLoop() {
    stopVideoProcessorFrameLoop();
    const video = document.getElementById('workspace-video');
    if (!video || videoProcessorState.status !== 'processing') return;

    if (videoProcessorState.frameRate === 'source' && typeof video.requestVideoFrameCallback === 'function') {
        videoProcessorState.frameCallbackMode = 'video';
        const render = () => {
            if (videoProcessorState.status !== 'processing') return;
            drawVideoProcessorFrame();
            videoProcessorState.frameCallbackId = video.requestVideoFrameCallback(render);
        };
        videoProcessorState.frameCallbackId = video.requestVideoFrameCallback(render);
        return;
    }

    videoProcessorState.frameCallbackMode = 'animation';
    let lastDraw = 0;
    const targetFps = ['30', '60', '120'].includes(videoProcessorState.frameRate)
        ? Number(videoProcessorState.frameRate)
        : 30;
    const interval = 1000 / targetFps;
    const render = (timestamp) => {
        if (videoProcessorState.status !== 'processing') return;
        if (timestamp - lastDraw >= interval - 1) {
            drawVideoProcessorFrame();
            lastDraw = timestamp;
        }
        videoProcessorState.frameCallbackId = requestAnimationFrame(render);
    };
    videoProcessorState.frameCallbackId = requestAnimationFrame(render);
}

function prepareVideoProcessorLosslessCapture() {
    if (videoProcessorState.audioQuality !== 'hires-lossless' || !videoProcessorAudioContext || !videoProcessorAudioSource) return;
    const node = videoProcessorAudioContext.createScriptProcessor(4096, 2, 2);
    const sink = videoProcessorAudioContext.createGain();
    sink.gain.value = 0;
    videoProcessorState.losslessAudioChunks = [];
    videoProcessorState.losslessAudioChannels = 0;
    videoProcessorState.losslessAudioSampleRate = Math.round(Number(videoProcessorAudioContext.sampleRate) || 48000);
    node.onaudioprocess = (event) => {
        const outputChannels = event.outputBuffer?.numberOfChannels || 0;
        for (let channel = 0; channel < outputChannels; channel += 1) {
            event.outputBuffer.getChannelData(channel).fill(0);
        }
        if (videoProcessorState.status !== 'processing') return;
        const input = event.inputBuffer;
        const sourceChannels = Math.max(1, Math.min(2, input?.numberOfChannels || 1));
        if (!videoProcessorState.losslessAudioChannels) videoProcessorState.losslessAudioChannels = sourceChannels;
        const channelCount = videoProcessorState.losslessAudioChannels;
        const block = [];
        for (let channel = 0; channel < channelCount; channel += 1) {
            const sourceChannel = Math.min(channel, Math.max(0, sourceChannels - 1));
            block.push(new Float32Array(input.getChannelData(sourceChannel)));
        }
        videoProcessorState.losslessAudioChunks.push(block);
    };
    videoProcessorAudioSource.connect(node);
    node.connect(sink);
    sink.connect(videoProcessorAudioContext.destination);
    videoProcessorState.losslessAudioNode = node;
    videoProcessorState.losslessAudioSink = sink;
}

async function createVideoProcessorLosslessWavBlob() {
    const blocks = videoProcessorState.losslessAudioChunks;
    const channels = Math.max(1, Math.min(2, videoProcessorState.losslessAudioChannels || 1));
    const sampleRate = Math.max(8000, videoProcessorState.losslessAudioSampleRate || 48000);
    const bitDepth = 24;
    if (!Array.isArray(blocks) || !blocks.length) return null;

    const totalFrames = blocks.reduce((total, block) => total + (block?.[0]?.length || 0), 0);
    if (!totalFrames) return null;
    const bytesPerSample = bitDepth / 8;
    const dataSize = totalFrames * channels * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    const writeText = (offset, value) => {
        for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
    };

    writeText(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeText(8, 'WAVE');
    writeText(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * bytesPerSample, true);
    view.setUint16(32, channels * bytesPerSample, true);
    view.setUint16(34, bitDepth, true);
    writeText(36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    let encodedFrames = 0;
    for (const block of blocks) {
        const frameCount = block?.[0]?.length || 0;
        for (let frame = 0; frame < frameCount; frame += 1) {
            for (let channel = 0; channel < channels; channel += 1) {
                const samples = block[channel] || block[0];
                const sample = Math.max(-1, Math.min(1, Number(samples?.[frame]) || 0));
                let value = Math.round(sample < 0 ? sample * 0x800000 : sample * 0x7FFFFF);
                if (value < 0) value += 0x1000000;
                view.setUint8(offset, value & 0xFF);
                view.setUint8(offset + 1, (value >> 8) & 0xFF);
                view.setUint8(offset + 2, (value >> 16) & 0xFF);
                offset += 3;
            }
        }
        encodedFrames += frameCount;
        if (encodedFrames % 65536 < frameCount) await new Promise((resolve) => setTimeout(resolve, 0));
    }

    videoProcessorState.losslessAudioBitDepth = bitDepth;
    return new Blob([buffer], { type: 'audio/wav' });
}

async function prepareVideoProcessorAudio(video, stream) {
    if (!videoProcessorState.audioEnabled) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('processor/audio-unsupported');

    if (!videoProcessorAudioContext) {
        try {
            videoProcessorAudioContext = new AudioContextClass({ sampleRate: 96000, latencyHint: 'playback' });
        } catch (error) {
            videoProcessorAudioContext = new AudioContextClass();
        }
    }
    if (videoProcessorAudioContext.state === 'closed') throw new Error('processor/audio-unsupported');
    if (!videoProcessorAudioSource) {
        videoProcessorAudioSource = videoProcessorAudioContext.createMediaElementSource(video);
        videoProcessorMonitorGain = videoProcessorAudioContext.createGain();
        videoProcessorAudioSource.connect(videoProcessorMonitorGain);
        videoProcessorMonitorGain.connect(videoProcessorAudioContext.destination);
    }

    if (videoProcessorAudioContext.state === 'suspended') await videoProcessorAudioContext.resume();
    if (videoProcessorMonitorGain?.gain) videoProcessorMonitorGain.gain.value = 0;
    const destination = videoProcessorAudioContext.createMediaStreamDestination();
    videoProcessorAudioSource.connect(destination);
    const tracks = destination.stream?.getAudioTracks?.() || [];
    if (!tracks.length) throw new Error('processor/audio-unsupported');
    tracks.forEach((track) => stream.addTrack(track));
    videoProcessorState.audioDestination = destination;
    prepareVideoProcessorLosslessCapture();
}

function createVideoProcessorRecorder(stream, capability) {
    const baseOptions = { videoBitsPerSecond: videoProcessorState.videoBitsPerSecond };
    if (videoProcessorState.audioEnabled) {
        baseOptions.audioBitsPerSecond = videoProcessorState.audioQuality === 'hires-lossless' ? 320000 : 128000;
        baseOptions.audioBitrateMode = videoProcessorState.audioQuality === 'hires-lossless' ? 'constant' : 'variable';
    }
    const compatibleOptions = { ...baseOptions };
    delete compatibleOptions.audioBitrateMode;
    const candidates = capability.mimeType
        ? [capability.mimeType, ...getVideoProcessorMimeCandidates(videoProcessorState.audioEnabled).filter((item) => item !== capability.mimeType)]
        : getVideoProcessorMimeCandidates(videoProcessorState.audioEnabled);

    for (const mimeType of candidates) {
        if (typeof MediaRecorder.isTypeSupported === 'function' && !MediaRecorder.isTypeSupported(mimeType)) continue;
        try {
            return new MediaRecorder(stream, { ...baseOptions, mimeType });
        } catch (error) {}
        try {
            return new MediaRecorder(stream, { ...compatibleOptions, mimeType });
        } catch (error) {}
    }
    try { return new MediaRecorder(stream, baseOptions); } catch (error) {}
    try { return new MediaRecorder(stream, compatibleOptions); } catch (error) {}
    throw new Error('processor/recorder-unavailable');
}

function rememberVideoProcessorPlayback(video) {
    return {
        currentTime: Number(video.currentTime) || 0,
        controls: video.controls,
        muted: video.muted,
        volume: video.volume,
        playbackRate: video.playbackRate,
        loop: video.loop
    };
}

function restoreVideoProcessorPlayback() {
    const video = document.getElementById('workspace-video');
    const previous = videoProcessorState.previousVideoState;
    if (!video || !previous) return;
    try { video.pause(); } catch (error) {}
    video.controls = previous.controls;
    video.muted = previous.muted;
    video.volume = previous.volume;
    video.playbackRate = previous.playbackRate;
    video.loop = previous.loop;
    try {
        const safeDuration = Number.isFinite(video.duration) ? video.duration : previous.currentTime;
        video.currentTime = Math.min(previous.currentTime, Math.max(0, safeDuration - 0.05));
    } catch (error) {}
}

async function requestVideoProcessorWakeLock() {
    if (!navigator.wakeLock?.request) return;
    try { videoProcessorState.wakeLock = await navigator.wakeLock.request('screen'); } catch (error) {}
}

async function releaseVideoProcessorWakeLock() {
    const lock = videoProcessorState.wakeLock;
    videoProcessorState.wakeLock = null;
    if (!lock) return;
    try { await lock.release(); } catch (error) {}
}

function cleanupVideoProcessorActiveResources() {
    stopVideoProcessorFrameLoop();
    if (videoProcessorState.progressTimer) clearInterval(videoProcessorState.progressTimer);
    videoProcessorState.progressTimer = null;

    const video = document.getElementById('workspace-video');
    if (video && videoProcessorState.endedHandler) video.removeEventListener('ended', videoProcessorState.endedHandler);
    videoProcessorState.endedHandler = null;

    if (videoProcessorAudioSource && videoProcessorState.losslessAudioNode) {
        try { videoProcessorAudioSource.disconnect(videoProcessorState.losslessAudioNode); } catch (error) {}
    }
    if (videoProcessorState.losslessAudioNode) {
        videoProcessorState.losslessAudioNode.onaudioprocess = null;
        try { videoProcessorState.losslessAudioNode.disconnect(); } catch (error) {}
    }
    if (videoProcessorState.losslessAudioSink) {
        try { videoProcessorState.losslessAudioSink.disconnect(); } catch (error) {}
    }
    videoProcessorState.losslessAudioNode = null;
    videoProcessorState.losslessAudioSink = null;

    if (videoProcessorAudioSource && videoProcessorState.audioDestination) {
        try { videoProcessorAudioSource.disconnect(videoProcessorState.audioDestination); } catch (error) {
            try {
                videoProcessorAudioSource.disconnect();
                if (videoProcessorMonitorGain) videoProcessorAudioSource.connect(videoProcessorMonitorGain);
            } catch (disconnectError) {}
        }
    }
    videoProcessorState.audioDestination = null;
    if (videoProcessorMonitorGain?.gain) videoProcessorMonitorGain.gain.value = 1;

    try { videoProcessorState.mediaStream?.getTracks?.().forEach((track) => track.stop()); } catch (error) {}
    videoProcessorState.mediaStream = null;
    videoProcessorState.recorder = null;
    videoProcessorState.canvas = null;
    videoProcessorState.context = null;
    restoreVideoProcessorPlayback();
    releaseVideoProcessorWakeLock();
}

function finishVideoProcessorRecording() {
    if (!['processing', 'paused'].includes(videoProcessorState.status)) return;
    videoProcessorState.status = 'stopping';
    const video = document.getElementById('workspace-video');
    try { video?.pause(); } catch (error) {}
    stopVideoProcessorFrameLoop();
    updateVideoProcessorProgressUI();
    try { videoProcessorState.recorder?.requestData(); } catch (error) {}
    try {
        if (videoProcessorState.recorder?.state !== 'inactive') videoProcessorState.recorder.stop();
        else handleVideoProcessorRecorderStopped();
    } catch (error) {
        videoProcessorState.failure = error;
        handleVideoProcessorRecorderStopped();
    }
    refreshVideoProcessorUI();
}

async function handleVideoProcessorRecorderStopped() {
    const cancelled = videoProcessorState.cancelled;
    const failure = videoProcessorState.failure;
    const chunks = [...videoProcessorState.chunks];
    const recorderMime = videoProcessorState.recorder?.mimeType || videoProcessorState.mimeType;
    cleanupVideoProcessorActiveResources();

    if (cancelled) {
        videoProcessorState.status = 'idle';
        videoProcessorState.chunks = [];
        videoProcessorState.losslessAudioChunks = [];
        setVideoProcessorError('');
        refreshVideoProcessorUI();
        return;
    }
    if (failure) {
        videoProcessorState.status = 'error';
        videoProcessorState.chunks = [];
        videoProcessorState.losslessAudioChunks = [];
        setVideoProcessorError(translateVideoProcessorError(failure));
        refreshVideoProcessorUI();
        return;
    }

    const mimeType = recorderMime || 'video/webm';
    const blob = new Blob(chunks, { type: mimeType });
    if (!blob.size) {
        videoProcessorState.status = 'error';
        setVideoProcessorError(translateVideoProcessorError(new Error('processor/empty-output')));
        refreshVideoProcessorUI();
        return;
    }

    let losslessBlob = null;
    let losslessWarning = '';
    if (videoProcessorState.audioEnabled && videoProcessorState.audioQuality === 'hires-lossless') {
        try {
            losslessBlob = await createVideoProcessorLosslessWavBlob();
            if (!losslessBlob?.size) losslessWarning = 'Video selesai, tetapi browser tidak menghasilkan sampel untuk audio WAV. Audio di dalam video tetap tersedia.';
        } catch (error) {
            console.warn('Audio WAV lossless gagal dibuat:', error);
            losslessWarning = 'Video selesai, tetapi audio WAV lossless tidak dapat dibuat karena memori browser terbatas.';
        }
    }

    if (videoProcessorState.outputUrl) {
        try { URL.revokeObjectURL(videoProcessorState.outputUrl); } catch (error) {}
    }
    videoProcessorState.outputBlob = blob;
    videoProcessorState.outputUrl = URL.createObjectURL(blob);
    videoProcessorState.mimeType = mimeType;
    videoProcessorState.outputFileName = getVideoProcessorOutputFileName(mimeType);
    videoProcessorState.losslessOutputBlob = losslessBlob;
    videoProcessorState.losslessOutputUrl = losslessBlob ? URL.createObjectURL(losslessBlob) : '';
    videoProcessorState.losslessOutputFileName = losslessBlob ? getVideoProcessorLosslessAudioFileName() : '';
    videoProcessorState.status = 'completed';
    videoProcessorState.chunks = [];
    videoProcessorState.losslessAudioChunks = [];
    videoProcessorState.historySynced = false;
    setVideoProcessorError(losslessWarning);

    if (videoWorkspaceState.projectId && typeof markWorkspaceProjectExported === 'function') {
        try {
            videoProcessorState.historySynced = await markWorkspaceProjectExported(videoWorkspaceState.projectId, {
                fileName: videoProcessorState.outputFileName,
                fileSize: blob.size,
                mimeType,
                width: videoProcessorState.width,
                height: videoProcessorState.height,
                frameRate: videoProcessorState.frameRate,
                audioEnabled: videoProcessorState.audioEnabled,
                audioQuality: videoProcessorState.audioQuality,
                losslessAudioFileName: videoProcessorState.losslessOutputFileName,
                losslessAudioFileSize: losslessBlob?.size || 0,
                losslessAudioSampleRate: losslessBlob ? videoProcessorState.losslessAudioSampleRate : 0,
                losslessAudioBitDepth: losslessBlob ? videoProcessorState.losslessAudioBitDepth : 0
            });
        } catch (error) {
            console.warn('Catatan ekspor belum tersinkron:', error);
        }
    }

    refreshVideoProcessorUI();
    safeShowToast('Video selesai diproses. Simpan hasilnya ke HP.', 'check');
    try { navigator.vibrate?.([70, 40, 70]); } catch (error) {}
}

async function startVideoProcessing() {
    if (isVideoProcessingActive()) return;
    setVideoProcessorError('');

    const video = document.getElementById('workspace-video');
    const file = videoWorkspaceState.file;
    if (!video || !file || !videoWorkspaceState.previewReady) {
        setVideoProcessorError(translateVideoProcessorError(new Error('processor/no-video')));
        return;
    }
    const premiumFeature = typeof getPremiumVideoFeature === 'function'
        ? getPremiumVideoFeature(videoWorkspaceState.settings, videoWorkspaceState.metadata)
        : '';
    const premiumAccess = typeof hasPremiumAccess === 'function' && hasPremiumAccess();
    if (premiumFeature && !premiumAccess) {
        setVideoProcessorError(`${premiumFeature} hanya dapat diproses oleh akun Premium.`);
        if (typeof showPremiumRequired === 'function') showPremiumRequired(premiumFeature);
        return;
    }
    const durationLimit = getVideoProcessorDurationLimit(videoWorkspaceState.settings);
    if (videoWorkspaceState.metadata.durationMs > durationLimit) {
        const code = durationLimit === VIDEO_PROCESSOR_LIMITS.maxUltraDurationMs ? 'processor/ultra-too-long' : 'processor/too-long';
        setVideoProcessorError(translateVideoProcessorError(new Error(code)));
        return;
    }
    if (Number(file.size) > VIDEO_PROCESSOR_LIMITS.maxSourceBytes) {
        setVideoProcessorError(translateVideoProcessorError(new Error('processor/file-too-large')));
        return;
    }

    const capability = getVideoProcessorCapability(videoWorkspaceState.settings.audioEnabled, videoWorkspaceState.settings.audioQuality);
    if (!capability.supported) {
        setVideoProcessorError(capability.reason || translateVideoProcessorError(new Error('processor/unsupported')));
        return;
    }

    invalidateVideoProcessorResult();
    const dimensions = getVideoProcessorOutputDimensions(videoWorkspaceState.metadata, videoWorkspaceState.settings);
    const frameRate = getVideoProcessorFrameRate(videoWorkspaceState.settings);
    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!context) {
        setVideoProcessorError(translateVideoProcessorError(new Error('processor/context-unavailable')));
        return;
    }

    videoProcessorState.status = 'preparing';
    videoProcessorState.cancelled = false;
    videoProcessorState.failure = null;
    videoProcessorState.chunks = [];
    videoProcessorState.losslessAudioChunks = [];
    videoProcessorState.losslessAudioChannels = 0;
    videoProcessorState.losslessAudioSampleRate = 0;
    videoProcessorState.canvas = canvas;
    videoProcessorState.context = context;
    videoProcessorState.width = dimensions.width;
    videoProcessorState.height = dimensions.height;
    videoProcessorState.frameRate = frameRate;
    videoProcessorState.audioEnabled = videoWorkspaceState.settings.audioEnabled;
    videoProcessorState.audioQuality = videoWorkspaceState.settings.audioQuality || 'standard';
    videoProcessorState.mimeType = capability.mimeType || 'video/webm';
    videoProcessorState.videoBitsPerSecond = getVideoProcessorBitrate(dimensions.width, dimensions.height, frameRate);
    videoProcessorState.previousVideoState = rememberVideoProcessorPlayback(video);
    videoProcessorState.startedAt = Date.now();
    refreshVideoProcessorUI();

    try {
        video.pause();
        video.controls = false;
        video.loop = false;
        video.playbackRate = 1;
        video.muted = !videoProcessorState.audioEnabled;
        video.currentTime = 0;
        drawVideoProcessorFrame();

        const stream = frameRate === 'source' ? canvas.captureStream() : canvas.captureStream(Number(frameRate));
        videoProcessorState.mediaStream = stream;
        await prepareVideoProcessorAudio(video, stream);
        if (videoProcessorState.cancelled || videoProcessorState.status !== 'preparing') throw new Error('processor/cancelled');

        const recorder = createVideoProcessorRecorder(stream, capability);
        videoProcessorState.recorder = recorder;
        videoProcessorState.mimeType = recorder.mimeType || capability.mimeType || 'video/webm';
        recorder.ondataavailable = (event) => {
            if (event.data?.size) videoProcessorState.chunks.push(event.data);
        };
        recorder.onerror = (event) => {
            videoProcessorState.failure = event.error || new Error('processor/recorder-unavailable');
            finishVideoProcessorRecording();
        };
        recorder.onstop = () => { handleVideoProcessorRecorderStopped(); };

        videoProcessorState.endedHandler = () => {
            drawVideoProcessorFrame();
            finishVideoProcessorRecording();
        };
        video.addEventListener('ended', videoProcessorState.endedHandler, { once: true });

        recorder.start(1000);
        videoProcessorState.status = 'processing';
        videoProcessorState.progressTimer = setInterval(updateVideoProcessorProgressUI, 250);
        startVideoProcessorFrameLoop();
        requestVideoProcessorWakeLock();
        refreshVideoProcessorUI();
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            await playPromise.catch(() => { throw new Error('processor/play-blocked'); });
        }
    } catch (error) {
        if (error?.message === 'processor/cancelled') return;
        videoProcessorState.failure = error;
        if (videoProcessorState.recorder?.state && videoProcessorState.recorder.state !== 'inactive') {
            finishVideoProcessorRecording();
        } else {
            cleanupVideoProcessorActiveResources();
            videoProcessorState.status = 'error';
            setVideoProcessorError(translateVideoProcessorError(error));
            refreshVideoProcessorUI();
        }
    }
}

async function toggleVideoProcessingPause() {
    const video = document.getElementById('workspace-video');
    const recorder = videoProcessorState.recorder;
    if (!video || !recorder) return;

    if (videoProcessorState.status === 'processing') {
        try { video.pause(); } catch (error) {}
        try { if (recorder.state === 'recording') recorder.pause(); } catch (error) {}
        videoProcessorState.status = 'paused';
        videoProcessorState.pausedByVisibility = false;
        stopVideoProcessorFrameLoop();
        releaseVideoProcessorWakeLock();
        refreshVideoProcessorUI();
        return;
    }

    if (videoProcessorState.status === 'paused') {
        try {
            if (videoProcessorAudioContext?.state === 'suspended') await videoProcessorAudioContext.resume();
            if (recorder.state === 'paused') recorder.resume();
            videoProcessorState.status = 'processing';
            videoProcessorState.pausedByVisibility = false;
            startVideoProcessorFrameLoop();
            requestVideoProcessorWakeLock();
            refreshVideoProcessorUI();
            await video.play();
        } catch (error) {
            videoProcessorState.status = 'paused';
            setVideoProcessorError('Pemrosesan belum dapat dilanjutkan. Tekan tombol Lanjutkan sekali lagi.');
            refreshVideoProcessorUI();
        }
    }
}

function pauseVideoProcessingForVisibility() {
    if (videoProcessorState.status !== 'processing') return;
    const video = document.getElementById('workspace-video');
    try { video?.pause(); } catch (error) {}
    try { if (videoProcessorState.recorder?.state === 'recording') videoProcessorState.recorder.pause(); } catch (error) {}
    videoProcessorState.status = 'paused';
    videoProcessorState.pausedByVisibility = true;
    stopVideoProcessorFrameLoop();
    releaseVideoProcessorWakeLock();
    refreshVideoProcessorUI();
}

function cancelVideoProcessing(options = {}) {
    if (!isVideoProcessingActive()) return;
    videoProcessorState.cancelled = true;
    videoProcessorState.status = 'stopping';
    const video = document.getElementById('workspace-video');
    try { video?.pause(); } catch (error) {}
    stopVideoProcessorFrameLoop();
    try {
        if (videoProcessorState.recorder?.state !== 'inactive') videoProcessorState.recorder.stop();
        else handleVideoProcessorRecorderStopped();
    } catch (error) {
        cleanupVideoProcessorActiveResources();
        videoProcessorState.status = 'idle';
        refreshVideoProcessorUI();
    }
    if (!options.silent) safeShowToast('Pemrosesan dibatalkan. Video sumber tetap aman.', 'info');
}

function canShareProcessedVideo() {
    if (!videoProcessorState.outputBlob || typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function' || typeof File === 'undefined') return false;
    try {
        const file = new File([videoProcessorState.outputBlob], videoProcessorState.outputFileName, { type: videoProcessorState.mimeType });
        return navigator.canShare({ files: [file] });
    } catch (error) {
        return false;
    }
}

function downloadProcessedVideo() {
    if (!videoProcessorState.outputBlob || !videoProcessorState.outputUrl) return;
    const link = document.createElement('a');
    link.href = videoProcessorState.outputUrl;
    link.download = videoProcessorState.outputFileName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    videoProcessorState.downloaded = true;
    safeShowToast('Unduhan video dimulai.', 'check');
}

function downloadProcessedLosslessAudio() {
    if (!videoProcessorState.losslessOutputBlob || !videoProcessorState.losslessOutputUrl) return;
    const link = document.createElement('a');
    link.href = videoProcessorState.losslessOutputUrl;
    link.download = videoProcessorState.losslessOutputFileName || 'V-Forge-Hi-Res-24bit.wav';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    safeShowToast('Unduhan audio WAV dimulai.', 'check');
}

async function shareProcessedVideo() {
    if (!canShareProcessedVideo()) {
        downloadProcessedVideo();
        return;
    }
    try {
        const file = new File([videoProcessorState.outputBlob], videoProcessorState.outputFileName, { type: videoProcessorState.mimeType });
        await navigator.share({ files: [file], title: videoProcessorState.outputFileName });
    } catch (error) {
        if (error?.name !== 'AbortError') safeShowToast('Video belum dapat dibagikan. Gunakan tombol Simpan ke HP.', 'info');
    }
}

function disposeVideoProcessor() {
    const recorder = videoProcessorState.recorder;
    if (recorder) {
        try {
            recorder.ondataavailable = null;
            recorder.onerror = null;
            recorder.onstop = null;
            if (recorder.state !== 'inactive') recorder.stop();
        } catch (error) {}
    }
    cleanupVideoProcessorActiveResources();
    if (videoProcessorState.outputUrl) {
        try { URL.revokeObjectURL(videoProcessorState.outputUrl); } catch (error) {}
    }
    if (videoProcessorState.losslessOutputUrl) {
        try { URL.revokeObjectURL(videoProcessorState.losslessOutputUrl); } catch (error) {}
    }
    videoProcessorState = createEmptyVideoProcessorState();
    const resultVideo = document.getElementById('processor-result-video');
    if (resultVideo) {
        const hadSource = Boolean(resultVideo.getAttribute('src') || resultVideo.currentSrc);
        resultVideo.removeAttribute('src');
        if (hadSource) {
            try { resultVideo.load(); } catch (error) {}
        }
    }
    setVideoProcessorError('');
    refreshVideoProcessorUI();
}

function resetVideoProcessor() {
    disposeVideoProcessor();
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseVideoProcessingForVisibility();
});

window.addEventListener('beforeunload', (event) => {
    if (!isVideoProcessingActive()) return;
    event.preventDefault();
    event.returnValue = '';
});

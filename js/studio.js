// ============================================================
// STUDIO.JS — V-Forge Motion Studio v7
// Template presets, transition preview, color effects, timeline UI,
// onboarding, undo/redo, dan optimasi animasi mobile.
// ============================================================

const VFORGE_STUDIO_VERSION = '7.0.0';
const VFORGE_STUDIO_STORAGE_KEY = 'vforge-studio-template-v7';
const VFORGE_STUDIO_ONBOARDING_KEY = 'vforge-studio-onboarding-v7';

const VFORGE_STUDIO_TEMPLATES = Object.freeze({
    'clean-cut': Object.freeze({
        id: 'clean-cut',
        label: 'Clean Cut',
        description: 'Tampilan bersih untuk vlog, review, dan konten harian.',
        icon: 'auto_fix_high',
        image: 'assets/images/vf-car-01.jpg',
        tone: 'clean',
        premium: false,
        badge: 'FREE',
        preset: Object.freeze({
            templateId: 'clean-cut', aspectRatio: 'original', outputResolution: '1080p', frameRate: '30',
            audioEnabled: true, audioQuality: 'standard', transitionId: 'cross-dissolve', effectId: 'natural', motionIntensity: 48
        })
    }),
    'creator-pop': Object.freeze({
        id: 'creator-pop',
        label: 'Creator Pop',
        description: 'Punchy 9:16 untuk Shorts, Reels, dan TikTok.',
        icon: 'smart_display',
        image: 'assets/images/vf-car-03.jpg',
        tone: 'pop',
        premium: false,
        badge: '60 FPS',
        preset: Object.freeze({
            templateId: 'creator-pop', aspectRatio: '9:16', outputResolution: '1080p', frameRate: '60',
            audioEnabled: true, audioQuality: 'standard', transitionId: 'zoom-punch', effectId: 'vibrant', motionIntensity: 72
        })
    }),
    'velocity-drive': Object.freeze({
        id: 'velocity-drive',
        label: 'Velocity Drive',
        description: 'Motion cepat, whip transition, dan nuansa automotive.',
        icon: 'speed',
        image: 'assets/images/vf-car-02.jpg',
        tone: 'velocity',
        premium: false,
        badge: 'MOTION',
        preset: Object.freeze({
            templateId: 'velocity-drive', aspectRatio: '16:9', outputResolution: '1080p', frameRate: '60',
            audioEnabled: true, audioQuality: 'standard', transitionId: 'whip-pan', effectId: 'cinematic', motionIntensity: 84
        })
    }),
    'minimal-story': Object.freeze({
        id: 'minimal-story',
        label: 'Minimal Story',
        description: 'Gerakan halus dan warna lembut untuk storytelling.',
        icon: 'filter_vintage',
        image: 'assets/images/vf-car-04.jpg',
        tone: 'minimal',
        premium: false,
        badge: 'SOFT',
        preset: Object.freeze({
            templateId: 'minimal-story', aspectRatio: '9:16', outputResolution: '1080p', frameRate: '30',
            audioEnabled: true, audioQuality: 'standard', transitionId: 'soft-fade', effectId: 'soft-film', motionIntensity: 38
        })
    }),
    'neon-rush': Object.freeze({
        id: 'neon-rush',
        label: 'Neon Rush',
        description: 'Glitch, glow, dan 120 FPS untuk edit berenergi tinggi.',
        icon: 'electric_bolt',
        image: 'assets/images/vf-car-03.jpg',
        tone: 'neon',
        premium: true,
        badge: 'PREMIUM',
        preset: Object.freeze({
            templateId: 'neon-rush', aspectRatio: '9:16', outputResolution: '2160p', frameRate: '120',
            audioEnabled: true, audioQuality: 'hires-lossless', transitionId: 'glitch-split', effectId: 'neon', motionIntensity: 92
        })
    }),
    'cinematic-drive': Object.freeze({
        id: 'cinematic-drive',
        label: 'Cinematic Drive',
        description: 'Look film, 4K, dan film-burn transition untuk showcase.',
        icon: 'theaters',
        image: 'assets/images/vf-car-04.jpg',
        tone: 'cinematic',
        premium: true,
        badge: '4K PRO',
        preset: Object.freeze({
            templateId: 'cinematic-drive', aspectRatio: '16:9', outputResolution: '2160p', frameRate: '60',
            audioEnabled: true, audioQuality: 'hires-lossless', transitionId: 'film-burn', effectId: 'cinematic-pro', motionIntensity: 66
        })
    })
});

const VFORGE_STUDIO_TRANSITIONS = Object.freeze({
    'hard-cut': Object.freeze({ id: 'hard-cut', label: 'Hard Cut', short: 'Cut', icon: 'content_cut', premium: false }),
    'cross-dissolve': Object.freeze({ id: 'cross-dissolve', label: 'Cross Dissolve', short: 'Dissolve', icon: 'blur_on', premium: false }),
    'soft-fade': Object.freeze({ id: 'soft-fade', label: 'Soft Fade', short: 'Fade', icon: 'gradient', premium: false }),
    'whip-pan': Object.freeze({ id: 'whip-pan', label: 'Whip Pan', short: 'Whip', icon: 'swap_horiz', premium: false }),
    'zoom-punch': Object.freeze({ id: 'zoom-punch', label: 'Zoom Punch', short: 'Zoom', icon: 'zoom_in', premium: false }),
    'film-burn': Object.freeze({ id: 'film-burn', label: 'Film Burn', short: 'Burn', icon: 'local_fire_department', premium: true }),
    'glitch-split': Object.freeze({ id: 'glitch-split', label: 'Glitch Split', short: 'Glitch', icon: 'broken_image', premium: true }),
    'liquid-warp': Object.freeze({ id: 'liquid-warp', label: 'Liquid Warp', short: 'Liquid', icon: 'water_drop', premium: true })
});

const VFORGE_STUDIO_EFFECTS = Object.freeze({
    natural: Object.freeze({ id: 'natural', label: 'Natural', icon: 'wb_sunny', premium: false }),
    vibrant: Object.freeze({ id: 'vibrant', label: 'Vibrant', icon: 'palette', premium: false }),
    cinematic: Object.freeze({ id: 'cinematic', label: 'Cinema', icon: 'movie', premium: false }),
    'soft-film': Object.freeze({ id: 'soft-film', label: 'Soft Film', icon: 'grain', premium: false }),
    mono: Object.freeze({ id: 'mono', label: 'Mono', icon: 'contrast', premium: false }),
    neon: Object.freeze({ id: 'neon', label: 'Neon', icon: 'flare', premium: true }),
    'cinematic-pro': Object.freeze({ id: 'cinematic-pro', label: 'Cinema Pro', icon: 'auto_awesome', premium: true })
});

const VFORGE_ONBOARDING_STEPS = Object.freeze([
    Object.freeze({
        kicker: 'Motion-first editor',
        title: 'Edit lebih cepat, tampil lebih premium',
        description: 'Mulai dari template, pilih transisi, lalu proses video langsung di HP tanpa mengunggah file sumber.',
        icon: 'movie_filter'
    }),
    Object.freeze({
        kicker: 'Template pintar',
        title: 'Satu tap mengatur gaya proyek',
        description: 'Template mengatur rasio, frame rate, color effect, transisi, dan intensitas motion sebagai titik awal.',
        icon: 'style'
    }),
    Object.freeze({
        kicker: 'Timeline profesional',
        title: 'Preview motion sebelum ekspor',
        description: 'Gunakan Smart Timeline, preview transisi, efek warna, serta undo dan redo agar eksperimen tetap aman.',
        icon: 'view_timeline'
    }),
    Object.freeze({
        kicker: 'Output premium',
        title: '4K, 120 FPS, dan audio lossless',
        description: 'Fitur output Ultra tetap mengikuti status subscription terverifikasi. Pemrosesan berlangsung lokal di perangkat.',
        icon: 'workspace_premium'
    })
]);

let studioSelectedTemplateId = readStudioTemplatePreference();
let studioHistory = [];
let studioFuture = [];
let studioApplyingSnapshot = false;
let studioOnboardingIndex = 0;
let studioHeroObserver = null;

function readStudioTemplatePreference() {
    try {
        const value = localStorage.getItem(VFORGE_STUDIO_STORAGE_KEY);
        return VFORGE_STUDIO_TEMPLATES[value] ? value : 'clean-cut';
    } catch (error) {
        return 'clean-cut';
    }
}

function writeStudioTemplatePreference(templateId) {
    try { localStorage.setItem(VFORGE_STUDIO_STORAGE_KEY, templateId); } catch (error) {}
}

function studioHasPremiumAccess() {
    return typeof hasPremiumAccess === 'function' ? hasPremiumAccess() : false;
}

function getSelectedStudioTemplate() {
    return studioSelectedTemplateId;
}

function getStudioTemplatePreset(templateId = studioSelectedTemplateId) {
    const requested = VFORGE_STUDIO_TEMPLATES[templateId] || VFORGE_STUDIO_TEMPLATES['clean-cut'];
    const template = requested.premium && !studioHasPremiumAccess()
        ? VFORGE_STUDIO_TEMPLATES['clean-cut']
        : requested;
    return { ...template.preset };
}

function getStudioTemplateLabel(templateId) {
    return (VFORGE_STUDIO_TEMPLATES[templateId] || VFORGE_STUDIO_TEMPLATES['clean-cut']).label;
}

function getStudioTransitionLabel(transitionId) {
    return (VFORGE_STUDIO_TRANSITIONS[transitionId] || VFORGE_STUDIO_TRANSITIONS['cross-dissolve']).label;
}

function getStudioEffectLabel(effectId) {
    return (VFORGE_STUDIO_EFFECTS[effectId] || VFORGE_STUDIO_EFFECTS.natural).label;
}

function showStudioMessage(message, type = 'info') {
    if (typeof safeShowToast === 'function') safeShowToast(message, type);
    else if (typeof showToast === 'function') showToast(message, type);
}

function requireStudioPremium(label, sourcePage = 'page-enhancer') {
    if (studioHasPremiumAccess()) return true;
    if (typeof showPremiumRequired === 'function') {
        showPremiumRequired(label, { openSubscription: true, sourcePage });
    } else {
        showStudioMessage(`${label} hanya tersedia untuk akun Premium.`, 'info');
    }
    return false;
}

function renderStudioTemplateGallery() {
    const container = document.getElementById('studio-template-list');
    if (!container) return;
    const premium = studioHasPremiumAccess();
    container.innerHTML = Object.values(VFORGE_STUDIO_TEMPLATES).map((template) => {
        const active = template.id === studioSelectedTemplateId;
        const locked = template.premium && !premium;
        return `
            <button type="button" role="listitem" class="studio-template-card tone-${template.tone}${active ? ' active' : ''}${locked ? ' locked' : ''}" data-template-id="${template.id}" onclick="selectStudioTemplate('${template.id}')" aria-pressed="${active}" aria-label="${template.label}${locked ? ', Premium' : ''}" style="--studio-template-image:url('../${template.image}')">
                <span class="studio-template-art" style="background-image:linear-gradient(180deg,rgba(5,7,12,.03),rgba(5,7,12,.76)),url('${template.image}')"><span class="studio-template-badge">${locked ? '<span class="material-icons-round">lock</span>' : ''}${template.badge}</span><span class="material-icons-round studio-template-icon">${template.icon}</span></span>
                <span class="studio-template-copy"><strong>${template.label}</strong><small>${template.description}</small></span>
                <span class="studio-template-check material-icons-round">${active ? 'check_circle' : 'arrow_outward'}</span>
            </button>`;
    }).join('');
    updateStudioSelectedTemplateUI();
}

function updateStudioSelectedTemplateUI() {
    const template = VFORGE_STUDIO_TEMPLATES[studioSelectedTemplateId] || VFORGE_STUDIO_TEMPLATES['clean-cut'];
    const label = document.getElementById('studio-selected-template-label');
    const ctaLabel = document.getElementById('create-video-template-label');
    if (label) label.textContent = template.label;
    if (ctaLabel) ctaLabel.textContent = `Preset: ${template.label} • ${template.preset.frameRate} FPS • ${template.preset.aspectRatio === 'original' ? 'Rasio asli' : template.preset.aspectRatio}`;
    document.querySelectorAll('[data-template-id]').forEach((button) => {
        const active = button.dataset.templateId === studioSelectedTemplateId;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
        const icon = button.querySelector('.studio-template-check');
        if (icon) icon.textContent = active ? 'check_circle' : 'arrow_outward';
    });
}

function selectStudioTemplate(templateId, options = {}) {
    const template = VFORGE_STUDIO_TEMPLATES[templateId];
    if (!template) return false;
    const workspaceOpen = typeof videoWorkspaceState !== 'undefined' && Boolean(videoWorkspaceState?.file);
    if (template.premium && !requireStudioPremium(template.label, workspaceOpen ? 'page-video-workspace' : 'page-enhancer')) {
        renderStudioTemplateGallery();
        return false;
    }

    if (workspaceOpen && !studioApplyingSnapshot) pushStudioHistory();
    studioSelectedTemplateId = template.id;
    writeStudioTemplatePreference(template.id);

    if (workspaceOpen) {
        Object.assign(videoWorkspaceState.settings, getStudioTemplatePreset(template.id));
        if (typeof invalidateVideoProcessorResult === 'function') invalidateVideoProcessorResult();
        if (typeof renderWorkspaceSettings === 'function') renderWorkspaceSettings();
        renderStudioWorkspaceControls();
        previewStudioTransition({ silent: true });
    }

    renderStudioTemplateGallery();
    if (!options.silent) showStudioMessage(`${template.label} dipilih.`, 'check');
    return true;
}

function getStudioCreativeSnapshot() {
    if (typeof videoWorkspaceState === 'undefined' || !videoWorkspaceState?.settings) return null;
    const settings = videoWorkspaceState.settings;
    return {
        templateId: settings.templateId || 'clean-cut',
        transitionId: settings.transitionId || 'cross-dissolve',
        effectId: settings.effectId || 'natural',
        motionIntensity: Math.max(0, Math.min(100, Number(settings.motionIntensity) || 0)),
        aspectRatio: settings.aspectRatio,
        outputResolution: settings.outputResolution,
        frameRate: settings.frameRate,
        audioEnabled: settings.audioEnabled,
        audioQuality: settings.audioQuality
    };
}

function pushStudioHistory() {
    const snapshot = getStudioCreativeSnapshot();
    if (!snapshot || studioApplyingSnapshot) return;
    studioHistory.push(snapshot);
    if (studioHistory.length > 30) studioHistory.shift();
    studioFuture = [];
    updateStudioHistoryButtons();
}

function applyStudioSnapshot(snapshot) {
    if (!snapshot || typeof videoWorkspaceState === 'undefined') return;
    studioApplyingSnapshot = true;
    Object.assign(videoWorkspaceState.settings, snapshot);
    studioSelectedTemplateId = snapshot.templateId || studioSelectedTemplateId;
    writeStudioTemplatePreference(studioSelectedTemplateId);
    if (typeof invalidateVideoProcessorResult === 'function') invalidateVideoProcessorResult();
    if (typeof renderWorkspaceSettings === 'function') renderWorkspaceSettings();
    renderStudioWorkspaceControls();
    renderStudioTemplateGallery();
    studioApplyingSnapshot = false;
}

function studioUndo() {
    if (!studioHistory.length) return;
    const current = getStudioCreativeSnapshot();
    const previous = studioHistory.pop();
    if (current) studioFuture.push(current);
    applyStudioSnapshot(previous);
    updateStudioHistoryButtons();
    showStudioMessage('Perubahan gaya diurungkan.', 'info');
}

function studioRedo() {
    if (!studioFuture.length) return;
    const current = getStudioCreativeSnapshot();
    const next = studioFuture.pop();
    if (current) studioHistory.push(current);
    applyStudioSnapshot(next);
    updateStudioHistoryButtons();
    showStudioMessage('Perubahan gaya diterapkan kembali.', 'info');
}

function updateStudioHistoryButtons() {
    const undo = document.getElementById('studio-undo-button');
    const redo = document.getElementById('studio-redo-button');
    if (undo) undo.disabled = studioHistory.length === 0;
    if (redo) redo.disabled = studioFuture.length === 0;
}

function renderStudioWorkspaceControls() {
    if (typeof videoWorkspaceState === 'undefined') return;
    const settings = videoWorkspaceState.settings || {};
    const premium = studioHasPremiumAccess();
    const templateId = VFORGE_STUDIO_TEMPLATES[settings.templateId] ? settings.templateId : 'clean-cut';
    const transitionId = VFORGE_STUDIO_TRANSITIONS[settings.transitionId] ? settings.transitionId : 'cross-dissolve';
    const effectId = VFORGE_STUDIO_EFFECTS[settings.effectId] ? settings.effectId : 'natural';
    const intensity = Math.max(0, Math.min(100, Number(settings.motionIntensity) || 0));

    const templateControls = document.getElementById('workspace-template-controls');
    if (templateControls) {
        templateControls.innerHTML = Object.values(VFORGE_STUDIO_TEMPLATES).map((template) => {
            const locked = template.premium && !premium;
            return `<button type="button" class="studio-choice${template.id === templateId ? ' active' : ''}${locked ? ' locked' : ''}" onclick="selectStudioTemplate('${template.id}')" aria-pressed="${template.id === templateId}"><span class="material-icons-round">${locked ? 'lock' : template.icon}</span><strong>${template.label}</strong><small>${template.badge}</small></button>`;
        }).join('');
    }

    const transitionControls = document.getElementById('workspace-transition-controls');
    if (transitionControls) {
        transitionControls.innerHTML = Object.values(VFORGE_STUDIO_TRANSITIONS).map((transition) => {
            const locked = transition.premium && !premium;
            return `<button type="button" class="studio-choice compact${transition.id === transitionId ? ' active' : ''}${locked ? ' locked' : ''}" onclick="selectStudioTransition('${transition.id}')" aria-pressed="${transition.id === transitionId}"><span class="material-icons-round">${locked ? 'lock' : transition.icon}</span><strong>${transition.label}</strong></button>`;
        }).join('');
    }

    const effectControls = document.getElementById('workspace-effect-controls');
    if (effectControls) {
        effectControls.innerHTML = Object.values(VFORGE_STUDIO_EFFECTS).map((effect) => {
            const locked = effect.premium && !premium;
            return `<button type="button" class="studio-choice compact${effect.id === effectId ? ' active' : ''}${locked ? ' locked' : ''}" onclick="selectStudioEffect('${effect.id}')" aria-pressed="${effect.id === effectId}"><span class="material-icons-round">${locked ? 'lock' : effect.icon}</span><strong>${effect.label}</strong></button>`;
        }).join('');
    }

    const intensityInput = document.getElementById('workspace-motion-intensity');
    const intensityValue = document.getElementById('workspace-motion-intensity-value');
    if (intensityInput) intensityInput.value = String(intensity);
    if (intensityValue) intensityValue.textContent = `${intensity}%`;

    const templateValue = document.getElementById('workspace-template-value');
    const transitionValue = document.getElementById('workspace-transition-value');
    const effectValue = document.getElementById('workspace-effect-value');
    if (templateValue) templateValue.textContent = getStudioTemplateLabel(templateId);
    if (transitionValue) transitionValue.textContent = getStudioTransitionLabel(transitionId);
    if (effectValue) effectValue.textContent = getStudioEffectLabel(effectId);

    const timelineTemplate = document.getElementById('studio-timeline-template');
    const timelineTransition = document.getElementById('studio-timeline-transition');
    const timelineEffect = document.getElementById('studio-timeline-effect');
    if (timelineTemplate) timelineTemplate.textContent = getStudioTemplateLabel(templateId);
    if (timelineTransition) timelineTransition.textContent = (VFORGE_STUDIO_TRANSITIONS[transitionId] || VFORGE_STUDIO_TRANSITIONS['cross-dissolve']).short;
    if (timelineEffect) timelineEffect.textContent = getStudioEffectLabel(effectId);

    const frame = document.getElementById('workspace-video-frame');
    if (frame) {
        frame.dataset.studioEffect = effectId;
        frame.dataset.studioTemplate = templateId;
        frame.style.setProperty('--studio-motion-strength', String(intensity / 100));
    }
    const timeline = document.getElementById('studio-mini-timeline');
    if (timeline) {
        timeline.dataset.template = templateId;
        timeline.style.setProperty('--studio-motion-strength', String(intensity / 100));
    }
    updateStudioHistoryButtons();
}

function selectStudioTransition(transitionId, options = {}) {
    const transition = VFORGE_STUDIO_TRANSITIONS[transitionId];
    if (!transition || typeof videoWorkspaceState === 'undefined') return false;
    if (transition.premium && !requireStudioPremium(transition.label, 'page-video-workspace')) return false;
    if (!studioApplyingSnapshot) pushStudioHistory();
    videoWorkspaceState.settings.transitionId = transition.id;
    if (typeof invalidateVideoProcessorResult === 'function') invalidateVideoProcessorResult();
    renderStudioWorkspaceControls();
    previewStudioTransition({ silent: true });
    if (!options.silent) showStudioMessage(`${transition.label} diterapkan.`, 'check');
    return true;
}

function selectStudioEffect(effectId, options = {}) {
    const effect = VFORGE_STUDIO_EFFECTS[effectId];
    if (!effect || typeof videoWorkspaceState === 'undefined') return false;
    if (effect.premium && !requireStudioPremium(effect.label, 'page-video-workspace')) return false;
    if (!studioApplyingSnapshot) pushStudioHistory();
    videoWorkspaceState.settings.effectId = effect.id;
    if (typeof invalidateVideoProcessorResult === 'function') invalidateVideoProcessorResult();
    renderStudioWorkspaceControls();
    if (!options.silent) showStudioMessage(`${effect.label} diterapkan.`, 'check');
    return true;
}

function setStudioMotionIntensity(value) {
    if (typeof videoWorkspaceState === 'undefined') return;
    const normalized = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    const previous = Math.round(Number(videoWorkspaceState.settings.motionIntensity) || 0);
    if (Math.abs(previous - normalized) >= 8 && !studioApplyingSnapshot) pushStudioHistory();
    videoWorkspaceState.settings.motionIntensity = normalized;
    const display = document.getElementById('workspace-motion-intensity-value');
    if (display) display.textContent = `${normalized}%`;
    const frame = document.getElementById('workspace-video-frame');
    const timeline = document.getElementById('studio-mini-timeline');
    if (frame) frame.style.setProperty('--studio-motion-strength', String(normalized / 100));
    if (timeline) timeline.style.setProperty('--studio-motion-strength', String(normalized / 100));
    if (typeof invalidateVideoProcessorResult === 'function') invalidateVideoProcessorResult();
}

function previewStudioTransition(options = {}) {
    const overlay = document.getElementById('studio-transition-preview');
    const playhead = document.getElementById('studio-playhead');
    if (!overlay || typeof videoWorkspaceState === 'undefined') return;
    const transitionId = videoWorkspaceState.settings.transitionId || 'cross-dissolve';
    overlay.dataset.transition = transitionId;
    overlay.classList.remove('playing');
    if (playhead) playhead.classList.remove('playing');
    // Dua frame memastikan animasi CSS benar-benar restart di Chrome Android.
    requestAnimationFrame(() => requestAnimationFrame(() => {
        overlay.classList.add('playing');
        if (playhead) playhead.classList.add('playing');
    }));
    window.setTimeout(() => {
        overlay.classList.remove('playing');
        if (playhead) playhead.classList.remove('playing');
    }, 1250);
    if (!options.silent) showStudioMessage(`Preview ${getStudioTransitionLabel(transitionId)}.`, 'info');
}

function getStudioOnboardingStorageKey() {
    const uid = (typeof auth !== 'undefined' && auth?.currentUser?.uid) ? auth.currentUser.uid : 'guest';
    return `${VFORGE_STUDIO_ONBOARDING_KEY}:${uid}`;
}

function shouldShowStudioOnboarding() {
    try { return localStorage.getItem(getStudioOnboardingStorageKey()) !== 'done'; }
    catch (error) { return false; }
}

function openStudioOnboarding(force = false) {
    if (!force && !shouldShowStudioOnboarding()) return;
    studioOnboardingIndex = 0;
    renderStudioOnboardingStep();
    const modal = document.getElementById('studio-onboarding');
    if (!modal) return;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('studio-onboarding-open');
}

function closeStudioOnboarding(markSeen = true) {
    const modal = document.getElementById('studio-onboarding');
    if (modal) {
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('studio-onboarding-open');
    if (markSeen) {
        try { localStorage.setItem(getStudioOnboardingStorageKey(), 'done'); } catch (error) {}
    }
}

function renderStudioOnboardingStep() {
    const step = VFORGE_ONBOARDING_STEPS[studioOnboardingIndex] || VFORGE_ONBOARDING_STEPS[0];
    const kicker = document.getElementById('studio-onboarding-kicker');
    const title = document.getElementById('studio-onboarding-title');
    const description = document.getElementById('studio-onboarding-description');
    const icon = document.getElementById('studio-onboarding-icon');
    const visual = document.getElementById('studio-onboarding-visual');
    const progress = document.getElementById('studio-onboarding-progress');
    const back = document.getElementById('studio-onboarding-back');
    const next = document.getElementById('studio-onboarding-next');
    if (kicker) kicker.textContent = step.kicker;
    if (title) title.textContent = step.title;
    if (description) description.textContent = step.description;
    if (icon) icon.textContent = step.icon;
    if (visual) visual.dataset.step = String(studioOnboardingIndex);
    if (progress) progress.innerHTML = VFORGE_ONBOARDING_STEPS.map((_, index) => `<span class="${index === studioOnboardingIndex ? 'active' : ''}"></span>`).join('');
    if (back) back.textContent = studioOnboardingIndex === 0 ? 'Lewati' : 'Kembali';
    if (next) {
        const label = next.querySelector('span:first-child');
        const arrow = next.querySelector('.material-icons-round');
        if (label) label.textContent = studioOnboardingIndex === VFORGE_ONBOARDING_STEPS.length - 1 ? 'Mulai berkarya' : 'Lanjut';
        if (arrow) arrow.textContent = studioOnboardingIndex === VFORGE_ONBOARDING_STEPS.length - 1 ? 'rocket_launch' : 'arrow_forward';
    }
}

function nextStudioOnboardingStep() {
    if (studioOnboardingIndex >= VFORGE_ONBOARDING_STEPS.length - 1) {
        closeStudioOnboarding(true);
        return;
    }
    studioOnboardingIndex += 1;
    renderStudioOnboardingStep();
}

function previousStudioOnboardingStep() {
    if (studioOnboardingIndex === 0) {
        closeStudioOnboarding(true);
        return;
    }
    studioOnboardingIndex -= 1;
    renderStudioOnboardingStep();
}

function handleStudioPageChange(pageId) {
    document.body.classList.toggle('vf-studio-active', pageId === 'page-enhancer' || pageId === 'page-video-workspace');
    if (pageId === 'page-enhancer') {
        renderStudioTemplateGallery();
        window.setTimeout(() => openStudioOnboarding(false), 420);
    }
    if (pageId === 'page-video-workspace') {
        renderStudioWorkspaceControls();
    }
}

function initStudioPerformanceControls() {
    const hero = document.querySelector('.hero-banner-container');
    if ('IntersectionObserver' in window && hero) {
        studioHeroObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => hero.classList.toggle('vf-hero-paused', !entry.isIntersecting));
        }, { threshold: 0.08 });
        studioHeroObserver.observe(hero);
    }
    document.addEventListener('visibilitychange', () => {
        document.body.classList.toggle('vf-motion-paused', document.hidden);
    });
}

function initStudioV7() {
    renderStudioTemplateGallery();
    renderStudioWorkspaceControls();
    initStudioPerformanceControls();
    document.addEventListener('vforge:pagechange', (event) => handleStudioPageChange(event.detail?.pageId));
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && document.getElementById('studio-onboarding')?.classList.contains('show')) {
            closeStudioOnboarding(true);
        }
    });
    if (typeof auth !== 'undefined' && auth?.onAuthStateChanged) {
        auth.onAuthStateChanged(() => {
            renderStudioTemplateGallery();
            renderStudioWorkspaceControls();
        });
    }
    if (typeof currentPage !== 'undefined') handleStudioPageChange(currentPage);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initStudioV7, { once: true });
else initStudioV7();

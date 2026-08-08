// V-FORGE V9.4 — V9.1 PREVIEW COMPATIBILITY LAYER
// Timeline state/commands/time ownership belongs exclusively to VForgeTimeline94.
(function () {
  'use strict';

  const VERSION = '9.4.0-compat';
  const state = { fitMode: 'contain' };

  const byId = (id) => document.getElementById(id);

  function getTimeline94() {
    return window.VForgeTimeline94 || null;
  }

  function toast(message, type = 'info') {
    try {
      if (typeof window.v9Toast === 'function') window.v9Toast(message, type);
      else if (typeof window.safeShowToast === 'function') window.safeShowToast(message, type);
      else if (typeof window.showToast === 'function') window.showToast(message, type);
    } catch (_) {}
  }

  function getVideo() { return byId('workspace-video'); }

  function createPreviewControls() {
    const frame = byId('workspace-video-frame');
    const video = getVideo();
    if (!frame || !video) return false;

    video.removeAttribute('controls');
    video.setAttribute('aria-label', 'Preview video V-Forge');

    if (!byId('v91-preview-topbar')) {
      const top = document.createElement('div');
      top.className = 'v91-preview-topbar';
      top.id = 'v91-preview-topbar';
      top.innerHTML = `
        <div class="v91-fit-switch" role="group" aria-label="Mode preview">
          <button id="v91-fit-button" class="active" type="button" aria-pressed="true"><span class="material-icons-round">fit_screen</span>Fit</button>
          <button id="v91-fill-button" type="button" aria-pressed="false"><span class="material-icons-round">crop_free</span>Fill</button>
        </div>
        <span class="v91-preview-badge"><span class="material-icons-round">verified_user</span>FULL FRAME</span>`;
      frame.appendChild(top);
    }

    if (!byId('v91-preview-controls')) {
      const controls = document.createElement('div');
      controls.id = 'v91-preview-controls';
      controls.className = 'v91-preview-controls';
      controls.innerHTML = `
        <button id="v91-play-button" class="v91-play-button" type="button" aria-label="Putar video"><span class="material-icons-round">play_arrow</span></button>
        <span id="v91-current-time" class="v91-time-label">00:00</span>
        <input id="v91-seek-range" aria-label="Posisi video" type="range" min="0" max="1000" step="1" value="0">
        <span id="v91-total-time" class="v91-time-label">00:00</span>
        <button id="v91-fullscreen-button" class="v91-icon-button" type="button" aria-label="Layar penuh"><span class="material-icons-round">fullscreen</span></button>`;
      frame.appendChild(controls);
    }

    const fit = byId('v91-fit-button');
    const fill = byId('v91-fill-button');
    const play = byId('v91-play-button');
    const fullscreen = byId('v91-fullscreen-button');
    const seek = byId('v91-seek-range');

    if (fit && fit.dataset.v94CompatBound !== 'true') {
      fit.dataset.v94CompatBound = 'true';
      fit.addEventListener('click', () => setFitMode('contain'));
    }
    if (fill && fill.dataset.v94CompatBound !== 'true') {
      fill.dataset.v94CompatBound = 'true';
      fill.addEventListener('click', () => setFitMode('cover'));
    }
    if (play && play.dataset.v94CompatBound !== 'true') {
      play.dataset.v94CompatBound = 'true';
      play.addEventListener('click', handlePlaybackToggle);
    }
    if (fullscreen && fullscreen.dataset.v94CompatBound !== 'true') {
      fullscreen.dataset.v94CompatBound = 'true';
      fullscreen.addEventListener('click', enterFullscreen);
    }
    if (seek && seek.dataset.v94CompatBound !== 'true') {
      seek.dataset.v94CompatBound = 'true';
      seek.addEventListener('input', handleSeekRange);
    }
    if (video.dataset.v94CompatPreviewClick !== 'true') {
      video.dataset.v94CompatPreviewClick = 'true';
      video.addEventListener('click', handlePlaybackToggle);
    }
    return true;
  }

  function createExportNotice() {
    const panel = document.querySelector('#page-video-workspace [data-editor-panel="export"] .processor-card');
    if (!panel || byId('vf94-export-notice')) return Boolean(panel);
    const notice = document.createElement('p');
    notice.id = 'vf94-export-notice';
    notice.className = 'vf94-export-notice';
    notice.innerHTML = '<span class="material-icons-round">info</span><span><strong>Timeline V9.4 A1 aktif untuk preview</strong><small>Ekspor web saat ini masih memproses video sumber utama; rangkaian Split, Trim, dan Delete belum diterapkan ke file ekspor.</small></span>';
    panel.insertAdjacentElement('afterbegin', notice);
    return true;
  }

  function setFitMode(mode) {
    state.fitMode = mode === 'cover' ? 'cover' : 'contain';
    applyFitMode();
    renderFitButtons();
    toast(state.fitMode === 'contain'
      ? 'Fit aktif: seluruh frame video terlihat.'
      : 'Fill aktif: canvas dipenuhi dan sisi video dapat terpotong.', 'info');
  }

  function applyFitMode() {
    const video = getVideo();
    const frame = byId('workspace-video-frame');
    if (!video || !frame) return;
    video.style.setProperty('object-fit', state.fitMode, 'important');
    video.style.setProperty('object-position', '50% 50%', 'important');
    frame.dataset.previewFit = state.fitMode;
    frame.classList.toggle('v91-fill-mode', state.fitMode === 'cover');
  }

  function renderFitButtons() {
    const fit = state.fitMode === 'contain';
    const fitButton = byId('v91-fit-button');
    const fillButton = byId('v91-fill-button');
    if (fitButton) {
      fitButton.classList.toggle('active', fit);
      fitButton.setAttribute('aria-pressed', String(fit));
    }
    if (fillButton) {
      fillButton.classList.toggle('active', !fit);
      fillButton.setAttribute('aria-pressed', String(!fit));
    }
    const badge = document.querySelector('.v91-preview-badge');
    if (badge) badge.innerHTML = fit
      ? '<span class="material-icons-round">verified_user</span>FULL FRAME'
      : '<span class="material-icons-round">crop</span>FILL CROP';
  }

  function fallbackTogglePlayback() {
    const video = getVideo();
    if (!video) return;
    if (!video.paused) video.pause();
    else {
      const promise = video.play();
      promise?.catch?.(() => toast('Video belum dapat diputar. Sentuh preview lalu coba lagi.', 'info'));
    }
  }

  function handlePlaybackToggle() {
    const timeline94 = getTimeline94();
    return timeline94 ? timeline94.togglePlayback() : fallbackTogglePlayback();
  }

  function handleCompatUndo() {
    const timeline94 = getTimeline94();
    return timeline94 ? timeline94.undo() : undefined;
  }

  function handleCompatRedo() {
    const timeline94 = getTimeline94();
    return timeline94 ? timeline94.redo() : undefined;
  }

  function handleCompatSplit() {
    const timeline94 = getTimeline94();
    return timeline94 ? timeline94.splitAtPlayhead() : undefined;
  }

  function handleSeekRange(event) {
    const timeline94 = getTimeline94();
    const value = Number(event?.target?.value || 0) / 1000;
    if (timeline94) return timeline94.seekByRatio(value);
    const video = getVideo();
    if (video && Number.isFinite(video.duration) && video.duration > 0) video.currentTime = video.duration * value;
  }

  function renderPlayButton() {
    const timeline94 = getTimeline94();
    if (timeline94) return timeline94.syncPreviewControls();
    const video = getVideo();
    const button = byId('v91-play-button');
    if (!video || !button) return;
    const playing = !video.paused && !video.ended;
    button.setAttribute('aria-label', playing ? 'Jeda video' : 'Putar video');
    const icon = button.querySelector('.material-icons-round');
    if (icon) icon.textContent = playing ? 'pause' : 'play_arrow';
  }

  function getFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function syncEditorNavigation() {
    const page = byId('page-video-workspace');
    const nav = byId('bottom-navigation');
    const editorOpen = Boolean(page?.classList.contains('active'));
    document.body?.classList.toggle('v911-editor-open', editorOpen);
    if (nav) {
      nav.hidden = editorOpen;
      nav.setAttribute('aria-hidden', String(editorOpen));
    }
  }

  function syncFullscreenState() {
    const page = byId('page-video-workspace');
    const active = Boolean(page && getFullscreenElement() === page);
    document.body?.classList.toggle('v911-editor-fullscreen', active);
    page?.classList.toggle('v911-immersive', active);
    const button = byId('v91-fullscreen-button');
    const icon = button?.querySelector('.material-icons-round');
    if (button) {
      button.setAttribute('aria-label', active ? 'Keluar dari layar penuh editor' : 'Buka editor layar penuh');
      button.setAttribute('aria-pressed', String(active));
    }
    if (icon) icon.textContent = active ? 'fullscreen_exit' : 'fullscreen';
    syncEditorNavigation();
    requestAnimationFrame(() => {
      if (typeof window.syncV9EditorViewport === 'function') window.syncV9EditorViewport();
      if (typeof window.syncV902PreviewCanvas === 'function') window.syncV902PreviewCanvas();
      applyFitMode();
      getTimeline94()?.refresh();
    });
  }

  async function enterFullscreen() {
    const page = byId('page-video-workspace');
    if (!page) return;
    try {
      const active = getFullscreenElement();
      if (active) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (typeof exit === 'function') await exit.call(document);
        return;
      }
      const request = page.requestFullscreen || page.webkitRequestFullscreen;
      if (typeof request !== 'function') {
        toast('Browser ini belum mendukung layar penuh editor. Pasang V-Forge sebagai PWA untuk ruang kerja lebih luas.', 'info');
        return;
      }
      await request.call(page);
    } catch (_) {
      toast('Layar penuh editor belum dapat dibuka. Sentuh tombol sekali lagi atau gunakan PWA.', 'info');
    }
  }

  function patchPreviewSizer() {
    const original = window.syncV902PreviewCanvas;
    if (typeof original === 'function' && !original.__v94CompatPatched) {
      const patched = function () {
        const result = original.apply(this, arguments);
        requestAnimationFrame(applyFitMode);
        return result;
      };
      patched.__v94CompatPatched = true;
      window.syncV902PreviewCanvas = patched;
    }
  }

  function bindPreviewVideo() {
    const video = getVideo();
    if (!video || video.dataset.v94CompatPreviewEvents === 'true') return;
    video.dataset.v94CompatPreviewEvents = 'true';
    video.addEventListener('loadedmetadata', () => {
      applyFitMode();
      renderPlayButton();
    });
    video.addEventListener('play', renderPlayButton);
    video.addEventListener('pause', renderPlayButton);
    video.addEventListener('ended', renderPlayButton);
    video.addEventListener('emptied', renderPlayButton);
  }

  function bindKeyboard() {
    if (document.documentElement.dataset.v94CompatKeyboard === 'true') return;
    document.documentElement.dataset.v94CompatKeyboard = 'true';
    document.addEventListener('keydown', (event) => {
      const page = byId('page-video-workspace');
      if (!page?.classList.contains('active')) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        event.shiftKey ? handleCompatRedo() : handleCompatUndo();
      } else if (modifier && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        handleCompatRedo();
      } else if (event.code === 'Space') {
        event.preventDefault();
        handlePlaybackToggle();
      } else if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        handleCompatSplit();
      }
    });
  }

  function prepare() {
    createPreviewControls();
    createExportNotice();
    bindPreviewVideo();
    bindKeyboard();
    patchPreviewSizer();
    applyFitMode();
    renderFitButtons();
    renderPlayButton();
    syncEditorNavigation();
    syncFullscreenState();

    if (getTimeline94()) {
      document.documentElement.dataset.vforgeTimelineOwner = '9.4.0';
      getTimeline94().refresh();
    }
  }

  document.addEventListener('fullscreenchange', syncFullscreenState);
  document.addEventListener('webkitfullscreenchange', syncFullscreenState);
  document.addEventListener('vforge:pagechange', (event) => {
    syncEditorNavigation();
    if (event.detail?.pageId === 'page-video-workspace') requestAnimationFrame(prepare);
  });
  window.addEventListener('resize', () => requestAnimationFrame(applyFitMode), { passive: true });

  window.v91Undo = handleCompatUndo;
  window.v91Redo = handleCompatRedo;
  window.VForgeEditor91 = {
    version: VERSION,
    state,
    setFitMode,
    enterFullscreen,
    syncEditorNavigation,
    handlePlaybackToggle,
    handleCompatUndo,
    handleCompatRedo,
    handleCompatSplit
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', prepare, { once: true });
  else prepare();
})();

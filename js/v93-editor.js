/* V-FORGE V9.4 — V9.3 EDITOR/PREVIEW COMPATIBILITY LAYER
   V9.3 keeps shell geometry, tool scroller, effects/audio preview and preview zoom.
   V9.4 exclusively owns timeline state, timeline zoom and media-time behavior. */
(function () {
  'use strict';

  const VERSION = '9.4.0-compat';
  if (window.VForgeEditor93?.version === VERSION) return;

  try {
    const page = document.getElementById('page-video-workspace');
    const toolSheet = document.getElementById('workspace-form');
    const video = document.getElementById('workspace-video');
    const editorHeader = page?.querySelector('.v82-editor-header');
    const editorDock = page?.querySelector('.v82-editor-dock');
    const byId = (id) => document.getElementById(id);
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const originalOpenV82EditorTool = typeof window.openV82EditorTool === 'function' ? window.openV82EditorTool : null;
    const originalToggleWorkspaceAudio = typeof window.toggleWorkspaceAudio === 'function' ? window.toggleWorkspaceAudio : null;
    const originalSelectStudioEffect = typeof window.selectStudioEffect === 'function' ? window.selectStudioEffect : null;
    const originalSelectStudioTemplate = typeof window.selectStudioTemplate === 'function' ? window.selectStudioTemplate : null;

    const EFFECT_CLASSES = [
      'vf93-live-effect-vibrant', 'vf93-live-effect-cinematic', 'vf93-live-effect-soft-film',
      'vf93-live-effect-mono', 'vf93-live-effect-neon', 'vf93-live-effect-cinematic-pro'
    ];
    const EFFECT_CLASS_MAP = {
      vibrant: 'vf93-live-effect-vibrant', cinematic: 'vf93-live-effect-cinematic',
      'soft-film': 'vf93-live-effect-soft-film', mono: 'vf93-live-effect-mono',
      neon: 'vf93-live-effect-neon', 'cinematic-pro': 'vf93-live-effect-cinematic-pro'
    };

    function getWorkspaceState() {
      try { if (typeof videoWorkspaceState !== 'undefined') return videoWorkspaceState; } catch (_) {}
      return window.videoWorkspaceState || null;
    }

    function syncEditorMetrics() {
      if (!page) return;
      const viewportHeight = Math.max(320, Math.round(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 720));
      page.style.setProperty('--vf93-page-h', `${viewportHeight}px`);
      window.requestAnimationFrame(() => {
        if (!page.classList.contains('active')) return;
        const headerHeight = Math.max(56, Math.ceil(editorHeader?.getBoundingClientRect().height || 76));
        const dockHeight = Math.max(62, Math.ceil(editorDock?.getBoundingClientRect().height || 78));
        page.style.setProperty('--vf93-header-h', `${headerHeight}px`);
        page.style.setProperty('--vf93-dock-h', `${dockHeight}px`);
      });
    }

    function resetToolScroll() { if (toolSheet) toolSheet.scrollTop = 0; }

    function applyLiveEffect() {
      if (!video) return;
      EFFECT_CLASSES.forEach((name) => video.classList.remove(name));
      const className = EFFECT_CLASS_MAP[getWorkspaceState()?.settings?.effectId || 'natural'];
      if (className) video.classList.add(className);
    }

    function syncAudioPreview() {
      if (video) video.muted = getWorkspaceState()?.settings?.audioEnabled === false;
    }

    function installEditorWrappers() {
      if (originalOpenV82EditorTool && !originalOpenV82EditorTool.__vforgeV93EditorWrapper) {
        const wrapped = function () {
          const result = originalOpenV82EditorTool.apply(this, arguments);
          requestAnimationFrame(() => { syncEditorMetrics(); resetToolScroll(); });
          return result;
        };
        wrapped.__vforgeV93EditorWrapper = true;
        window.openV82EditorTool = wrapped;
      }
      if (originalToggleWorkspaceAudio && !originalToggleWorkspaceAudio.__vforgeV93EditorWrapper) {
        const wrapped = function () { const result = originalToggleWorkspaceAudio.apply(this, arguments); syncAudioPreview(); return result; };
        wrapped.__vforgeV93EditorWrapper = true;
        window.toggleWorkspaceAudio = wrapped;
      }
      if (originalSelectStudioEffect && !originalSelectStudioEffect.__vforgeV93EditorWrapper) {
        const wrapped = function () { const result = originalSelectStudioEffect.apply(this, arguments); applyLiveEffect(); return result; };
        wrapped.__vforgeV93EditorWrapper = true;
        window.selectStudioEffect = wrapped;
      }
      if (originalSelectStudioTemplate && !originalSelectStudioTemplate.__vforgeV93EditorWrapper) {
        const wrapped = function () { const result = originalSelectStudioTemplate.apply(this, arguments); applyLiveEffect(); syncAudioPreview(); return result; };
        wrapped.__vforgeV93EditorWrapper = true;
        window.selectStudioTemplate = wrapped;
      }
    }

    function installMetricObservers() {
      if (typeof ResizeObserver === 'function') {
        const observer = new ResizeObserver(syncEditorMetrics);
        if (editorHeader) observer.observe(editorHeader);
        if (editorDock) observer.observe(editorDock);
      }
      window.addEventListener('resize', syncEditorMetrics, { passive: true });
      window.visualViewport?.addEventListener('resize', syncEditorMetrics, { passive: true });
      window.addEventListener('orientationchange', () => setTimeout(syncEditorMetrics, 120), { passive: true });
    }

    const MIN_SCALE = 1;
    const MAX_SCALE = 3.5;
    const SCALE_STEP = 0.25;
    const state = {
      scale: 1, x: 0, y: 0, pointers: new Map(), gestureStartDistance: 0, gestureStartScale: 1,
      panStartX: 0, panStartY: 0, panOriginX: 0, panOriginY: 0, moved: false,
      suppressClickUntil: 0, setupAttempts: 0
    };

    function showInfo(message) {
      try {
        if (typeof window.v9Toast === 'function') window.v9Toast(message, 'info');
        else if (typeof window.safeShowToast === 'function') window.safeShowToast(message, 'info');
        else if (typeof window.showToast === 'function') window.showToast(message, 'info');
      } catch (_) {}
    }

    function getElements() {
      const editorPage = byId('page-video-workspace');
      return {
        page: editorPage,
        stage: editorPage?.querySelector('.v82-preview-stage'),
        frame: byId('workspace-video-frame'),
        video: byId('workspace-video'),
        topbar: byId('v91-preview-topbar'),
        controls: byId('v91-preview-controls'),
        meta: editorPage?.querySelector('.v82-preview-meta')
      };
    }

    function getPanBounds(scale = state.scale) {
      const { frame } = getElements();
      if (!frame || scale <= 1) return { x: 0, y: 0 };
      return { x: Math.max(0, (frame.clientWidth * (scale - 1)) / 2), y: Math.max(0, (frame.clientHeight * (scale - 1)) / 2) };
    }

    function normalizePan() {
      const bounds = getPanBounds();
      state.x = clamp(state.x, -bounds.x, bounds.x);
      state.y = clamp(state.y, -bounds.y, bounds.y);
      if (state.scale <= 1.001) { state.x = 0; state.y = 0; }
    }

    function updatePreviewTransform() {
      const { video: previewVideo, frame } = getElements();
      if (!previewVideo || !frame) return;
      normalizePan();
      previewVideo.style.setProperty('transform', `translate3d(${state.x.toFixed(2)}px, ${state.y.toFixed(2)}px, 0) scale(${state.scale.toFixed(3)})`, 'important');
      previewVideo.style.setProperty('transform-origin', '50% 50%', 'important');
      frame.dataset.previewZoom = state.scale > 1.001 ? 'zoomed' : 'fit';
      const label = byId('v913-preview-zoom-label');
      if (label) label.textContent = `${Math.round(state.scale * 100)}%`;
      const out = byId('v913-preview-zoom-out');
      const into = byId('v913-preview-zoom-in');
      if (out) out.disabled = state.scale <= MIN_SCALE + .001;
      if (into) into.disabled = state.scale >= MAX_SCALE - .001;
    }

    function setPreviewScale(value, announce = false) {
      state.scale = clamp(Number(value) || MIN_SCALE, MIN_SCALE, MAX_SCALE);
      if (state.scale <= 1.001) { state.scale = 1; state.x = 0; state.y = 0; }
      updatePreviewTransform();
      if (announce) showInfo(`Zoom preview ${Math.round(state.scale * 100)}%.`);
    }

    function resetPreviewTransform(announce = false) {
      state.scale = 1; state.x = 0; state.y = 0; updatePreviewTransform();
      if (announce) showInfo('Zoom preview kembali ke 100%.');
    }

    function createZoomControls() {
      const { topbar } = getElements();
      if (!topbar || byId('v913-preview-zoom')) return;
      const badge = topbar.querySelector('.v91-preview-badge');
      if (badge) badge.hidden = true;
      const group = document.createElement('div');
      group.id = 'v913-preview-zoom'; group.className = 'v913-preview-zoom'; group.setAttribute('role','group'); group.setAttribute('aria-label','Zoom preview video');
      group.innerHTML = '<button id="v913-preview-zoom-out" type="button" aria-label="Perkecil preview"><span class="material-icons-round">remove</span></button><button id="v913-preview-zoom-reset" type="button" aria-label="Reset zoom preview"><strong id="v913-preview-zoom-label">100%</strong></button><button id="v913-preview-zoom-in" type="button" aria-label="Perbesar preview"><span class="material-icons-round">add</span></button>';
      topbar.appendChild(group);
      byId('v913-preview-zoom-out')?.addEventListener('click', () => setPreviewScale(state.scale - SCALE_STEP, true));
      byId('v913-preview-zoom-in')?.addEventListener('click', () => setPreviewScale(state.scale + SCALE_STEP, true));
      byId('v913-preview-zoom-reset')?.addEventListener('click', () => resetPreviewTransform(true));
    }

    function composePreviewLayout() {
      const { stage, frame, topbar, controls, meta } = getElements();
      if (!stage || !frame || !topbar || !controls || !meta) return false;
      stage.classList.add('v913-preview-layout');
      if (topbar.parentElement !== stage) stage.insertBefore(topbar, frame);
      if (controls.parentElement !== stage) stage.insertBefore(controls, meta);
      createZoomControls(); updatePreviewTransform(); return true;
    }

    function pointerDistance() {
      const values = Array.from(state.pointers.values());
      if (values.length < 2) return 0;
      return Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
    }

    function bindPreviewGestures() {
      const { video: previewVideo } = getElements();
      if (!previewVideo || previewVideo.dataset.v913bGestures === 'true') return Boolean(previewVideo);
      previewVideo.dataset.v913bGestures = 'true';
      previewVideo.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        try { previewVideo.setPointerCapture(event.pointerId); } catch (_) {}
        state.moved = false;
        if (state.pointers.size === 1) {
          state.panStartX = event.clientX; state.panStartY = event.clientY; state.panOriginX = state.x; state.panOriginY = state.y;
        } else if (state.pointers.size === 2) {
          state.gestureStartDistance = Math.max(1, pointerDistance()); state.gestureStartScale = state.scale;
        }
      });
      previewVideo.addEventListener('pointermove', (event) => {
        if (!state.pointers.has(event.pointerId)) return;
        state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (state.pointers.size >= 2) {
          const d = pointerDistance();
          if (d > 0) { setPreviewScale(state.gestureStartScale * (d / state.gestureStartDistance), false); state.moved = true; }
          return;
        }
        if (state.scale > 1.001) {
          const dx = event.clientX - state.panStartX; const dy = event.clientY - state.panStartY;
          if (Math.abs(dx) > 2 || Math.abs(dy) > 2) state.moved = true;
          state.x = state.panOriginX + dx; state.y = state.panOriginY + dy; updatePreviewTransform();
        }
      });
      function finish(event) {
        if (state.moved) state.suppressClickUntil = performance.now() + 220;
        state.pointers.delete(event.pointerId);
        if (state.pointers.size === 1) {
          const remaining = Array.from(state.pointers.values())[0];
          state.panStartX = remaining.x; state.panStartY = remaining.y; state.panOriginX = state.x; state.panOriginY = state.y;
        }
      }
      previewVideo.addEventListener('pointerup', finish);
      previewVideo.addEventListener('pointercancel', finish);
      previewVideo.addEventListener('lostpointercapture', finish);
      previewVideo.addEventListener('click', (event) => {
        if (performance.now() < state.suppressClickUntil) { event.preventDefault(); event.stopImmediatePropagation(); }
      }, true);
      previewVideo.addEventListener('dblclick', (event) => { event.preventDefault(); event.stopImmediatePropagation(); resetPreviewTransform(true); }, true);
      previewVideo.addEventListener('loadedmetadata', () => { resetPreviewTransform(false); requestAnimationFrame(composePreviewLayout); });
      previewVideo.addEventListener('emptied', () => resetPreviewTransform(false));
      return true;
    }

    function updateTimelineZoomButtons() {
      if (window.VForgeTimeline94?.version === '9.4.0') return;
      const editor = window.VForgeEditor91;
      if (!editor?.state) return;
    }

    function enhanceTimelineZoom() {
      if (window.VForgeTimeline94?.version === '9.4.0') return true;
      const editor = window.VForgeEditor91;
      const zoomOut = byId('v91-zoom-out');
      const zoomIn = byId('v91-zoom-in');
      if (!editor?.state || typeof editor.setTimelineZoom !== 'function' || !zoomOut || !zoomIn) return false;
      return true;
    }

    function setupEditorZoom() {
      const layoutReady = composePreviewLayout();
      const gesturesReady = bindPreviewGestures();
      const timelineReady = enhanceTimelineZoom();
      if (!layoutReady || !gesturesReady || !timelineReady) {
        state.setupAttempts += 1;
        if (state.setupAttempts <= 40) setTimeout(setupEditorZoom, 100);
      } else state.setupAttempts = 0;
    }

    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-workspace-setting="aspectRatio"]')) {
        resetPreviewTransform(false);
        requestAnimationFrame(() => { composePreviewLayout(); updatePreviewTransform(); });
      }
    });
    document.addEventListener('vforge:pagechange', (event) => {
      if (event.detail?.pageId !== 'page-video-workspace') return;
      state.setupAttempts = 0;
      requestAnimationFrame(() => {
        setupEditorZoom(); syncEditorMetrics(); resetToolScroll(); applyLiveEffect(); syncAudioPreview();
      });
    });
    window.addEventListener('resize', () => requestAnimationFrame(() => { normalizePan(); updatePreviewTransform(); updateTimelineZoomButtons(); }), { passive: true });

    installEditorWrappers();
    installMetricObservers();
    video?.addEventListener('loadedmetadata', () => { syncEditorMetrics(); resetToolScroll(); applyLiveEffect(); syncAudioPreview(); });
    video?.addEventListener('emptied', () => { EFFECT_CLASSES.forEach((name) => video.classList.remove(name)); video.muted = false; });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupEditorZoom, { once: true });
    else setupEditorZoom();

    document.documentElement.dataset.vforgeEditor93 = VERSION;
    window.VForgeEditor93 = {
      version: VERSION,
      syncLayout: syncEditorMetrics,
      layoutMetrics: () => ({
        viewport: Math.round(window.visualViewport?.height || window.innerHeight || 0),
        header: Math.round(editorHeader?.getBoundingClientRect().height || 0),
        dock: Math.round(editorDock?.getBoundingClientRect().height || 0),
        shell: Math.round(page?.querySelector('.v82-editor-shell')?.getBoundingClientRect().height || 0),
        preview: Math.round(page?.querySelector('.v82-preview-stage')?.getBoundingClientRect().height || 0),
        timeline: Math.round(document.getElementById('studio-mini-timeline')?.getBoundingClientRect().height || 0),
        tools: Math.round(toolSheet?.getBoundingClientRect().height || 0)
      }),
      applyLiveEffect,
      syncAudioPreview,
      setPreviewScale,
      resetPreviewTransform
    };
  } catch (error) {
    console.error('[V-Forge] V9.4 editor compatibility layer gagal dimulai:', error);
  }
})();

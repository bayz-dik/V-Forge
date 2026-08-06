// ============================================================
// V-FORGE v9.1.3 — MOBILE WORKSPACE, PREVIEW ZOOM & DESKTOP LAYOUT
// Additive hotfix for v9.1.2. Keeps the current editor engine intact.
// ============================================================

(function () {
  'use strict';

  const VERSION = '9.1.3';
  const MIN_SCALE = 1;
  const MAX_SCALE = 3.5;
  const SCALE_STEP = 0.25;

  const preview = {
    scale: 1,
    x: 0,
    y: 0,
    pointers: new Map(),
    gestureStartDistance: 0,
    gestureStartScale: 1,
    panStartX: 0,
    panStartY: 0,
    panOriginX: 0,
    panOriginY: 0,
    moved: false,
    suppressClickUntil: 0,
  };

  const byId = (id) => document.getElementById(id);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function toast(message, type = 'info') {
    if (typeof window.v9Toast === 'function') window.v9Toast(message, type);
    else if (typeof window.safeShowToast === 'function') window.safeShowToast(message, type);
    else if (typeof window.showToast === 'function') window.showToast(message, type);
  }

  function injectStylesheet() {
    if (document.querySelector('link[data-vforge-v913]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `css/v913-layout.css?v=${VERSION}`;
    link.dataset.vforgeV913 = VERSION;
    document.head.appendChild(link);
  }

  function getPreviewElements() {
    const page = byId('page-video-workspace');
    const stage = page?.querySelector('.v82-preview-stage');
    const frame = byId('workspace-video-frame');
    const video = byId('workspace-video');
    const topbar = byId('v91-preview-topbar');
    const controls = byId('v91-preview-controls');
    const meta = page?.querySelector('.v82-preview-meta');
    return { page, stage, frame, video, topbar, controls, meta };
  }

  function createPreviewZoomControls() {
    const { stage, topbar } = getPreviewElements();
    if (!stage || !topbar || byId('v913-preview-zoom')) return;

    const badge = topbar.querySelector('.v91-preview-badge');
    if (badge) badge.hidden = true;

    const group = document.createElement('div');
    group.id = 'v913-preview-zoom';
    group.className = 'v913-preview-zoom';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Zoom preview video');
    group.innerHTML = `
      <button id="v913-preview-zoom-out" type="button" aria-label="Perkecil preview"><span class="material-icons-round">remove</span></button>
      <button id="v913-preview-zoom-reset" type="button" aria-label="Reset zoom preview"><strong id="v913-preview-zoom-label">100%</strong></button>
      <button id="v913-preview-zoom-in" type="button" aria-label="Perbesar preview"><span class="material-icons-round">add</span></button>`;
    topbar.appendChild(group);

    byId('v913-preview-zoom-out')?.addEventListener('click', () => setPreviewScale(preview.scale - SCALE_STEP, true));
    byId('v913-preview-zoom-in')?.addEventListener('click', () => setPreviewScale(preview.scale + SCALE_STEP, true));
    byId('v913-preview-zoom-reset')?.addEventListener('click', () => resetPreviewTransform(true));
  }

  function recomposePreviewLayout() {
    const { stage, frame, topbar, controls, meta } = getPreviewElements();
    if (!stage || !frame || !topbar || !controls || !meta) return;

    stage.classList.add('v913-preview-layout');

    if (topbar.parentElement !== stage) stage.insertBefore(topbar, frame);
    if (controls.parentElement !== stage) stage.insertBefore(controls, meta);

    createPreviewZoomControls();
    updatePreviewTransform();
  }

  function getPanBounds(scale = preview.scale) {
    const { frame } = getPreviewElements();
    if (!frame || scale <= 1) return { x: 0, y: 0 };
    return {
      x: Math.max(0, (frame.clientWidth * (scale - 1)) / 2),
      y: Math.max(0, (frame.clientHeight * (scale - 1)) / 2),
    };
  }

  function normalisePan() {
    const bounds = getPanBounds();
    preview.x = clamp(preview.x, -bounds.x, bounds.x);
    preview.y = clamp(preview.y, -bounds.y, bounds.y);
    if (preview.scale <= 1) {
      preview.x = 0;
      preview.y = 0;
    }
  }

  function updatePreviewTransform() {
    const { video, frame } = getPreviewElements();
    if (!video || !frame) return;

    normalisePan();
    video.style.setProperty(
      'transform',
      `translate3d(${preview.x.toFixed(2)}px, ${preview.y.toFixed(2)}px, 0) scale(${preview.scale.toFixed(3)})`,
      'important'
    );
    video.style.setProperty('transform-origin', '50% 50%', 'important');
    frame.dataset.previewZoom = preview.scale > 1.001 ? 'zoomed' : 'fit';

    const label = byId('v913-preview-zoom-label');
    if (label) label.textContent = `${Math.round(preview.scale * 100)}%`;

    const out = byId('v913-preview-zoom-out');
    const inside = byId('v913-preview-zoom-in');
    if (out) out.disabled = preview.scale <= MIN_SCALE + 0.001;
    if (inside) inside.disabled = preview.scale >= MAX_SCALE - 0.001;
  }

  function setPreviewScale(value, announce = false) {
    preview.scale = clamp(Number(value) || MIN_SCALE, MIN_SCALE, MAX_SCALE);
    if (preview.scale <= 1.001) {
      preview.scale = 1;
      preview.x = 0;
      preview.y = 0;
    }
    updatePreviewTransform();
    if (announce) toast(`Zoom preview ${Math.round(preview.scale * 100)}%.`, 'info');
  }

  function resetPreviewTransform(announce = false) {
    preview.scale = 1;
    preview.x = 0;
    preview.y = 0;
    updatePreviewTransform();
    if (announce) toast('Zoom preview dikembalikan ke 100%.', 'info');
  }

  function pointerDistance() {
    const values = Array.from(preview.pointers.values());
    if (values.length < 2) return 0;
    return Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
  }

  function bindPreviewGestures() {
    const { video, frame } = getPreviewElements();
    if (!video || !frame || video.dataset.v913Gestures === 'true') return;
    video.dataset.v913Gestures = 'true';

    video.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      preview.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      video.setPointerCapture?.(event.pointerId);
      preview.moved = false;

      if (preview.pointers.size === 1) {
        preview.panStartX = event.clientX;
        preview.panStartY = event.clientY;
        preview.panOriginX = preview.x;
        preview.panOriginY = preview.y;
      } else if (preview.pointers.size === 2) {
        preview.gestureStartDistance = Math.max(1, pointerDistance());
        preview.gestureStartScale = preview.scale;
      }
    });

    video.addEventListener('pointermove', (event) => {
      if (!preview.pointers.has(event.pointerId)) return;
      preview.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (preview.pointers.size >= 2) {
        const distance = pointerDistance();
        if (distance > 0) {
          const next = preview.gestureStartScale * (distance / preview.gestureStartDistance);
          setPreviewScale(next, false);
          preview.moved = true;
        }
        return;
      }

      if (preview.scale > 1.001) {
        const dx = event.clientX - preview.panStartX;
        const dy = event.clientY - preview.panStartY;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) preview.moved = true;
        preview.x = preview.panOriginX + dx;
        preview.y = preview.panOriginY + dy;
        updatePreviewTransform();
      }
    });

    const finishPointer = (event) => {
      if (preview.moved) preview.suppressClickUntil = performance.now() + 220;
      preview.pointers.delete(event.pointerId);
      if (preview.pointers.size === 1) {
        const remaining = Array.from(preview.pointers.values())[0];
        preview.panStartX = remaining.x;
        preview.panStartY = remaining.y;
        preview.panOriginX = preview.x;
        preview.panOriginY = preview.y;
      }
    };

    video.addEventListener('pointerup', finishPointer);
    video.addEventListener('pointercancel', finishPointer);
    video.addEventListener('lostpointercapture', finishPointer);

    video.addEventListener('click', (event) => {
      if (performance.now() < preview.suppressClickUntil) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);

    video.addEventListener('dblclick', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      resetPreviewTransform(true);
    }, true);

    video.addEventListener('loadedmetadata', () => {
      resetPreviewTransform(false);
      requestAnimationFrame(recomposePreviewLayout);
    });
    video.addEventListener('emptied', () => resetPreviewTransform(false));
  }

  function enhanceTimelineZoom() {
    const api = window.VForgeEditor91;
    const zoomOut = byId('v91-zoom-out');
    const zoomIn = byId('v91-zoom-in');
    if (!api?.state || typeof api.setTimelineZoom !== 'function' || !zoomOut || !zoomIn) return;
    if (zoomOut.dataset.v913Bound === 'true') return;
    zoomOut.dataset.v913Bound = 'true';
    zoomIn.dataset.v913Bound = 'true';

    const run = (direction, event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const current = Number(api.state.pxPerSecond) || 44;
      const next = direction > 0 ? current * 1.5 : current / 1.5;
      api.setTimelineZoom(next);
      requestAnimationFrame(updateTimelineZoomButtons);
    };

    zoomOut.addEventListener('click', (event) => run(-1, event), true);
    zoomIn.addEventListener('click', (event) => run(1, event), true);
    updateTimelineZoomButtons();
  }

  function updateTimelineZoomButtons() {
    const state = window.VForgeEditor91?.state;
    if (!state) return;
    const value = Number(state.pxPerSecond) || 44;
    const zoomOut = byId('v91-zoom-out');
    const zoomIn = byId('v91-zoom-in');
    if (zoomOut) zoomOut.disabled = value <= 22.1;
    if (zoomIn) zoomIn.disabled = value >= 109.9;
  }

  function patchPreviewSizer() {
    const original = window.syncV902PreviewCanvas;
    if (typeof original !== 'function' || original.__v913Patched) return;
    const patched = function () {
      const result = original.apply(this, arguments);
      requestAnimationFrame(() => {
        recomposePreviewLayout();
        updatePreviewTransform();
      });
      return result;
    };
    patched.__v913Patched = true;
    window.syncV902PreviewCanvas = patched;
  }

  function prepare() {
    injectStylesheet();
    patchPreviewSizer();
    recomposePreviewLayout();
    bindPreviewGestures();
    enhanceTimelineZoom();

    document.documentElement.dataset.vforgeHotfix = VERSION;

    document.addEventListener('vforge:pagechange', (event) => {
      if (event.detail?.pageId !== 'page-video-workspace') return;
      requestAnimationFrame(() => {
        recomposePreviewLayout();
        bindPreviewGestures();
        enhanceTimelineZoom();
        updatePreviewTransform();
      });
    });

    window.addEventListener('resize', () => requestAnimationFrame(() => {
      normalisePan();
      updatePreviewTransform();
      updateTimelineZoomButtons();
    }), { passive: true });

    const observer = new MutationObserver(() => {
      recomposePreviewLayout();
      bindPreviewGestures();
      enhanceTimelineZoom();
    });
    const page = byId('page-video-workspace');
    if (page) observer.observe(page, { childList: true, subtree: true });
  }

  window.VForgeLayout913 = {
    version: VERSION,
    setPreviewScale,
    resetPreviewTransform,
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', prepare, { once: true });
  else prepare();
})();

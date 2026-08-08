(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VForgeTimelineController94Factory = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  const VERSION = '9.4.0';

  function createController(deps = {}) {
    const engine = deps.engine;
    const history = deps.history;
    const view = deps.view;
    const getVideo = typeof deps.getVideo === 'function' ? deps.getVideo : () => null;
    const idFactory = typeof deps.idFactory === 'function' ? deps.idFactory : undefined;
    if (!engine || !history || !view) throw new Error('V9.4 controller requires engine, history, and view');

    let state = engine.createEmptyState();
    let trimBefore = null;
    let activePlaybackClipId = '';
    let boundVideo = null;
    let sourceObjectUrl = '';
    let playbackRaf = 0;
    let thumbnailToken = 0;


    function rafApi() {
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        return {
          request: window.requestAnimationFrame.bind(window),
          cancel: typeof window.cancelAnimationFrame === 'function' ? window.cancelAnimationFrame.bind(window) : () => {}
        };
      }
      return null;
    }

    function stopPlaybackLoop() {
      const api = rafApi();
      if (api && playbackRaf) api.cancel(playbackRaf);
      playbackRaf = 0;
    }

    function startPlaybackLoop() {
      const api = rafApi();
      if (!api || playbackRaf) return;
      const tick = () => {
        playbackRaf = 0;
        if (!state.isPlaying) return;
        view.renderPlayback?.(state);
        view.scrollToPlayhead?.(state.playheadTime, state.zoom, 'auto');
        syncPreviewControls();
        playbackRaf = api.request(tick);
      };
      playbackRaf = api.request(tick);
    }

    function handleMediaProgress() {
      const video = currentVideo();
      if (!video || state.status !== 'ready' || !state.clips.length) return;
      let index = state.clips.findIndex((clip) => clip.id === activePlaybackClipId);
      if (index < 0) {
        const mapped = engine.sequenceToSource(state, state.playheadTime);
        index = mapped?.clipIndex ?? 0;
        activePlaybackClipId = state.clips[index]?.id || '';
      }
      const clip = state.clips[index];
      if (!clip) return;

      if (!video.paused && Number(video.currentTime) >= clip.sourceEnd - 0.025) {
        const next = state.clips[index + 1];
        if (next) {
          activePlaybackClipId = next.id;
          state = engine.setPlayhead(state, next.timelineStart).state;
          try { video.currentTime = next.sourceStart; } catch (_) {}
          view.renderPlayback?.(state);
          syncPreviewControls();
          syncWorkspaceModel();
          return;
        }
        try { video.pause(); } catch (_) {}
        state = engine.setPlayhead(state, engine.projectDuration(state)).state;
        state = { ...state, isPlaying: false };
        stopPlaybackLoop();
        view.renderPlayback?.(state);
        view.scrollToPlayhead?.(state.playheadTime, state.zoom, 'auto');
        syncPreviewControls();
        syncWorkspaceModel();
        return;
      }

      const sequenceTime = engine.sourceToSequence(state, Number(video.currentTime) || 0, activePlaybackClipId);
      state = engine.setPlayhead(state, sequenceTime).state;
      view.renderPlayback?.(state);
      syncPreviewControls();
      syncWorkspaceModel();
    }

    async function createThumbnails(objectUrl, duration) {
      const token = ++thumbnailToken;
      view.setThumbnails?.([]);
      if (typeof document === 'undefined' || !objectUrl || !(duration > 0)) return;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext?.('2d', { alpha: false });
      if (!context) return;
      canvas.width = 160;
      canvas.height = 90;
      const temp = document.createElement('video');
      temp.muted = true;
      temp.playsInline = true;
      temp.preload = 'auto';
      temp.src = objectUrl;
      const frames = [];

      function waitFor(type, failType, timeout = 1000) {
        return new Promise((resolve, reject) => {
          let settled = false;
          const timer = setTimeout(() => finish(false), timeout);
          const success = () => finish(true);
          const fail = () => finish(false);
          function finish(ok) {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            temp.removeEventListener(type, success);
            if (failType) temp.removeEventListener(failType, fail);
            ok ? resolve() : reject(new Error(type));
          }
          temp.addEventListener(type, success, { once: true });
          if (failType) temp.addEventListener(failType, fail, { once: true });
        });
      }

      try {
        if (temp.readyState < 2) {
          temp.load?.();
          await waitFor('loadeddata', 'error', 1600);
        }
        for (let index = 0; index < 8; index += 1) {
          if (token !== thumbnailToken) return;
          const time = duration * ((index + 0.5) / 8);
          try {
            temp.currentTime = Math.min(Math.max(0, time), Math.max(0, duration - 0.05));
            await waitFor('seeked', 'error', 900);
            context.fillStyle = '#08080b';
            context.fillRect(0, 0, canvas.width, canvas.height);
            const sw = temp.videoWidth || 16;
            const sh = temp.videoHeight || 9;
            const sourceRatio = sw / sh;
            const targetRatio = canvas.width / canvas.height;
            let width = canvas.width;
            let height = canvas.height;
            let x = 0;
            let y = 0;
            if (sourceRatio > targetRatio) {
              height = canvas.width / sourceRatio;
              y = (canvas.height - height) / 2;
            } else {
              width = canvas.height * sourceRatio;
              x = (canvas.width - width) / 2;
            }
            context.drawImage(temp, x, y, width, height);
            frames.push({ time, dataUrl: canvas.toDataURL('image/jpeg', 0.6) });
            view.setThumbnails?.(frames);
            view.renderStructure?.(state, { disableSplit: !canSplitAtPlayhead(), disableDelete: state.status !== 'ready' || !state.selectedClipId });
          } catch (_) {
            // Placeholder thumbnails remain when browser frame capture fails.
          }
        }
      } catch (_) {
        // Presentation-only thumbnails may fail without affecting editor state.
      } finally {
        temp.removeAttribute?.('src');
        try { temp.load?.(); } catch (_) {}
      }
    }

    function currentVideo() {
      try { return getVideo() || null; } catch (_) { return null; }
    }

    function syncWorkspaceModel() {
      if (typeof window === 'undefined' || !window.videoWorkspaceState || typeof window.videoWorkspaceState !== 'object') return;
      window.videoWorkspaceState.timeline = {
        version: VERSION,
        sourceDuration: state.sourceDuration,
        sequenceDuration: engine.projectDuration(state),
        selectedClipId: state.selectedClipId,
        playheadTime: state.playheadTime,
        zoom: state.zoom,
        clips: state.clips.map(({ id, sourceStart, sourceEnd, timelineStart, timelineEnd }) => ({
          id, sourceStart, sourceEnd, timelineStart, timelineEnd
        })),
        prototypeOnly: true
      };
    }

    function renderHistory() {
      view.renderHistory?.({ canUndo: history.canUndo(), canRedo: history.canRedo() });
    }

    function canSplitAtPlayhead() {
      if (state.status !== 'ready' || !state.clips.length) return false;
      const mapped = engine.sequenceToSource(state, state.playheadTime);
      if (!mapped) return false;
      const clip = state.clips[mapped.clipIndex];
      if (!clip) return false;
      const minimum = Number(engine.MIN_CLIP_SECONDS || 0.1);
      return (mapped.sourceTime - clip.sourceStart) >= minimum - 1e-9
        && (clip.sourceEnd - mapped.sourceTime) >= minimum - 1e-9;
    }

    function enforceNonReadyMediaState() {
      if (state.status === 'ready') return;
      const video = currentVideo();
      if (video && !video.paused && typeof video.pause === 'function') {
        try { video.pause(); } catch (_) {}
      }
      stopPlaybackLoop();
      if (state.isPlaying) state = { ...state, isPlaying: false };
    }

    function renderStructure() {
      enforceNonReadyMediaState();
      syncWorkspaceModel();
      view.renderStructure?.(state, {
        disableSplit: !canSplitAtPlayhead(),
        disableDelete: state.status !== 'ready' || !state.selectedClipId
      });
      view.renderMediaStatus?.(state);
      view.renderPlayback?.(state);
      renderHistory();
    }

    function syncPreviewControls() {
      if (typeof document === 'undefined') return;
      const playButton = document.getElementById('v91-play-button');
      const icon = playButton?.querySelector('.material-icons-round');
      if (playButton) playButton.setAttribute('aria-label', state.isPlaying ? 'Jeda video' : 'Putar video');
      if (icon) icon.textContent = state.isPlaying ? 'pause' : 'play_arrow';
      const current = document.getElementById('v91-current-time');
      const total = document.getElementById('v91-total-time');
      const seek = document.getElementById('v91-seek-range');
      const duration = engine.projectDuration(state);
      const fmt = (seconds) => {
        const safe = Math.max(0, Number(seconds) || 0);
        const min = Math.floor(safe / 60);
        const sec = Math.floor(safe % 60);
        return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
      };
      if (current) current.textContent = fmt(state.playheadTime);
      if (total) total.textContent = fmt(duration);
      if (seek) seek.value = String(Math.round((duration > 0 ? state.playheadTime / duration : 0) * 1000));
    }

    function syncPreviewToPlayhead() {
      const video = currentVideo();
      if (!video || !state.clips.length) {
        syncPreviewControls();
        return;
      }
      const mapped = engine.sequenceToSource(state, state.playheadTime);
      if (mapped && Number.isFinite(mapped.sourceTime)) {
        try { video.currentTime = mapped.sourceTime; } catch (_) {}
        activePlaybackClipId = mapped.clipId;
      }
      view.renderPlayback?.(state);
      view.scrollToPlayhead?.(state.playheadTime, state.zoom, 'auto');
      syncPreviewControls();
    }

    function applyStructural(transition) {
      const before = engine.structuralSnapshot(state);
      const result = transition(state);
      if (!result?.ok) return result;
      history.record(before);
      state = result.state;
      activePlaybackClipId = state.selectedClipId;
      renderStructure();
      syncPreviewToPlayhead();
      return result;
    }

    function getState() {
      return engine.cloneState(state);
    }

    function loadSource(duration, objectUrl = '') {
      state = engine.createInitialState(duration, idFactory);
      sourceObjectUrl = String(objectUrl || '');
      history.clear();
      trimBefore = null;
      activePlaybackClipId = state.selectedClipId;
      state = { ...state, isPlaying: false };
      renderStructure();
      syncPreviewToPlayhead();
      if (state.status === 'ready') void createThumbnails(sourceObjectUrl, state.sourceDuration);
      return { ok: state.status === 'ready', state: getState(), reason: state.status === 'ready' ? '' : 'INVALID_STATE' };
    }

    function resetSource(reason = '') {
      history.clear();
      trimBefore = null;
      activePlaybackClipId = '';
      sourceObjectUrl = '';
      thumbnailToken += 1;
      view.setThumbnails?.([]);
      stopPlaybackLoop();
      state = engine.createEmptyState();
      if (reason === 'invalid' || reason === 'error') state = { ...state, status: 'invalid' };
      renderStructure();
      syncPreviewControls();
      return { ok: true, state: getState(), reason: reason || '' };
    }

    function selectClip(clipId, options = {}) {
      const result = engine.selectClip(state, clipId);
      if (!result.ok) return result;
      state = result.state;
      if (options.seekStart === true) {
        const selected = state.clips.find((clip) => clip.id === state.selectedClipId);
        if (selected) state = engine.setPlayhead(state, selected.timelineStart).state;
      }
      renderStructure();
      if (options.seekPreview !== false) syncPreviewToPlayhead();
      return { ...result, state: getState() };
    }

    function setPlayhead(sequenceTime, options = {}) {
      const result = engine.setPlayhead(state, sequenceTime);
      if (!result.ok) return result;
      state = result.state;
      const mapped = engine.sequenceToSource(state, state.playheadTime);
      if (mapped && options.select !== false) {
        const selected = engine.selectClip(state, mapped.clipId);
        if (selected.ok) state = selected.state;
        activePlaybackClipId = mapped.clipId;
      }
      view.renderPlayback?.(state);
      if (options.center !== false) view.scrollToPlayhead?.(state.playheadTime, state.zoom, options.behavior || 'auto');
      if (options.seekPreview !== false) syncPreviewToPlayhead();
      else syncPreviewControls();
      syncWorkspaceModel();
      return { ...result, state: getState() };
    }

    function splitAtPlayhead() {
      return applyStructural((current) => engine.splitAtPlayhead(current, idFactory));
    }

    function deleteSelectedClip() {
      return applyStructural((current) => engine.deleteSelectedClip(current));
    }

    function beginTrim(clipId, edge) {
      if (trimBefore) return { ok: false, state: getState(), reason: 'INVALID_STATE' };
      trimBefore = engine.structuralSnapshot(state);
      const result = engine.beginTrim(state, clipId, edge);
      if (!result.ok) {
        trimBefore = null;
        return result;
      }
      state = result.state;
      renderStructure();
      return { ...result, state: getState() };
    }

    function updateTrim(sourceTime) {
      const result = engine.updateTrim(state, sourceTime);
      if (!result.ok) return result;
      state = result.state;
      renderStructure();
      const selected = state.clips.find((clip) => clip.id === state.selectedClipId);
      const video = currentVideo();
      if (selected && video && state.trimSession) {
        const previewTime = state.trimSession.edge === 'left'
          ? selected.sourceStart
          : Math.min(state.sourceDuration, Math.max(selected.sourceStart, selected.sourceEnd - 0.001));
        try { video.currentTime = previewTime; } catch (_) {}
      }
      syncWorkspaceModel();
      return { ...result, state: getState() };
    }

    function commitTrim() {
      if (!trimBefore) return { ok: false, state: getState(), reason: 'INVALID_STATE' };
      const before = trimBefore;
      const result = engine.commitTrim(state);
      if (!result.ok) return result;
      state = result.state;
      const after = engine.structuralSnapshot(state);
      if (JSON.stringify(before) !== JSON.stringify(after)) history.record(before);
      trimBefore = null;
      renderStructure();
      syncPreviewToPlayhead();
      return { ...result, state: getState() };
    }

    function cancelTrim() {
      if (!trimBefore) return { ok: false, state: getState(), reason: 'INVALID_STATE' };
      const result = engine.cancelTrim(state);
      trimBefore = null;
      if (!result.ok) return result;
      state = result.state;
      renderStructure();
      syncPreviewToPlayhead();
      return { ...result, state: getState() };
    }

    function setZoom(pxPerSecond) {
      const result = engine.setZoom(state, pxPerSecond);
      if (!result.ok) return result;
      state = result.state;
      renderStructure();
      view.scrollToPlayhead?.(state.playheadTime, state.zoom, 'auto');
      return { ...result, state: getState() };
    }

    function zoomBy(direction) {
      const current = Number(state.zoom || engine.DEFAULT_PX_PER_SECOND || 44);
      const next = direction > 0 ? current * 1.25 : current / 1.25;
      return setZoom(next);
    }

    function undo() {
      const result = history.undo(engine.structuralSnapshot(state));
      if (!result.ok) return { ok: false, state: getState(), reason: 'NO_CHANGE' };
      state = engine.restoreStructuralSnapshot(state, result.snapshot);
      activePlaybackClipId = state.selectedClipId;
      trimBefore = null;
      renderStructure();
      syncPreviewToPlayhead();
      return { ok: true, state: getState(), reason: '' };
    }

    function redo() {
      const result = history.redo(engine.structuralSnapshot(state));
      if (!result.ok) return { ok: false, state: getState(), reason: 'NO_CHANGE' };
      state = engine.restoreStructuralSnapshot(state, result.snapshot);
      activePlaybackClipId = state.selectedClipId;
      trimBefore = null;
      renderStructure();
      syncPreviewToPlayhead();
      return { ok: true, state: getState(), reason: '' };
    }

    function pauseForInteraction() {
      const video = currentVideo();
      if (video && !video.paused && typeof video.pause === 'function') {
        try { video.pause(); } catch (_) {}
      }
      state = { ...state, isPlaying: false };
      stopPlaybackLoop();
      view.renderPlayback?.(state);
      syncPreviewControls();
      return { ok: true, state: getState(), reason: '' };
    }

    function togglePlayback() {
      const video = currentVideo();
      if (!video || state.status !== 'ready' || !state.clips.length) return { ok: false, state: getState(), reason: 'INVALID_STATE' };
      if (!video.paused && typeof video.pause === 'function') {
        video.pause();
        state = { ...state, isPlaying: false };
        stopPlaybackLoop();
        view.renderPlayback?.(state);
        syncPreviewControls();
        return { ok: true, state: getState(), reason: '' };
      }
      const mapped = engine.sequenceToSource(state, state.playheadTime);
      if (mapped) {
        activePlaybackClipId = mapped.clipId;
        try { video.currentTime = mapped.sourceTime; } catch (_) {}
      }
      state = { ...state, isPlaying: true };
      startPlaybackLoop();
      const promise = typeof video.play === 'function' ? video.play() : null;
      if (promise?.catch) promise.catch(() => {
        state = { ...state, isPlaying: false };
        stopPlaybackLoop();
        view.renderPlayback?.(state);
        syncPreviewControls();
      });
      view.renderPlayback?.(state);
      syncPreviewControls();
      return { ok: true, state: getState(), reason: '' };
    }

    function seekByRatio(ratio) {
      const total = engine.projectDuration(state);
      const safe = Math.max(0, Math.min(1, Number(ratio) || 0));
      return setPlayhead(total * safe, { seekPreview: true, center: true });
    }

    function canUndo() { return history.canUndo(); }
    function canRedo() { return history.canRedo(); }

    function handleViewAction(action = {}) {
      switch (action.type) {
        case 'split': return splitAtPlayhead();
        case 'delete': return deleteSelectedClip();
        case 'select': return selectClip(action.clipId, { seekPreview: false });
        case 'zoom': return zoomBy(action.direction);
        case 'undo': return undo();
        case 'redo': return redo();
        case 'replace-video':
          if (typeof window !== 'undefined') {
            if (typeof window.replaceWorkspaceVideo === 'function') window.replaceWorkspaceVideo();
            else if (typeof window.openVideoPicker === 'function') window.openVideoPicker();
          }
          return { ok: true, state: getState(), reason: '' };
        default: return { ok: false, state: getState(), reason: 'INVALID_STATE' };
      }
    }

    function bindVideo() {
      const video = currentVideo();
      if (!video || typeof video.addEventListener !== 'function' || video === boundVideo) return Boolean(video);
      if (video.dataset?.vf94TimelineBound === 'true') {
        boundVideo = video;
        return true;
      }
      boundVideo = video;
      if (video.dataset) video.dataset.vf94TimelineBound = 'true';
      video.addEventListener('loadedmetadata', () => {
        if (Number.isFinite(video.duration) && video.duration > 0) {
          loadSource(video.duration, video.currentSrc || video.src || video.getAttribute?.('src') || '');
        } else {
          resetSource('invalid');
        }
      });
      video.addEventListener('durationchange', () => {
        if (state.status !== 'ready' && Number.isFinite(video.duration) && video.duration > 0) {
          loadSource(video.duration, video.currentSrc || video.src || '');
        }
      });
      video.addEventListener('timeupdate', handleMediaProgress);
      video.addEventListener('play', () => {
        state = { ...state, isPlaying: true };
        startPlaybackLoop();
        view.renderPlayback?.(state);
        syncPreviewControls();
      });
      const stop = () => {
        state = { ...state, isPlaying: false };
        stopPlaybackLoop();
        view.renderPlayback?.(state);
        syncPreviewControls();
      };
      video.addEventListener('pause', stop);
      video.addEventListener('ended', stop);
      video.addEventListener('emptied', () => resetSource('empty'));
      video.addEventListener('abort', () => resetSource('empty'));
      video.addEventListener('error', () => resetSource('invalid'));
      return true;
    }

    function refresh() {
      renderStructure();
      view.scrollToPlayhead?.(state.playheadTime, state.zoom, 'auto');
      syncPreviewControls();
      return getState();
    }

    return {
      version: VERSION,
      getState,
      loadSource,
      resetSource,
      selectClip,
      setPlayhead,
      splitAtPlayhead,
      deleteSelectedClip,
      beginTrim,
      updateTrim,
      commitTrim,
      cancelTrim,
      setZoom,
      zoomBy,
      undo,
      redo,
      pauseForInteraction,
      togglePlayback,
      seekByRatio,
      syncPreviewControls,
      canUndo,
      canRedo,
      handleViewAction,
      bindVideo,
      refresh,
      _debug: () => ({ activePlaybackClipId, sourceObjectUrl })
    };
  }

  function bootBrowser() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (window.VForgeTimeline94?.version === '9.4.0') return;
    if (!window.VForgeTimelineState94 || !window.VForgeTimelineHistory94 || !window.VForgeTimelineView94) return;

    let controller = null;
    const view = window.VForgeTimelineView94.createView({
      timelineRoot: document.getElementById('studio-mini-timeline'),
      editPanel: document.querySelector('#page-video-workspace [data-editor-panel="edit"]'),
      previewFrame: document.getElementById('workspace-video-frame'),
      onAction(action) { return controller?.handleViewAction(action); }
    });

    controller = createController({
      engine: window.VForgeTimelineState94,
      history: window.VForgeTimelineHistory94.createHistory(50),
      view,
      getVideo: () => document.getElementById('workspace-video')
    });

    view.mount();
    window.VForgeTimeline94 = controller;
    controller.bindVideo();

    const refs = view.refs();
    window.VForgeTimelineGestures94?.bind({
      viewport: refs.viewport,
      clipRow: refs.clipRow,
      controller
    });
    controller.refresh();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bootBrowser, { once: true });
    } else {
      queueMicrotask(bootBrowser);
    }
  }

  return { VERSION, createController, bootBrowser };
});

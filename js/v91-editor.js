// ============================================================
// V-FORGE v9.1.0 — EDITOR UX & INTERACTIVE TIMELINE
// Local-only prototype: custom playback, Fit/Fill, scrubbing,
// trim handles, split, duplicate, delete, timeline zoom, undo/redo.
// Video bytes stay on-device; this file does not upload media.
// ============================================================

(function () {
  'use strict';

  const VERSION = '9.1.0';
  const MIN_CLIP_SECONDS = 0.25;
  const MIN_PX_PER_SECOND = 22;
  const MAX_PX_PER_SECOND = 110;
  const THUMBNAIL_COUNT = 8;

  const state = {
    ready: false,
    duration: 0,
    clips: [],
    selectedId: '',
    fitMode: 'contain',
    pxPerSecond: 44,
    history: [],
    future: [],
    playbackClipIndex: 0,
    thumbnails: [],
    thumbnailToken: 0,
    dragging: null,
    suppressTimeUpdate: false,
    lastObjectUrl: '',
  };

  const el = {};

  function byId(id) {
    return document.getElementById(id);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function uid(prefix = 'clip') {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function toast(message, type = 'info') {
    if (typeof window.v9Toast === 'function') window.v9Toast(message, type);
    else if (typeof window.safeShowToast === 'function') window.safeShowToast(message, type);
    else if (typeof window.showToast === 'function') window.showToast(message, type);
  }

  function formatTime(seconds, includeTenths = false) {
    const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    const minutes = Math.floor(safe / 60);
    const remaining = safe - minutes * 60;
    if (includeTenths && safe < 60) {
      return `${String(minutes).padStart(2, '0')}:${remaining.toFixed(1).padStart(4, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(Math.floor(remaining)).padStart(2, '0')}`;
  }

  function getVideo() {
    return byId('workspace-video');
  }

  function getSelectedIndex() {
    return Math.max(0, state.clips.findIndex((clip) => clip.id === state.selectedId));
  }

  function getSelectedClip() {
    return state.clips[getSelectedIndex()] || null;
  }

  function clipDuration(clip) {
    return Math.max(0, Number(clip?.end || 0) - Number(clip?.start || 0));
  }

  function sequenceDuration() {
    return state.clips.reduce((total, clip) => total + clipDuration(clip), 0);
  }

  function sequenceOffsetForIndex(index) {
    let total = 0;
    for (let i = 0; i < index; i += 1) total += clipDuration(state.clips[i]);
    return total;
  }

  function sourceToSequence(sourceTime, preferredIndex = getSelectedIndex()) {
    if (!state.clips.length) return 0;
    const preferred = state.clips[preferredIndex];
    if (preferred && sourceTime >= preferred.start - 0.03 && sourceTime <= preferred.end + 0.03) {
      return sequenceOffsetForIndex(preferredIndex) + clamp(sourceTime - preferred.start, 0, clipDuration(preferred));
    }
    const index = state.clips.findIndex((clip) => sourceTime >= clip.start - 0.03 && sourceTime <= clip.end + 0.03);
    if (index >= 0) return sequenceOffsetForIndex(index) + clamp(sourceTime - state.clips[index].start, 0, clipDuration(state.clips[index]));
    return sequenceOffsetForIndex(preferredIndex);
  }

  function sequenceToSource(sequenceTime) {
    const total = sequenceDuration();
    const safe = clamp(sequenceTime, 0, total);
    let cursor = 0;
    for (let index = 0; index < state.clips.length; index += 1) {
      const clip = state.clips[index];
      const length = clipDuration(clip);
      if (safe <= cursor + length || index === state.clips.length - 1) {
        return {
          index,
          clip,
          sourceTime: clamp(clip.start + (safe - cursor), clip.start, clip.end),
          sequenceTime: safe,
        };
      }
      cursor += length;
    }
    return { index: 0, clip: state.clips[0], sourceTime: state.clips[0]?.start || 0, sequenceTime: 0 };
  }

  function snapshot() {
    return {
      clips: state.clips.map((clip) => ({ ...clip })),
      selectedId: state.selectedId,
    };
  }

  function pushHistory() {
    state.history.push(snapshot());
    if (state.history.length > 40) state.history.shift();
    state.future = [];
    renderHistoryButtons();
  }

  function applySnapshot(value) {
    if (!value) return;
    state.clips = value.clips.map((clip) => ({ ...clip }));
    state.selectedId = state.clips.some((clip) => clip.id === value.selectedId)
      ? value.selectedId
      : state.clips[0]?.id || '';
    const video = getVideo();
    const selected = getSelectedClip();
    if (video && selected) {
      state.suppressTimeUpdate = true;
      video.currentTime = clamp(video.currentTime, selected.start, selected.end);
      state.suppressTimeUpdate = false;
    }
    renderAll();
  }

  function undo() {
    if (!state.history.length) return;
    state.future.push(snapshot());
    applySnapshot(state.history.pop());
  }

  function redo() {
    if (!state.future.length) return;
    state.history.push(snapshot());
    applySnapshot(state.future.pop());
  }

  function renderHistoryButtons() {
    const undoButtons = [byId('v91-undo'), byId('studio-undo-button')].filter(Boolean);
    const redoButtons = [byId('v91-redo'), byId('studio-redo-button')].filter(Boolean);
    undoButtons.forEach((button) => { button.disabled = state.history.length === 0; });
    redoButtons.forEach((button) => { button.disabled = state.future.length === 0; });
  }

  function injectStylesheet() {
    if (document.querySelector('link[data-vforge-v91]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'css/v91-editor.css?v=9.1.0';
    link.dataset.vforgeV91 = VERSION;
    document.head.appendChild(link);
  }

  function createPreviewControls() {
    const stage = document.querySelector('#page-video-workspace .v82-preview-stage');
    const frame = byId('workspace-video-frame');
    const video = getVideo();
    if (!stage || !frame || !video || byId('v91-preview-controls')) return;

    video.removeAttribute('controls');
    video.setAttribute('aria-label', 'Preview video V-Forge');

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

    byId('v91-fit-button')?.addEventListener('click', () => setFitMode('contain'));
    byId('v91-fill-button')?.addEventListener('click', () => setFitMode('cover'));
    byId('v91-play-button')?.addEventListener('click', togglePlayback);
    byId('v91-fullscreen-button')?.addEventListener('click', enterFullscreen);
    byId('v91-seek-range')?.addEventListener('input', handleSeekRange);

    video.addEventListener('click', togglePlayback);
  }

  function createTimeline() {
    const timeline = byId('studio-mini-timeline');
    if (!timeline || timeline.dataset.v91Ready === 'true') return;
    timeline.dataset.v91Ready = 'true';
    timeline.innerHTML = `
      <div class="v91-timeline-header">
        <div class="v91-history-controls">
          <button id="v91-undo" type="button" aria-label="Urungkan" disabled><span class="material-icons-round">undo</span></button>
          <button id="v91-redo" type="button" aria-label="Ulangi" disabled><span class="material-icons-round">redo</span></button>
        </div>
        <div class="v91-timeline-title"><strong>Timeline</strong><small id="v91-clip-summary">Belum ada klip</small></div>
        <div class="v91-zoom-controls">
          <button id="v91-zoom-out" type="button" aria-label="Perkecil timeline"><span class="material-icons-round">remove</span></button>
          <span id="v91-zoom-label">100%</span>
          <button id="v91-zoom-in" type="button" aria-label="Perbesar timeline"><span class="material-icons-round">add</span></button>
        </div>
      </div>
      <div id="v91-timeline-viewport" class="v91-timeline-viewport">
        <div id="v91-timeline-canvas" class="v91-timeline-canvas">
          <div id="v91-ruler" class="v91-ruler"></div>
          <div id="v91-clip-row" class="v91-clip-row"></div>
          <div class="v91-audio-row"><span class="material-icons-round">graphic_eq</span><div class="v91-waveform" aria-hidden="true"></div></div>
          <button id="v91-playhead" class="v91-playhead" type="button" aria-label="Geser playhead"><span></span></button>
        </div>
      </div>`;

    byId('v91-undo')?.addEventListener('click', undo);
    byId('v91-redo')?.addEventListener('click', redo);
    byId('v91-zoom-out')?.addEventListener('click', () => setTimelineZoom(state.pxPerSecond - 11));
    byId('v91-zoom-in')?.addEventListener('click', () => setTimelineZoom(state.pxPerSecond + 11));
    byId('v91-timeline-canvas')?.addEventListener('pointerdown', handleTimelinePointerDown);
    byId('v91-playhead')?.addEventListener('pointerdown', startPlayheadDrag);
  }

  function createQuickTools() {
    const panel = document.querySelector('#page-video-workspace [data-editor-panel="edit"]');
    const heading = panel?.querySelector('.v82-tool-heading');
    if (!panel || !heading || byId('v91-quick-tools')) return;

    const tools = document.createElement('section');
    tools.id = 'v91-quick-tools';
    tools.className = 'v91-quick-tools';
    tools.setAttribute('aria-label', 'Alat edit klip');
    tools.innerHTML = `
      <div class="v91-quick-title"><span><small>KLIP AKTIF</small><strong id="v91-selected-clip-label">Klip 1</strong></span><em id="v91-selected-range">00:00 – 00:00</em></div>
      <div class="v91-quick-grid">
        <button id="v91-split-button" type="button"><span class="material-icons-round">call_split</span><small>Split</small></button>
        <button id="v91-duplicate-button" type="button"><span class="material-icons-round">content_copy</span><small>Duplikat</small></button>
        <button id="v91-delete-button" type="button" class="danger"><span class="material-icons-round">delete_outline</span><small>Hapus</small></button>
        <button id="v91-reset-button" type="button"><span class="material-icons-round">restart_alt</span><small>Reset</small></button>
      </div>
      <p class="v91-trim-hint"><span class="material-icons-round">swipe</span>Geser pegangan untuk trim. Timeline ini menjadi blueprint editor Kotlin; ekspor web masih memakai sumber utama.</p>`;
    heading.insertAdjacentElement('afterend', tools);

    byId('v91-split-button')?.addEventListener('click', splitAtPlayhead);
    byId('v91-duplicate-button')?.addEventListener('click', duplicateSelectedClip);
    byId('v91-delete-button')?.addEventListener('click', deleteSelectedClip);
    byId('v91-reset-button')?.addEventListener('click', resetTimeline);
  }

  function createExportNotice() {
    const panel = document.querySelector('#page-video-workspace [data-editor-panel="export"] .processor-card');
    if (!panel || byId('v91-export-notice')) return;
    const notice = document.createElement('p');
    notice.id = 'v91-export-notice';
    notice.className = 'v91-export-notice';
    notice.innerHTML = '<span class="material-icons-round">science</span><span><strong>Timeline V9.1 masih prototype</strong><small>Trim, split, dan urutan klip sudah aktif untuk preview. Ekspor web saat ini belum merangkai multi-klip; engine final dibangun native di Kotlin V10.</small></span>';
    panel.insertAdjacentElement('afterbegin', notice);
  }

  function setFitMode(mode) {
    state.fitMode = mode === 'cover' ? 'cover' : 'contain';
    applyFitMode();
    renderFitButtons();
    toast(state.fitMode === 'contain' ? 'Fit aktif: seluruh frame video terlihat.' : 'Fill aktif: canvas dipenuhi dan sisi video dapat terpotong.', 'info');
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

  function togglePlayback() {
    const video = getVideo();
    if (!video || !state.ready) return;
    if (!video.paused) {
      video.pause();
      return;
    }
    const selectedIndex = getSelectedIndex();
    const selected = state.clips[selectedIndex];
    if (!selected) return;
    state.playbackClipIndex = selectedIndex;
    if (video.currentTime < selected.start || video.currentTime >= selected.end - 0.04) video.currentTime = selected.start;
    const promise = video.play();
    if (promise?.catch) promise.catch(() => toast('Video belum dapat diputar. Sentuh preview lalu coba lagi.', 'info'));
  }

  async function enterFullscreen() {
    const frame = byId('workspace-video-frame');
    if (!frame) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (frame.requestFullscreen) await frame.requestFullscreen();
      else toast('Mode layar penuh belum didukung browser ini.', 'info');
    } catch (_) {
      toast('Layar penuh belum dapat dibuka.', 'info');
    }
  }

  function handleSeekRange(event) {
    if (!state.ready) return;
    const total = sequenceDuration();
    const sequenceTime = total * (Number(event.target.value) / 1000);
    seekSequence(sequenceTime, { select: true, center: false });
  }

  function seekSequence(sequenceTime, options = {}) {
    const video = getVideo();
    if (!video || !state.clips.length) return;
    const mapped = sequenceToSource(sequenceTime);
    state.playbackClipIndex = mapped.index;
    if (options.select !== false) state.selectedId = mapped.clip.id;
    state.suppressTimeUpdate = true;
    video.currentTime = mapped.sourceTime;
    state.suppressTimeUpdate = false;
    renderAll();
    if (options.center !== false) centerPlayhead();
  }

  function handleTimeUpdate() {
    const video = getVideo();
    if (!video || !state.ready || state.suppressTimeUpdate) return;
    let index = clamp(state.playbackClipIndex, 0, Math.max(0, state.clips.length - 1));
    let clip = state.clips[index];
    if (!clip) return;

    if (!video.paused && video.currentTime >= clip.end - 0.025) {
      const nextIndex = index + 1;
      if (nextIndex < state.clips.length) {
        state.playbackClipIndex = nextIndex;
        state.selectedId = state.clips[nextIndex].id;
        video.currentTime = state.clips[nextIndex].start;
        return;
      }
      video.pause();
      video.currentTime = clip.end;
    }

    if (video.currentTime < clip.start - 0.04 || video.currentTime > clip.end + 0.04) {
      const matching = state.clips.findIndex((item) => video.currentTime >= item.start - 0.03 && video.currentTime <= item.end + 0.03);
      if (matching >= 0) {
        index = matching;
        clip = state.clips[index];
        state.playbackClipIndex = index;
        state.selectedId = clip.id;
      }
    }

    renderPlaybackOnly();
  }

  function renderPlaybackOnly() {
    const video = getVideo();
    if (!video) return;
    const sequence = sourceToSequence(video.currentTime, state.playbackClipIndex);
    const total = Math.max(0.001, sequenceDuration());
    const ratio = clamp(sequence / total, 0, 1);
    const seek = byId('v91-seek-range');
    if (seek) seek.value = String(Math.round(ratio * 1000));
    if (byId('v91-current-time')) byId('v91-current-time').textContent = formatTime(sequence);
    if (byId('v91-total-time')) byId('v91-total-time').textContent = formatTime(total);
    const playhead = byId('v91-playhead');
    if (playhead) playhead.style.left = `${Math.max(0, sequence * state.pxPerSecond)}px`;
    renderPlayButton();
  }

  function renderPlayButton() {
    const video = getVideo();
    const button = byId('v91-play-button');
    if (!video || !button) return;
    const playing = !video.paused && !video.ended;
    button.setAttribute('aria-label', playing ? 'Jeda video' : 'Putar video');
    const icon = button.querySelector('.material-icons-round');
    if (icon) icon.textContent = playing ? 'pause' : 'play_arrow';
  }

  function setTimelineZoom(value) {
    state.pxPerSecond = clamp(value, MIN_PX_PER_SECOND, MAX_PX_PER_SECOND);
    renderTimeline();
    renderPlaybackOnly();
    centerPlayhead();
  }

  function makeRuler(total) {
    const ruler = byId('v91-ruler');
    if (!ruler) return;
    const interval = state.pxPerSecond >= 80 ? 1 : state.pxPerSecond >= 45 ? 2 : 5;
    const marks = [];
    for (let time = 0; time <= Math.ceil(total); time += interval) {
      marks.push(`<span style="left:${time * state.pxPerSecond}px"><i></i><small>${formatTime(time)}</small></span>`);
    }
    ruler.innerHTML = marks.join('');
  }

  function thumbnailForTime(time) {
    if (!state.thumbnails.length) return '';
    let best = state.thumbnails[0];
    let distance = Math.abs(best.time - time);
    state.thumbnails.forEach((item) => {
      const next = Math.abs(item.time - time);
      if (next < distance) {
        best = item;
        distance = next;
      }
    });
    return best.dataUrl || '';
  }

  function clipThumbs(clip) {
    const length = clipDuration(clip);
    const count = clamp(Math.ceil((length * state.pxPerSecond) / 58), 2, 8);
    const images = [];
    for (let index = 0; index < count; index += 1) {
      const time = clip.start + (length * (index + 0.5)) / count;
      const src = thumbnailForTime(time);
      images.push(src
        ? `<img src="${src}" alt="" draggable="false">`
        : `<i class="v91-thumb-placeholder"><span class="material-icons-round">movie</span></i>`);
    }
    return images.join('');
  }

  function renderTimeline() {
    const canvas = byId('v91-timeline-canvas');
    const row = byId('v91-clip-row');
    const waveform = document.querySelector('.v91-waveform');
    if (!canvas || !row) return;
    const total = Math.max(0.5, sequenceDuration());
    const width = Math.max(320, Math.ceil(total * state.pxPerSecond));
    canvas.style.width = `${width}px`;
    makeRuler(total);

    row.innerHTML = state.clips.map((clip, index) => {
      const length = clipDuration(clip);
      const selected = clip.id === state.selectedId;
      const widthPx = Math.max(52, length * state.pxPerSecond);
      return `<button class="v91-clip${selected ? ' selected' : ''}" data-clip-id="${clip.id}" data-clip-index="${index}" style="width:${widthPx}px" type="button" aria-pressed="${selected}">
        <span class="v91-clip-thumbs">${clipThumbs(clip)}</span>
        <span class="v91-clip-shade"></span>
        <span class="v91-clip-copy"><strong>Klip ${index + 1}</strong><small>${formatTime(length, true)}</small></span>
        ${selected ? '<span class="v91-trim-handle left" data-trim="start" aria-label="Trim awal"></span><span class="v91-trim-handle right" data-trim="end" aria-label="Trim akhir"></span>' : ''}
      </button>`;
    }).join('');

    row.querySelectorAll('.v91-clip').forEach((clipButton) => {
      clipButton.addEventListener('click', (event) => {
        if (event.target.closest('.v91-trim-handle')) return;
        selectClip(clipButton.dataset.clipId, true);
      });
    });
    row.querySelectorAll('.v91-trim-handle').forEach((handle) => {
      handle.addEventListener('pointerdown', startTrimDrag);
    });

    if (waveform) {
      waveform.innerHTML = Array.from({ length: Math.max(18, Math.floor(width / 12)) }, (_, index) => {
        const height = 18 + ((index * 17) % 28);
        return `<i style="height:${height}%"></i>`;
      }).join('');
    }

    const zoomPercent = Math.round((state.pxPerSecond / 44) * 100);
    if (byId('v91-zoom-label')) byId('v91-zoom-label').textContent = `${zoomPercent}%`;
    if (byId('v91-clip-summary')) byId('v91-clip-summary').textContent = `${state.clips.length} klip • ${formatTime(total)}`;
  }

  function renderSelection() {
    const selected = getSelectedClip();
    const index = getSelectedIndex();
    if (byId('v91-selected-clip-label')) byId('v91-selected-clip-label').textContent = selected ? `Klip ${index + 1}` : 'Belum ada klip';
    if (byId('v91-selected-range')) byId('v91-selected-range').textContent = selected
      ? `${formatTime(selected.start, true)} – ${formatTime(selected.end, true)}`
      : '00:00 – 00:00';
    const deleteButton = byId('v91-delete-button');
    if (deleteButton) deleteButton.disabled = state.clips.length <= 1;
  }

  function syncWorkspaceModel() {
    if (typeof videoWorkspaceState === 'object' && videoWorkspaceState) {
      videoWorkspaceState.timeline = {
        version: VERSION,
        clips: state.clips.map((clip) => ({ start: clip.start, end: clip.end })),
        selectedIndex: getSelectedIndex(),
        fitMode: state.fitMode,
        sequenceDuration: sequenceDuration(),
        prototypeOnly: true,
      };
    }
  }

  function renderAll() {
    syncWorkspaceModel();
    renderFitButtons();
    renderTimeline();
    renderSelection();
    renderHistoryButtons();
    renderPlaybackOnly();
  }

  function selectClip(id, seek = false) {
    const index = state.clips.findIndex((clip) => clip.id === id);
    if (index < 0) return;
    state.selectedId = id;
    state.playbackClipIndex = index;
    if (seek) {
      const video = getVideo();
      if (video) video.currentTime = state.clips[index].start;
    }
    renderAll();
    centerPlayhead();
  }

  function splitAtPlayhead() {
    const video = getVideo();
    const index = getSelectedIndex();
    const clip = state.clips[index];
    if (!video || !clip) return;
    const time = clamp(video.currentTime, clip.start, clip.end);
    if (time - clip.start < MIN_CLIP_SECONDS || clip.end - time < MIN_CLIP_SECONDS) {
      toast('Geser playhead lebih jauh dari tepi klip sebelum Split.', 'info');
      return;
    }
    pushHistory();
    const left = { ...clip, id: uid('clip'), end: time };
    const right = { ...clip, id: uid('clip'), start: time };
    state.clips.splice(index, 1, left, right);
    state.selectedId = right.id;
    state.playbackClipIndex = index + 1;
    renderAll();
    centerPlayhead();
    toast('Klip berhasil dibagi pada playhead.', 'check');
  }

  function duplicateSelectedClip() {
    const index = getSelectedIndex();
    const clip = state.clips[index];
    if (!clip) return;
    pushHistory();
    const copy = { ...clip, id: uid('clip') };
    state.clips.splice(index + 1, 0, copy);
    state.selectedId = copy.id;
    state.playbackClipIndex = index + 1;
    renderAll();
    toast('Klip diduplikat di timeline.', 'check');
  }

  function deleteSelectedClip() {
    if (state.clips.length <= 1) {
      toast('Timeline harus memiliki setidaknya satu klip.', 'info');
      return;
    }
    const index = getSelectedIndex();
    pushHistory();
    state.clips.splice(index, 1);
    const nextIndex = Math.min(index, state.clips.length - 1);
    state.selectedId = state.clips[nextIndex].id;
    state.playbackClipIndex = nextIndex;
    const video = getVideo();
    if (video) video.currentTime = state.clips[nextIndex].start;
    renderAll();
    toast('Klip dihapus dari timeline.', 'check');
  }

  function resetTimeline() {
    if (!state.duration) return;
    pushHistory();
    const clip = { id: uid('clip'), start: 0, end: state.duration };
    state.clips = [clip];
    state.selectedId = clip.id;
    state.playbackClipIndex = 0;
    const video = getVideo();
    if (video) video.currentTime = 0;
    renderAll();
    toast('Timeline dikembalikan ke video utuh.', 'check');
  }

  function timelinePointerToSequence(event) {
    const canvas = byId('v91-timeline-canvas');
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    return clamp((event.clientX - rect.left) / state.pxPerSecond, 0, sequenceDuration());
  }

  function handleTimelinePointerDown(event) {
    if (event.target.closest('.v91-clip, .v91-playhead, button')) return;
    seekSequence(timelinePointerToSequence(event), { select: true, center: false });
  }

  function startPlayheadDrag(event) {
    if (!state.ready) return;
    event.preventDefault();
    const target = event.currentTarget;
    target.setPointerCapture?.(event.pointerId);
    state.dragging = { type: 'playhead', pointerId: event.pointerId };
    const move = (moveEvent) => seekSequence(timelinePointerToSequence(moveEvent), { select: true, center: false });
    const end = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', end);
      target.removeEventListener('pointercancel', end);
      state.dragging = null;
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', end);
  }

  function startTrimDrag(event) {
    event.preventDefault();
    event.stopPropagation();
    const handle = event.currentTarget;
    const clipButton = handle.closest('.v91-clip');
    const index = Number(clipButton?.dataset.clipIndex);
    const clip = state.clips[index];
    if (!clip) return;
    pushHistory();
    const startX = event.clientX;
    const original = { ...clip };
    const edge = handle.dataset.trim;
    state.dragging = { type: 'trim', pointerId: event.pointerId, index, edge };

    const move = (moveEvent) => {
      if (moveEvent.pointerId !== event.pointerId) return;
      const deltaSeconds = (moveEvent.clientX - startX) / state.pxPerSecond;
      if (edge === 'start') {
        clip.start = clamp(original.start + deltaSeconds, 0, original.end - MIN_CLIP_SECONDS);
        getVideo().currentTime = clip.start;
      } else {
        clip.end = clamp(original.end + deltaSeconds, original.start + MIN_CLIP_SECONDS, state.duration);
        getVideo().currentTime = Math.max(clip.start, clip.end - 0.02);
      }
      renderTimeline();
      renderSelection();
      renderPlaybackOnly();
      syncWorkspaceModel();
    };

    const end = (endEvent) => {
      if (endEvent.pointerId !== event.pointerId) return;
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', end);
      document.removeEventListener('pointercancel', end);
      state.dragging = null;
      renderAll();
    };

    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
  }

  function centerPlayhead() {
    const viewport = byId('v91-timeline-viewport');
    const playhead = byId('v91-playhead');
    if (!viewport || !playhead) return;
    const left = parseFloat(playhead.style.left) || 0;
    const target = left - viewport.clientWidth / 2;
    viewport.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }

  async function createThumbnails(objectUrl, duration) {
    const token = ++state.thumbnailToken;
    state.thumbnails = [];
    renderTimeline();
    if (!objectUrl || !duration || !document.createElement('canvas').getContext) return;

    const temp = document.createElement('video');
    temp.muted = true;
    temp.playsInline = true;
    temp.preload = 'auto';
    temp.src = objectUrl;

    try {
      await new Promise((resolve, reject) => {
        const ready = () => { cleanup(); resolve(); };
        const fail = () => { cleanup(); reject(new Error('thumbnail-load')); };
        const cleanup = () => {
          temp.removeEventListener('loadeddata', ready);
          temp.removeEventListener('error', fail);
        };
        temp.addEventListener('loadeddata', ready, { once: true });
        temp.addEventListener('error', fail, { once: true });
        temp.load();
      });

      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 90;
      const context = canvas.getContext('2d', { alpha: false });
      const times = Array.from({ length: THUMBNAIL_COUNT }, (_, index) => duration * ((index + 0.5) / THUMBNAIL_COUNT));

      for (const time of times) {
        if (token !== state.thumbnailToken) return;
        await new Promise((resolve) => {
          const onSeeked = () => { temp.removeEventListener('seeked', onSeeked); resolve(); };
          temp.addEventListener('seeked', onSeeked, { once: true });
          temp.currentTime = clamp(time, 0, Math.max(0, duration - 0.05));
          window.setTimeout(resolve, 800);
        });
        try {
          context.fillStyle = '#08080b';
          context.fillRect(0, 0, canvas.width, canvas.height);
          const sourceRatio = temp.videoWidth / temp.videoHeight;
          const targetRatio = canvas.width / canvas.height;
          let drawWidth = canvas.width;
          let drawHeight = canvas.height;
          let x = 0;
          let y = 0;
          if (sourceRatio > targetRatio) {
            drawHeight = canvas.width / sourceRatio;
            y = (canvas.height - drawHeight) / 2;
          } else {
            drawWidth = canvas.height * sourceRatio;
            x = (canvas.width - drawWidth) / 2;
          }
          context.drawImage(temp, x, y, drawWidth, drawHeight);
          state.thumbnails.push({ time, dataUrl: canvas.toDataURL('image/jpeg', 0.6) });
          renderTimeline();
        } catch (_) {}
      }
    } catch (_) {
      // Placeholder thumbnails remain available when the browser blocks frame capture.
    } finally {
      temp.removeAttribute('src');
      try { temp.load(); } catch (_) {}
    }
  }

  function initialiseForVideo() {
    const video = getVideo();
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    const objectUrl = video.currentSrc || video.getAttribute('src') || '';
    state.duration = video.duration;
    state.ready = true;
    state.history = [];
    state.future = [];
    state.fitMode = 'contain';
    state.pxPerSecond = 44;
    state.playbackClipIndex = 0;
    const clip = { id: uid('clip'), start: 0, end: state.duration };
    state.clips = [clip];
    state.selectedId = clip.id;
    state.lastObjectUrl = objectUrl;
    applyFitMode();
    renderAll();
    createThumbnails(objectUrl, state.duration);
    document.body.classList.add('v91-editor-ready');
  }

  function resetForEmptyVideo() {
    state.ready = false;
    state.duration = 0;
    state.clips = [];
    state.selectedId = '';
    state.history = [];
    state.future = [];
    state.thumbnails = [];
    state.thumbnailToken += 1;
    document.body.classList.remove('v91-editor-ready');
    renderAll();
  }

  function bindVideo() {
    const video = getVideo();
    if (!video || video.dataset.v91Bound === 'true') return;
    video.dataset.v91Bound = 'true';
    video.addEventListener('loadedmetadata', initialiseForVideo);
    video.addEventListener('durationchange', () => {
      if (!state.ready && video.duration > 0) initialiseForVideo();
    });
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', renderPlayButton);
    video.addEventListener('pause', renderPlayButton);
    video.addEventListener('ended', renderPlayButton);
    video.addEventListener('emptied', resetForEmptyVideo);
    video.addEventListener('abort', resetForEmptyVideo);
  }

  function patchPreviewSizer() {
    const original = window.syncV902PreviewCanvas;
    if (typeof original === 'function' && !original.__v91Patched) {
      const patched = function () {
        const result = original.apply(this, arguments);
        requestAnimationFrame(applyFitMode);
        return result;
      };
      patched.__v91Patched = true;
      window.syncV902PreviewCanvas = patched;
    }
  }

  function bindKeyboard() {
    document.addEventListener('keydown', (event) => {
      const page = byId('page-video-workspace');
      if (!page?.classList.contains('active')) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        event.shiftKey ? redo() : undo();
      } else if (modifier && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
      } else if (event.code === 'Space') {
        event.preventDefault();
        togglePlayback();
      } else if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        splitAtPlayhead();
      }
    });
  }

  function prepare() {
    injectStylesheet();
    createPreviewControls();
    createTimeline();
    createQuickTools();
    createExportNotice();
    bindVideo();
    bindKeyboard();
    patchPreviewSizer();
    applyFitMode();
    renderAll();

    document.addEventListener('vforge:pagechange', (event) => {
      if (event.detail?.pageId === 'page-video-workspace') {
        requestAnimationFrame(() => {
          createPreviewControls();
          createTimeline();
          createQuickTools();
          createExportNotice();
          bindVideo();
          applyFitMode();
          renderAll();
        });
      }
    });

    window.addEventListener('resize', () => requestAnimationFrame(() => {
      applyFitMode();
      renderPlaybackOnly();
    }), { passive: true });
  }

  window.v91Undo = undo;
  window.v91Redo = redo;
  window.VForgeEditor91 = {
    version: VERSION,
    state,
    undo,
    redo,
    splitAtPlayhead,
    duplicateSelectedClip,
    deleteSelectedClip,
    resetTimeline,
    setFitMode,
    setTimelineZoom,
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', prepare, { once: true });
  else prepare();
})();

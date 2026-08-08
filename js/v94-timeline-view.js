(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VForgeTimelineView94 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '9.4.0';
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function formatTime(seconds, tenths = true) {
    const safe = Number.isFinite(Number(seconds)) ? Math.max(0, Number(seconds)) : 0;
    const minutes = Math.floor(safe / 60);
    const remaining = safe - minutes * 60;
    if (tenths) return `${String(minutes).padStart(2, '0')}:${remaining.toFixed(1).padStart(4, '0')}`;
    return `${String(minutes).padStart(2, '0')}:${String(Math.floor(remaining)).padStart(2, '0')}`;
  }

  function clipDuration(clip) {
    return Math.max(0, Number(clip?.sourceEnd || 0) - Number(clip?.sourceStart || 0));
  }

  function projectDuration(state) {
    const clips = state?.clips || [];
    return clips.length ? Number(clips[clips.length - 1].timelineEnd || 0) : 0;
  }

  function createView(options = {}) {
    const timelineRoot = options.timelineRoot || null;
    const editPanel = options.editPanel || null;
    const previewFrame = options.previewFrame || null;
    const onAction = typeof options.onAction === 'function' ? options.onAction : () => {};
    const dom = {};
    let thumbnails = [];
    let resizeObserver = null;
    let mounted = false;
    let actionHandler = null;

    function byId(id) {
      if (typeof document === 'undefined') return null;
      return document.getElementById(id);
    }

    function syncRefs() {
      dom.root = timelineRoot;
      dom.viewport = byId('vf94-timeline-viewport');
      dom.canvas = byId('vf94-timeline-canvas');
      dom.ruler = byId('vf94-ruler');
      dom.clipRow = byId('vf94-clip-row');
      dom.playhead = byId('vf94-fixed-playhead');
      dom.undo = byId('vf94-undo');
      dom.redo = byId('vf94-redo');
      dom.zoomOut = byId('vf94-zoom-out');
      dom.zoomIn = byId('vf94-zoom-in');
      dom.zoomLabel = byId('vf94-zoom-label');
      dom.summary = byId('vf94-clip-summary');
      dom.quick = byId('vf94-quick-tools');
      dom.selectedLabel = byId('vf94-selected-clip-label');
      dom.selectedRange = byId('vf94-selected-range');
      dom.split = byId('vf94-split');
      dom.delete = byId('vf94-delete');
      dom.previewEmpty = byId('vf94-preview-empty');
      dom.emptyState = byId('vf94-timeline-empty-state');
      return dom;
    }

    function syncEdgePad() {
      const viewport = dom.viewport;
      if (!viewport || !timelineRoot) return 0;
      const edgePad = Math.max(0, viewport.clientWidth / 2);
      timelineRoot.style.setProperty('--vf94-edge-pad', `${edgePad}px`);
      return edgePad;
    }

    function mount() {
      if (!timelineRoot || mounted) {
        syncRefs();
        return Boolean(timelineRoot);
      }
      timelineRoot.classList.add('vf94-timeline-root');
      timelineRoot.innerHTML = `
<div class="vf94-timeline-header">
  <div class="vf94-history-controls">
    <button id="vf94-undo" type="button" aria-label="Urungkan" disabled><span class="material-icons-round">undo</span></button>
    <button id="vf94-redo" type="button" aria-label="Ulangi" disabled><span class="material-icons-round">redo</span></button>
  </div>
  <div class="vf94-timeline-title"><strong>Timeline</strong><small id="vf94-clip-summary">Belum ada klip</small></div>
  <div class="vf94-zoom-controls" role="group" aria-label="Zoom timeline">
    <button id="vf94-zoom-out" type="button" aria-label="Perkecil timeline"><span class="material-icons-round">remove</span></button>
    <span id="vf94-zoom-label">100%</span>
    <button id="vf94-zoom-in" type="button" aria-label="Perbesar timeline"><span class="material-icons-round">add</span></button>
  </div>
</div>
<div class="vf94-timeline-viewport" id="vf94-timeline-viewport">
  <div class="vf94-timeline-canvas" id="vf94-timeline-canvas">
    <div class="vf94-ruler" id="vf94-ruler"></div>
    <div class="vf94-clip-row" id="vf94-clip-row"></div>
    <div class="vf94-timeline-empty-state" id="vf94-timeline-empty-state" hidden>
      <span class="material-icons-round" aria-hidden="true">video_library</span>
      <strong>Belum ada klip</strong>
      <button data-vf94-replace-video="true" type="button">Tambahkan video</button>
    </div>
  </div>
</div>
<div aria-hidden="true" class="vf94-fixed-playhead" id="vf94-fixed-playhead"><span></span></div>`;

      if (editPanel && !byId('vf94-quick-tools')) {
        const heading = editPanel.querySelector('.v82-tool-heading');
        const tools = document.createElement('section');
        tools.setAttribute('aria-label', 'Alat edit klip');
        tools.className = 'vf94-quick-tools';
        tools.id = 'vf94-quick-tools';
        tools.innerHTML = `
  <div class="vf94-quick-title">
    <span><small>KLIP AKTIF</small><strong id="vf94-selected-clip-label">Belum ada klip</strong></span>
    <em id="vf94-selected-range">00:00.0 – 00:00.0</em>
  </div>
  <div class="vf94-quick-grid">
    <button id="vf94-split" type="button"><span class="material-icons-round">call_split</span><small>Split</small></button>
    <button class="danger" id="vf94-delete" type="button"><span class="material-icons-round">delete_outline</span><small>Hapus</small></button>
  </div>`;
        if (heading) heading.insertAdjacentElement('afterend', tools);
        else editPanel.prepend(tools);
      }

      syncRefs();
      actionHandler = (event) => {
        const button = event.target.closest?.('button');
        if (!button) return;
        if (button.id === 'vf94-undo') onAction({ type: 'undo' });
        else if (button.id === 'vf94-redo') onAction({ type: 'redo' });
        else if (button.id === 'vf94-zoom-out') onAction({ type: 'zoom', direction: -1 });
        else if (button.id === 'vf94-zoom-in') onAction({ type: 'zoom', direction: 1 });
        else if (button.id === 'vf94-split') onAction({ type: 'split' });
        else if (button.id === 'vf94-delete') onAction({ type: 'delete' });
        else if (button.dataset?.vf94ClipId) onAction({ type: 'select', clipId: button.dataset.vf94ClipId });
        else if (button.dataset?.vf94ReplaceVideo === 'true') onAction({ type: 'replace-video' });
      };
      timelineRoot.addEventListener('click', actionHandler);
      dom.quick?.addEventListener('click', actionHandler);

      if (typeof ResizeObserver === 'function' && dom.viewport) {
        resizeObserver = new ResizeObserver(() => syncEdgePad());
        resizeObserver.observe(dom.viewport);
      } else if (typeof window !== 'undefined') {
        window.addEventListener('resize', syncEdgePad, { passive: true });
      }
      mounted = true;
      syncEdgePad();
      return true;
    }

    function refs() {
      return syncRefs();
    }

    function thumbnailFor(time) {
      if (!thumbnails.length) return '';
      let best = thumbnails[0];
      let distance = Math.abs(Number(best.time || 0) - time);
      thumbnails.forEach((item) => {
        const next = Math.abs(Number(item.time || 0) - time);
        if (next < distance) {
          best = item;
          distance = next;
        }
      });
      return best.dataUrl || '';
    }

    function clipThumbs(clip, zoom) {
      const length = clipDuration(clip);
      const width = length * zoom;
      const count = clamp(Math.ceil(width / 62), 1, 8);
      const cells = [];
      for (let index = 0; index < count; index += 1) {
        const time = clip.sourceStart + length * ((index + 0.5) / count);
        const src = thumbnailFor(time);
        cells.push(src
          ? `<img alt="" draggable="false" src="${src}">`
          : '<i class="vf94-thumb-placeholder"><span class="material-icons-round">movie</span></i>');
      }
      return cells.join('');
    }

    function renderRuler(total, zoom, edgePad) {
      if (!dom.ruler) return;
      const interval = zoom >= 80 ? 1 : zoom >= 45 ? 2 : 5;
      const marks = [];
      for (let time = 0; time <= Math.ceil(total); time += interval) {
        marks.push(`<span style="left:${edgePad + time * zoom}px"><i></i><small>${formatTime(time, false)}</small></span>`);
      }
      dom.ruler.innerHTML = marks.join('');
    }

    function renderStructure(state, ui = {}) {
      syncRefs();
      if (!dom.canvas || !dom.clipRow) return;
      const rawZoom = Number(state?.zoom);
      const zoom = Number.isFinite(rawZoom) ? Math.max(1, rawZoom) : 44;
      const total = projectDuration(state);
      const edgePad = syncEdgePad();
      dom.canvas.style.width = `${Math.max(edgePad * 2, edgePad * 2 + total * zoom)}px`;
      renderRuler(total, zoom, edgePad);
      dom.clipRow.style.paddingInline = `${edgePad}px`;

      dom.clipRow.innerHTML = (state?.clips || []).map((clip, index) => {
        const selected = clip.id === state.selectedClipId;
        const width = Math.max(0, clipDuration(clip) * zoom);
        return `<button class="vf94-timeline-clip vf94-clip${selected ? ' selected' : ''}" data-vf94-clip-id="${clip.id}" data-vf94-clip-index="${index}" style="width:${width}px" type="button" aria-pressed="${selected}">
  <span class="vf94-clip-thumbs">${clipThumbs(clip, zoom)}</span>
  <span class="vf94-clip-shade"></span>
  <span class="vf94-clip-copy"><strong>Klip ${index + 1}</strong><small>${formatTime(clipDuration(clip))}</small></span>
  ${selected ? '<span class="vf94-trim-handle left" data-vf94-trim="left" aria-label="Trim awal"></span><span class="vf94-trim-handle right" data-vf94-trim="right" aria-label="Trim akhir"></span>' : ''}
</button>`;
      }).join('');

      const selectedIndex = (state?.clips || []).findIndex((clip) => clip.id === state.selectedClipId);
      const selected = selectedIndex >= 0 ? state.clips[selectedIndex] : null;
      if (dom.selectedLabel) dom.selectedLabel.textContent = selected ? `Klip ${selectedIndex + 1}` : 'Belum ada klip';
      if (dom.selectedRange) dom.selectedRange.textContent = selected
        ? `${formatTime(selected.sourceStart)} – ${formatTime(selected.sourceEnd)}`
        : '00:00.0 – 00:00.0';
      if (dom.summary) {
        dom.summary.textContent = state?.status === 'invalid'
          ? 'Video tidak valid'
          : state?.clips?.length
            ? `${state.clips.length} klip • ${formatTime(total, false)}`
            : 'Belum ada klip';
      }
      if (dom.zoomLabel) dom.zoomLabel.textContent = `${Math.round((zoom / 44) * 100)}%`;
      if (dom.zoomOut) dom.zoomOut.disabled = zoom <= 22.001;
      if (dom.zoomIn) dom.zoomIn.disabled = zoom >= 109.999;
      if (dom.split) dom.split.disabled = !selected || Boolean(ui.disableSplit);
      if (dom.delete) dom.delete.disabled = !selected || Boolean(ui.disableDelete);
      const empty = state?.status === 'empty';
      const invalid = state?.status === 'invalid';
      if (dom.emptyState) {
        dom.emptyState.hidden = !(empty || invalid);
        const strong = dom.emptyState.querySelector('strong');
        if (strong) strong.textContent = invalid ? 'Video tidak valid' : 'Belum ada klip';
      }
      timelineRoot?.classList.toggle('vf94-is-empty', empty);
      timelineRoot?.classList.toggle('vf94-is-invalid', invalid);
      timelineRoot?.setAttribute('data-vf94-status', state?.status || 'empty');
    }

    function renderPlayback(state) {
      if (!timelineRoot) return;
      timelineRoot.style.setProperty('--vf94-playhead-time', String(Number(state?.playheadTime || 0)));
      timelineRoot.dataset.vf94Playing = state?.isPlaying ? 'true' : 'false';
    }

    function renderHistory({ canUndo = false, canRedo = false } = {}) {
      syncRefs();
      if (dom.undo) dom.undo.disabled = !canUndo;
      if (dom.redo) dom.redo.disabled = !canRedo;
    }

    function renderMediaStatus(state) {
      syncRefs();
      const empty = state?.status === 'empty';
      const invalid = state?.status === 'invalid';
      if (typeof document !== 'undefined') {
        document.body?.classList.toggle('vf94-timeline-empty', empty);
        document.body?.classList.toggle('vf94-timeline-invalid', invalid);
      }
      if (dom.previewEmpty) {
        dom.previewEmpty.hidden = !(empty || invalid);
        const strong = dom.previewEmpty.querySelector('strong');
        const small = dom.previewEmpty.querySelector('small');
        if (strong) strong.textContent = invalid ? 'Video tidak dapat dibaca' : 'Timeline kosong';
        if (small) small.textContent = invalid ? 'Pilih video lain untuk melanjutkan.' : 'Tambahkan video untuk mulai mengedit.';
      }
      if (previewFrame) {
        previewFrame.dataset.vf94MediaStatus = state?.status || 'empty';
      }
    }

    function scrollToPlayhead(sequenceTime, zoom, behavior = 'auto') {
      const viewport = refs().viewport;
      if (!viewport) return;
      const left = Math.max(0, Number(sequenceTime || 0) * Number(zoom || 44));
      viewport.scrollTo({ left, behavior });
    }

    function sequenceTimeFromScroll(zoom) {
      const viewport = refs().viewport;
      if (!viewport) return 0;
      return Math.max(0, viewport.scrollLeft / Math.max(1, Number(zoom || 44)));
    }

    function setThumbnails(value) {
      thumbnails = Array.isArray(value) ? value.map((item) => ({ ...item })) : [];
    }

    function destroy() {
      if (!mounted) return;
      if (actionHandler) {
        timelineRoot?.removeEventListener('click', actionHandler);
        dom.quick?.removeEventListener('click', actionHandler);
      }
      resizeObserver?.disconnect();
      if (!resizeObserver && typeof window !== 'undefined') window.removeEventListener('resize', syncEdgePad);
      mounted = false;
    }

    return {
      mount,
      refs,
      renderStructure,
      renderPlayback,
      renderHistory,
      renderMediaStatus,
      scrollToPlayhead,
      sequenceTimeFromScroll,
      setThumbnails,
      destroy
    };
  }

  return { VERSION, createView };
});

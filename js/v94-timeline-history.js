(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VForgeTimelineHistory94 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '9.4.0';

  function cloneSnapshot(snapshot) {
    return {
      clips: (snapshot?.clips || []).map((clip) => ({ ...clip })),
      selectedClipId: String(snapshot?.selectedClipId || ''),
      playheadTime: Number.isFinite(Number(snapshot?.playheadTime)) ? Number(snapshot.playheadTime) : 0
    };
  }

  function createHistory(limit = 50) {
    const max = Math.max(1, Math.floor(Number(limit) || 50));
    let past = [];
    let future = [];

    function record(snapshot) {
      past.push(cloneSnapshot(snapshot));
      if (past.length > max) past = past.slice(-max);
      future = [];
      return { ok: true };
    }

    function undo(currentSnapshot) {
      if (!past.length) return { ok: false, snapshot: null };
      future.push(cloneSnapshot(currentSnapshot));
      return { ok: true, snapshot: cloneSnapshot(past.pop()) };
    }

    function redo(currentSnapshot) {
      if (!future.length) return { ok: false, snapshot: null };
      past.push(cloneSnapshot(currentSnapshot));
      if (past.length > max) past = past.slice(-max);
      return { ok: true, snapshot: cloneSnapshot(future.pop()) };
    }

    function clear() {
      past = [];
      future = [];
    }

    function canUndo() {
      return past.length > 0;
    }

    function canRedo() {
      return future.length > 0;
    }

    function size() {
      return { past: past.length, future: future.length, limit: max };
    }

    return { record, undo, redo, clear, canUndo, canRedo, size };
  }

  return { VERSION, createHistory };
});

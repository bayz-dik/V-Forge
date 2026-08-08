(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VForgeTimelineState94 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '9.4.0';
  const MIN_CLIP_SECONDS = 0.1;
  const MIN_PX_PER_SECOND = 22;
  const MAX_PX_PER_SECOND = 110;
  const DEFAULT_PX_PER_SECOND = 44;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const defaultIdFactory = () => `vf94-clip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const result = (ok, state, reason = '') => ({ ok, state, reason });

  function createEmptyState() {
    return {
      version: VERSION,
      status: 'empty',
      sourceDuration: 0,
      clips: [],
      selectedClipId: '',
      playheadTime: 0,
      zoom: DEFAULT_PX_PER_SECOND,
      isPlaying: false,
      trimSession: null
    };
  }

  function clipDuration(clip) {
    return Math.max(0, finite(clip?.sourceEnd) - finite(clip?.sourceStart));
  }

  function recomputeTimeline(clips) {
    let cursor = 0;
    return (clips || []).map((clip) => {
      const sourceStart = Math.max(0, finite(clip.sourceStart));
      const sourceEnd = Math.max(sourceStart, finite(clip.sourceEnd));
      const length = sourceEnd - sourceStart;
      const next = {
        id: String(clip.id || ''),
        sourceStart,
        sourceEnd,
        timelineStart: cursor,
        timelineEnd: cursor + length
      };
      cursor += length;
      return next;
    });
  }

  function createInitialState(duration, idFactory = defaultIdFactory) {
    const safeDuration = finite(duration, 0);
    if (!(safeDuration > 0)) return { ...createEmptyState(), status: 'invalid' };
    const clip = { id: idFactory(), sourceStart: 0, sourceEnd: safeDuration };
    return {
      ...createEmptyState(),
      status: 'ready',
      sourceDuration: safeDuration,
      clips: recomputeTimeline([clip]),
      selectedClipId: clip.id
    };
  }

  function cloneState(state) {
    return {
      ...state,
      clips: (state?.clips || []).map((clip) => ({ ...clip })),
      trimSession: state?.trimSession ? {
        ...state.trimSession,
        originalClip: { ...state.trimSession.originalClip }
      } : null
    };
  }

  function projectDuration(state) {
    const clips = state?.clips || [];
    return clips.length ? finite(clips[clips.length - 1].timelineEnd) : 0;
  }

  function structuralSnapshot(state) {
    return {
      clips: (state?.clips || []).map((clip) => ({ ...clip })),
      selectedClipId: String(state?.selectedClipId || ''),
      playheadTime: finite(state?.playheadTime)
    };
  }

  function restoreStructuralSnapshot(state, snapshot) {
    const clips = recomputeTimeline((snapshot?.clips || []).map((clip) => ({ ...clip })));
    const selectedClipId = clips.some((clip) => clip.id === snapshot?.selectedClipId)
      ? snapshot.selectedClipId
      : clips[0]?.id || '';
    return {
      ...cloneState(state),
      status: clips.length ? 'ready' : 'empty',
      clips,
      selectedClipId,
      playheadTime: clamp(finite(snapshot?.playheadTime), 0, clips.length ? clips[clips.length - 1].timelineEnd : 0),
      isPlaying: false,
      trimSession: null
    };
  }

  function sequenceToSource(state, sequenceTime) {
    const clips = state?.clips || [];
    if (!clips.length) return null;
    const safe = clamp(finite(sequenceTime), 0, projectDuration(state));
    let clipIndex = clips.findIndex((clip, index) => safe < clip.timelineEnd || index === clips.length - 1);
    if (clipIndex < 0) clipIndex = clips.length - 1;
    const clip = clips[clipIndex];
    const local = clamp(safe - clip.timelineStart, 0, clipDuration(clip));
    return {
      clipId: clip.id,
      clipIndex,
      sequenceTime: safe,
      sourceTime: clamp(clip.sourceStart + local, clip.sourceStart, clip.sourceEnd)
    };
  }

  function sourceToSequence(state, sourceTime, preferredClipId = '') {
    const clips = state?.clips || [];
    if (!clips.length) return 0;
    const time = finite(sourceTime);
    const preferred = clips.find((clip) => clip.id === preferredClipId);
    const candidates = preferred ? [preferred, ...clips.filter((clip) => clip !== preferred)] : clips;
    const clip = candidates.find((item) => time >= item.sourceStart - 1e-9 && time <= item.sourceEnd + 1e-9);
    if (!clip) return clamp(finite(state?.playheadTime), 0, projectDuration(state));
    return clamp(clip.timelineStart + clamp(time - clip.sourceStart, 0, clipDuration(clip)), 0, projectDuration(state));
  }

  function selectClip(state, clipId) {
    if (!state || !Array.isArray(state.clips)) return result(false, cloneState(state || createEmptyState()), 'INVALID_STATE');
    if (!state.clips.some((clip) => clip.id === clipId)) return result(false, cloneState(state), 'INVALID_CLIP');
    if (state.selectedClipId === clipId) return result(true, cloneState(state), 'NO_CHANGE');
    return result(true, { ...cloneState(state), selectedClipId: clipId }, '');
  }

  function setPlayhead(state, sequenceTime) {
    if (!state || !Array.isArray(state.clips)) return result(false, cloneState(state || createEmptyState()), 'INVALID_STATE');
    const next = clamp(finite(sequenceTime), 0, projectDuration(state));
    return result(true, { ...cloneState(state), playheadTime: next }, next === state.playheadTime ? 'NO_CHANGE' : '');
  }

  function setZoom(state, pxPerSecond) {
    if (!state || !Array.isArray(state.clips)) return result(false, cloneState(state || createEmptyState()), 'INVALID_STATE');
    const next = clamp(finite(pxPerSecond, DEFAULT_PX_PER_SECOND), MIN_PX_PER_SECOND, MAX_PX_PER_SECOND);
    return result(true, { ...cloneState(state), zoom: next }, next === state.zoom ? 'NO_CHANGE' : '');
  }

  function splitAtPlayhead(state, idFactory = defaultIdFactory) {
    const current = cloneState(state || createEmptyState());
    if (current.status !== 'ready' || !current.clips.length) return result(false, current, 'INVALID_STATE');
    const mapped = sequenceToSource(current, current.playheadTime);
    if (!mapped) return result(false, current, 'NO_SELECTION');
    const clip = current.clips[mapped.clipIndex];
    if (!clip) return result(false, current, 'INVALID_CLIP');
    const sourceTime = mapped.sourceTime;
    if (sourceTime - clip.sourceStart < MIN_CLIP_SECONDS - 1e-9 || clip.sourceEnd - sourceTime < MIN_CLIP_SECONDS - 1e-9) {
      return result(false, current, 'MIN_DURATION');
    }
    const rightId = idFactory();
    const nextClips = current.clips.map((item) => ({ ...item }));
    nextClips.splice(mapped.clipIndex, 1,
      { id: clip.id, sourceStart: clip.sourceStart, sourceEnd: sourceTime },
      { id: rightId, sourceStart: sourceTime, sourceEnd: clip.sourceEnd }
    );
    return result(true, {
      ...current,
      clips: recomputeTimeline(nextClips),
      selectedClipId: rightId,
      trimSession: null
    }, '');
  }

  function beginTrim(state, clipId, edge) {
    const current = cloneState(state || createEmptyState());
    if (current.status !== 'ready') return result(false, current, 'INVALID_STATE');
    const index = current.clips.findIndex((clip) => clip.id === clipId);
    if (index < 0) return result(false, current, 'INVALID_CLIP');
    if (edge !== 'left' && edge !== 'right') return result(false, current, 'INVALID_STATE');
    current.selectedClipId = clipId;
    current.trimSession = {
      clipId,
      edge,
      clipIndex: index,
      originalClip: { ...current.clips[index] }
    };
    return result(true, current, '');
  }

  function updateTrim(state, sourceTime) {
    const current = cloneState(state || createEmptyState());
    const session = current.trimSession;
    if (current.status !== 'ready' || !session) return result(false, current, 'INVALID_STATE');
    const index = current.clips.findIndex((clip) => clip.id === session.clipId);
    if (index < 0) return result(false, current, 'INVALID_CLIP');
    const clips = current.clips.map((clip) => ({ ...clip }));
    const clip = clips[index];
    const previous = clips[index - 1];
    const next = clips[index + 1];
    const requested = finite(sourceTime, session.edge === 'left' ? clip.sourceStart : clip.sourceEnd);
    if (session.edge === 'left') {
      const min = previous ? previous.sourceEnd : 0;
      const max = clip.sourceEnd - MIN_CLIP_SECONDS;
      clip.sourceStart = clamp(requested, min, max);
    } else {
      const min = clip.sourceStart + MIN_CLIP_SECONDS;
      const max = next ? next.sourceStart : current.sourceDuration;
      clip.sourceEnd = clamp(requested, min, max);
    }
    current.clips = recomputeTimeline(clips);
    return result(true, current, '');
  }

  function commitTrim(state) {
    const current = cloneState(state || createEmptyState());
    if (!current.trimSession) return result(false, current, 'INVALID_STATE');
    current.trimSession = null;
    return result(true, current, '');
  }

  function cancelTrim(state) {
    const current = cloneState(state || createEmptyState());
    const session = current.trimSession;
    if (!session) return result(false, current, 'INVALID_STATE');
    const index = current.clips.findIndex((clip) => clip.id === session.clipId);
    if (index < 0) return result(false, current, 'INVALID_CLIP');
    const clips = current.clips.map((clip) => ({ ...clip }));
    clips[index] = { ...session.originalClip };
    current.clips = recomputeTimeline(clips);
    current.trimSession = null;
    return result(true, current, '');
  }

  function deleteSelectedClip(state) {
    const current = cloneState(state || createEmptyState());
    if (current.status !== 'ready' || !current.clips.length) return result(false, current, 'INVALID_STATE');
    const index = current.clips.findIndex((clip) => clip.id === current.selectedClipId);
    if (index < 0) return result(false, current, 'NO_SELECTION');
    const clips = current.clips.filter((_, clipIndex) => clipIndex !== index).map((clip) => ({ ...clip }));
    if (!clips.length) {
      return result(true, {
        ...current,
        status: 'empty',
        clips: [],
        selectedClipId: '',
        playheadTime: 0,
        isPlaying: false,
        trimSession: null
      }, '');
    }
    const recomputed = recomputeTimeline(clips);
    const nextIndex = Math.min(index, recomputed.length - 1);
    return result(true, {
      ...current,
      status: 'ready',
      clips: recomputed,
      selectedClipId: recomputed[nextIndex].id,
      playheadTime: clamp(current.playheadTime, 0, projectDuration({ clips: recomputed })),
      isPlaying: false,
      trimSession: null
    }, '');
  }

  return {
    VERSION,
    MIN_CLIP_SECONDS,
    MIN_PX_PER_SECOND,
    MAX_PX_PER_SECOND,
    DEFAULT_PX_PER_SECOND,
    createEmptyState,
    createInitialState,
    cloneState,
    structuralSnapshot,
    restoreStructuralSnapshot,
    clipDuration,
    projectDuration,
    recomputeTimeline,
    sequenceToSource,
    sourceToSequence,
    selectClip,
    setPlayhead,
    setZoom,
    splitAtPlayhead,
    beginTrim,
    updateTrim,
    commitTrim,
    cancelTrim,
    deleteSelectedClip
  };
});

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VForgeTimelineGestures94 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '9.4.0';
  let activeBinding = null;

  function chooseGestureMode({ trimActive = false, pointerCount = 0 } = {}) {
    if (trimActive) return 'trim';
    if (pointerCount >= 2) return 'pinch';
    return 'scrub';
  }

  function distance(points) {
    const values = Array.from(points.values());
    if (values.length < 2) return 0;
    return Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
  }

  function bind({ viewport, clipRow, controller } = {}) {
    unbind();
    if (!viewport || !controller) return false;

    const session = {
      mode: 'idle',
      pointers: new Map(),
      trimClipId: '',
      trimEdge: '',
      trimOriginalBoundary: 0,
      startX: 0,
      startScrollLeft: 0,
      pinchStartDistance: 0,
      pinchStartZoom: 44,
      primaryPointerId: null,
      moved: false,
      suppressClickUntil: 0
    };

    function pointerRecord(event) {
      return { x: event.clientX, y: event.clientY, target: event.target };
    }

    function updatePointer(event) {
      if (!session.pointers.has(event.pointerId)) return false;
      session.pointers.set(event.pointerId, pointerRecord(event));
      return true;
    }

    function setCapture(event) {
      try { viewport.setPointerCapture?.(event.pointerId); } catch (_) {}
    }

    function releaseCapture(event) {
      try {
        if (viewport.hasPointerCapture?.(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
      } catch (_) {}
    }

    function beginPinch() {
      session.mode = 'pinch';
      session.pinchStartDistance = Math.max(1, distance(session.pointers));
      session.pinchStartZoom = Number(controller.getState?.().zoom || 44);
      session.moved = true;
    }

    function beginScrub(event) {
      session.mode = 'scrub';
      session.primaryPointerId = event.pointerId;
      session.startX = event.clientX;
      session.startScrollLeft = viewport.scrollLeft;
      session.moved = false;
    }

    function onPointerDown(event) {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      controller.pauseForInteraction?.();
      session.pointers.set(event.pointerId, pointerRecord(event));
      setCapture(event);

      const trim = event.target.closest?.('[data-vf94-trim]');
      const trimActive = session.mode === 'trim';
      if (trim && !trimActive) {
        event.preventDefault();
        event.stopPropagation();
        const clipButton = trim.closest?.('[data-vf94-clip-id]');
        const clipId = clipButton?.dataset?.vf94ClipId || '';
        const edge = trim.dataset.vf94Trim;
        const state = controller.getState?.();
        const clip = state?.clips?.find((item) => item.id === clipId);
        if (!clip || (edge !== 'left' && edge !== 'right')) {
          session.pointers.delete(event.pointerId);
          return;
        }
        session.mode = 'trim';
        session.primaryPointerId = event.pointerId;
        session.trimClipId = clipId;
        session.trimEdge = edge;
        session.trimOriginalBoundary = edge === 'left' ? clip.sourceStart : clip.sourceEnd;
        session.startX = event.clientX;
        session.moved = false;
        const result = controller.beginTrim?.(clipId, edge);
        if (result?.ok === false) {
          session.mode = 'idle';
          session.trimClipId = '';
          session.trimEdge = '';
        }
        return;
      }

      const mode = chooseGestureMode({ trimActive: session.mode === 'trim', pointerCount: session.pointers.size });
      if (mode === 'trim') return;
      if (mode === 'pinch') {
        event.preventDefault();
        beginPinch();
        return;
      }
      beginScrub(event);
    }

    function onPointerMove(event) {
      if (!updatePointer(event)) return;
      if (session.mode === 'trim') {
        if (event.pointerId !== session.primaryPointerId) return;
        event.preventDefault();
        event.stopPropagation();
        const state = controller.getState?.();
        const zoom = Math.max(1, Number(state?.zoom || 44));
        const deltaSeconds = (event.clientX - session.startX) / zoom;
        if (Math.abs(event.clientX - session.startX) > 2) session.moved = true;
        controller.updateTrim?.(session.trimOriginalBoundary + deltaSeconds);
        return;
      }

      if (session.pointers.size >= 2 || session.mode === 'pinch') {
        if (session.mode !== 'pinch') beginPinch();
        event.preventDefault();
        const currentDistance = distance(session.pointers);
        if (currentDistance > 0) {
          const nextZoom = session.pinchStartZoom * (currentDistance / Math.max(1, session.pinchStartDistance));
          controller.setZoom?.(nextZoom);
          session.moved = true;
        }
        return;
      }

      if (session.mode !== 'scrub' || event.pointerId !== session.primaryPointerId) return;
      event.preventDefault();
      const dx = event.clientX - session.startX;
      if (Math.abs(dx) >= 4) session.moved = true;
      viewport.scrollLeft = Math.max(0, session.startScrollLeft - dx);
      const zoom = Math.max(1, Number(controller.getState?.().zoom || 44));
      controller.setPlayhead?.(viewport.scrollLeft / zoom, {
        seekPreview: true,
        renderStructure: false,
        center: false,
        select: true
      });
    }

    function finish(event, cancelled = false) {
      const wasTrim = session.mode === 'trim' && event.pointerId === session.primaryPointerId;
      if (wasTrim) {
        if (cancelled) controller.cancelTrim?.();
        else controller.commitTrim?.();
      }
      if (session.moved) session.suppressClickUntil = Date.now() + 260;
      session.pointers.delete(event.pointerId);
      releaseCapture(event);

      if (wasTrim) {
        session.mode = 'idle';
        session.trimClipId = '';
        session.trimEdge = '';
        session.primaryPointerId = null;
        session.moved = false;
        return;
      }

      if (session.mode === 'pinch') {
        if (session.pointers.size < 2) {
          session.mode = 'idle';
          session.primaryPointerId = null;
          session.moved = false;
        }
        return;
      }

      if (event.pointerId === session.primaryPointerId) {
        session.mode = 'idle';
        session.primaryPointerId = null;
        session.moved = false;
      }
    }

    function onPointerUp(event) { finish(event, false); }
    function onPointerCancel(event) { finish(event, true); }
    function onLostCapture(event) {
      if (session.pointers.has(event.pointerId)) finish(event, true);
    }

    function onClickCapture(event) {
      if (Date.now() < session.suppressClickUntil) {
        event.preventDefault();
        event.stopImmediatePropagation?.();
      }
    }

    function onWheel(event) {
      if (!(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      controller.pauseForInteraction?.();
      controller.zoomBy?.(event.deltaY < 0 ? +1 : -1);
    }

    viewport.addEventListener('pointerdown', onPointerDown);
    viewport.addEventListener('pointermove', onPointerMove);
    viewport.addEventListener('pointerup', onPointerUp);
    viewport.addEventListener('pointercancel', onPointerCancel);
    viewport.addEventListener('lostpointercapture', onLostCapture);
    viewport.addEventListener('click', onClickCapture, true);
    viewport.addEventListener('wheel', onWheel, { passive: false });

    activeBinding = {
      viewport,
      clipRow,
      controller,
      listeners: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostCapture, onClickCapture, onWheel },
      session
    };
    return true;
  }

  function unbind() {
    if (!activeBinding) return false;
    const { viewport, listeners } = activeBinding;
    viewport.removeEventListener('pointerdown', listeners.onPointerDown);
    viewport.removeEventListener('pointermove', listeners.onPointerMove);
    viewport.removeEventListener('pointerup', listeners.onPointerUp);
    viewport.removeEventListener('pointercancel', listeners.onPointerCancel);
    viewport.removeEventListener('lostpointercapture', listeners.onLostCapture);
    viewport.removeEventListener('click', listeners.onClickCapture, true);
    viewport.removeEventListener('wheel', listeners.onWheel);
    activeBinding = null;
    return true;
  }

  return { VERSION, bind, unbind, chooseGestureMode };
});

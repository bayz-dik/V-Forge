/* V-Forge V9.3 — Premium Showcase controller */
(function () {
  'use strict';

  const VERSION = '9.3.0';
  if (window.VForgeShowcase93?.version === VERSION) return;

  try {
    const workshop = document.getElementById('vf926-workshop');
    const carousel = document.getElementById('vf926-carousel');
    const slides = Array.from(document.querySelectorAll('[data-vf926-slide]'));
    const dots = Array.from(document.querySelectorAll('[data-vf926-dot]'));
    const previousButton = document.getElementById('vf926-previous');
    const nextButton = document.getElementById('vf926-next');
    const selectButton = document.getElementById('vf926-select-video');
    const backButton = document.getElementById('vf926-back');
    const navigation = document.getElementById('bottom-navigation');
    const editorEntry = workshop?.querySelector('.vf929-editor-entry');

    if (!workshop || !carousel || slides.length !== 3 || dots.length !== 3) {
      console.error('[V-Forge] V9.3 Showcase DOM tidak lengkap.');
      return;
    }

    const state = {
      open: false,
      sourcePage: 'page-home',
      slideIndex: 0,
      pickerPending: false,
      fileSelected: false,
      pointerStartX: null,
      timer: null
    };

    const originalOpenVideoPicker =
      typeof window.openVideoPicker === 'function' ? window.openVideoPicker : null;
    const originalHandleWorkspaceFileSelected =
      typeof window.handleWorkspaceFileSelected === 'function'
        ? window.handleWorkspaceFileSelected
        : null;

    function navIndex(pageId) {
      return ({
        'page-home': 0,
        'page-search': 1,
        'page-enhancer': 2,
        'page-profile': 3
      })[pageId] ?? 0;
    }

    function getCurrentPageId() {
      try {
        if (typeof currentPage !== 'undefined' && typeof currentPage === 'string') {
          return currentPage;
        }
      } catch (_) {}
      return typeof window.currentPage === 'string' ? window.currentPage : 'page-home';
    }

    function render(nextIndex, userInitiated = false) {
      state.slideIndex = (Number(nextIndex) + slides.length) % slides.length;
      slides.forEach((slide, index) => {
        const active = index === state.slideIndex;
        slide.classList.toggle('active', active);
        slide.setAttribute('aria-hidden', String(!active));
      });
      dots.forEach((dot, index) => {
        const active = index === state.slideIndex;
        dot.classList.toggle('active', active);
        dot.setAttribute('aria-pressed', String(active));
      });
      if (userInitiated) restartAutoLoop();
    }

    function stopAutoLoop() {
      if (state.timer) window.clearInterval(state.timer);
      state.timer = null;
    }

    function startAutoLoop() {
      stopAutoLoop();
      if (document.hidden || !state.open) return;
      state.timer = window.setInterval(() => render(state.slideIndex + 1, false), 5000);
    }

    function restartAutoLoop() {
      stopAutoLoop();
      window.setTimeout(startAutoLoop, 140);
    }

    function syncNavigation() {
      document.body?.classList.toggle('vf926-workshop-open', state.open);
      if (!navigation) return;
      navigation.setAttribute('aria-hidden', String(state.open));
      if (state.open) navigation.setAttribute('inert', '');
      else navigation.removeAttribute('inert');
    }

    function keepEditorEntryVisible() {
      if (!state.open || !editorEntry) return;
      window.requestAnimationFrame(() => {
        try {
          editorEntry.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
        } catch (_) {}
      });
    }

    function showWorkshop() {
      state.open = true;
      state.pickerPending = false;
      state.fileSelected = false;
      workshop.classList.add('open');
      workshop.setAttribute('aria-hidden', 'false');
      syncNavigation();
      render(0, false);
      startAutoLoop();
      keepEditorEntryVisible();
    }

    function hideWorkshop() {
      state.open = false;
      stopAutoLoop();
      workshop.classList.remove('open');
      workshop.setAttribute('aria-hidden', 'true');
      syncNavigation();
    }

    function open() {
      const activePage = getCurrentPageId();
      state.sourcePage =
        activePage !== 'page-video-workspace' ? activePage : 'page-home';
      try {
        if (typeof window.setVideoWorkspaceReturnPage === 'function') {
          window.setVideoWorkspaceReturnPage(state.sourcePage);
        }
      } catch (_) {}
      showWorkshop();
    }

    function close() {
      hideWorkshop();
    }

    function recoverPickerCancel() {
      if (!state.pickerPending || state.fileSelected) return;
      state.pickerPending = false;
      try {
        if (typeof window.goToPage === 'function') {
          window.goToPage(state.sourcePage, navIndex(state.sourcePage));
        }
      } catch (_) {}
      showWorkshop();
    }

    function openPicker() {
      if (!originalOpenVideoPicker) {
        console.error('[V-Forge] Pemilih video belum tersedia.');
        return;
      }
      state.pickerPending = true;
      state.fileSelected = false;
      hideWorkshop();
      try {
        if (typeof window.setVideoWorkspaceReturnPage === 'function') {
          window.setVideoWorkspaceReturnPage(state.sourcePage);
        }
        if (typeof window.goToPage === 'function') {
          window.goToPage('page-video-workspace', -1);
        }
      } catch (_) {}
      window.setTimeout(() => {
        try {
          originalOpenVideoPicker(null);
        } catch (error) {
          state.pickerPending = false;
          try {
            if (typeof window.goToPage === 'function') {
              window.goToPage(state.sourcePage, navIndex(state.sourcePage));
            }
          } catch (_) {}
          showWorkshop();
          console.error('[V-Forge] Gagal membuka pemilih video:', error);
        }
      }, 100);
    }

    previousButton?.addEventListener('click', () => render(state.slideIndex - 1, true));
    nextButton?.addEventListener('click', () => render(state.slideIndex + 1, true));
    dots.forEach((dot) => {
      dot.addEventListener('click', () => render(Number(dot.dataset.vf926Dot) || 0, true));
    });

    carousel.addEventListener('pointerdown', (event) => {
      state.pointerStartX = event.clientX;
      stopAutoLoop();
    });
    carousel.addEventListener('pointerup', (event) => {
      if (state.pointerStartX !== null) {
        const distance = event.clientX - state.pointerStartX;
        if (Math.abs(distance) > 42) {
          render(state.slideIndex + (distance < 0 ? 1 : -1), false);
        }
      }
      state.pointerStartX = null;
      restartAutoLoop();
    });
    carousel.addEventListener('pointercancel', () => {
      state.pointerStartX = null;
      restartAutoLoop();
    });

    selectButton?.addEventListener('click', openPicker);
    selectButton?.setAttribute('aria-label', 'Pilih video untuk masuk ke V-Forge Video Editor');
    backButton?.addEventListener('click', close);

    if (originalHandleWorkspaceFileSelected && !originalHandleWorkspaceFileSelected.__vforgeV93ShowcaseWrapper) {
      const wrapped = function (input) {
        const file = input?.files?.[0];
        if (file) {
          state.fileSelected = true;
          state.pickerPending = false;
          hideWorkshop();
        }
        return originalHandleWorkspaceFileSelected.apply(this, arguments);
      };
      wrapped.__vforgeV93ShowcaseWrapper = true;
      window.handleWorkspaceFileSelected = wrapped;
    }

    window.addEventListener('focus', () => window.setTimeout(recoverPickerCancel, 420), { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopAutoLoop();
      else startAutoLoop();
    });
    window.addEventListener('resize', keepEditorEntryVisible, { passive: true });
    window.visualViewport?.addEventListener('resize', keepEditorEntryVisible, { passive: true });
    window.addEventListener('orientationchange', () => window.setTimeout(keepEditorEntryVisible, 180), { passive: true });

    window.startV83NewProject = open;
    window.openV82CreateSheet = open;
    window.startV82BlankProject = open;

    const homeButton = document.querySelector('#page-home .v82-create-button strong');
    const homeDescription = document.querySelector('#page-home .v82-create-copy p');
    if (homeButton) homeButton.textContent = 'Buka Premium Showcase';
    if (homeDescription) {
      homeDescription.textContent = 'Lihat tiga fitur unggulan V-Forge, lalu pilih video untuk masuk ke editor.';
    }

    render(0, false);
    syncNavigation();
    document.documentElement.dataset.vforgeShowcase93 = VERSION;
    window.VForgeShowcase93 = {
      version: VERSION,
      open,
      close,
      next: () => render(state.slideIndex + 1, true),
      previous: () => render(state.slideIndex - 1, true),
      sync: syncNavigation,
      getState: () => ({
        open: state.open,
        sourcePage: state.sourcePage,
        slideIndex: state.slideIndex,
        pickerPending: state.pickerPending
      })
    };
  } catch (error) {
    console.error('[V-Forge] V9.3 Showcase gagal dimulai:', error);
  }
})();

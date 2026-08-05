// ============================================================
// V8-UI.JS — V-Forge v8.2.1 Scroll + Navigation Reliability
// Presentation/navigation layer only. Firebase, projects,
// workspace, premium, and processor logic remain separate.
// ============================================================

const VFORGE_V82_VERSION = '8.2.1';
const V82_PUBLIC_PAGES = new Set(['page-login', 'page-register', 'page-forgot-password']);
let v82TemplateCategory = 'all';
let v82TemplateSearch = '';
let v82CreateSheetScrollY = 0;
let v82CreateSheetTrigger = null;
let v82TemplateObserver = null;

function isV82CreateSheetOpen() {
    return document.getElementById('v82-create-sheet')?.classList.contains('show') === true;
}

function lockV82BodyForSheet() {
    const body = document.body;
    if (!body || body.dataset.v82SheetLocked === 'true') return;

    v82CreateSheetScrollY = Math.max(0, window.scrollY || document.scrollingElement?.scrollTop || 0);
    body.dataset.v82SheetLocked = 'true';
    body.classList.add('v82-modal-open');
    body.style.position = 'fixed';
    body.style.top = `-${v82CreateSheetScrollY}px`;
    body.style.right = '0';
    body.style.left = '0';
    body.style.width = '100%';
}

function unlockV82BodyForSheet({ restoreScroll = true } = {}) {
    const body = document.body;
    if (!body) return;

    const wasLocked = body.dataset.v82SheetLocked === 'true';
    delete body.dataset.v82SheetLocked;
    body.classList.remove('v82-modal-open');
    body.style.removeProperty('position');
    body.style.removeProperty('top');
    body.style.removeProperty('right');
    body.style.removeProperty('left');
    body.style.removeProperty('width');

    if (wasLocked && restoreScroll) {
        window.requestAnimationFrame(() => window.scrollTo({ top: v82CreateSheetScrollY, left: 0, behavior: 'auto' }));
    }
}

function openV82CreateSheet() {
    const sheet = document.getElementById('v82-create-sheet');
    if (!sheet || sheet.classList.contains('show')) return;

    v82CreateSheetTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    sheet.classList.add('show');
    sheet.setAttribute('aria-hidden', 'false');
    lockV82BodyForSheet();

    window.requestAnimationFrame(() => {
        const firstAction = sheet.querySelector('.v82-create-option, .v82-create-sheet-head button');
        if (firstAction instanceof HTMLElement) firstAction.focus({ preventScroll: true });
    });
}

function closeV82CreateSheet(options = {}) {
    const { restoreFocus = true, restoreScroll = true } = options;
    const sheet = document.getElementById('v82-create-sheet');
    if (!sheet) {
        unlockV82BodyForSheet({ restoreScroll });
        return;
    }

    const wasOpen = sheet.classList.contains('show');
    sheet.classList.remove('show');
    sheet.setAttribute('aria-hidden', 'true');
    unlockV82BodyForSheet({ restoreScroll });

    if (wasOpen && restoreFocus && v82CreateSheetTrigger?.isConnected) {
        window.requestAnimationFrame(() => v82CreateSheetTrigger.focus({ preventScroll: true }));
    }
    v82CreateSheetTrigger = null;
}

function startV82BlankProject() {
    closeV82CreateSheet();
    window.setTimeout(() => typeof openVideoPicker === 'function' && openVideoPicker(), 100);
}

function openV82TemplatesFromSheet() {
    closeV82CreateSheet({ restoreFocus: false, restoreScroll: false });
    if (typeof goToPage === 'function') goToPage('page-enhancer', 2);
}

function openV82ProjectsFromSheet() {
    closeV82CreateSheet({ restoreFocus: false, restoreScroll: false });
    if (typeof goToPage === 'function') goToPage('page-search', 1);
}

function showV82Soon(feature) {
    const message = `${feature} sedang disiapkan untuk versi editor berikutnya.`;
    if (typeof safeShowToast === 'function') safeShowToast(message, 'info');
    else if (typeof showToast === 'function') showToast(message, 'info');
}

function openV82EditorTool(tool, button) {
    const page = document.getElementById('page-video-workspace');
    if (!page) return;

    const selected = page.querySelector(`[data-editor-panel="${tool}"]`);
    if (!selected) return;

    page.dataset.editorTool = tool;
    page.querySelectorAll('[data-editor-panel]').forEach((panel) => {
        const active = panel === selected;
        panel.classList.toggle('active', active);
        panel.setAttribute('aria-hidden', String(!active));
    });
    page.querySelectorAll('[data-editor-tool-button]').forEach((item) => {
        const active = item === button || item.dataset.editorToolButton === tool;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
    });

    const sheet = document.getElementById('workspace-form');
    if (sheet) {
        sheet.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        window.requestAnimationFrame(() => sheet.scrollTo({ top: 0, left: 0, behavior: 'auto' }));
    }
}

// Compatibility for v8 cached markup.
function openV8EditorTool(tool, button) {
    const map = { media: 'edit', edit: 'edit', audio: 'audio', text: 'text', effects: 'effects', export: 'export' };
    openV82EditorTool(map[tool] || 'edit', button);
}

function setV82HomeDaypart() {
    const greeting = document.getElementById('editor-greeting-title');
    if (!greeting) return;

    const current = String(greeting.textContent || '');
    const name = current.replace(/^(Hey|Pagi|Siang|Sore|Malam),\s*/i, '').trim() || 'Creator';
    const hour = new Date().getHours();
    const prefix = hour < 11 ? 'Pagi' : (hour < 15 ? 'Siang' : (hour < 19 ? 'Sore' : 'Malam'));
    const nextText = `${prefix}, ${name}`;
    if (greeting.textContent !== nextText) greeting.textContent = nextText;
}

function setV82TemplateCategory(category, button) {
    v82TemplateCategory = category || 'all';
    document.querySelectorAll('[data-v82-category]').forEach((item) => {
        const active = item === button || item.dataset.v82Category === v82TemplateCategory;
        item.classList.toggle('active', active);
        item.setAttribute('aria-selected', String(active));
    });
    applyV82TemplateFilters();
}

function filterV82Templates(value) {
    v82TemplateSearch = String(value || '').trim().toLowerCase();
    applyV82TemplateFilters();
}

function applyV82TemplateFilters() {
    const container = document.getElementById('studio-template-list');
    if (!container) return;

    const words = {
        automotive: ['velocity', 'drive', 'neon'],
        social: ['creator', 'pop', 'clean', 'story'],
        cinematic: ['cinematic', 'minimal', 'film'],
        premium: ['premium', 'neon', 'cinematic drive']
    };

    Array.from(container.children).forEach((card) => {
        if (!(card instanceof HTMLElement)) return;
        const text = String(card.textContent || '').toLowerCase();
        const premium = card.classList.contains('premium')
            || card.classList.contains('locked')
            || text.includes('premium')
            || Boolean(card.querySelector('.studio-premium-badge'));
        const queryMatch = !v82TemplateSearch || text.includes(v82TemplateSearch);
        let categoryMatch = v82TemplateCategory === 'all';
        if (v82TemplateCategory === 'premium') categoryMatch = premium;
        else if (words[v82TemplateCategory]) categoryMatch = words[v82TemplateCategory].some((word) => text.includes(word));
        card.hidden = !(queryMatch && categoryMatch);
    });
}

function observeV82TemplateList() {
    const list = document.getElementById('studio-template-list');
    if (!list) return;
    if (v82TemplateObserver) v82TemplateObserver.disconnect();
    v82TemplateObserver = new MutationObserver(() => applyV82TemplateFilters());
    v82TemplateObserver.observe(list, { childList: true });
    applyV82TemplateFilters();
}

function clearV82StaleScrollLocks(pageId = '') {
    const body = document.body;
    if (!body) return;

    if (!V82_PUBLIC_PAGES.has(pageId)) body.classList.remove('auth-mode');

    const projectSheetOpen = document.getElementById('project-detail-modal')?.classList.contains('show') === true;
    const onboardingOpen = document.getElementById('studio-onboarding')?.classList.contains('show') === true;
    if (!projectSheetOpen) body.classList.remove('project-sheet-open');
    if (!onboardingOpen) body.classList.remove('studio-onboarding-open');

    if (!isV82CreateSheetOpen() && body.dataset.v82SheetLocked === 'true') {
        unlockV82BodyForSheet({ restoreScroll: false });
    }
}

function handleV82PageChange(event) {
    const pageId = event.detail?.pageId || '';
    if (isV82CreateSheetOpen()) closeV82CreateSheet({ restoreFocus: false, restoreScroll: false });
    clearV82StaleScrollLocks(pageId);

    if (pageId === 'page-video-workspace') {
        openV82EditorTool('edit');
    } else {
        window.requestAnimationFrame(() => {
            const rootScroller = document.scrollingElement;
            if (rootScroller && rootScroller.scrollTop < 0) rootScroller.scrollTop = 0;
        });
    }
}

function prepareV82Ui() {
    document.documentElement.dataset.vforgeUi = VFORGE_V82_VERSION;
    setV82HomeDaypart();
    observeV82TemplateList();
    clearV82StaleScrollLocks(window.currentPage || '');

    const greeting = document.getElementById('editor-greeting-title');
    if (greeting) {
        new MutationObserver(() => window.requestAnimationFrame(setV82HomeDaypart))
            .observe(greeting, { childList: true, characterData: true, subtree: true });
    }

    document.addEventListener('vforge:pagechange', handleV82PageChange);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && isV82CreateSheetOpen()) {
            event.preventDefault();
            closeV82CreateSheet();
        }
    });

    window.addEventListener('pageshow', () => clearV82StaleScrollLocks(window.currentPage || ''));
    window.addEventListener('orientationchange', () => {
        window.setTimeout(() => clearV82StaleScrollLocks(window.currentPage || ''), 120);
    });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', prepareV82Ui, { once: true });
else prepareV82Ui();

// ============================================================
// V8-UI.JS — V-Forge v8.2 Native Navigation Rebuild
// Navigation and presentation layer only. Existing Firebase,
// project, premium, workspace, and processor logic stay intact.
// ============================================================

const VFORGE_V82_VERSION = '8.2.0';
let v82TemplateCategory = 'all';
let v82TemplateSearch = '';

function openV82CreateSheet() {
    const sheet = document.getElementById('v82-create-sheet');
    if (!sheet) return;
    sheet.classList.add('show');
    sheet.setAttribute('aria-hidden', 'false');
    document.body.classList.add('v82-modal-open');
}

function closeV82CreateSheet() {
    const sheet = document.getElementById('v82-create-sheet');
    if (!sheet) return;
    sheet.classList.remove('show');
    sheet.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('v82-modal-open');
}

function startV82BlankProject() {
    closeV82CreateSheet();
    window.setTimeout(() => typeof openVideoPicker === 'function' && openVideoPicker(), 100);
}

function openV82TemplatesFromSheet() {
    closeV82CreateSheet();
    if (typeof goToPage === 'function') goToPage('page-enhancer', 2);
}

function openV82ProjectsFromSheet() {
    closeV82CreateSheet();
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
    const selected = document.querySelector(`[data-editor-panel="${tool}"]`);
    if (!selected) return;
    page.dataset.editorTool = tool;
    document.querySelectorAll('[data-editor-panel]').forEach((panel) => panel.classList.toggle('active', panel === selected));
    document.querySelectorAll('[data-editor-tool-button]').forEach((item) => item.classList.toggle('active', item === button || item.dataset.editorToolButton === tool));
    const sheet = document.getElementById('workspace-form');
    if (sheet) sheet.scrollTop = 0;
}

// Compatibility for the v8 handler name used by older cached markup.
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
    greeting.textContent = `${prefix}, ${name}`;
}

function setV82TemplateCategory(category, button) {
    v82TemplateCategory = category || 'all';
    document.querySelectorAll('[data-v82-category]').forEach((item) => item.classList.toggle('active', item === button));
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
    container.querySelectorAll('button, [role="listitem"]').forEach((card) => {
        const text = String(card.textContent || '').toLowerCase();
        const premium = card.classList.contains('premium') || text.includes('premium') || card.querySelector('.studio-premium-badge');
        const queryMatch = !v82TemplateSearch || text.includes(v82TemplateSearch);
        let categoryMatch = v82TemplateCategory === 'all';
        if (v82TemplateCategory === 'premium') categoryMatch = Boolean(premium);
        else if (words[v82TemplateCategory]) categoryMatch = words[v82TemplateCategory].some((word) => text.includes(word));
        card.hidden = !(queryMatch && categoryMatch);
    });
}

function observeV82TemplateList() {
    const list = document.getElementById('studio-template-list');
    if (!list) return;
    new MutationObserver(() => applyV82TemplateFilters()).observe(list, { childList: true, subtree: true });
}

function prepareV82Ui() {
    document.documentElement.dataset.vforgeUi = VFORGE_V82_VERSION;
    setV82HomeDaypart();
    observeV82TemplateList();

    const greeting = document.getElementById('editor-greeting-title');
    if (greeting) new MutationObserver(() => window.requestAnimationFrame(setV82HomeDaypart)).observe(greeting, { childList: true, characterData: true, subtree: true });

    document.addEventListener('vforge:pagechange', (event) => {
        closeV82CreateSheet();
        if (event.detail?.pageId === 'page-video-workspace') openV82EditorTool('edit');
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeV82CreateSheet();
    });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', prepareV82Ui, { once: true });
else prepareV82Ui();

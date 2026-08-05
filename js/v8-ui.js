// ============================================================
// V8-UI.JS — V-Forge v8 Focus Redesign
// UI navigation only. Video bytes remain local and existing
// Firebase, Premium, workspace, and processor logic stay intact.
// ============================================================

const VFORGE_V8_VERSION = '8.0.0';

function openV8EditorTool(tool, button) {
    const targets = {
        media: 'v8-panel-media',
        edit: 'workspace-form',
        audio: 'v8-panel-audio',
        effects: 'v8-panel-effects',
        export: 'v8-panel-export'
    };

    document.querySelectorAll('.v8-editor-dock button').forEach((item) => {
        item.classList.toggle('active', item === button);
    });

    if (tool === 'text') {
        if (typeof safeShowToast === 'function') {
            safeShowToast('Text layer sedang disiapkan untuk update berikutnya.', 'info');
        } else if (typeof showToast === 'function') {
            showToast('Text layer sedang disiapkan untuk update berikutnya.', 'info');
        }
        return;
    }

    const target = document.getElementById(targets[tool]);
    if (!target) return;

    target.classList.remove('v8-tool-highlight');
    void target.offsetWidth;
    target.classList.add('v8-tool-highlight');
    target.scrollIntoView({ behavior: 'smooth', block: tool === 'media' ? 'start' : 'center' });
    window.setTimeout(() => target.classList.remove('v8-tool-highlight'), 1000);
}

function setV8HomeDaypart() {
    const greeting = document.getElementById('editor-greeting-title');
    if (!greeting || !/^Hey,\s*/i.test(greeting.textContent || '')) return;
    const name = String(greeting.textContent).replace(/^Hey,\s*/i, '').trim() || 'Creator';
    const hour = new Date().getHours();
    const prefix = hour < 11 ? 'Pagi' : (hour < 15 ? 'Siang' : (hour < 19 ? 'Sore' : 'Malam'));
    greeting.textContent = `${prefix}, ${name}`;
}

function prepareV8Ui() {
    document.documentElement.dataset.vforgeUi = VFORGE_V8_VERSION;
    setV8HomeDaypart();

    const studioObserver = new MutationObserver(() => {
        window.requestAnimationFrame(setV8HomeDaypart);
    });
    const greeting = document.getElementById('editor-greeting-title');
    if (greeting) studioObserver.observe(greeting, { childList: true, characterData: true, subtree: true });

    document.addEventListener('visibilitychange', () => {
        document.body.classList.toggle('v8-page-hidden', document.hidden);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', prepareV8Ui, { once: true });
} else {
    prepareV8Ui();
}

// ============================================================
// V8-UI.JS — V-Forge v8.3 Mission + Theme + Editor Attraction
// UI/navigation layer. Firebase profile, projects and processor
// remain separated in their original modules.
// ============================================================

const VFORGE_UI_VERSION = '8.3.0';
const VFORGE_PREMIUM_REWARD_COST = 1000;
const V83_MISSIONS = Object.freeze([
    { id: 'firstDraft', title: 'Buat satu draft', description: 'Pilih video dan simpan proyek hari ini.', icon: 'movie_edit', goal: 1, reward: 50 },
    { id: 'firstExport', title: 'Ekspor satu video', description: 'Selesaikan satu proses ekspor hari ini.', icon: 'ios_share', goal: 1, reward: 100 },
    { id: 'templateExplorer', title: 'Jelajahi 2 gaya', description: 'Gunakan dua template berbeda pada proyek hari ini.', icon: 'auto_awesome_mosaic', goal: 2, reward: 150 },
    { id: 'draftSprint', title: 'Simpan 3 draft', description: 'Bangun tiga konsep video dalam satu hari.', icon: 'local_fire_department', goal: 3, reward: 200 }
]);

let v82TemplateCategory = 'all';
let v82TemplateSearch = '';
let v82TemplateObserver = null;

function v83Toast(message, type = 'info') {
    if (typeof safeShowToast === 'function') safeShowToast(message, type);
    else if (typeof showToast === 'function') showToast(message, type);
}

function getV83JakartaDayKey(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    try {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(date);
    } catch (error) {
        const shifted = new Date(date.getTime() + (7 * 60 * 60 * 1000));
        return shifted.toISOString().slice(0, 10);
    }
}

function projectV83DayKey(timestamp) {
    if (!timestamp) return '';
    let millis = 0;
    if (typeof projectTimestampToMillis === 'function') millis = projectTimestampToMillis(timestamp);
    else if (typeof timestamp.toMillis === 'function') millis = timestamp.toMillis();
    else if (Number.isFinite(timestamp.seconds)) millis = timestamp.seconds * 1000;
    else millis = new Date(timestamp).getTime();
    return millis ? getV83JakartaDayKey(new Date(millis)) : '';
}

function getV83DerivedMissionProgress() {
    const today = getV83JakartaDayKey();
    const records = (typeof projectRecords !== 'undefined' && Array.isArray(projectRecords)) ? projectRecords : [];
    const todayProjects = records.filter((project) => {
        const createdKey = projectV83DayKey(project.createdAt);
        const updatedKey = projectV83DayKey(project.updatedAt);
        return createdKey === today || updatedKey === today;
    });
    const exportedToday = records.filter((project) => {
        if (project.status !== 'completed') return false;
        return projectV83DayKey(project.lastExportedAt || project.updatedAt) === today;
    });
    const uniqueTemplates = new Set(todayProjects.map((project) => project.templateId).filter(Boolean));
    return {
        firstDraft: Math.min(1, todayProjects.length),
        firstExport: Math.min(1, exportedToday.length),
        templateExplorer: Math.min(2, uniqueTemplates.size),
        draftSprint: Math.min(3, todayProjects.length)
    };
}

function getV83MissionSnapshot() {
    const today = getV83JakartaDayKey();
    const serverState = (typeof activeProfileData === 'object' && activeProfileData)
        ? activeProfileData.dailyMissionState
        : null;
    const derived = getV83DerivedMissionProgress();
    const validServer = serverState && serverState.dayKey === today;
    const serverProgress = validServer && serverState.progress && typeof serverState.progress === 'object'
        ? serverState.progress : {};
    const claimed = validServer && serverState.claimed && typeof serverState.claimed === 'object'
        ? serverState.claimed : {};
    const progress = {};
    V83_MISSIONS.forEach((mission) => {
        progress[mission.id] = Math.max(0, Math.min(mission.goal,
            Number(serverProgress[mission.id]) || Number(derived[mission.id]) || 0));
    });
    return { today, progress, claimed, serverConnected: Boolean(validServer) };
}

function escapeV83(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}


let v83MissionSyncPromise = null;
async function syncV83MissionBackend() {
    if (v83MissionSyncPromise) return v83MissionSyncPromise;
    if (typeof auth === 'undefined' || !auth?.currentUser || typeof functions === 'undefined' || !functions) return null;
    v83MissionSyncPromise = (async () => {
        try {
            const sync = functions.httpsCallable('syncDailyMissions');
            await sync({ dayKey: getV83JakartaDayKey() });
        } catch (error) {
            console.info('Mission backend belum aktif atau belum dapat dijangkau:', error?.code || error?.message || error);
        } finally {
            window.setTimeout(() => { v83MissionSyncPromise = null; }, 1500);
        }
    })();
    return v83MissionSyncPromise;
}

function renderV83Missions() {
    const list = document.getElementById('v83-mission-list');
    const pointsHome = document.getElementById('v83-home-points');
    const points = Math.max(0, Number(typeof userPoints !== 'undefined' ? userPoints : activeProfileData?.points) || 0);
    const premium = typeof isPremium !== 'undefined' && isPremium === true;
    const missionState = getV83MissionSnapshot();

    if (pointsHome) pointsHome.textContent = String(points);
    const globalPoints = document.getElementById('global-points-display');
    if (globalPoints) globalPoints.textContent = String(points);

    if (list) {
        list.innerHTML = V83_MISSIONS.map((mission) => {
            const progress = missionState.progress[mission.id] || 0;
            const complete = progress >= mission.goal;
            const claimed = missionState.claimed[mission.id] === true;
            const percent = Math.round((progress / mission.goal) * 100);
            const status = claimed ? 'Poin masuk' : (complete ? 'Verifikasi' : `${progress}/${mission.goal}`);
            return `<article class="v83-mission-card${complete ? ' is-complete' : ''}${claimed ? ' is-claimed' : ''}" data-mission-id="${escapeV83(mission.id)}">
                <span class="v83-mission-icon"><span class="material-icons-round">${escapeV83(mission.icon)}</span></span>
                <span class="v83-mission-copy"><strong>${escapeV83(mission.title)}</strong><small>${escapeV83(mission.description)}</small><span class="v83-mission-mini-track"><span style="width:${percent}%"></span></span></span>
                <span class="v83-mission-reward"><b>+${mission.reward}</b><span>${escapeV83(status)}</span></span>
            </article>`;
        }).join('');
    }

    const progressLabel = document.getElementById('v83-premium-progress-label');
    const progressBar = document.getElementById('v83-premium-progress-bar');
    const progressNote = document.getElementById('v83-premium-progress-note');
    const redeem = document.getElementById('v83-redeem-premium');
    const percent = Math.min(100, Math.round((points / VFORGE_PREMIUM_REWARD_COST) * 100));
    if (progressLabel) progressLabel.textContent = premium ? 'Premium sedang aktif' : `${points} / ${VFORGE_PREMIUM_REWARD_COST} poin`;
    if (progressBar) progressBar.style.width = premium ? '100%' : `${percent}%`;
    if (progressNote) {
        progressNote.textContent = premium
            ? '4K, 120 FPS, dan Hi-Res Lossless telah terbuka pada akun ini.'
            : (missionState.serverConnected
                ? 'Misi tersambung ke Firebase dan hadiah diproses otomatis oleh backend.'
                : 'Progres lokal terlihat real-time. Pasang Cloud Functions agar poin dan Premium diproses aman.');
    }
    if (redeem) {
        if (premium) {
            redeem.textContent = 'Aktif';
            redeem.disabled = true;
        } else if (points >= VFORGE_PREMIUM_REWARD_COST) {
            redeem.textContent = 'Aktifkan';
            redeem.disabled = false;
        } else {
            redeem.textContent = 'Kumpulkan';
            redeem.disabled = true;
        }
    }
}

function applyVForgeTheme(theme, options = {}) {
    const next = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    document.body?.classList.toggle('dark-mode', next === 'dark');
    try { localStorage.setItem('vforge-theme', next); } catch (error) {}

    const toggle = document.getElementById('v83-theme-toggle');
    if (toggle) {
        const active = next === 'dark';
        toggle.classList.toggle('active', active);
        toggle.setAttribute('aria-checked', String(active));
    }
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', next === 'dark' ? '#07070A' : '#F3F3F7');
    if (!options.silent) v83Toast(next === 'dark' ? 'Mode gelap aktif 🌙' : 'Mode terang aktif ☀️', 'check');
}

function toggleDarkMode() {
    const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    applyVForgeTheme(current === 'dark' ? 'light' : 'dark');
}

function syncV83EditorAttraction() {
    const frame = document.getElementById('workspace-video-frame');
    const video = document.getElementById('workspace-video');
    if (!frame || !video) return;
    const hasVideo = Boolean(video.getAttribute('src') || video.currentSrc || (typeof videoWorkspaceState === 'object' && videoWorkspaceState?.file));
    frame.classList.toggle('has-video', hasVideo);
}

function startV83NewProject() {
    const sourcePage = (typeof currentPage === 'string' && currentPage !== 'page-video-workspace') ? currentPage : 'page-home';
    if (typeof setVideoWorkspaceReturnPage === 'function') setVideoWorkspaceReturnPage(sourcePage);
    try {
        if (typeof closeVideoWorkspace === 'function') closeVideoWorkspace({ navigate: false, force: true });
    } catch (error) {}
    if (typeof goToPage === 'function') goToPage('page-video-workspace', -1);
    syncV83EditorAttraction();
    if (typeof openVideoPicker === 'function') openVideoPicker();
}

// Cached v8.2 markup compatibility: no duplicate sheet anymore.
function openV82CreateSheet() { startV83NewProject(); }
function closeV82CreateSheet() {}
function startV82BlankProject() { startV83NewProject(); }
function openV82TemplatesFromSheet() { if (typeof goToPage === 'function') goToPage('page-enhancer', 2); }
function openV82ProjectsFromSheet() { if (typeof goToPage === 'function') goToPage('page-search', 1); }
function showV82Soon(feature) { v83Toast(`${feature} sedang disiapkan bertahap.`, 'info'); }

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
    if (sheet) sheet.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}
function openV8EditorTool(tool, button) {
    const map = { media:'edit', edit:'edit', audio:'audio', text:'text', effects:'effects', export:'export' };
    openV82EditorTool(map[tool] || 'edit', button);
}

function setV82HomeDaypart() {
    const greeting = document.getElementById('editor-greeting-title');
    if (!greeting) return;
    const current = String(greeting.textContent || '');
    const name = current.replace(/^(Hey|Pagi|Siang|Sore|Malam),\s*/i, '').trim() || 'Creator';
    const hour = new Date().getHours();
    const prefix = hour < 11 ? 'Pagi' : (hour < 15 ? 'Siang' : (hour < 19 ? 'Sore' : 'Malam'));
    const text = `${prefix}, ${name}`;
    if (greeting.textContent !== text) greeting.textContent = text;
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
function filterV82Templates(value) { v82TemplateSearch = String(value || '').trim().toLowerCase(); applyV82TemplateFilters(); }
function applyV82TemplateFilters() {
    const container = document.getElementById('studio-template-list');
    if (!container) return;
    const words = {
        automotive:['velocity','drive','neon'], social:['creator','pop','clean','story'],
        cinematic:['cinematic','minimal','film'], premium:['premium','neon','cinematic drive']
    };
    Array.from(container.children).forEach((card) => {
        if (!(card instanceof HTMLElement)) return;
        const text = String(card.textContent || '').toLowerCase();
        const premium = card.classList.contains('premium') || card.classList.contains('locked') || text.includes('premium') || Boolean(card.querySelector('.studio-premium-badge'));
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
    v82TemplateObserver = new MutationObserver(applyV82TemplateFilters);
    v82TemplateObserver.observe(list, { childList:true });
    applyV82TemplateFilters();
}

function clearV83StaleLocks() {
    const body = document.body;
    if (!body) return;
    body.classList.remove('v82-modal-open');
    delete body.dataset.v82SheetLocked;
    ['position','top','right','left','width'].forEach((property) => body.style.removeProperty(property));
}

function handleV83PageChange(event) {
    const pageId = event.detail?.pageId || '';
    clearV83StaleLocks();
    if (pageId === 'page-video-workspace') {
        openV82EditorTool('edit');
        window.requestAnimationFrame(syncV83EditorAttraction);
    }
    if (pageId === 'page-home') renderV83Missions();
}

function prepareV83Ui() {
    document.documentElement.dataset.vforgeUi = VFORGE_UI_VERSION;
    const savedTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    applyVForgeTheme(savedTheme, { silent:true });
    setV82HomeDaypart();
    observeV82TemplateList();
    renderV83Missions();
    clearV83StaleLocks();

    const greeting = document.getElementById('editor-greeting-title');
    if (greeting) new MutationObserver(() => requestAnimationFrame(setV82HomeDaypart)).observe(greeting, { childList:true, characterData:true, subtree:true });

    const video = document.getElementById('workspace-video');
    if (video) {
        ['loadstart','loadedmetadata','emptied','error','abort'].forEach((eventName) => video.addEventListener(eventName, syncV83EditorAttraction));
        new MutationObserver(syncV83EditorAttraction).observe(video, { attributes:true, attributeFilter:['src'] });
    }

    document.addEventListener('vforge:pagechange', handleV83PageChange);
    window.addEventListener('pageshow', () => { clearV83StaleLocks(); renderV83Missions(); syncV83EditorAttraction(); });
    window.addEventListener('orientationchange', () => setTimeout(clearV83StaleLocks, 120));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', prepareV83Ui, { once:true });
else prepareV83Ui();

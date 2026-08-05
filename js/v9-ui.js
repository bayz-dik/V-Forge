// ============================================================
// V9-UI.JS — V-Forge Sprint V9
// Mobile shell, Spark-safe missions, unified themes, editor motion
// ============================================================

const VFORGE_UI_VERSION = '9.0.2';
const VFORGE_BACKEND_MODE = 'spark';
const VFORGE_PREMIUM_REWARD_COST = 1000;
const V9_MISSIONS = Object.freeze([
  { id:'firstDraft', title:'Buat satu draft', description:'Pilih video dan simpan satu proyek hari ini.', icon:'movie_edit', goal:1, reward:50, action:'editor' },
  { id:'firstExport', title:'Ekspor satu video', description:'Selesaikan satu proses ekspor hari ini.', icon:'ios_share', goal:1, reward:100, action:'projects' },
  { id:'templateExplorer', title:'Pakai dua gaya', description:'Gunakan dua template berbeda pada proyek hari ini.', icon:'auto_awesome_mosaic', goal:2, reward:150, action:'templates' },
  { id:'draftSprint', title:'Simpan tiga draft', description:'Bangun tiga konsep video dalam satu hari.', icon:'local_fire_department', goal:3, reward:200, action:'editor' }
]);
const V9_EDITOR_FEATURES = Object.freeze([
  { kicker:'MOTION-FIRST EDITOR', title:'Potong cepat. Gerak halus.', description:'Preview, timeline, transition, dan efek berada dalam satu workspace yang fokus.' },
  { kicker:'LOCAL-FIRST PRIVACY', title:'Video tetap di perangkat.', description:'File sumber tidak diunggah ke cloud. Firebase hanya menyimpan akun dan metadata kecil.' },
  { kicker:'V-FORGE SIGNATURE', title:'Automotive energy, studio control.', description:'Motion light, smoke, color, dan visual premium menjaga editor terasa hidup.' }
]);

let v82TemplateCategory = 'all';
let v82TemplateSearch = '';
let v82TemplateObserver = null;
let v9LaunchBusy = false;
let v9FeatureIndex = 0;
let v9FeatureTimer = null;

let v9EditorViewportFrame = 0;
function syncV9EditorViewport() {
  if (v9EditorViewportFrame) cancelAnimationFrame(v9EditorViewportFrame);
  v9EditorViewportFrame = requestAnimationFrame(() => {
    v9EditorViewportFrame = 0;
    const viewport = window.visualViewport;
    const height = Math.max(320, Math.round(viewport?.height || window.innerHeight || document.documentElement.clientHeight));
    document.documentElement.style.setProperty('--vf-editor-height', `${height}px`);
  });
}
function setV9EditorViewportMode(active) {
  document.body?.classList.toggle('vf-editor-open', Boolean(active));
  if (active) syncV9EditorViewport();
}

function v9Toast(message, type='info') {
  if (typeof safeShowToast === 'function') safeShowToast(message, type);
  else if (typeof showToast === 'function') showToast(message, type);
}
function escapeV9(value) {
  return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function getV9JakartaDayKey(value=new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  try { return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(date); }
  catch (_) { return new Date(date.getTime()+25200000).toISOString().slice(0,10); }
}
function projectV9DayKey(timestamp) {
  if (!timestamp) return '';
  let millis = 0;
  if (typeof projectTimestampToMillis === 'function') millis = projectTimestampToMillis(timestamp);
  else if (typeof timestamp.toMillis === 'function') millis = timestamp.toMillis();
  else if (Number.isFinite(timestamp.seconds)) millis = timestamp.seconds*1000;
  else millis = new Date(timestamp).getTime();
  return millis ? getV9JakartaDayKey(new Date(millis)) : '';
}
function getV9MissionProgress() {
  const today = getV9JakartaDayKey();
  const records = (typeof projectRecords !== 'undefined' && Array.isArray(projectRecords)) ? projectRecords : [];
  const todayProjects = records.filter(project => projectV9DayKey(project.createdAt)===today || projectV9DayKey(project.updatedAt)===today);
  const exports = records.filter(project => project.status==='completed' && projectV9DayKey(project.lastExportedAt || project.updatedAt)===today);
  const templates = new Set(todayProjects.map(project => project.templateId).filter(Boolean));
  return {
    firstDraft:Math.min(1,todayProjects.length),
    firstExport:Math.min(1,exports.length),
    templateExplorer:Math.min(2,templates.size),
    draftSprint:Math.min(3,todayProjects.length)
  };
}
function getV9VerifiedPoints() {
  const profilePoints = Number(typeof activeProfileData === 'object' && activeProfileData ? activeProfileData.points : NaN);
  return Number.isFinite(profilePoints) ? Math.max(0, profilePoints) : 0;
}
function getV9BetaScore(progress) {
  return V9_MISSIONS.reduce((total, mission) => total + ((progress[mission.id]||0)>=mission.goal ? mission.reward : 0), 0);
}
function openV9MissionAction(action) {
  if (action==='templates') return typeof goToPage==='function' && goToPage('page-enhancer',2);
  if (action==='projects') return typeof goToPage==='function' && goToPage('page-search',1);
  startV83NewProject();
}
function renderV83Missions() {
  const progress = getV9MissionProgress();
  const verifiedPoints = getV9VerifiedPoints();
  const betaScore = getV9BetaScore(progress);
  const premium = typeof isPremium !== 'undefined' && isPremium===true;
  const list = document.getElementById('v83-mission-list');
  const pointsHome = document.getElementById('v83-home-points');
  const globalPoints = document.getElementById('global-points-display');
  if (pointsHome) pointsHome.textContent = String(verifiedPoints);
  if (globalPoints) globalPoints.textContent = String(verifiedPoints);
  const achievementPoints = document.getElementById('ach-points-text');
  if (achievementPoints) achievementPoints.textContent = String(verifiedPoints);

  if (list) list.innerHTML = V9_MISSIONS.map(mission => {
    const value = Math.max(0,Math.min(mission.goal,Number(progress[mission.id])||0));
    const complete = value>=mission.goal;
    const percent = Math.round(value/mission.goal*100);
    const status = complete ? 'Selesai • Beta' : `${value}/${mission.goal}`;
    return `<button class="v83-mission-card${complete?' is-complete':''}" data-mission-id="${escapeV9(mission.id)}" onclick="openV9MissionAction('${escapeV9(mission.action)}')" type="button">
      <span class="v83-mission-icon"><span class="material-icons-round">${escapeV9(mission.icon)}</span></span>
      <span class="v83-mission-copy"><strong>${escapeV9(mission.title)}</strong><small>${escapeV9(mission.description)}</small><span class="v83-mission-mini-track"><span style="width:${percent}%"></span></span></span>
      <span class="v83-mission-reward"><b>+${mission.reward}</b><span>${escapeV9(status)}</span></span>
    </button>`;
  }).join('');

  const label = document.getElementById('v83-premium-progress-label');
  const bar = document.getElementById('v83-premium-progress-bar');
  const note = document.getElementById('v83-premium-progress-note');
  const redeem = document.getElementById('v83-redeem-premium');
  const percent = Math.min(100,Math.round(verifiedPoints/VFORGE_PREMIUM_REWARD_COST*100));
  if (label) label.textContent = premium ? 'Premium sedang aktif' : `${verifiedPoints} / ${VFORGE_PREMIUM_REWARD_COST} poin`;
  if (bar) bar.style.width = premium ? '100%' : `${percent}%`;
  if (note) note.textContent = premium
    ? '4K, 120 FPS, dan Hi-Res Lossless terbuka pada akun ini.'
    : `Mode Spark: skor beta hari ini +${betaScore}. Poin aman dan Premium menunggu Cloud Functions.`;
  if (redeem) {
    redeem.disabled = true;
    redeem.textContent = premium ? 'Aktif' : 'Spark Beta';
  }
  const rewardButton = document.getElementById('redeem-vip-btn');
  if (rewardButton && !premium) {
    rewardButton.textContent = 'Belum aktif';
    rewardButton.classList.add('disabled');
    rewardButton.setAttribute('aria-disabled','true');
  }
}

function applyVForgeTheme(theme, options={}) {
  const next = theme==='light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme',next);
  document.body?.classList.toggle('dark-mode',next==='dark');
  try { localStorage.setItem('vforge-theme',next); } catch (_) {}
  const toggle = document.getElementById('v83-theme-toggle');
  if (toggle) {
    const active = next==='dark';
    toggle.classList.toggle('active',active);
    toggle.setAttribute('aria-checked',String(active));
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content',next==='dark'?'#08080B':'#F4F2F8');
  if (!options.silent) v9Toast(next==='dark'?'Mode gelap aktif 🌙':'Mode terang aktif ☀️','check');
}
function toggleDarkMode() {
  const current = document.documentElement.getAttribute('data-theme')==='light'?'light':'dark';
  applyVForgeTheme(current==='dark'?'light':'dark');
}
function setV82HomeDaypart() {
  const greeting = document.getElementById('editor-greeting-title');
  if (!greeting) return;
  const raw = String(greeting.textContent||'');
  const name = raw.replace(/^(Hey|Pagi|Siang|Sore|Malam),\s*/i,'').trim()||'Creator';
  const hour = new Date().getHours();
  const prefix = hour<11?'Pagi':hour<15?'Siang':hour<19?'Sore':'Malam';
  const next = `${prefix}, ${name}`;
  if (greeting.textContent!==next) greeting.textContent=next;
}

function syncV83EditorAttraction() {
  const frame = document.getElementById('workspace-video-frame');
  const video = document.getElementById('workspace-video');
  if (!frame || !video) return;
  const hasVideo = Boolean(video.getAttribute('src') || video.currentSrc || (typeof videoWorkspaceState==='object' && videoWorkspaceState?.file));
  frame.classList.toggle('has-video',hasVideo);
  if (hasVideo) stopV9FeatureRotation(); else startV9FeatureRotation();
}
function renderV9EditorFeature(index) {
  const feature = V9_EDITOR_FEATURES[index%V9_EDITOR_FEATURES.length];
  const kicker = document.getElementById('v9-attract-kicker');
  const title = document.getElementById('v9-attract-title');
  const desc = document.getElementById('v9-attract-description');
  if (kicker) kicker.textContent=feature.kicker;
  if (title) title.textContent=feature.title;
  if (desc) desc.textContent=feature.description;
  document.querySelectorAll('.v9-feature-dots i').forEach((dot,i)=>dot.classList.toggle('active',i===index));
}
function startV9FeatureRotation() {
  if (v9FeatureTimer) return;
  renderV9EditorFeature(v9FeatureIndex);
  v9FeatureTimer = window.setInterval(()=>{ v9FeatureIndex=(v9FeatureIndex+1)%V9_EDITOR_FEATURES.length; renderV9EditorFeature(v9FeatureIndex); },4200);
}
function stopV9FeatureRotation() { if (v9FeatureTimer) window.clearInterval(v9FeatureTimer); v9FeatureTimer=null; }

function startV83NewProject() {
  if (v9LaunchBusy) return;
  v9LaunchBusy=true;
  const source = (typeof currentPage==='string' && currentPage!=='page-video-workspace') ? currentPage : 'page-home';
  if (typeof setVideoWorkspaceReturnPage==='function') setVideoWorkspaceReturnPage(source);
  if (typeof goToPage==='function') goToPage('page-video-workspace',-1);
  syncV83EditorAttraction();
  window.setTimeout(()=>{
    try { if (typeof openVideoPicker==='function') openVideoPicker(); }
    finally { window.setTimeout(()=>{v9LaunchBusy=false;},500); }
  },120);
}
function openV82CreateSheet(){startV83NewProject();}
function closeV82CreateSheet(){}
function startV82BlankProject(){startV83NewProject();}
function openV82TemplatesFromSheet(){if(typeof goToPage==='function')goToPage('page-enhancer',2);}
function openV82ProjectsFromSheet(){if(typeof goToPage==='function')goToPage('page-search',1);}
function showV82Soon(feature){v9Toast(`${feature} akan dibangun bertahap pada sprint editor berikutnya.`,'info');}

function openV82EditorTool(tool,button) {
  const page=document.getElementById('page-video-workspace');
  if(!page)return;
  const selected=page.querySelector(`[data-editor-panel="${tool}"]`);
  if(!selected)return;
  page.dataset.editorTool=tool;
  page.querySelectorAll('[data-editor-panel]').forEach(panel=>{const active=panel===selected;panel.classList.toggle('active',active);panel.setAttribute('aria-hidden',String(!active));});
  page.querySelectorAll('[data-editor-tool-button]').forEach(item=>{const active=item===button||item.dataset.editorToolButton===tool;item.classList.toggle('active',active);item.setAttribute('aria-pressed',String(active));});
  const sheet=document.getElementById('workspace-form');
  if(sheet)sheet.scrollTo({top:0,left:0,behavior:'auto'});
}
function openV8EditorTool(tool,button){const map={media:'edit',edit:'edit',audio:'audio',text:'text',effects:'effects',export:'export'};openV82EditorTool(map[tool]||'edit',button);}

function setV82TemplateCategory(category,button) {
  v82TemplateCategory=category||'all';
  document.querySelectorAll('[data-v82-category]').forEach(item=>{const active=item===button||item.dataset.v82Category===v82TemplateCategory;item.classList.toggle('active',active);item.setAttribute('aria-selected',String(active));});
  applyV82TemplateFilters();
}
function filterV82Templates(value){v82TemplateSearch=String(value||'').trim().toLowerCase();applyV82TemplateFilters();}
function applyV82TemplateFilters(){
  const container=document.getElementById('studio-template-list'); if(!container)return;
  const words={automotive:['velocity','drive','neon'],social:['creator','pop','clean','story'],cinematic:['cinematic','minimal','film'],premium:['premium','neon','cinematic drive']};
  Array.from(container.children).forEach(card=>{if(!(card instanceof HTMLElement))return;const text=String(card.textContent||'').toLowerCase();const premium=card.classList.contains('premium')||card.classList.contains('locked')||text.includes('premium')||Boolean(card.querySelector('.studio-premium-badge'));const q=!v82TemplateSearch||text.includes(v82TemplateSearch);let c=v82TemplateCategory==='all';if(v82TemplateCategory==='premium')c=premium;else if(words[v82TemplateCategory])c=words[v82TemplateCategory].some(word=>text.includes(word));card.hidden=!(q&&c);});
}
function observeV82TemplateList(){const list=document.getElementById('studio-template-list');if(!list)return;if(v82TemplateObserver)v82TemplateObserver.disconnect();v82TemplateObserver=new MutationObserver(applyV82TemplateFilters);v82TemplateObserver.observe(list,{childList:true});applyV82TemplateFilters();}

function clearV9StaleLocks(){
  const body=document.body;if(!body)return;
  body.classList.remove('v82-modal-open','v83-modal-open');
  delete body.dataset.v82SheetLocked;
  ['position','top','right','left','width','overflow'].forEach(prop=>body.style.removeProperty(prop));
}
function handleV9PageChange(event){
  const pageId=event.detail?.pageId||'';
  clearV9StaleLocks();
  document.querySelectorAll('.page.active').forEach(page=>{if(pageId!=='page-video-workspace')page.scrollTop=0;});
  const editorOpen = pageId==='page-video-workspace';
  setV9EditorViewportMode(editorOpen);
  if(editorOpen){openV82EditorTool('edit');requestAnimationFrame(()=>{syncV83EditorAttraction();syncV902PreviewCanvas();});}
  else stopV9FeatureRotation();
  if(pageId==='page-home')renderV83Missions();
}

const v9OriginalRedeem = typeof window.redeemSubscription==='function' ? window.redeemSubscription : null;
window.redeemSubscription = async function(cost=1000){
  if (VFORGE_BACKEND_MODE==='spark') {
    v9Toast('Penukaran Premium membutuhkan Cloud Functions. Pada paket Spark, progres tetap tampil sebagai beta tanpa mengubah akun.','info');
    return false;
  }
  return v9OriginalRedeem ? v9OriginalRedeem(cost) : false;
};



// v9.0.2 — hitung ukuran canvas preview agar seluruh video selalu terlihat.
let v902PreviewResizeObserver = null;
let v902PreviewFrameObserver = null;
function getV902PreviewRatio() {
  const settings = (typeof videoWorkspaceState === 'object' && videoWorkspaceState?.settings) ? videoWorkspaceState.settings : {};
  const metadata = (typeof videoWorkspaceState === 'object' && videoWorkspaceState?.metadata) ? videoWorkspaceState.metadata : {};
  const selected = settings.aspectRatio || 'original';
  const map = { '9:16': 9/16, '16:9': 16/9, '1:1': 1 };
  if (selected !== 'original' && map[selected]) return map[selected];
  const width = Number(metadata.width) || 0;
  const height = Number(metadata.height) || 0;
  if (width > 0 && height > 0) return width / height;
  const video = document.getElementById('workspace-video');
  if (video?.videoWidth > 0 && video?.videoHeight > 0) return video.videoWidth / video.videoHeight;
  return 16/9;
}
function syncV902PreviewCanvas() {
  const page = document.getElementById('page-video-workspace');
  const stage = page?.querySelector('.v82-preview-stage');
  const frame = document.getElementById('workspace-video-frame');
  const video = document.getElementById('workspace-video');
  const meta = page?.querySelector('.v82-preview-meta');
  if (!page || !stage || !frame || !video) return;
  if (!page.classList.contains('active')) return;

  const stageStyle = getComputedStyle(stage);
  const padX = (parseFloat(stageStyle.paddingLeft)||0) + (parseFloat(stageStyle.paddingRight)||0);
  const padY = (parseFloat(stageStyle.paddingTop)||0) + (parseFloat(stageStyle.paddingBottom)||0);
  const gap = parseFloat(stageStyle.rowGap)||0;
  const metaHeight = meta ? meta.getBoundingClientRect().height : 0;
  const maxWidth = Math.max(80, stage.clientWidth - padX);
  const maxHeight = Math.max(80, stage.clientHeight - padY - metaHeight - gap);
  const hasVideo = Boolean(video.getAttribute('src') || video.currentSrc || (typeof videoWorkspaceState === 'object' && videoWorkspaceState?.file));
  const ratio = hasVideo ? Math.max(.2, Math.min(5, getV902PreviewRatio())) : 16/9;

  let width = maxWidth;
  let height = width / ratio;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }
  width = Math.max(36, Math.min(maxWidth, width));
  height = Math.max(36, Math.min(maxHeight, height));

  frame.style.setProperty('--v902-canvas-width', `${Math.floor(width)}px`);
  frame.style.setProperty('--v902-canvas-height', `${Math.floor(height)}px`);
  frame.style.setProperty('--v902-preview-ratio', String(ratio));
  frame.dataset.previewOrientation = ratio < .9 ? 'portrait' : (ratio > 1.1 ? 'landscape' : 'square');
  frame.dataset.previewFit = 'contain';
  video.style.setProperty('object-fit','contain','important');
  video.style.setProperty('object-position','50% 50%','important');
}
function prepareV902PreviewCanvas() {
  const stage = document.querySelector('#page-video-workspace .v82-preview-stage');
  const frame = document.getElementById('workspace-video-frame');
  const video = document.getElementById('workspace-video');
  if (!stage || !frame || !video) return;
  if ('ResizeObserver' in window) {
    v902PreviewResizeObserver?.disconnect();
    v902PreviewResizeObserver = new ResizeObserver(() => requestAnimationFrame(syncV902PreviewCanvas));
    v902PreviewResizeObserver.observe(stage);
  }
  v902PreviewFrameObserver?.disconnect();
  v902PreviewFrameObserver = new MutationObserver(() => requestAnimationFrame(syncV902PreviewCanvas));
  v902PreviewFrameObserver.observe(frame,{attributes:true,attributeFilter:['class']});
  ['loadedmetadata','loadeddata','durationchange','emptied'].forEach(name => video.addEventListener(name,()=>requestAnimationFrame(syncV902PreviewCanvas)));
  requestAnimationFrame(syncV902PreviewCanvas);
}

function prepareV9Ui(){
  document.documentElement.dataset.vforgeUi=VFORGE_UI_VERSION;
  document.documentElement.dataset.firebasePlan=VFORGE_BACKEND_MODE;
  const stored=(()=>{try{return localStorage.getItem('vforge-theme');}catch(_){return null;}})();
  const preferred=stored || (window.matchMedia?.('(prefers-color-scheme: light)').matches?'light':'dark');
  applyVForgeTheme(preferred,{silent:true});
  prepareV902PreviewCanvas();
  setV82HomeDaypart();observeV82TemplateList();renderV83Missions();clearV9StaleLocks();syncV9EditorViewport();syncV83EditorAttraction();
  const greeting=document.getElementById('editor-greeting-title');
  if(greeting)new MutationObserver(()=>requestAnimationFrame(setV82HomeDaypart)).observe(greeting,{childList:true,characterData:true,subtree:true});
  const video=document.getElementById('workspace-video');
  if(video){['loadstart','loadedmetadata','emptied','error','abort'].forEach(name=>video.addEventListener(name,syncV83EditorAttraction));new MutationObserver(syncV83EditorAttraction).observe(video,{attributes:true,attributeFilter:['src']});}
  document.addEventListener('vforge:pagechange',handleV9PageChange);
  window.addEventListener('pageshow',()=>{clearV9StaleLocks();renderV83Missions();syncV83EditorAttraction();});
  window.addEventListener('orientationchange',()=>setTimeout(()=>{clearV9StaleLocks();syncV9EditorViewport();syncV902PreviewCanvas();},120));
  window.addEventListener('resize',()=>{syncV9EditorViewport();syncV902PreviewCanvas();},{passive:true});
  if(window.visualViewport){window.visualViewport.addEventListener('resize',()=>{syncV9EditorViewport();syncV902PreviewCanvas();},{passive:true});window.visualViewport.addEventListener('scroll',()=>{syncV9EditorViewport();syncV902PreviewCanvas();},{passive:true});}
  window.addEventListener('online',()=>v9Toast('Koneksi kembali aktif. Firebase akan menyinkronkan metadata.','sync'));
  window.addEventListener('offline',()=>v9Toast('Mode offline aktif. Video lokal tetap dapat diedit.','info'));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',prepareV9Ui,{once:true});else prepareV9Ui();

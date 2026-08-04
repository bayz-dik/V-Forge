// VARIABLE GLOBAL DEKLARASI DI ATAS BIAR AMAN DAN JALAN 100%
        let isPremium = false;
        let userPoints = 348;
        let completedTasks = 0;
        let globalExportedVideos = 12;
        let mission1State = 'todo'; 
        let currentPage = 'page-home';
        let subSourcePage = 'page-profile';
        let hasNotifPermission = false; 
        let notifSourcePage = 'page-home';

        let notificationList = [
            { title: "VIP Pro Activated!", desc: 'All Pro features are now unlocked.', time: "Just now", icon: "verified", color: "#34C759" },
            { title: "Video Exported Successfully", desc: 'Your project is ready.', time: "1h", icon: "movie_filter", color: "#6366F1" },
            { title: "Exclusive Tools Inside", desc: "Unlock 4K exporting and Pro transitions today!", time: "1h", icon: "local_offer", color: "#FF8C00" }
        ];

        // FUNGSI NOTIFIKASI (TOAST & PAGE)
        let toastTimeout;
        function showToast(message, type = 'check') {
            const toast = document.getElementById('toast-alert'); 
            const icon = document.getElementById('toast-icon');
            if(!toast || !icon) return;
            
            document.getElementById('toast-text').innerText = message;
            if(type === 'info') { icon.innerText = 'info'; icon.style.color = '#0A84FF'; } 
            else if(type === 'sync') { icon.innerText = 'sync'; icon.style.color = '#0A84FF'; } 
            else { icon.innerText = 'check_circle'; icon.style.color = '#34C759'; }
            
            toast.classList.add('show'); 
            clearTimeout(toastTimeout); 
            toastTimeout = setTimeout(() => { toast.classList.remove('show'); }, 2500);
        }

        function renderNotifications() {
            const container = document.getElementById('notif-section-today');
            if(!container) return;
            let html = '';
            if (notificationList.length === 0) {
                html = `<div style="text-align:center; padding: 40px 20px; color: var(--text-sub);"><span class="material-icons-round" style="font-size: 48px; opacity: 0.5; margin-bottom:12px;">notifications_off</span><p style="font-size: 14px; font-weight: 500;">You have no new notifications.</p></div>`;
            } else {
                notificationList.forEach((item, index) => {
                    html += `<div class="notif-wrapper"><div class="notif-delete-bg" onclick="deleteNotif(${index})"><span class="material-icons-round">delete</span></div><div class="notif-item"><div class="notif-icon" style="background: rgba(${hexToRgb(item.color)}, 0.15); color: ${item.color};"><span class="material-icons-round">${item.icon}</span></div><div class="notif-content"><h4 class="notif-title">${item.title}</h4><p class="notif-desc">${item.desc}</p></div><div class="notif-time">${item.time}</div></div></div>`;
                });
            }
            container.innerHTML = html;
            const badgeCount = document.getElementById('notif-badge-count');
            if(badgeCount) badgeCount.innerText = `${notificationList.length} NEW`;
            if (notificationList.length > 0) initSwipeToDelete();
        }

        function clearAll() { notificationList = []; renderNotifications(); showToast('All notifications cleared', 'check'); }
        function deleteNotif(index) { notificationList.splice(index, 1); renderNotifications(); showToast('Notification deleted', 'info'); }
        function hexToRgb(hex) { let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null; }
        function addNotification(title, desc, icon = "notifications", color = "#34C759") { notificationList.unshift({ title, desc, time: "Just now", icon, color }); renderNotifications(); }

        function openNotifications(sourcePage) { 
            notifSourcePage = sourcePage; 
            const nModal = document.getElementById('notif-permission-modal'); 
            if (!hasNotifPermission && nModal) { nModal.classList.add('show'); } 
            else { goToPage('page-notifications', -1); } 
        }

        function handleNotifPermission(allow) { 
            const nModal = document.getElementById('notif-permission-modal'); 
            if(nModal) nModal.classList.remove('show'); 
            if (allow) { hasNotifPermission = true; showToast('Notifications Enabled! 🔔', 'check'); setTimeout(() => { goToPage('page-notifications', -1); }, 400); } 
            else { showToast('Notifications kept disabled.', 'info'); } 
        }

        function closeNotifications() { 
            let navIdx = (notifSourcePage === 'page-subscription' || notifSourcePage === 'page-profile') ? 3 : 0; 
            goToPage(notifSourcePage || 'page-home', navIdx); 
        }

        function initSwipeToDelete() { 
            const notifItems = document.querySelectorAll('.notif-item'); if(!notifItems) return; 
            notifItems.forEach(item => { 
                let startX = 0, currentX = 0, isDragging = false; 
                item.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; isDragging = true; item.style.transition = 'none'; }, {passive: true}); 
                item.addEventListener('touchmove', (e) => { if (!isDragging) return; currentX = e.touches[0].clientX; let diff = currentX - startX; if (diff < 0 && diff > -100) item.style.transform = `translateX(${diff}px)`; }, {passive: true}); 
                item.addEventListener('touchend', () => { if (!isDragging) return; isDragging = false; item.style.transition = 'transform 0.3s ease-out'; let diff = currentX - startX; if (diff < -40) item.style.transform = `translateX(-80px)`; else item.style.transform = `translateX(0)`; }); 
            }); 
        }

        // FUNGSI NAVIGASI
        function goToPage(pageId, navIndex) {
            const pages = document.querySelectorAll('.page'); 
            pages.forEach(page => page.classList.remove('active'));
            const targetPage = document.getElementById(pageId); 
            if(targetPage) { targetPage.classList.add('active'); window.scrollTo(0, 0); }
            currentPage = pageId; 
            updateNavVisibility();
            if(navIndex !== undefined && navIndex >= 0) { 
                const navItems = document.querySelectorAll('.nav-item'); 
                navItems.forEach(item => item.classList.remove('active')); 
                if(navItems[navIndex]) navItems[navIndex].classList.add('active'); 
            } else if (navIndex === -1) { 
                const navItems = document.querySelectorAll('.nav-item'); 
                navItems.forEach(item => item.classList.remove('active')); 
            }
        }

        function updateNavVisibility() {
            const hiddenPages = ['page-enhancer', 'page-video-workspace', 'page-subscription', 'page-notifications', 'page-settings', 'page-cloud', 'page-edit-profile', 'page-achievements', 'page-login', 'page-register'];
            let shouldHide = hiddenPages.includes(currentPage);
            const activeEl = document.activeElement; 
            if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) { shouldHide = true; }
            if (shouldHide) { document.body.classList.add('hide-nav'); } 
            else { document.body.classList.remove('hide-nav'); }
        }

        // FUNGSI SUBSCRIPTION SINKRONISASI
        function openSubscription(sourcePageId) { 
            subSourcePage = sourcePageId; 
            goToPage('page-subscription', 3); 
        } 
        
        function closeSubscription() { 
            goToPage(subSourcePage, 3); 
        }

        function upgradeToPro() {
            if(!isPremium) {
                isPremium = true; 
                renderPremiumUI(); 
                if (typeof syncUserDataToFirestore === 'function') syncUserDataToFirestore();
                showToast('Payment Successful! You are now PRO. 🎉', 'check');
                addNotification("VIP Pro Activated!", "All Pro features are now unlocked.", "verified", "#8A2BE2");
            }
        }

        function cancelSubscription() {
            if(isPremium) {
                isPremium = false; 
                renderPremiumUI(); 
                if (typeof syncUserDataToFirestore === 'function') syncUserDataToFirestore();
                showToast('Subscription Cancelled.', 'info');
                addNotification("VIP Pro Cancelled.", "Account reverted to free tier.", "remove_circle_outline", "#EF4444");
            }
        }

        function renderPremiumUI() {
            const profileBadge = document.getElementById('profile-badge'); 
            const editorBadge = document.getElementById('editor-badge'); 
            const vipBanner = document.getElementById('profile-vip-banner'); 
            const vipBtn = document.getElementById('vip-action-btn'); 
            const vipStatus = document.getElementById('vip-status-text'); 
            const subPage = document.getElementById('page-subscription'); 
            const subHero = document.getElementById('sub-hero-content'); 
            const subProDetails = document.getElementById('sub-pro-details'); 

            // EDITOR CARDS
            const cRes = document.getElementById('fcard-res'); const tRes = document.getElementById('ftext-res');
            const cFps = document.getElementById('fcard-fps'); const tFps = document.getElementById('ftext-fps');
            const cAud = document.getElementById('fcard-audio'); const tAud = document.getElementById('ftext-audio');
            
            if (isPremium) {
                // UI PRO (Warna Ungu)
                if(profileBadge) { profileBadge.className = 'status-badge pro'; profileBadge.innerHTML = '<span class="material-icons-round" style="font-size: 16px;">workspace_premium</span> PRO'; }
                if(editorBadge) { 
                    editorBadge.className = 'editor-status-badge pro'; 
                    editorBadge.innerHTML = '<span class="material-icons-round" style="font-size: 16px; color: white;">stars</span> <span style="color: white;">VIP Pro</span>'; 
                }
                if(vipBanner) { vipBanner.className = 'vip-banner pro'; }
                if(vipBtn) { vipBtn.innerText = 'Manage'; }
                if(vipStatus) { vipStatus.innerText = 'Subscription Active'; }
                if(subPage) { subPage.classList.remove('free'); subPage.classList.add('pro'); }
                if(subHero) { subHero.innerHTML = `<div class="sub-hero-icon" style="background: linear-gradient(135deg, #B8860B, #FFD700); color: white; box-shadow: 0 4px 15px rgba(255,215,0,0.3);"><span class="material-icons-round">workspace_premium</span></div><h3 style="color: var(--text-main);">You are a PRO!</h3><p style="color: var(--text-sub);">Thank you for supporting V-Forge.</p>`; }
                if(subProDetails) { subProDetails.style.display = 'block'; }

                // UPDATE EDITOR CARDS TO PRO (Ungu)
                if(cRes) { cRes.classList.add('pro-active'); tRes.innerHTML = "4K<br>Unlocked"; }
                if(cFps) { cFps.classList.add('pro-active'); tFps.innerHTML = "120 FPS<br>Unlocked"; }
                if(cAud) { cAud.classList.add('pro-active'); tAud.innerHTML = "Hi-Res Audio<br>Unlocked"; }

            } else {
                // UI GRATIS (Warna Abu-abu)
                if(profileBadge) { profileBadge.className = 'status-badge free'; profileBadge.innerHTML = '<div class="free-icon-wrap"><span class="material-icons-round" style="font-size:14px;">star</span></div> <span>Free</span>'; }
                if(editorBadge) { 
                    editorBadge.className = 'editor-status-badge free'; 
                    editorBadge.innerHTML = '<div class="free-icon-wrap" style="background: rgba(255,255,255,0.2); color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;"><span class="material-icons-round" style="font-size:12px;">star</span></div><span>Free</span>'; 
                }
                if(vipBanner) { vipBanner.className = 'vip-banner free'; }
                if(vipBtn) { vipBtn.innerText = 'Subscribe Now'; }
                if(vipStatus) { vipStatus.innerText = 'You are not subscribed yet'; }
                if(subPage) { subPage.classList.remove('pro'); subPage.classList.add('free'); }
                if(subHero) { subHero.innerHTML = `<div class="sub-hero-icon"><span class="material-icons-round">auto_awesome</span></div><h3 style="color: var(--text-main);">Unlock PRO</h3><p style="color: var(--text-sub);">$ 25.86 / month</p><div class="sub-main-btn" onclick="upgradeToPro()"><span class="material-icons-round" style="font-size:18px;">lock_open</span> Upgrade Now</div>`; }
                if(subProDetails) { subProDetails.style.display = 'none'; }

                // UPDATE EDITOR CARDS TO FREE (Abu-abu)
                if(cRes) { cRes.classList.remove('pro-active'); tRes.innerHTML = "4K Locked<br>(Premium)"; }
                if(cFps) { cFps.classList.remove('pro-active'); tFps.innerHTML = "120 FPS Locked<br>(Premium)"; }
                if(cAud) { cAud.classList.remove('pro-active'); tAud.innerHTML = "Hi-Res Locked<br>(Premium)"; }
            }
            updatePointsDisplay(); 
        }

        // FUNGSI CLOUD STORAGE
        let hasStoragePermission = false;
        function checkPermissionAndOpenCloud() { 
            const pModal = document.getElementById('storage-permission-modal'); 
            if (!hasStoragePermission && pModal) { 
                pModal.classList.add('show'); 
            } else { 
                goToPage('page-cloud', 3); 
                initCloudStorage(); 
            } 
        }

        function handlePermission(allow) { 
            const pModal = document.getElementById('storage-permission-modal'); 
            if(pModal) pModal.classList.remove('show'); 
            if (allow) { 
                hasStoragePermission = true; 
                showToast('Permission granted!', 'check'); 
                setTimeout(() => { goToPage('page-cloud', 3); initCloudStorage(); }, 400); 
            } else { 
                showToast('Permission denied.', 'info'); 
            } 
        }

        function initCloudStorage() { 
            const cu = document.getElementById('cloud-used'); if(cu) cu.innerText = "275.7 GB"; 
            const ct = document.getElementById('cloud-total'); if(ct) ct.innerText = "512 GB"; 
            const bi = document.getElementById('bar-img'); if(bi) bi.style.width = '25%'; 
            const bd = document.getElementById('bar-doc'); if(bd) bd.style.width = '10%'; 
            const bv = document.getElementById('bar-vid'); if(bv) bv.style.width = '14%'; 
            const bo = document.getElementById('bar-oth'); if(bo) bo.style.width = '4.8%'; 
        }

        function triggerSync(btn) { 
            const icon = document.getElementById('sync-icon'); 
            const text = document.getElementById('sync-text'); 
            if(icon) icon.classList.add('sync-spin'); 
            if(text) text.innerText = "Syncing..."; 
            if(btn) btn.style.pointerEvents = "none"; 
            
            setTimeout(() => { 
                if(icon) icon.classList.remove('sync-spin'); 
                if(text) text.innerText = "Synchronizing"; 
                if(btn) btn.style.pointerEvents = "auto"; 
                showToast('Successfully synchronized!', 'check'); 
            }, 2000); 
        }

        // FUNGSI LAIN-LAIN (TAB, DARK MODE, POINTS)
        function switchHomeTab(element, type) { 
            const tabs = document.querySelectorAll('.tabs-container .tab'); 
            tabs.forEach(tab => tab.classList.remove('active')); 
            element.classList.add('active'); 
            const taskList = document.getElementById('home-task-list'); 
            if(taskList){ 
                if (type !== 'todos') { taskList.style.display = 'none'; } 
                else { taskList.style.display = 'flex'; } 
            } 
        }

        function switchActTab(element) { 
            const tabs = document.querySelectorAll('.act-tab'); 
            tabs.forEach(tab => tab.classList.remove('active')); 
            element.classList.add('active'); 
        }

        function toggleDarkMode(btn) { 
            btn.classList.toggle('active'); 
            document.body.classList.toggle('dark-mode'); 
            if(document.body.classList.contains('dark-mode')) { showToast('Dark Mode Enabled 🌙', 'check'); } 
            else { showToast('Light Mode Enabled ☀️', 'check'); } 
        }

        function updatePointsDisplay() {
            const globalP = document.getElementById('global-points-display'); 
            const achP = document.getElementById('ach-points-text');
            if(globalP) globalP.innerText = userPoints; 
            if(achP) achP.innerText = userPoints;
            
            const redeemBtn = document.getElementById('redeem-vip-btn');
            if(redeemBtn) {
                if (userPoints >= 1000 && !isPremium) { redeemBtn.classList.remove('disabled'); redeemBtn.innerText = 'Redeem Now'; } 
                else if (isPremium) { redeemBtn.classList.add('disabled'); redeemBtn.innerText = 'Active'; } 
                else { redeemBtn.classList.add('disabled'); redeemBtn.innerText = '1000 Pts'; }
            }
        }

        function handleTaskClick(taskId) {
            if(taskId === 'mission-card-1') { 
                if(mission1State === 'todo') { goToPage('page-enhancer', -1); showToast('Pilih video untuk membuka workspace.', 'info'); } 
                else if(mission1State === 'ready') { claimTask1Reward(); } 
            }
        }

        function claimTask1Reward() {
            mission1State = 'claimed'; 
            const taskEl = document.getElementById('mission-card-1'); 
            if(!taskEl) return;
            taskEl.style.transform = 'scale(0.9)'; taskEl.style.opacity = '0';
            setTimeout(() => {
                taskEl.style.display = 'none'; userPoints += 50; completedTasks += 1; updatePointsDisplay(); 
                if (typeof syncUserDataToFirestore === 'function') syncUserDataToFirestore();
                const dCount = document.getElementById('done-count'); const tCount = document.getElementById('todo-count');
                if(dCount) dCount.innerText = completedTasks; if(tCount) tCount.innerText = "0"; 
                showToast(`Mission Completed! ✨ +50 Pts`, 'check'); 
                addNotification("Reward Claimed! 🎉", "+50 Forge Points added to your balance.", "card_giftcard", "#FFD700");
            }, 300);
        }

        function redeemSubscription(cost) {
            if (isPremium) { showToast('You are already a VIP Pro!', 'info'); return; }
            if (userPoints >= cost) { userPoints -= cost; updatePointsDisplay(); if (typeof syncUserDataToFirestore === 'function') syncUserDataToFirestore(); upgradeToPro(); } 
            else { showToast(`You need ${cost - userPoints} more points!`, 'info'); }
        }

        function renderEditorHistory() {
            if (typeof renderProjectEditorHistory === 'function') {
                renderProjectEditorHistory();
            }
        }

        function filterSettings(query) {
            query = query.toLowerCase().trim(); const sections = document.querySelectorAll('#page-settings .settings-section'); let totalVisibleItems = 0;
            sections.forEach(section => {
                const items = section.querySelectorAll('.settings-item'); let hasVisibleItem = false;
                items.forEach(item => { const textNode = item.querySelector('.si-text'); if (textNode) { const text = textNode.innerText.toLowerCase(); if (text.includes(query)) { item.style.display = 'flex'; hasVisibleItem = true; totalVisibleItems++; } else { item.style.display = 'none'; } } });
                section.style.display = hasVisibleItem ? 'block' : 'none';
            });
            const noResults = document.getElementById('settings-no-results'); if(noResults) { if (totalVisibleItems === 0 && query !== '') { noResults.style.display = 'block'; } else { noResults.style.display = 'none'; } }
        }

        function previewFile(input) { const file = input.files[0]; if (file) { const reader = new FileReader(); reader.onload = function(e) { const previews = document.querySelectorAll('.profile-img-preview'); previews.forEach(img => { img.style.backgroundImage = `url('${e.target.result}')`; img.src = e.target.result; }); }; reader.readAsDataURL(file); } }
        function updateProfileText() { const nameEl = document.getElementById('input-name'); const usernameEl = document.getElementById('input-username'); if(!nameEl || !usernameEl) return; const nameVal = nameEl.value; const usernameVal = usernameEl.value; const dispName = document.getElementById('display-name'); if(dispName) dispName.innerText = nameVal; const setDispName = document.getElementById('settings-display-name'); if(setDispName) setDispName.innerText = nameVal; const greetName = document.getElementById('editor-greeting-title'); if(greetName) greetName.innerText = `Hey, ${nameVal.split(' ')[0]}`; const dispUser = document.getElementById('display-username'); if(dispUser) dispUser.innerText = usernameVal; }
        function updateDateDisplay(val) { if (!val) return; const d = val.split('-'); const dob = document.getElementById('dob-display'); if(dob) dob.innerText = `${d[2]}/${d[1]}/${d[0]}`; }

        function initRealTime() {
            try {
                let startDateStr = localStorage.getItem('appStartDate');
                if (!startDateStr) { const today = new Date(); startDateStr = today.toDateString(); localStorage.setItem('appStartDate', startDateStr); }
                const start = new Date(startDateStr); const now = new Date(); const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1; 
                const dayDisplay = document.getElementById('day-display'); if (dayDisplay) dayDisplay.innerText = `Day ${diffDays}/66`;
            } catch(e){}
            updatePointsDisplay(); renderNotifications(); updateProfileText(); renderEditorHistory();
        }

        // REGISTER SERVICE WORKER (wajib untuk PWA installable)
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./service-worker.js')
                    .then((reg) => console.log('Service Worker terdaftar:', reg.scope))
                    .catch((err) => console.log('Service Worker gagal daftar:', err));
            });
        }

        // INIT LOAD
        // Catatan: initRealTime() & renderPremiumUI() TIDAK dipanggil di sini lagi.
        // Keduanya sekarang dipanggil oleh auth.js (di auth.onAuthStateChanged),
        // setelah dipastikan user sudah login dan data dari Firestore selesai dimuat.
        window.onload = () => { 
            // Pastikan listener input navigasi tetap jalan
            const inputs = document.querySelectorAll('input[type="text"], input[type="date"], textarea');
            inputs.forEach(input => { input.addEventListener('focus', () => document.body.classList.add('hide-nav')); input.addEventListener('blur', () => setTimeout(updateNavVisibility, 150)); });
        };

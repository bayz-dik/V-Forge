const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');

admin.initializeApp();
setGlobalOptions({ region: 'asia-southeast2', maxInstances: 10 });

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp;
const PREMIUM_COST = 1000;
const PREMIUM_DAYS = 30;
const MISSIONS = Object.freeze({
  firstDraft: { goal: 1, reward: 50 },
  firstExport: { goal: 1, reward: 100 },
  templateExplorer: { goal: 2, reward: 150 },
  draftSprint: { goal: 3, reward: 200 }
});

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function jakartaDayKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date);
}

function projectBelongsToDay(project, dayKey) {
  const created = toDate(project.createdAt);
  const updated = toDate(project.updatedAt);
  return (created && jakartaDayKey(created) === dayKey) || (updated && jakartaDayKey(updated) === dayKey);
}

async function calculateDailyProgress(userId, dayKey = jakartaDayKey()) {
  const snapshot = await db.collection('users').doc(userId).collection('projects').limit(200).get();
  const projects = snapshot.docs.map((doc) => doc.data() || {});
  const todayProjects = projects.filter((project) => projectBelongsToDay(project, dayKey));
  const exportsToday = projects.filter((project) => {
    if (project.status !== 'completed') return false;
    const exportedAt = toDate(project.lastExportedAt || project.updatedAt);
    return exportedAt && jakartaDayKey(exportedAt) === dayKey;
  });
  const templates = new Set(todayProjects.map((project) => String(project.templateId || '')).filter(Boolean));
  return {
    firstDraft: Math.min(MISSIONS.firstDraft.goal, todayProjects.length),
    firstExport: Math.min(MISSIONS.firstExport.goal, exportsToday.length),
    templateExplorer: Math.min(MISSIONS.templateExplorer.goal, templates.size),
    draftSprint: Math.min(MISSIONS.draftSprint.goal, todayProjects.length)
  };
}

async function updateMissionState(userId) {
  const dayKey = jakartaDayKey();
  const progress = await calculateDailyProgress(userId, dayKey);
  const userRef = db.collection('users').doc(userId);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists) return;
    const data = snapshot.data() || {};
    const previous = data.dailyMissionState && data.dailyMissionState.dayKey === dayKey
      ? data.dailyMissionState : { dayKey, claimed: {}, progress: {} };
    const claimed = { ...(previous.claimed || {}) };
    let pointsToAdd = 0;
    let tasksToAdd = 0;

    for (const [missionId, config] of Object.entries(MISSIONS)) {
      if ((progress[missionId] || 0) >= config.goal && claimed[missionId] !== true) {
        claimed[missionId] = true;
        pointsToAdd += config.reward;
        tasksToAdd += 1;
      }
    }

    transaction.set(userRef, {
      dailyMissionState: { dayKey, progress, claimed, updatedAt: FieldValue.serverTimestamp() },
      missionProgress: progress,
      points: Math.max(0, Number(data.points) || 0) + pointsToAdd,
      completedTasks: Math.max(0, Number(data.completedTasks) || 0) + tasksToAdd,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  });

  return { dayKey, progress };
}

exports.recalculateDailyMissions = onDocumentWritten('users/{userId}/projects/{projectId}', async (event) => {
  const userId = event.params.userId;
  if (!userId) return;
  await updateMissionState(userId);
});

exports.syncDailyMissions = onCall(async (request) => {
  const userId = request.auth?.uid;
  if (!userId) throw new HttpsError('unauthenticated', 'Login diperlukan.');
  const result = await updateMissionState(userId);
  return { ok: true, ...result };
});

exports.redeemPremiumWithPoints = onCall(async (request) => {
  const userId = request.auth?.uid;
  if (!userId) throw new HttpsError('unauthenticated', 'Login diperlukan.');
  const userRef = db.collection('users').doc(userId);
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(now.toMillis() + PREMIUM_DAYS * 24 * 60 * 60 * 1000);

  const result = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists) throw new HttpsError('not-found', 'Profil pengguna tidak ditemukan.');
    const data = snapshot.data() || {};
    const currentExpiry = toDate(data.subscriptionExpiresAt);
    const alreadyActive = data.isPremium === true
      && data.subscriptionStatus === 'active'
      && (!currentExpiry || currentExpiry.getTime() > Date.now());
    if (alreadyActive) return { alreadyActive: true, points: Number(data.points) || 0 };

    const points = Math.max(0, Number(data.points) || 0);
    if (points < PREMIUM_COST) {
      throw new HttpsError('failed-precondition', `Diperlukan ${PREMIUM_COST} Forge Points.`);
    }

    transaction.update(userRef, {
      points: points - PREMIUM_COST,
      isPremium: true,
      subscriptionStatus: 'active',
      subscriptionPlan: 'reward-30d',
      subscriptionProvider: 'forge-points',
      subscriptionStartedAt: now,
      subscriptionExpiresAt: expiresAt,
      subscriptionUpdatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    return { alreadyActive: false, points: points - PREMIUM_COST };
  });

  return { ok: true, expiresAt: expiresAt.toMillis(), ...result };
});

exports.expireRewardPremium = onSchedule('every day 00:15', async () => {
  const now = Timestamp.now();
  const snapshot = await db.collection('users')
    .where('subscriptionProvider', '==', 'forge-points')
    .limit(500)
    .get();
  if (snapshot.empty) return;
  const batch = db.batch();
  let updates = 0;
  snapshot.docs.forEach((document) => {
    const data = document.data() || {};
    const expiry = toDate(data.subscriptionExpiresAt);
    if (data.subscriptionStatus !== 'active' || !expiry || expiry.getTime() > now.toMillis()) return;
    updates += 1;
    batch.update(document.ref, {
      isPremium: false,
      subscriptionStatus: 'inactive',
      subscriptionUpdatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
  });
  if (updates === 0) return;
  await batch.commit();
});

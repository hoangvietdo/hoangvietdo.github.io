// Persistence: the whole app state lives in IndexedDB on this device (localStorage as a
// fallback). Nothing is ever sent to a server.
//
// state = {
//   version, settings,
//   sessions: [{ id, date, endDate|null, title, note, entries: [{ id, exerciseId, name, unit|null, targetSets, sets: [{ id, reps, weightKg, rir|null, warmup, done }] }] }],
//   cardio: [{ id, date, kind, durationMinutes, distanceKm|null, avgHr|null, effort|null, note }],
//   customExercises: [{ id, name, primary, secondary, equipment, repLow, repHigh, isTimed }],
//   checkIns: [{ day: 'YYYY-MM-DD', feeling|null, sleepHours|null }],
// }
// Dates are ISO strings; weights are kilograms.

import { makeSettings } from './engine/settings.js';
import { Catalog } from './engine/exercises.js';
import { addDays, dayKey, startOfDay } from './engine/calendar.js';
import { MUSCLES } from './engine/muscles.js';

const DB_NAME = 'gymtrack';
const STORE = 'kv';
const KEY = 'state';
const FALLBACK_KEY = 'gymtrack-state';
const CURRENT_VERSION = 2;
const SAFETY_BACKUP_KEY = 'safety-before-v2';
const SAFETY_FALLBACK_KEY = 'gymtrack-safety-before-v2';

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

export function emptyState() {
  return { version: CURRENT_VERSION, settings: makeSettings(), sessions: [], cardio: [], customExercises: [], checkIns: [] };
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idb(mode, action) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = action(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(request?.result);
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadState() {
  let raw = null;
  try {
    raw = await idb('readonly', (store) => store.get(KEY));
  } catch {
    // Private browsing or storage blocked.
  }
  if (!raw) {
    try {
      raw = JSON.parse(localStorage.getItem(FALLBACK_KEY) ?? 'null');
    } catch {
      raw = null;
    }
  }
  await preserveBeforeV2(raw);
  return normalize(raw);
}

export async function saveState(state) {
  try {
    await idb('readwrite', (store) => store.put(state, KEY));
  } catch {
    try {
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(state));
    } catch {
      // Nothing more we can do; the export button still works.
    }
  }
}

/** Fills defaults and drops anything malformed, so old or imported data can't break the app. */
export function normalize(raw, now = new Date()) {
  const state = emptyState();
  if (!raw || typeof raw !== 'object') return state;
  const oldVersion = Math.max(1, Math.round(number(raw.version, 1)));
  state.settings = cleanSettings(raw.settings);
  state.sessions = list(raw.sessions, cleanSession);
  state.cardio = list(raw.cardio, cleanCardio);
  state.customExercises = list(raw.customExercises, cleanCustom);
  state.checkIns = list(raw.checkIns, cleanCheckIn);
  if (oldVersion < 2) migrateV2(state, now);
  return state;
}

const list = (value, clean) => (Array.isArray(value) ? value.map(clean).filter(Boolean) : []);
const isDate = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value));
const number = (value, fallback = null) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
const text = (value, fallback = '') => (typeof value === 'string' ? value : fallback);

function cleanSettings(raw = {}) {
  const base = makeSettings();
  if (!raw || typeof raw !== 'object') return base;
  const targets = { ...base.targets };
  for (const m of MUSCLES) {
    const v = number(raw.targets?.[m]);
    if (v != null) targets[m] = Math.min(40, Math.max(0, v));
  }
  return {
    weeklyGoal: Math.min(7, Math.max(1, Math.round(number(raw.weeklyGoal, base.weeklyGoal)))),
    split: ['automatic', 'pushPullLegs', 'upperLower', 'fullBody'].includes(raw.split) ? raw.split : base.split,
    age: Math.min(90, Math.max(14, Math.round(number(raw.age, base.age)))),
    unit: raw.unit === 'lb' ? 'lb' : 'kg',
    weekStartsMonday: raw.weekStartsMonday !== false,
    targets,
  };
}

function cleanSession(raw) {
  if (!raw || typeof raw.id !== 'string' || !isDate(raw.date)) return null;
  return {
    id: raw.id,
    date: raw.date,
    endDate: isDate(raw.endDate) ? raw.endDate : null,
    title: text(raw.title),
    note: text(raw.note),
    entries: list(raw.entries, (e) => (e && typeof e.exerciseId === 'string'
      ? {
        id: text(e.id) || uid(),
        exerciseId: e.exerciseId,
        name: text(e.name, e.exerciseId),
        unit: e.unit === 'lb' || e.unit === 'kg' ? e.unit : null,
        targetSets: Math.max(0, Math.round(number(e.targetSets, 0))),
        sets: list(e.sets, (s) => (s
          ? {
            id: text(s.id) || uid(),
            reps: Math.max(0, Math.round(number(s.reps, 0))),
            weightKg: Math.max(0, number(s.weightKg, 0)),
            rir: number(s.rir),
            warmup: s.warmup === true,
            done: s.done !== false,
          }
          : null)),
      }
      : null)),
  };
}

/** Version 2 adds per-exercise units. Preserve the stored kg values and only change how the
 * requested cable curl is displayed. The migration is limited to the workout open/current on
 * the day the update is first loaded, so historical exercise names remain an accurate record. */
function migrateV2(state, now) {
  const today = dayKey(now);
  for (const session of state.sessions) {
    if (dayKey(new Date(session.date)) !== today) continue;
    for (const entry of session.entries) {
      const cableBicepCurl = entry.exerciseId === 'cable_curl'
        || (/cable/i.test(entry.name) && /(?:bicep|curl)/i.test(entry.name));
      if (!cableBicepCurl) continue;
      entry.name = 'Single-arm Cable Bicep Curl';
      entry.unit = 'lb';
    }
  }
}

function cleanCardio(raw) {
  if (!raw || typeof raw.id !== 'string' || !isDate(raw.date)) return null;
  const duration = number(raw.durationMinutes);
  if (!(duration > 0)) return null;
  return {
    id: raw.id,
    date: raw.date,
    kind: ['run', 'cycle', 'walk', 'other'].includes(raw.kind) ? raw.kind : 'other',
    durationMinutes: duration,
    distanceKm: number(raw.distanceKm),
    avgHr: number(raw.avgHr),
    effort: number(raw.effort),
    note: text(raw.note),
  };
}

function cleanCustom(raw) {
  if (!raw || typeof raw.id !== 'string' || typeof raw.name !== 'string') return null;
  const muscles = (value) => (Array.isArray(value) ? value.filter((m) => MUSCLES.includes(m)) : []);
  const primary = muscles(raw.primary);
  if (!primary.length) return null;
  return {
    id: raw.id,
    name: raw.name,
    primary,
    secondary: muscles(raw.secondary).filter((m) => !primary.includes(m)),
    equipment: text(raw.equipment, 'other'),
    repLow: Math.max(1, Math.round(number(raw.repLow, 8))),
    repHigh: Math.max(1, Math.round(number(raw.repHigh, 12))),
    isTimed: raw.isTimed === true,
  };
}

function cleanCheckIn(raw) {
  if (!raw || typeof raw.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.day)) return null;
  return {
    day: raw.day,
    feeling: ['great', 'normal', 'tired', 'sick'].includes(raw.feeling) ? raw.feeling : null,
    sleepHours: number(raw.sleepHours),
  };
}

// Backup

export function backupJSON(state) {
  return JSON.stringify({ app: 'GymTrack', exportedAt: new Date().toISOString(), ...state }, null, 2);
}

/** Returns the automatic snapshot made before the v2 data migration, when one exists. */
export async function safetyBackupJSON() {
  try {
    const saved = await idb('readonly', (store) => store.get(SAFETY_BACKUP_KEY));
    if (typeof saved === 'string') return saved;
  } catch {
    // Try the storage fallback below.
  }
  try {
    return localStorage.getItem(SAFETY_FALLBACK_KEY);
  } catch {
    return null;
  }
}

/** One-time, immutable copy of the raw state. This runs before normalize/migrate touches it. */
async function preserveBeforeV2(raw) {
  if (!raw || typeof raw !== 'object' || number(raw.version, 1) >= 2) return;
  const json = JSON.stringify({
    app: 'GymTrack',
    exportedAt: new Date().toISOString(),
    reason: 'Automatic backup before per-exercise units update',
    ...raw,
  }, null, 2);
  try {
    const existing = await idb('readonly', (store) => store.get(SAFETY_BACKUP_KEY));
    if (!existing) await idb('readwrite', (store) => store.put(json, SAFETY_BACKUP_KEY));
    return;
  } catch {
    // IndexedDB may be unavailable in private browsing.
  }
  try {
    if (!localStorage.getItem(SAFETY_FALLBACK_KEY)) localStorage.setItem(SAFETY_FALLBACK_KEY, json);
  } catch {
    // The main state remains untouched even if no secondary storage is available.
  }
}

/** Adds items that aren't here yet (matched by id, check-ins by day). Returns how many. */
export function mergeBackup(state, raw) {
  const incoming = normalize(raw);
  let added = 0;
  const merge = (key, idOf) => {
    const known = new Set(state[key].map(idOf));
    for (const item of incoming[key]) {
      if (known.has(idOf(item))) continue;
      state[key].push(item);
      known.add(idOf(item));
      added += 1;
    }
  };
  merge('customExercises', (x) => x.id);
  merge('cardio', (x) => x.id);
  merge('checkIns', (x) => x.day);
  const sessions = new Map(state.sessions.map((session) => [session.id, session]));
  for (const incomingSession of incoming.sessions) {
    const existing = sessions.get(incomingSession.id);
    if (!existing) {
      state.sessions.push(incomingSession);
      sessions.set(incomingSession.id, incomingSession);
      added += 1;
      continue;
    }
    const entries = new Map(existing.entries.map((entry) => [entry.id, entry]));
    for (const incomingEntry of incomingSession.entries) {
      const entry = entries.get(incomingEntry.id);
      if (!entry) {
        existing.entries.push(incomingEntry);
        entries.set(incomingEntry.id, incomingEntry);
        added += 1;
        continue;
      }
      const knownSets = new Set(entry.sets.map((set) => set.id));
      for (const set of incomingEntry.sets) {
        if (knownSets.has(set.id)) continue;
        entry.sets.push(set);
        knownSets.add(set.id);
        added += 1;
      }
    }
  }
  state.sessions.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  return added;
}

/** Three weeks of push/pull/legs (Mon, Tue, Thu, Fri) with slowly rising weights, plus runs
 * on Wednesdays and Sundays, ending yesterday. */
export function sampleData(now = new Date()) {
  const catalog = new Catalog();
  const today = startOfDay(now);
  const templates = [
    ['Push day', [['barbell_bench_press', 3, 6, 70], ['incline_dumbbell_press', 3, 10, 24], ['lateral_raise', 3, 15, 8], ['triceps_pushdown', 3, 12, 25]]],
    ['Pull day', [['lat_pulldown', 3, 10, 55], ['seated_cable_row', 3, 10, 50], ['face_pull', 3, 15, 20], ['barbell_curl', 3, 10, 25]]],
    ['Leg day', [['back_squat', 3, 6, 90], ['romanian_deadlift', 3, 8, 80], ['leg_extension', 3, 12, 45], ['standing_calf_raise', 3, 12, 60]]],
  ];
  const sessions = [];
  const cardio = [];
  let rotation = 0;
  for (let daysAgo = 21; daysAgo >= 1; daysAgo -= 1) {
    const day = addDays(today, -daysAgo);
    const evening = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 18);
    const week = Math.floor((21 - daysAgo) / 7);
    const weekday = day.getDay();
    if ([1, 2, 4, 5].includes(weekday)) {
      const [title, items] = templates[rotation % templates.length];
      rotation += 1;
      sessions.push({
        id: uid(),
        date: evening.toISOString(),
        endDate: new Date(+evening + 65 * 60e3).toISOString(),
        title,
        note: '',
        entries: items.map(([exerciseId, count, reps, kg]) => {
          const exercise = catalog.get(exerciseId);
          const weightKg = kg + week * ({ barbell: 2.5, dumbbell: 2, machine: 5 }[exercise.equipment] ?? 2.5);
          return {
            id: uid(),
            exerciseId,
            name: exercise.name,
            targetSets: 0,
            sets: Array.from({ length: count }, (_, i) => ({ id: uid(), reps, weightKg, rir: i === count - 1 ? 0 : null, warmup: false, done: true })),
          };
        }),
      });
    } else if (weekday === 3 || weekday === 0) {
      const long = weekday === 0;
      cardio.push({ id: uid(), date: evening.toISOString(), kind: 'run', durationMinutes: long ? 55 : 30, distanceKm: long ? 9.5 : 5.2, avgHr: null, effort: long ? 6 : 4, note: '' });
    }
  }
  return { sessions, cardio };
}

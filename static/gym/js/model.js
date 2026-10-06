// Glue between stored state and the engine, plus small state mutations.

import { Catalog } from './engine/exercises.js';
import { dayKey, fromDayKey } from './engine/calendar.js';
import { recommend } from './engine/recommender.js';
import { isWorking } from './engine/sets.js';
import { uid } from './store.js';

const HISTORY_WINDOW = 180 * 86400e3;

export const catalogFor = (state) => new Catalog(state.customExercises);
export const toWorkout = (session) => ({
  id: session.id,
  title: session.title,
  date: new Date(session.date),
  endDate: session.endDate ? new Date(session.endDate) : null,
  exercises: session.entries,
});
export const toCardio = (entry) => ({ ...entry, date: new Date(entry.date) });
export const workingSets = (session) => session.entries.reduce((n, e) => n + e.sets.filter(isWorking).length, 0);
export const plannedSets = (session) => session.entries.reduce((n, e) => n + e.sets.filter((s) => !s.warmup).length, 0);

export function todaysCheckIn(state, now = new Date()) {
  return state.checkIns.find((c) => c.day === dayKey(now)) ?? null;
}

/** The workout in progress, or else the latest one started today. */
export function todaysSession(state, now = new Date()) {
  const today = dayKey(now);
  return state.sessions
    .filter((s) => !s.endDate || dayKey(new Date(s.date)) === today)
    .sort((a, b) => (!a.endDate - !b.endDate) || Date.parse(a.date) - Date.parse(b.date))
    .at(-1) ?? null;
}

export function computeRecommendation(state, now = new Date()) {
  const since = +now - HISTORY_WINDOW;
  const checkIn = todaysCheckIn(state, now);
  return recommend({
    now,
    workouts: state.sessions.filter((s) => Date.parse(s.date) > since).map(toWorkout),
    cardio: state.cardio.filter((c) => Date.parse(c.date) > since).map(toCardio),
    checkIn: checkIn && { date: fromDayKey(checkIn.day), feeling: checkIn.feeling, sleepHours: checkIn.sleepHours },
    settings: state.settings,
    catalog: catalogFor(state),
  });
}

export function createSession(state, { title = 'Workout', date = new Date(), endDate = null } = {}) {
  const session = { id: uid(), date: new Date(date).toISOString(), endDate: endDate && new Date(endDate).toISOString(), title, note: '', entries: [] };
  state.sessions.push(session);
  return session;
}

export function addEntry(session, exercise, targetSets = 0) {
  const entry = { id: uid(), exerciseId: exercise.id, name: exercise.name, unit: exercise.defaultUnit ?? null, targetSets, sets: [] };
  session.entries.push(entry);
  return entry;
}

/** Starts today's workout from the plan, with every set pre-filled from its target. */
export function startSession(state, plan) {
  const session = createSession(state, { title: plan?.name ?? 'Workout' });
  for (const item of plan?.exercises ?? []) {
    const entry = addEntry(session, item.exercise, item.sets);
    const weightKg = item.hint?.weightKg ?? 0;
    const reps = item.hint?.targetReps ?? item.exercise.repLow;
    for (let i = 0; i < item.sets; i += 1) {
      entry.sets.push({ id: uid(), reps, weightKg, rir: null, warmup: false, done: false });
    }
  }
  return session;
}

/** New sets copy the previous one, or start from the progression target. During a live
 * workout they start un-ticked; when editing a past workout they count straight away. */
export function addSet(entry, hint, exercise, { done = true } = {}) {
  const last = entry.sets[entry.sets.length - 1];
  entry.sets.push({
    id: uid(),
    reps: last?.reps ?? hint?.targetReps ?? exercise?.repLow ?? 8,
    weightKg: last?.weightKg ?? hint?.weightKg ?? 0,
    rir: null,
    warmup: false,
    done,
  });
}

/** Ticks a set off (or back on). A ticked weight carries over to the sets still to do. */
export function toggleDone(entry, set) {
  set.done = set.done === false;
  if (!set.done) return;
  for (const later of entry.sets.slice(entry.sets.indexOf(set) + 1)) {
    if (later.done === false && !later.warmup) later.weightKg = set.weightKg;
  }
}

/** Marks a set as taken to muscular failure. Recording failure also means the set was
 * performed, so tick it complete and carry its weight into later planned sets. */
export function toggleFailure(entry, set) {
  const wasFailure = set.rir === 0;
  set.rir = wasFailure ? null : 0;
  if (!wasFailure && set.done === false) toggleDone(entry, set);
}

/** Drops sets that were never done. Returns false (and deletes the workout) if nothing was. */
export function finishSession(state, session) {
  for (const entry of session.entries) entry.sets = entry.sets.filter((s) => s.done !== false);
  session.entries = session.entries.filter((e) => e.sets.length > 0);
  if (workingSets(session) === 0) {
    removeById(state.sessions, session.id);
    return false;
  }
  if (!session.endDate) session.endDate = new Date().toISOString();
  return true;
}

export function removeById(array, id) {
  const index = array.findIndex((x) => x.id === id);
  if (index >= 0) array.splice(index, 1);
}

export function setFeeling(state, feeling, now = new Date()) {
  const existing = todaysCheckIn(state, now);
  if (existing) existing.feeling = existing.feeling === feeling ? null : feeling;
  else state.checkIns.push({ day: dayKey(now), feeling, sleepHours: null });
}

export function setSleep(state, hours, now = new Date()) {
  const existing = todaysCheckIn(state, now);
  if (existing) existing.sleepHours = hours;
  else state.checkIns.push({ day: dayKey(now), feeling: null, sleepHours: hours });
}

/** A workout still open after 12 hours was finished and never closed. */
export function closeForgottenWorkouts(state, now = new Date()) {
  let changed = false;
  for (const session of [...state.sessions]) {
    if (!session.endDate && +now - Date.parse(session.date) > 12 * 3600e3) {
      finishSession(state, session);
      if (session.endDate) session.endDate = new Date(Date.parse(session.date) + 75 * 60e3).toISOString();
      changed = true;
    }
  }
  return changed;
}

// Fatigue model: every hard set adds one unit of fatigue to its prime movers (half a unit to
// synergists), which then decays exponentially with a muscle-specific time constant. Ten
// units at once leaves a muscle 0% recovered; it counts as ready again at 90%.

import { MUSCLES, MUSCLE_INFO } from './muscles.js';
import { contributions } from './exercises.js';
import { cardioKind, cardioLoad } from './cardio.js';
import { HOUR, DAY } from './calendar.js';
import { target, maxHeartRate } from './settings.js';
import { isWorking } from './sets.js';

export const READY = 0.9;
export const FATIGUED = 0.7;
export const FULL_FATIGUE_SETS = 10;
const LOOKBACK = 10 * DAY;
const WEEK = 7 * DAY;

/** Sets far from failure stimulate (and fatigue) much less than hard sets. */
export function effortFactor(rir) {
  if (rir == null) return 1;
  if (rir <= 3) return 1;
  if (rir <= 5) return 0.5;
  return 0.25;
}

export function effectiveSets(workout, catalog) {
  const totals = {};
  for (const logged of workout.exercises) {
    const exercise = catalog.get(logged.exerciseId);
    if (!exercise) continue;
    const hardSets = logged.sets.filter(isWorking).reduce((sum, set) => sum + effortFactor(set.rir), 0);
    if (hardSets <= 0) continue;
    for (const [muscle, share] of Object.entries(contributions(exercise))) {
      totals[muscle] = (totals[muscle] ?? 0) + hardSets * share;
    }
  }
  return totals;
}

/** Cardio fatigues the legs but doesn't count toward muscle-building volume. */
export function cardioFatigue(session, maxHr) {
  const units = cardioLoad(session, maxHr) / 10;
  return Object.fromEntries(Object.entries(cardioKind(session.kind).weights).map(([m, w]) => [m, w * units]));
}

/** Smooth 0…1 gate used by the planner: 0 at ≤75% recovered, 1 from the ready threshold. */
export function trainability(recovery) {
  return Math.min(1, Math.max(0, (recovery - 0.75) / (READY - 0.75)));
}

export function muscleStatuses({ now, workouts, cardio = [], settings, catalog }) {
  const t = +now;
  const fatigue = {};
  const weekly = {};
  const lastTrained = {};

  const addFatigue = (load, date) => {
    const hours = (t - date) / HOUR;
    for (const [muscle, sets] of Object.entries(load)) {
      fatigue[muscle] = (fatigue[muscle] ?? 0) + sets * Math.exp(-hours / MUSCLE_INFO[muscle].tau);
    }
  };

  for (const workout of workouts) {
    const date = +workout.date;
    if (date > t) continue;
    const load = effectiveSets(workout, catalog);
    const age = t - date;
    if (age < LOOKBACK) addFatigue(load, date);
    for (const [muscle, sets] of Object.entries(load)) {
      if (age < WEEK) weekly[muscle] = (weekly[muscle] ?? 0) + sets;
      if (sets >= 1 && !(lastTrained[muscle] >= date)) lastTrained[muscle] = date;
    }
  }
  const maxHr = maxHeartRate(settings);
  for (const session of cardio) {
    const date = +session.date;
    if (date > t || t - date >= LOOKBACK) continue;
    addFatigue(cardioFatigue(session, maxHr), date);
  }

  const allowed = (1 - READY) * FULL_FATIGUE_SETS;
  return MUSCLES.map((muscle) => {
    const remaining = fatigue[muscle] ?? 0;
    const recovery = Math.min(1, Math.max(0, 1 - remaining / FULL_FATIGUE_SETS));
    const weeklyTarget = target(settings, muscle);
    const setsThisWeek = weekly[muscle] ?? 0;
    return {
      muscle,
      recovery,
      setsThisWeek,
      weeklyTarget,
      lastTrained: lastTrained[muscle] != null ? new Date(lastTrained[muscle]) : null,
      hoursUntilReady: remaining > allowed ? MUSCLE_INFO[muscle].tau * Math.log(remaining / allowed) : 0,
      deficit: Math.max(0, weeklyTarget - setsThisWeek),
      state: recovery >= READY ? 'ready' : recovery >= FATIGUED ? 'recovering' : 'fatigued',
      trainability: trainability(recovery),
    };
  });
}

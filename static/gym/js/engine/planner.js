// Picks the session template whose muscles are most recovered and furthest behind their
// weekly targets, then fills a set budget with exercises, most urgent muscle first.

import { contributions, isCompound } from './exercises.js';
import { DAY } from './calendar.js';
import { loadIncrementKg } from './settings.js';
import { isWorking } from './sets.js';
import { progressionHint } from './progression.js';

export const TEMPLATES = {
  push: { name: 'Push day', muscles: ['chest', 'shoulders', 'triceps'], key: ['chest'] },
  pull: { name: 'Pull day', muscles: ['back', 'biceps'], key: ['back'] },
  legs: { name: 'Leg day', muscles: ['quads', 'hamstrings', 'glutes', 'calves'], key: ['quads', 'hamstrings'] },
  upper: { name: 'Upper body', muscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps'], key: ['chest', 'back'] },
  lower: { name: 'Lower body', muscles: ['quads', 'hamstrings', 'glutes', 'calves', 'abs'], key: ['quads', 'hamstrings'] },
  fullBody: { name: 'Full body', muscles: ['chest', 'back', 'shoulders', 'quads', 'hamstrings'], key: ['chest', 'back', 'quads'] },
};

const SPLIT_TEMPLATES = {
  automatic: ['fullBody', 'upper', 'push', 'pull', 'legs'],
  pushPullLegs: ['push', 'pull', 'legs'],
  upperLower: ['upper', 'lower'],
  fullBody: ['fullBody'],
};

const MAX_SETS_PER_MUSCLE = 8;
const SESSION_BUDGET = 22;
const LIGHT_SESSION_BUDGET = 15;
const LIGHT_FACTOR = 0.7;
const MAX_EXERCISES = 7;

/** 0…1: how much a muscle needs training, ignoring recovery. 70% weekly deficit, 30% time
 * since it was last trained (capped at a week). */
export function need(status, now) {
  if (!(status.weeklyTarget > 0)) return 0;
  const deficitShare = Math.min(1, status.deficit / status.weeklyTarget);
  const days = status.lastTrained ? (now - status.lastTrained) / DAY : 7;
  return 0.7 * deficitShare + (0.3 * Math.min(Math.max(days, 0), 7)) / 7;
}

export function plan({ statuses, workouts, catalog, settings, now, light = false }) {
  const byMuscle = Object.fromEntries(statuses.map((s) => [s.muscle, s]));

  let best = null;
  for (const id of SPLIT_TEMPLATES[settings.split] ?? SPLIT_TEMPLATES.automatic) {
    const candidate = scoreTemplate(TEMPLATES[id], byMuscle, now);
    if (!candidate) continue;
    if (best) {
      const better = candidate.score > best.score + 0.01
        || (Math.abs(candidate.score - best.score) <= 0.01 && candidate.need > best.need + 0.01);
      if (!better) continue;
    }
    best = { id, ...candidate };
  }
  if (!best || best.score <= 0) return null;

  const built = buildExercises(TEMPLATES[best.id], byMuscle, workouts, catalog, settings, now, light);
  if (!built.exercises.length) return null;
  const totalSets = built.exercises.reduce((n, e) => n + e.sets, 0);
  return {
    template: best.id,
    name: TEMPLATES[best.id].name,
    focus: built.focus,
    exercises: built.exercises,
    score: best.score,
    isLight: light,
    totalSets,
    // About 2¾ minutes per set including rest, plus warm-up.
    estimatedMinutes: Math.round(totalSets * 2.75) + 8,
  };
}

function scoreTemplate(template, byMuscle, now) {
  const relevant = template.muscles.map((m) => byMuscle[m]).filter((s) => s && s.weeklyTarget > 0);
  if (!relevant.length) return null;
  const keys = template.key.map((m) => byMuscle[m]).filter((s) => s && s.weeklyTarget > 0);
  if (!keys.every((s) => s.trainability >= 0.5)) return null;

  let total = 0;
  let needSum = 0;
  for (const status of relevant) {
    if (status.trainability >= 0.5) {
      const urgency = need(status, now);
      total += urgency * status.trainability;
      needSum += urgency;
    } else {
      total -= 0.3;
    }
  }
  return { score: total / relevant.length, need: needSum };
}

/** Sets a muscle should get today: its weekly deficit spread over ~2 sessions. */
function sessionSets(status, light) {
  const sets = Math.min(MAX_SETS_PER_MUSCLE, Math.max(2, Math.ceil(status.deficit / 2)));
  return light ? Math.max(2, Math.round(sets * LIGHT_FACTOR)) : sets;
}

function buildExercises(template, byMuscle, workouts, catalog, settings, now, light) {
  const targets = [];
  template.muscles.forEach((muscle, order) => {
    const s = byMuscle[muscle];
    if (s && s.weeklyTarget > 0 && s.trainability >= 0.5 && s.deficit >= 1.5) {
      targets.push({ muscle, priority: need(s, now), order, remaining: sessionSets(s, light) });
    }
  });
  const abs = byMuscle.abs;
  if (!template.muscles.includes('abs') && abs && abs.weeklyTarget > 0 && abs.trainability >= 0.5 && abs.deficit >= 2) {
    // Optional finisher, ranked below the session's main muscles.
    targets.push({ muscle: 'abs', priority: need(abs, now) * 0.5, order: template.muscles.length, remaining: sessionSets(abs, light) });
  }

  const budget = light ? LIGHT_SESSION_BUDGET : SESSION_BUDGET;
  const perExercise = light ? 3 : 4;
  const usage = usageCounts(workouts, +now - 56 * DAY);
  const chosen = [];
  const focus = [];
  const exhausted = new Set();
  let total = 0;

  // Repeatedly give the next exercise to the muscle with the most urgent unmet need.
  while (chosen.length < MAX_EXERCISES && budget - total >= 2) {
    const open = targets.filter((t) => t.remaining >= 2 && !exhausted.has(t.muscle));
    if (!open.length) break;
    let pick = open[0];
    for (const t of open.slice(1)) {
      const current = pick.priority * pick.remaining;
      const candidate = t.priority * t.remaining;
      if (Math.abs(candidate - current) > 0.001 ? candidate > current : t.order < pick.order) pick = t;
    }

    const sets = Math.min(perExercise, budget - total, Math.round(pick.remaining));
    const exercise = sets >= 2 ? bestExercise(pick.muscle, chosen, byMuscle, catalog, usage) : null;
    if (!exercise) {
      exhausted.add(pick.muscle);
      continue;
    }
    const hint = progressionHint(exercise, workouts, { before: now, incrementKg: loadIncrementKg(settings, exercise.equipment) });
    chosen.push({ exercise, sets, focus: pick.muscle, hint });
    if (!focus.includes(pick.muscle)) focus.push(pick.muscle);
    total += sets;
    // Indirect work only half-counts while planning so small muscles still get some direct
    // sets (curls on pull day, pushdowns on push day).
    for (const [worked, share] of Object.entries(contributions(exercise))) {
      const t = targets.find((x) => x.muscle === worked);
      if (t) t.remaining -= sets * (share < 1 ? share * 0.5 : share);
    }
  }

  // Compound lifts first, then isolation work, each in priority order.
  const exercises = chosen
    .map((item, index) => ({ item, index, compound: isCompound(item.exercise) }))
    .sort((a, b) => (a.compound === b.compound ? a.index - b.index : a.compound ? -1 : 1))
    .map(({ item }) => item);
  return { exercises, focus };
}

function bestExercise(muscle, chosen, byMuscle, catalog, usage) {
  const candidates = catalog.targeting(muscle)
    .filter((e) => !chosen.some((c) => c.exercise.id === e.id) && isCompatible(e, byMuscle));
  // Exercises led by this muscle first (curls before chin-ups for biceps), then the ones the
  // user already does, then library order.
  candidates.sort((l, r) => {
    const leftLeads = l.primary[0] === muscle;
    const rightLeads = r.primary[0] === muscle;
    if (leftLeads !== rightLeads) return leftLeads ? -1 : 1;
    const leftUse = usage.get(l.id) ?? 0;
    const rightUse = usage.get(r.id) ?? 0;
    if (leftUse !== rightUse) return rightUse - leftUse;
    return catalog.rank(l.id) - catalog.rank(r.id);
  });
  return candidates[0] ?? null;
}

function isCompatible(exercise, byMuscle) {
  return exercise.primary.every((m) => (byMuscle[m]?.trainability ?? 1) >= 0.5)
    && exercise.secondary.every((m) => (byMuscle[m]?.trainability ?? 1) >= 0.2);
}

function usageCounts(workouts, since) {
  const counts = new Map();
  for (const workout of workouts) {
    if (+workout.date < since) continue;
    for (const exercise of workout.exercises) {
      if (exercise.sets.some(isWorking)) counts.set(exercise.exerciseId, (counts.get(exercise.exerciseId) ?? 0) + 1);
    }
  }
  return counts;
}

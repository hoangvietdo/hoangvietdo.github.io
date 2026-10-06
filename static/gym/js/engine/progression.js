// Double progression: add reps until every set at the top weight reaches the top of the rep
// range, then add the smallest weight step and start again at the bottom of the range.

import { EQUIPMENT } from './exercises.js';
import { isWorking } from './sets.js';

/** Working sets from the most recent workout containing the exercise. */
export function lastPerformance(exerciseId, workouts, before = null) {
  let latest = null;
  for (const workout of workouts) {
    const date = +workout.date;
    if (before != null && date >= +before) continue;
    if (latest && latest.date >= date) continue;
    const sets = workout.exercises
      .filter((e) => e.exerciseId === exerciseId)
      .flatMap((e) => e.sets.filter(isWorking));
    if (sets.length) latest = { date, sets };
  }
  return latest && { date: new Date(latest.date), sets: latest.sets };
}

export function progressionHint(exercise, workouts, { before = null, incrementKg = null } = {}) {
  const last = lastPerformance(exercise.id, workouts, before);
  return last ? hintFromSets(exercise, last.sets, last.date, incrementKg) : null;
}

/**
 * kind: 'increaseLoad' | 'addReps' | 'repeatLoad' | 'decreaseLoad'. Judged on the working
 * weight: the one used for the most sets (the heavier one on a tie), so a single heavy top
 * set or a lighter back-off set doesn't skew the call.
 * - Every set at that weight reached the top of the rep range → add one step, or two if
 *   every set went 3+ reps past the range without reaching failure (the weight was too light).
 * - Went to failure without reaching the bottom of the range → drop about 5%.
 * - Below the range but not to failure → same weight, aim for the bottom of the range.
 * - Otherwise → same weight, one more rep on the weakest set.
 */
export function hintFromSets(exercise, lastSets, lastDate, incrementKg = null) {
  const working = lastSets.filter(isWorking);
  if (!working.length) return null;
  const top = workingWeight(working);
  const topSets = working.filter((s) => Math.abs(s.weightKg - top) < 0.01);
  const fewest = Math.min(...topSets.map((s) => s.reps));
  const most = Math.max(...topSets.map((s) => s.reps));
  const reachedFailure = working.some((s) => s.rir === 0);
  const step = incrementKg ?? EQUIPMENT[exercise.equipment]?.incrementKg ?? 2.5;
  const make = (kind, weightKg, targetReps) => ({ kind, weightKg, targetReps, lastDate, lastSets: working, reachedFailure });
  const assisted = exercise.defaultLoadMode === 'assisted';

  if (exercise.isTimed) return make('addReps', top, most + 5);
  if (fewest >= exercise.repHigh) {
    const steps = !reachedFailure && fewest >= exercise.repHigh + 3 ? 2 : 1;
    if (assisted) return make('decreaseAssistance', Math.max(0, top - steps * step), exercise.repLow);
    return make('increaseLoad', top + steps * step, exercise.repLow);
  }
  if (most < exercise.repLow) {
    if (assisted && reachedFailure) return make('increaseAssistance', top + step, exercise.repLow);
    if (reachedFailure && top > 0) {
      const lower = Math.round((top - Math.max(step, top * 0.05)) / step) * step;
      return make('decreaseLoad', Math.max(0, Math.min(lower, top - step)), exercise.repLow);
    }
    return make(assisted ? 'repeatAssistance' : 'repeatLoad', top, exercise.repLow);
  }
  return make('addReps', top, Math.min(fewest + 1, exercise.repHigh));
}

/** The weight used for the most sets; the heavier one on a tie. */
function workingWeight(sets) {
  const counts = new Map();
  for (const set of sets) {
    const key = Math.round(set.weightKg * 100) / 100;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
}

/** Epley estimate. Beyond ~12 reps it overestimates, so reps are capped there. */
export function estimatedOneRepMax(weightKg, reps) {
  if (!(reps > 0) || !(weightKg > 0)) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + Math.min(reps, 12) / 30);
}

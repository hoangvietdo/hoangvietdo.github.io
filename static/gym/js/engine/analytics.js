// Aggregations for the Progress screen.

import { addDays, weekStart } from './calendar.js';
import { effectiveSets } from './recovery.js';
import { estimatedOneRepMax } from './progression.js';
import { isWorking, workingSetCount } from './sets.js';

/** Start dates of the last `count` weeks, oldest first, current week last. */
export function weekStarts(count, now, mondayFirst = true) {
  const current = weekStart(now, mondayFirst);
  return Array.from({ length: count }, (_, i) => addDays(current, -7 * (count - 1 - i)));
}

/** Effective sets per week for one muscle, or total working sets when `muscle` is null. */
export function weeklySets(muscle, workouts, catalog, weeks, now, mondayFirst = true) {
  const starts = weekStarts(weeks, now, mondayFirst);
  const totals = new Map(starts.map((s) => [+s, 0]));
  for (const workout of workouts) {
    const key = +weekStart(workout.date, mondayFirst);
    if (!totals.has(key)) continue;
    const add = muscle ? (effectiveSets(workout, catalog)[muscle] ?? 0) : workingSetCount(workout);
    totals.set(key, totals.get(key) + add);
  }
  return starts.map((s) => ({ weekStart: s, value: totals.get(+s) }));
}

export function weeklyDistance(cardio, kind, weeks, now, mondayFirst = true) {
  const starts = weekStarts(weeks, now, mondayFirst);
  const totals = new Map(starts.map((s) => [+s, 0]));
  for (const session of cardio) {
    if (kind && session.kind !== kind) continue;
    const key = +weekStart(session.date, mondayFirst);
    if (totals.has(key)) totals.set(key, totals.get(key) + (session.distanceKm ?? 0));
  }
  return starts.map((s) => ({ weekStart: s, value: totals.get(+s) }));
}

/** Best set (by estimated 1RM) of every workout containing the exercise, oldest first. */
export function exerciseHistory(exerciseId, workouts) {
  const points = [];
  for (const workout of workouts) {
    const sets = workout.exercises.filter((e) => e.exerciseId === exerciseId).flatMap((e) => e.sets.filter(isWorking));
    if (!sets.length) continue;
    const best = sets.reduce((a, b) => (estimatedOneRepMax(b.weightKg, b.reps) > estimatedOneRepMax(a.weightKg, a.reps) ? b : a));
    points.push({
      date: new Date(workout.date),
      estimatedOneRepMax: estimatedOneRepMax(best.weightKg, best.reps),
      topWeightKg: best.weightKg,
      topReps: best.reps,
      volumeKg: sets.reduce((sum, s) => sum + s.weightKg * s.reps, 0),
    });
  }
  return points.sort((a, b) => a.date - b.date);
}

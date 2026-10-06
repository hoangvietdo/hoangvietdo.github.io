// A compact post-workout analysis. This deliberately uses only recorded sets so the result is
// transparent and deterministic; no server or AI model sees the user's workout.

import { effectiveSets } from './recovery.js';
import { isWorking } from './sets.js';

export function analyzeWorkout(workout, catalog, {
  bodyWeightKg = null, heightCm = null, barbellWeightKg = 0, smithBarWeightKg = 0,
} = {}) {
  const entries = workout.exercises.map((entry) => ({ entry, exercise: catalog.get(entry.exerciseId), sets: entry.sets.filter(isWorking) }));
  const sets = entries.flatMap(({ sets: working }) => working);
  const muscleSets = effectiveSets(workout, catalog);
  const focus = Object.entries(muscleSets)
    .map(([muscle, value]) => ({ muscle, sets: Math.round(value * 2) / 2 }))
    .sort((a, b) => b.sets - a.sets || a.muscle.localeCompare(b.muscle));
  const start = +new Date(workout.date);
  const end = workout.endDate ? +new Date(workout.endDate) : NaN;

  const totalReps = sets.reduce((sum, set) => sum + set.reps, 0);
  const volumeKg = entries.reduce((total, { exercise, sets: working }) => total + working.reduce((sum, set) => {
    const bar = exercise?.equipment === 'barbell'
      ? Math.max(0, barbellWeightKg)
      : exercise?.equipment === 'smith' ? Math.max(0, smithBarWeightKg) : 0;
    return sum + (set.weightKg + bar) * set.reps;
  }, 0), 0);
  const durationMinutes = Number.isFinite(start) && Number.isFinite(end) && end >= start
    ? Math.max(1, Math.round((end - start) / 60000))
    : null;
  const validWeight = Number.isFinite(bodyWeightKg) && bodyWeightKg > 0 ? bodyWeightKg : null;
  const validHeight = Number.isFinite(heightCm) && heightCm > 0 ? heightCm : null;

  return {
    exercises: workout.exercises.filter((entry) => entry.sets.some(isWorking)).length,
    workingSets: sets.length,
    totalReps,
    averageReps: sets.length ? totalReps / sets.length : 0,
    volumeKg,
    volumePerMinuteKg: durationMinutes ? volumeKg / durationMinutes : null,
    volumeBodyweightRatio: validWeight ? volumeKg / validWeight : null,
    failureSets: sets.filter((set) => set.rir === 0).length,
    durationMinutes,
    bodyWeightKg: validWeight,
    heightCm: validHeight,
    bmi: validWeight && validHeight ? validWeight / ((validHeight / 100) ** 2) : null,
    focus,
  };
}

// A compact post-workout analysis. This deliberately uses only recorded sets so the result is
// transparent and deterministic; no server or AI model sees the user's workout.

import { effectiveSets } from './recovery.js';
import { isWorking } from './sets.js';

export function analyzeWorkout(workout, catalog) {
  const sets = workout.exercises.flatMap((entry) => entry.sets.filter(isWorking));
  const muscleSets = effectiveSets(workout, catalog);
  const focus = Object.entries(muscleSets)
    .map(([muscle, value]) => ({ muscle, sets: Math.round(value * 2) / 2 }))
    .sort((a, b) => b.sets - a.sets || a.muscle.localeCompare(b.muscle));
  const start = +new Date(workout.date);
  const end = workout.endDate ? +new Date(workout.endDate) : NaN;

  return {
    exercises: workout.exercises.filter((entry) => entry.sets.some(isWorking)).length,
    workingSets: sets.length,
    totalReps: sets.reduce((sum, set) => sum + set.reps, 0),
    volumeKg: sets.reduce((sum, set) => sum + set.weightKg * set.reps, 0),
    failureSets: sets.filter((set) => set.rir === 0).length,
    durationMinutes: Number.isFinite(start) && Number.isFinite(end) && end >= start
      ? Math.max(1, Math.round((end - start) / 60000))
      : null,
    focus,
  };
}

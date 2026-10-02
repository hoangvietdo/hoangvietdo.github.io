// A logged set: { reps, weightKg, rir (reps in reserve; 0 = went to failure, null = not
// marked), warmup, done }. Planned sets that haven't been ticked off yet have done === false;
// older data has no `done` field and counts as done.
// A workout given to the engine: { date: Date, exercises: [{ exerciseId, sets: [set] }] }.

export const isWorking = (set) => !set.warmup && set.reps > 0 && set.done !== false;

export function workingSetCount(workout) {
  return workout.exercises.reduce((n, exercise) => n + exercise.sets.filter(isWorking).length, 0);
}

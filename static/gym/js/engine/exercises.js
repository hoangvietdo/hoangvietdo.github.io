// Built-in exercise library. Ids are stored with every logged set, so never change one.
// Within each muscle the staples come first; the planner falls back to this order when the
// user has no history with any candidate.

export const EQUIPMENT = {
  barbell: { name: 'Barbell', incrementKg: 2.5 },
  dumbbell: { name: 'Dumbbell', incrementKg: 2 },
  machine: { name: 'Machine', incrementKg: 5 },
  cable: { name: 'Cable', incrementKg: 2.5 },
  bodyweight: { name: 'Bodyweight', incrementKg: 2.5 },
  other: { name: 'Other', incrementKg: 2.5 },
};

export const CUSTOM_PREFIX = 'custom.';

function ex(id, name, primary, secondary, equipment, [repLow, repHigh], isTimed = false, defaultUnit = null) {
  return { id, name, primary, secondary, equipment, repLow, repHigh, isTimed, defaultUnit };
}

export const LIBRARY = [
  // Chest
  ex('barbell_bench_press', 'Barbell Bench Press', ['chest'], ['triceps', 'shoulders'], 'barbell', [5, 8]),
  ex('incline_dumbbell_press', 'Incline Dumbbell Press', ['chest'], ['shoulders', 'triceps'], 'dumbbell', [8, 12]),
  ex('dumbbell_bench_press', 'Dumbbell Bench Press', ['chest'], ['triceps', 'shoulders'], 'dumbbell', [8, 12]),
  ex('incline_barbell_bench_press', 'Incline Barbell Bench Press', ['chest'], ['shoulders', 'triceps'], 'barbell', [6, 10]),
  ex('machine_chest_press', 'Machine Chest Press', ['chest'], ['triceps', 'shoulders'], 'machine', [8, 12]),
  ex('cable_fly', 'Cable Fly', ['chest'], [], 'cable', [10, 15]),
  ex('pec_deck', 'Pec Deck', ['chest'], [], 'machine', [10, 15]),
  ex('dip', 'Dip', ['chest', 'triceps'], ['shoulders'], 'bodyweight', [6, 12]),
  ex('push_up', 'Push-up', ['chest'], ['triceps', 'shoulders'], 'bodyweight', [10, 20]),

  // Back
  ex('lat_pulldown', 'Lat Pulldown', ['back'], ['biceps'], 'cable', [8, 12]),
  ex('seated_cable_row', 'Seated Cable Row', ['back'], ['biceps'], 'cable', [8, 12]),
  ex('pull_up', 'Pull-up', ['back'], ['biceps'], 'bodyweight', [5, 10]),
  ex('barbell_row', 'Barbell Row', ['back'], ['biceps', 'lowerBack'], 'barbell', [6, 10]),
  ex('dumbbell_row', 'One-arm Dumbbell Row', ['back'], ['biceps'], 'dumbbell', [8, 12]),
  ex('chest_supported_row', 'Chest-supported Row', ['back'], ['biceps'], 'machine', [8, 12]),
  ex('chin_up', 'Chin-up', ['back', 'biceps'], [], 'bodyweight', [5, 10]),
  ex('straight_arm_pulldown', 'Straight-arm Pulldown', ['back'], [], 'cable', [10, 15]),
  ex('shrug', 'Shrug', ['back'], ['forearms'], 'dumbbell', [10, 15]),

  // Shoulders
  ex('lateral_raise', 'Lateral Raise', ['shoulders'], [], 'dumbbell', [12, 20]),
  ex('dumbbell_shoulder_press', 'Dumbbell Shoulder Press', ['shoulders'], ['triceps'], 'dumbbell', [8, 12]),
  ex('overhead_press', 'Overhead Press', ['shoulders'], ['triceps'], 'barbell', [5, 8]),
  ex('cable_lateral_raise', 'Cable Lateral Raise', ['shoulders'], [], 'cable', [12, 20]),
  ex('rear_delt_fly', 'Rear Delt Fly', ['shoulders'], ['back'], 'machine', [12, 20]),
  ex('face_pull', 'Face Pull', ['shoulders'], ['back'], 'cable', [12, 20]),
  ex('machine_shoulder_press', 'Machine Shoulder Press', ['shoulders'], ['triceps'], 'machine', [8, 12]),

  // Biceps
  ex('barbell_curl', 'Barbell Curl', ['biceps'], ['forearms'], 'barbell', [8, 12]),
  ex('dumbbell_curl', 'Dumbbell Curl', ['biceps'], ['forearms'], 'dumbbell', [8, 12]),
  ex('hammer_curl', 'Hammer Curl', ['biceps'], ['forearms'], 'dumbbell', [8, 12]),
  ex('incline_dumbbell_curl', 'Incline Dumbbell Curl', ['biceps'], [], 'dumbbell', [8, 12]),
  ex('preacher_curl', 'Preacher Curl', ['biceps'], [], 'machine', [8, 12]),
  ex('cable_curl', 'Single-arm Cable Bicep Curl', ['biceps'], [], 'cable', [10, 15], false, 'lb'),

  // Triceps
  ex('triceps_pushdown', 'Triceps Pushdown', ['triceps'], [], 'cable', [10, 15]),
  ex('overhead_triceps_extension', 'Overhead Triceps Extension', ['triceps'], [], 'cable', [10, 15]),
  ex('skull_crusher', 'Skull Crusher', ['triceps'], [], 'barbell', [8, 12]),
  ex('close_grip_bench_press', 'Close-grip Bench Press', ['triceps'], ['chest', 'shoulders'], 'barbell', [6, 10]),

  // Forearms
  ex('wrist_curl', 'Wrist Curl', ['forearms'], [], 'dumbbell', [12, 20]),

  // Legs
  ex('back_squat', 'Back Squat', ['quads'], ['glutes', 'lowerBack'], 'barbell', [5, 8]),
  ex('leg_press', 'Leg Press', ['quads'], ['glutes'], 'machine', [8, 12]),
  ex('hack_squat', 'Hack Squat', ['quads'], ['glutes'], 'machine', [8, 12]),
  ex('front_squat', 'Front Squat', ['quads'], ['glutes'], 'barbell', [5, 8]),
  ex('leg_extension', 'Leg Extension', ['quads'], [], 'machine', [10, 15]),
  ex('romanian_deadlift', 'Romanian Deadlift', ['hamstrings'], ['glutes', 'lowerBack'], 'barbell', [6, 10]),
  ex('seated_leg_curl', 'Seated Leg Curl', ['hamstrings'], [], 'machine', [10, 15]),
  ex('lying_leg_curl', 'Lying Leg Curl', ['hamstrings'], [], 'machine', [10, 15]),
  ex('hip_thrust', 'Hip Thrust', ['glutes'], ['hamstrings'], 'barbell', [8, 12]),
  ex('bulgarian_split_squat', 'Bulgarian Split Squat', ['quads', 'glutes'], [], 'dumbbell', [8, 12]),
  ex('walking_lunge', 'Walking Lunge', ['quads'], ['glutes'], 'dumbbell', [10, 16]),
  ex('hip_abduction', 'Hip Abduction', ['glutes'], [], 'machine', [12, 20]),
  ex('deadlift', 'Deadlift', ['glutes', 'lowerBack'], ['hamstrings', 'quads', 'back', 'forearms'], 'barbell', [3, 6]),
  ex('back_extension', 'Back Extension', ['lowerBack'], ['glutes', 'hamstrings'], 'bodyweight', [10, 15]),
  ex('standing_calf_raise', 'Standing Calf Raise', ['calves'], [], 'machine', [10, 15]),
  ex('seated_calf_raise', 'Seated Calf Raise', ['calves'], [], 'machine', [12, 20]),

  // Abs
  ex('cable_crunch', 'Cable Crunch', ['abs'], [], 'cable', [10, 15]),
  ex('hanging_leg_raise', 'Hanging Leg Raise', ['abs'], [], 'bodyweight', [8, 15]),
  ex('ab_wheel_rollout', 'Ab Wheel Rollout', ['abs'], [], 'other', [8, 15]),
  ex('plank', 'Plank', ['abs'], [], 'bodyweight', [30, 60], true),
];

/** How much one hard set counts toward each muscle: 1 for prime movers, 0.5 for synergists. */
export function contributions(exercise) {
  const result = {};
  for (const m of exercise.secondary) result[m] = 0.5;
  for (const m of exercise.primary) result[m] = 1;
  return result;
}

/** Works more than one major muscle. Grip (forearms) doesn't count, so curls stay isolation. */
export function isCompound(exercise) {
  return exercise.primary.length + exercise.secondary.filter((m) => m !== 'forearms').length > 1;
}

export function exerciseMuscles(exercise) {
  return [...exercise.primary, ...exercise.secondary.filter((m) => !exercise.primary.includes(m))];
}

/** Rep range for a new custom exercise. */
export function defaultRepRange(primary, secondary, isTimed) {
  if (isTimed) return [30, 60];
  return primary.length + secondary.length > 1 ? [6, 10] : [10, 15];
}

/** Built-in library plus the user's custom exercises, looked up by id. */
export class Catalog {
  constructor(custom = []) {
    this.list = [...LIBRARY, ...custom];
    this.index = new Map();
    this.list.forEach((exercise, i) => {
      if (!this.index.has(exercise.id)) this.index.set(exercise.id, i);
    });
  }

  get(id) {
    const i = this.index.get(id);
    return i === undefined ? undefined : this.list[i];
  }

  /** Position in the catalog; built-ins are ordered so staples come first. */
  rank(id) {
    return this.index.get(id) ?? Number.MAX_SAFE_INTEGER;
  }

  /** Exercises where `muscle` is a prime mover, staples first. */
  targeting(muscle) {
    return this.list.filter((exercise) => exercise.primary.includes(muscle));
  }
}

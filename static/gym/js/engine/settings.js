import { MUSCLE_INFO, defaultTargets } from './muscles.js';
import { EQUIPMENT } from './exercises.js';

export const KG_PER_LB = 0.45359237;

export const SPLITS = {
  automatic: 'Automatic',
  pushPullLegs: 'Push / Pull / Legs',
  upperLower: 'Upper / Lower',
  fullBody: 'Full body',
};

export function makeSettings(partial = {}) {
  return {
    weeklyGoal: 4,
    split: 'automatic',
    age: 30,
    unit: 'kg',
    bodyWeightKg: null,
    heightCm: null,
    barbellWeightKg: 20,
    weekStartsMonday: true,
    ...partial,
    targets: { ...defaultTargets(), ...(partial.targets ?? {}) },
  };
}

export function target(settings, muscle) {
  return settings.targets?.[muscle] ?? MUSCLE_INFO[muscle].target;
}

/** Tanaka et al. (2001): 208 − 0.7 × age. */
export function maxHeartRate(settings) {
  return 208 - 0.7 * settings.age;
}

/** Smallest sensible load jump in kg; plate-friendly 5 lb steps (10 lb machines) in pounds. */
export function loadIncrementKg(settings, equipment) {
  if (settings.unit !== 'lb') return EQUIPMENT[equipment]?.incrementKg ?? 2.5;
  return (equipment === 'machine' ? 10 : 5) * KG_PER_LB;
}

// Whole-body readiness. Starts at 75 and adds or subtracts points per signal. HRV and resting
// heart rate are compared with your own 30-day baseline, never population norms.

import { startOfDay, addDays, isSameDay, DAY } from './calendar.js';
import { cardioLoad } from './cardio.js';
import { maxHeartRate } from './settings.js';
import { workingSetCount } from './sets.js';

const BASE_SCORE = 75;
const BASELINE_DAYS = 30;
const MINIMUM_BASELINE_DAYS = 5;
/** Cardio below this load (~20 easy minutes) doesn't count as a training day. */
const TRAINING_DAY_LOAD = 20;

export const FEELINGS = {
  great: { name: 'Great', emoji: '💪' },
  normal: { name: 'Normal', emoji: '🙂' },
  tired: { name: 'Tired', emoji: '😴' },
  sick: { name: 'Sick / hurt', emoji: '🤒' },
};

const signal = (kind, title, value, detail, impact, points) => ({ kind, title, value, detail, impact, points });

/**
 * health: [{ date, hrvMs?, restingHeartRate?, sleepHours? }] (one per day; sleep is the night
 * that ended that day). checkIn: { date, feeling?, sleepHours? }.
 */
export function evaluateReadiness({ now, health = [], checkIn = null, workouts, cardio = [], settings }) {
  const today = startOfDay(now);
  const todays = checkIn && isSameDay(checkIn.date, now) ? checkIn : null;
  const days = new Map();
  for (const day of health) days.set(+startOfDay(day.date), day);

  const signals = [];
  let usesHealthData = false;

  if (todays?.feeling) signals.push(feelingSignal(todays.feeling));
  const watchSleep = days.get(+today)?.sleepHours;
  if (watchSleep != null) {
    signals.push(sleepSignal(watchSleep));
    usesHealthData = true;
  } else if (todays?.sleepHours != null) {
    signals.push(sleepSignal(todays.sleepHours));
  }
  const hrv = hrvSignal(days, today);
  if (hrv) {
    signals.push(hrv);
    usesHealthData = true;
  }
  const resting = restingHeartRateSignal(days, today);
  if (resting) {
    signals.push(resting);
    usesHealthData = true;
  }
  const maxHr = maxHeartRate(settings);
  const streak = trainingStreak(today, workouts, cardio, maxHr);
  signals.push(streakSignal(streak));
  const load = cardioLoadSignal(now, cardio, maxHr);
  if (load) signals.push(load);

  const total = signals.reduce((sum, s) => sum + s.points, BASE_SCORE);
  const score = Math.round(Math.min(100, Math.max(0, total)));
  return {
    score,
    level: score >= 70 ? 'high' : score >= 50 ? 'moderate' : 'low',
    signals,
    isSick: todays?.feeling === 'sick',
    trainingStreak: streak,
    usesHealthData,
  };
}

function feelingSignal(feeling) {
  const name = FEELINGS[feeling]?.name ?? feeling;
  switch (feeling) {
    case 'great': return signal('feeling', 'Feeling', name, 'You feel fresh', 'positive', 5);
    case 'tired': return signal('feeling', 'Feeling', name, 'You checked in as tired', 'negative', -15);
    case 'sick': return signal('feeling', 'Feeling', name, "Rest until you're better", 'negative', -40);
    default: return signal('feeling', 'Feeling', name, 'No complaints', 'neutral', 0);
  }
}

function sleepSignal(hours) {
  const minutes = Math.round(hours * 60);
  const value = `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  if (hours < 5) return signal('sleep', 'Sleep', value, 'Very short night, recovery is impaired', 'negative', -20);
  if (hours < 6) return signal('sleep', 'Sleep', value, 'Short night', 'negative', -12);
  if (hours < 7) return signal('sleep', 'Sleep', value, 'A bit under the 7 h+ most adults need', 'negative', -5);
  return signal('sleep', 'Sleep', value, 'Enough sleep', 'positive', 3);
}

function hrvSignal(days, today) {
  const latest = latestValue(days, today, 'hrvMs');
  if (!latest || !(latest.value > 0)) return null;
  const value = `${Math.round(latest.value)} ms`;
  const suffix = +latest.day === +today ? '' : ' (yesterday)';
  const baseline = baselineValues(days, latest.day, 'hrvMs').filter((v) => v > 0).map(Math.log);
  if (baseline.length < MINIMUM_BASELINE_DAYS) {
    return signal('hrv', 'HRV', value, `Building your baseline (${baseline.length} of ${MINIMUM_BASELINE_DAYS} days)`, 'neutral', 0);
  }
  // HRV is log-normally distributed, so compare in log space. A minimum spread keeps a very
  // stable baseline from flagging tiny day-to-day changes.
  const mean = baseline.reduce((a, b) => a + b, 0) / baseline.length;
  const spread = Math.max(standardDeviation(baseline, mean), 0.05);
  const z = (Math.log(latest.value) - mean) / spread;
  const percent = Math.abs(Math.trunc((latest.value / Math.exp(mean) - 1) * 100));
  if (z < -1) return signal('hrv', 'HRV', value, `${percent}% below your normal${suffix}`, 'negative', -20);
  if (z < -0.5) return signal('hrv', 'HRV', value, `Slightly below your normal${suffix}`, 'negative', -8);
  if (z >= 0.5) return signal('hrv', 'HRV', value, `${percent}% above your normal${suffix}`, 'positive', 5);
  return signal('hrv', 'HRV', value, `Within your normal range${suffix}`, 'neutral', 0);
}

function restingHeartRateSignal(days, today) {
  const latest = latestValue(days, today, 'restingHeartRate');
  if (!latest || !(latest.value > 0)) return null;
  const value = `${Math.round(latest.value)} bpm`;
  const suffix = +latest.day === +today ? '' : ' (yesterday)';
  const baseline = baselineValues(days, latest.day, 'restingHeartRate').filter((v) => v > 0);
  if (baseline.length < MINIMUM_BASELINE_DAYS) {
    return signal('restingHeartRate', 'Resting HR', value, `Building your baseline (${baseline.length} of ${MINIMUM_BASELINE_DAYS} days)`, 'neutral', 0);
  }
  const delta = latest.value - baseline.reduce((a, b) => a + b, 0) / baseline.length;
  const bpm = Math.abs(Math.round(delta));
  if (delta >= 7) return signal('restingHeartRate', 'Resting HR', value, `${bpm} bpm above your normal, possible fatigue or illness${suffix}`, 'negative', -15);
  if (delta >= 4) return signal('restingHeartRate', 'Resting HR', value, `${bpm} bpm above your normal${suffix}`, 'negative', -7);
  if (delta <= -2) return signal('restingHeartRate', 'Resting HR', value, `${bpm} bpm below your normal${suffix}`, 'positive', 3);
  return signal('restingHeartRate', 'Resting HR', value, `In your normal range${suffix}`, 'neutral', 0);
}

function streakSignal(streak) {
  const value = streak === 0 ? 'Rested' : `${streak} day${streak === 1 ? '' : 's'}`;
  if (streak === 0) return signal('trainingStreak', 'Training streak', value, 'Rested yesterday', 'positive', 5);
  if (streak <= 2) return signal('trainingStreak', 'Training streak', value, `Trained ${value} in a row`, 'neutral', 0);
  if (streak === 3) return signal('trainingStreak', 'Training streak', value, '3 days in a row without rest', 'negative', -5);
  if (streak === 4) return signal('trainingStreak', 'Training streak', value, '4 days in a row without rest', 'negative', -12);
  return signal('trainingStreak', 'Training streak', value, `${streak} days in a row without rest`, 'negative', -20);
}

/** Acute (7-day) vs chronic (28-day weekly average) cardio load. Sudden spikes are a common
 * precursor of overuse injuries in runners. */
function cardioLoadSignal(now, cardio, maxHr) {
  const t = +now;
  const load = (days) => cardio
    .filter((s) => +s.date <= t && t - +s.date < days * DAY)
    .reduce((sum, s) => sum + cardioLoad(s, maxHr), 0);
  const acute = load(7);
  const chronicWeekly = load(28) / 4;
  if (chronicWeekly < 30) return null;
  const ratio = acute / chronicWeekly;
  const value = `${Math.round(ratio * 100)}% of usual`;
  if (ratio >= 1.5) return signal('cardioLoad', 'Cardio load', value, "This week's cardio is well above your 4-week average", 'negative', -8);
  if (ratio >= 1.3) return signal('cardioLoad', 'Cardio load', value, 'Cardio is ramping up quickly', 'negative', -4);
  return signal('cardioLoad', 'Cardio load', value, 'In line with your 4-week average', 'neutral', 0);
}

export function trainingStreak(today, workouts, cardio, maxHr) {
  const trainingDays = new Set();
  for (const w of workouts) if (workingSetCount(w) > 0) trainingDays.add(+startOfDay(w.date));
  for (const c of cardio) if (cardioLoad(c, maxHr) >= TRAINING_DAY_LOAD) trainingDays.add(+startOfDay(c.date));
  let streak = 0;
  let day = startOfDay(today);
  while (streak < 14) {
    const previous = addDays(day, -1);
    if (!trainingDays.has(+previous)) break;
    streak += 1;
    day = previous;
  }
  return streak;
}

/** Today's value, or yesterday's when the watch hasn't produced one yet. */
function latestValue(days, today, key) {
  const todayValue = days.get(+today)?.[key];
  if (todayValue != null) return { day: today, value: todayValue };
  const yesterday = addDays(today, -1);
  const yesterdayValue = days.get(+yesterday)?.[key];
  if (yesterdayValue != null) return { day: yesterday, value: yesterdayValue };
  return null;
}

function baselineValues(days, before, key) {
  const start = +addDays(before, -BASELINE_DAYS);
  const values = [];
  for (const [time, day] of days) {
    if (time >= start && time < +before && day[key] != null) values.push(day[key]);
  }
  return values;
}

function standardDeviation(values, mean) {
  if (values.length < 2) return 0;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

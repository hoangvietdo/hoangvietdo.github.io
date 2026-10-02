import { daysBetween } from './engine/calendar.js';
import { KG_PER_LB } from './engine/settings.js';

const numberFormats = new Map();

export function num(value, digits = 1) {
  if (!numberFormats.has(digits)) numberFormats.set(digits, new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }));
  return numberFormats.get(digits).format(value);
}

export const fromKg = (kg, unit) => (unit === 'lb' ? kg / KG_PER_LB : kg);
export const toKg = (value, unit) => (unit === 'lb' ? value * KG_PER_LB : value);

export function weight(kg, unit) {
  return kg > 0 ? `${num(fromKg(kg, unit))} ${unit}` : 'bodyweight';
}

/** Value for a weight text field: "62.5", or "" for nothing. */
export function inputWeight(kg, unit) {
  return kg > 0 ? String(Math.round(fromKg(kg, unit) * 100) / 100) : '';
}

export function distance(km) {
  return `${num(km, km < 10 ? 2 : 1)} km`;
}

/** 28:30 or 1:05:09. */
export function clock(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total / 60) % 60;
  const seconds = String(total % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}

export function pace(minutesPerKm) {
  return `${clock(minutesPerKm * 60000)} /km`;
}

/** Sets rounded to the nearest half. */
export function sets(value) {
  return num(Math.round(value * 2) / 2, 1);
}

export function shortDate(date) {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function weekdayDate(date) {
  return new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });
}

export function longDate(date) {
  return new Date(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function relativeDay(date, now = new Date()) {
  const days = daysBetween(date, now);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return shortDate(date);
}

/** "2026-09-30T18:05" for <input type="datetime-local">. */
export function toLocalInput(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value) {
  const d = new Date(value);
  return Number.isNaN(+d) ? null : d.toISOString();
}

/** "80 kg × 8, 8, 7", or "80 × 8, 75 × 10 kg" when the weight changed between sets. */
export function setList(list, unit, isTimed) {
  if (!list.length) return '';
  const suffix = isTimed ? ' s' : '';
  const first = list[0].weightKg;
  if (list.every((s) => Math.abs(s.weightKg - first) < 0.01)) {
    const reps = list.map((s) => s.reps).join(', ');
    return first > 0 ? `${weight(first, unit)} × ${reps}${suffix}` : `${reps}${suffix}`;
  }
  return `${list.map((s) => `${num(fromKg(s.weightKg, unit))} × ${s.reps}`).join(', ')} ${unit}`;
}

/** The call to make for an exercise: { tone: 'up' | 'same' | 'down', icon, title, text }. */
export function advice(hint, unit, isTimed) {
  const reps = isTimed ? `${hint.targetReps} s` : `${hint.targetReps} reps`;
  const wasBodyweight = Math.max(...hint.lastSets.map((s) => s.weightKg)) <= 0;
  const load = weight(hint.weightKg, unit);
  switch (hint.kind) {
    case 'increaseLoad':
      return wasBodyweight
        ? { tone: 'up', icon: '⬆', title: 'Add weight', text: `+${load} or a harder variation, ${reps}` }
        : { tone: 'up', icon: '⬆', title: 'Increase weight', text: `${load} × ${reps}` };
    case 'decreaseLoad':
      return { tone: 'down', icon: '⬇', title: 'Lower the weight', text: `${load} × ${reps}` };
    case 'repeatLoad':
      return { tone: 'same', icon: '➡', title: 'Same weight', text: `${load} × ${reps}` };
    default:
      if (isTimed) return { tone: 'same', icon: '➡', title: 'Hold longer', text: reps };
      return wasBodyweight
        ? { tone: 'same', icon: '➡', title: 'More reps', text: reps }
        : { tone: 'same', icon: '➡', title: 'Same weight, one more rep', text: `${load} × ${reps}` };
  }
}

/** Why the call was made, in plain words. */
export function adviceReason(hint, exercise) {
  const range = `${exercise.repLow}–${exercise.repHigh}`;
  switch (hint.kind) {
    case 'increaseLoad':
      return `Every set reached ${exercise.repHigh}+ ${exercise.isTimed ? 'seconds' : 'reps'}, the top of the ${range} range.`;
    case 'decreaseLoad':
      return `You hit failure before ${exercise.repLow} reps, so the weight is too heavy for now.`;
    case 'repeatLoad':
      return `Get every set into the ${range} rep range before adding weight.`;
    default:
      return exercise.isTimed
        ? 'Add a few seconds each session.'
        : `Add reps until every set reaches ${exercise.repHigh}, then go up in weight.`;
  }
}

/** "Last time (Mon 28 Sept): 60 kg × 8, 8, 8 · last set to failure". */
export function lastTime(hint, unit, isTimed) {
  const sets = setList(hint.lastSets, unit, isTimed);
  const failure = hint.lastSets.at(-1)?.rir === 0 ? ' · last set to failure' : hint.reachedFailure ? ' · reached failure' : '';
  return `Last time (${weekdayDate(hint.lastDate)}): ${sets}${failure}`;
}

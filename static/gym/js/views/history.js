import { h, icon, section, card } from '../dom.js';
import { addDays, weekStart } from '../engine/calendar.js';
import { CARDIO, paceMinutesPerKm } from '../engine/cardio.js';
import { isWorking } from '../engine/sets.js';
import * as fmt from '../format.js';
import { createSession, workingSets } from '../model.js';

const CARDIO_EMOJI = { run: '🏃', cycle: '🚴', walk: '🚶', other: '❤️' };

export function renderHistory(ctx) {
  const { state } = ctx;
  const mondayFirst = state.settings.weekStartsMonday;
  const items = [
    ...state.sessions.map((session) => ({ date: new Date(session.date), session })),
    ...state.cardio.map((entry) => ({ date: new Date(entry.date), entry })),
  ].sort((a, b) => b.date - a.date);

  const weeks = new Map();
  for (const item of items) {
    const key = +weekStart(item.date, mondayFirst);
    if (!weeks.has(key)) weeks.set(key, []);
    weeks.get(key).push(item);
  }

  return h('main', { class: 'screen' },
    h('header', { class: 'page-head' }, h('h1', {}, 'History')),
    h('div', { class: 'actions' },
      h('button', { class: 'btn tinted', onClick: () => logPastWorkout(ctx) }, icon('plus', 18), 'Past workout'),
      h('button', { class: 'btn tinted', onClick: () => ctx.go('#/cardio/new') }, icon('plus', 18), 'Run / cardio')),
    items.length === 0 && h('div', { class: 'empty-state' },
      h('div', { class: 'empty-emoji', 'aria-hidden': 'true' }, '🏋️'),
      h('h2', {}, 'No workouts yet'),
      h('p', { class: 'muted' }, 'Gym sessions and runs you log show up here. To look around first, load sample data in Settings.')),
    [...weeks].map(([key, list]) => section(weekTitle(new Date(key), mondayFirst),
      card(list.map((item) => (item.session ? gymRow(ctx, item.session) : cardioRow(ctx, item.entry)))))));
}

function gymRow(ctx, session) {
  const unit = ctx.state.settings.unit;
  const volume = session.entries.reduce((sum, e) => sum + e.sets.filter(isWorking).reduce((s, x) => s + x.weightKg * x.reps, 0), 0);
  const count = session.entries.length;
  const parts = [`${count} exercise${count === 1 ? '' : 's'}`, `${workingSets(session)} sets`];
  if (volume > 0) parts.push(`${fmt.num(fmt.fromKg(volume, unit), 0)} ${unit} lifted`);
  const minutes = session.endDate ? (Date.parse(session.endDate) - Date.parse(session.date)) / 60e3 : null;
  if (minutes >= 5 && minutes <= 300) parts.push(`${Math.round(minutes)} min`);
  return h('button', { class: 'row row-button history-row', onClick: () => ctx.go(`#/workout/${session.id}`) },
    h('span', { class: 'history-icon', 'aria-hidden': 'true' }, '🏋️'),
    h('div', { class: 'grow' },
      h('div', { class: 'row-title' }, session.title || 'Workout', !session.endDate && h('span', { class: 'pill live' }, 'In progress')),
      h('div', { class: 'small muted' }, parts.join(' · '))),
    h('span', { class: 'small muted' }, fmt.weekdayDate(session.date)));
}

function cardioRow(ctx, entry) {
  const kind = CARDIO[entry.kind] ?? CARDIO.other;
  const title = entry.distanceKm > 0 ? `${kind.name} · ${fmt.distance(entry.distanceKm)}` : kind.name;
  const parts = [fmt.clock(entry.durationMinutes * 60e3)];
  const pace = paceMinutesPerKm(entry);
  if (pace && entry.kind !== 'cycle') parts.push(fmt.pace(pace));
  if (entry.avgHr) parts.push(`${Math.round(entry.avgHr)} bpm`);
  return h('button', { class: 'row row-button history-row', onClick: () => ctx.go(`#/cardio/${entry.id}`) },
    h('span', { class: 'history-icon', 'aria-hidden': 'true' }, CARDIO_EMOJI[entry.kind] ?? '❤️'),
    h('div', { class: 'grow' }, h('div', { class: 'row-title' }, title), h('div', { class: 'small muted' }, parts.join(' · '))),
    h('span', { class: 'small muted' }, fmt.weekdayDate(entry.date)));
}

function logPastWorkout(ctx) {
  let id = null;
  ctx.mutate((state) => {
    const now = new Date();
    id = createSession(state, { date: new Date(+now - 2 * 3600e3), endDate: now }).id;
  });
  ctx.go(`#/workout/${id}`);
}

function weekTitle(start, mondayFirst) {
  const current = weekStart(new Date(), mondayFirst);
  if (+start === +current) return 'This week';
  if (+start === +addDays(current, -7)) return 'Last week';
  return `${fmt.shortDate(start)} – ${fmt.shortDate(addDays(start, 6))}`;
}

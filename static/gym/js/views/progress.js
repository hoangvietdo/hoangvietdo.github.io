import { h, svg, section, card, select, segmented } from '../dom.js';
import { MUSCLES, muscleName } from '../engine/muscles.js';
import { muscleStatuses } from '../engine/recovery.js';
import { weeklySets, weeklyDistance, exerciseHistory } from '../engine/analytics.js';
import { isWorking } from '../engine/sets.js';
import * as fmt from '../format.js';
import { catalogFor, toWorkout, toCardio } from '../model.js';

export function renderProgress(ctx) {
  const { state, ui } = ctx;
  const now = new Date();
  const catalog = catalogFor(state);
  const workouts = state.sessions.map(toWorkout);
  const cardio = state.cardio.map(toCardio);
  const mondayFirst = state.settings.weekStartsMonday;
  const body = {
    muscles: () => muscleView(ctx, workouts, cardio, catalog, now, mondayFirst),
    lifts: () => liftView(ctx, workouts, catalog),
    cardio: () => cardioView(cardio, now, mondayFirst),
  }[ui.progressTab]?.() ?? null;

  return h('main', { class: 'screen' },
    h('header', { class: 'page-head' }, h('h1', {}, 'Progress')),
    h('div', { class: 'section' }, segmented({
      value: ui.progressTab, label: 'Progress view',
      options: [['muscles', 'Muscles'], ['lifts', 'Lifts'], ['cardio', 'Cardio']],
      onChange: (v) => { ui.progressTab = v; ctx.render(); },
    })),
    body);
}

function muscleView(ctx, workouts, cardio, catalog, now, mondayFirst) {
  const settings = ctx.state.settings;
  const statuses = muscleStatuses({ now, workouts, cardio, settings, catalog }).filter((s) => s.weeklyTarget > 0);
  const max = Math.max(1, ...statuses.map((s) => Math.max(s.weeklyTarget, s.setsThisWeek)));
  const muscle = ctx.ui.progressMuscle;
  const weekly = weeklySets(muscle, workouts, catalog, 8, now, mondayFirst);
  return [
    section('Weekly volume vs target', card(h('div', { class: 'row volume' }, statuses.map((s) => h('div', { class: 'vol-row' },
      h('span', { class: 'vol-name' }, muscleName(s.muscle)),
      h('div', { class: 'vol-track' },
        h('i', { class: 'vol-target', style: { width: `${(s.weeklyTarget / max) * 100}%` } }),
        h('i', { class: `vol-fill${s.setsThisWeek >= s.weeklyTarget ? ' met' : ''}`, style: { width: `${(Math.min(s.setsThisWeek, max) / max) * 100}%` } })),
      h('span', { class: 'vol-value' }, `${fmt.sets(s.setsThisWeek)}/${s.weeklyTarget}`))))),
    'Hard sets in the last 7 days. The pale bar is your target; change targets in Settings.'),
    section('Sets per week', card(
      h('label', { class: 'row field' },
        h('span', { class: 'label grow' }, 'Muscle'),
        select({ value: muscle, options: MUSCLES.map((m) => [m, muscleName(m)]), label: 'Muscle', onChange: (v) => { ctx.ui.progressMuscle = v; ctx.render(); } })),
      h('div', { class: 'row' }, barChart(
        weekly.map((w) => ({ label: dayMonth(w.weekStart), value: w.value })),
        { target: settings.targets[muscle] ?? 0, format: fmt.sets },
      )))),
  ];
}

function liftView(ctx, workouts, catalog) {
  const unit = ctx.state.settings.unit;
  const counts = new Map();
  for (const w of workouts) {
    for (const e of w.exercises) if (e.sets.some(isWorking)) counts.set(e.exerciseId, (counts.get(e.exerciseId) ?? 0) + 1);
  }
  const performed = [...counts.keys()]
    .map((id) => catalog.get(id))
    .filter(Boolean)
    .sort((a, b) => counts.get(b.id) - counts.get(a.id) || a.name.localeCompare(b.name));
  if (!performed.length) {
    return section(null, card(h('div', { class: 'row muted' }, 'Log a few workouts to see strength trends here.')));
  }
  const selected = performed.find((e) => e.id === ctx.ui.progressExercise) ?? performed[0];
  const points = exerciseHistory(selected.id, workouts);
  return [
    section(`Estimated 1-rep max (${unit})`, card(
      h('label', { class: 'row field' },
        h('span', { class: 'label grow' }, 'Exercise'),
        select({ value: selected.id, options: performed.map((e) => [e.id, e.name]), label: 'Exercise', onChange: (v) => { ctx.ui.progressExercise = v; ctx.render(); } })),
      h('div', { class: 'row' }, lineChart(points.map((p) => ({ date: p.date, value: fmt.fromKg(p.estimatedOneRepMax, unit) })), unit))),
    'Epley estimate from your best set each session. Bodyweight exercises count added weight only.'),
    section('Recent sessions', card(points.slice(-8).reverse().map((p) => h('div', { class: 'row' },
      h('span', { class: 'grow' }, fmt.shortDate(p.date)),
      h('span', { class: 'mono' }, `${fmt.weight(p.topWeightKg, unit)} × ${p.topReps}`),
      h('span', { class: 'small muted e1rm' }, `1RM ~${fmt.num(fmt.fromKg(p.estimatedOneRepMax, unit), 0)}`))))),
  ];
}

function cardioView(cardio, now, mondayFirst) {
  const weekly = weeklyDistance(cardio, 'run', 12, now, mondayFirst);
  const previousFour = weekly.slice(-5, -1);
  const runs = cardio.filter((c) => c.kind === 'run' && c.date >= weekly[0].weekStart);
  return section('Running distance per week', card(
    h('div', { class: 'row' }, barChart(weekly.map((w) => ({ label: dayMonth(w.weekStart), value: w.value })), { format: (v) => fmt.num(v, 1), tone: 'orange' })),
    statRow('This week', fmt.distance(weekly[weekly.length - 1].value)),
    statRow('Average of the previous 4 weeks', fmt.distance(previousFour.reduce((s, w) => s + w.value, 0) / 4)),
    statRow('Runs in the last 12 weeks', String(runs.length))),
  'Raising weekly distance by more than ~10–30% at a time increases injury risk.');
}

function statRow(label, value) {
  return h('div', { class: 'row field' }, h('span', { class: 'label grow' }, label), h('span', { class: 'value' }, value));
}

function dayMonth(date) {
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

/** Vertical bars, oldest left. points: [{ label, value }]. */
function barChart(points, { target = 0, format = String, tone = 'accent' } = {}) {
  const max = Math.max(target, ...points.map((p) => p.value), 1) * 1.15;
  return h('div', { class: `bars tone-${tone}`, role: 'img', 'aria-label': points.map((p) => `${p.label}: ${format(p.value)}`).join(', ') },
    target > 0 && h('div', { class: 'bars-target', style: { bottom: `calc(var(--label) + ${(target / max).toFixed(4)} * var(--plot))` } }),
    points.map((p) => h('div', { class: 'bar-col' },
      h('div', { class: 'bar-area' },
        h('div', { class: 'bar-fill', style: { height: `${(p.value / max) * 100}%` } },
          p.value > 0 && h('span', { class: 'bar-value' }, format(p.value)))),
      h('div', { class: 'bar-label' }, p.label))));
}

/** Line chart of { date, value } points, oldest first. */
function lineChart(points, unit) {
  if (points.length < 2) {
    return h('p', { class: 'small muted' }, points.length ? 'One session so far. The trend line appears after the next one.' : 'No data yet.');
  }
  const W = 320;
  const H = 160;
  const pad = { l: 36, r: 12, t: 12, b: 24 };
  const xs = points.map((p) => +p.date);
  const ys = points.map((p) => p.value);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const spread = Math.max((y1 - y0) * 0.15, 1);
  const [lo, hi] = [y0 - spread, y1 + spread];
  const X = (x) => pad.l + ((x - x0) / Math.max(x1 - x0, 1)) * (W - pad.l - pad.r);
  const Y = (y) => pad.t + (1 - (y - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const text = (value, attrs) => svg('text', { class: 'axis', ...attrs }, document.createTextNode(value));
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${X(+p.date).toFixed(1)},${Y(p.value).toFixed(1)}`).join('');
  return svg('svg', {
    viewBox: `0 0 ${W} ${H}`, class: 'line-chart', role: 'img',
    'aria-label': `Estimated 1-rep max went from ${fmt.num(ys[0], 0)} to ${fmt.num(ys[ys.length - 1], 0)} ${unit}`,
  },
  [hi, (hi + lo) / 2, lo].map((v) => [
    svg('line', { x1: pad.l, x2: W - pad.r, y1: Y(v), y2: Y(v), class: 'grid' }),
    text(fmt.num(v, 0), { x: pad.l - 6, y: Y(v) + 4, 'text-anchor': 'end' }),
  ]),
  svg('path', { d: path, class: 'line' }),
  points.map((p) => svg('circle', { cx: X(+p.date), cy: Y(p.value), r: 3.5, class: 'dot' })),
  text(fmt.shortDate(points[0].date), { x: pad.l, y: H - 6 }),
  text(fmt.shortDate(points[points.length - 1].date), { x: W - pad.r, y: H - 6, 'text-anchor': 'end' }));
}

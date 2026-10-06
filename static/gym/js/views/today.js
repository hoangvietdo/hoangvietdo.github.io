import { h, icon, svg, section, card, select } from '../dom.js';
import { muscleName } from '../engine/muscles.js';
import { FEELINGS } from '../engine/readiness.js';
import { analyzeWorkout } from '../engine/workout-analysis.js';
import * as fmt from '../format.js';
import {
  catalogFor, computeRecommendation, finishSession, plannedSets, removeById, setFeeling, setSleep,
  startSession, todaysCheckIn, todaysSession, toWorkout, workingSets,
} from '../model.js';
import { adviceBox, exerciseLogger, newExerciseNote, nextHint } from './exercise.js';

const VERDICTS = {
  train: { emoji: '🏋️', tone: 'green' },
  trainLight: { emoji: '🧘', tone: 'orange' },
  optional: { emoji: '👌', tone: 'blue' },
  rest: { emoji: '🛌', tone: 'indigo' },
  done: { emoji: '✅', tone: 'green' },
};

const LEVELS = { high: ['Good to go', 'green'], moderate: ['Moderate', 'orange'], low: ['Low', 'red'] };

const SIGNAL_ICONS = { feeling: '🙂', sleep: '🛏️', hrv: '💓', restingHeartRate: '❤️', trainingStreak: '📅', cardioLoad: '🏃' };

const SLEEP_OPTIONS = [['', 'Not set'], ['4.5', 'Under 5 h'], ['5.5', '5–6 h'], ['6.5', '6–7 h'], ['7.5', '7–8 h'], ['8.5', '8 h or more']];

const INSTALL_HINT_KEY = 'gymtrack-install-hint-dismissed';

export function renderToday(ctx) {
  const { state } = ctx;
  const now = new Date();
  const rec = computeRecommendation(state, now);
  const session = todaysSession(state, now);
  const live = session && !session.endDate;

  return h('main', { class: 'screen' },
    h('header', { class: 'page-head' }, h('h1', {}, 'Today'), h('p', { class: 'subtitle' }, fmt.longDate(now))),
    installHint(ctx),
    live ? liveWorkout(ctx, session) : [
      verdictCard(rec),
      session ? summary(ctx, session) : rec.plan && planSection(ctx, rec.plan),
    ],
    checkInSection(ctx, todaysCheckIn(state, now)),
    readinessSection(rec.readiness),
    muscleSection(rec.muscles),
    section(null, card(
      !session && rowButton('Start an empty workout', () => ctx.update((s) => startSession(s, null))),
      rowButton('Log a run or other cardio', () => ctx.go('#/cardio/new')),
    ), 'Suggestions are training rules of thumb, not medical advice.'),
  );
}

export function isInstalled() {
  return window.navigator.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches;
}

function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function installHint(ctx) {
  if (isInstalled() || !isIOS() || localStorage.getItem(INSTALL_HINT_KEY)) return null;
  return h('section', { class: 'card install' },
    h('div', { class: 'grow' },
      h('div', { class: 'row-title' }, 'Install GymTrack on your iPhone'),
      h('p', { class: 'small muted' }, 'Tap ', icon('share', 15), ' Share, then “Add to Home Screen”. Do it before logging: the Home Screen app and Safari keep separate data.')),
    h('button', {
      class: 'icon-btn', 'aria-label': 'Dismiss',
      onClick: () => { localStorage.setItem(INSTALL_HINT_KEY, '1'); ctx.render(); },
    }, icon('x', 18)));
}

// Before the workout: the verdict and today's exercises

function verdictCard(rec) {
  const v = VERDICTS[rec.verdict];
  return h('section', { class: `card verdict tone-${v.tone}` },
    h('div', { class: 'verdict-top' },
      h('div', { class: 'verdict-emoji', 'aria-hidden': 'true' }, v.emoji),
      h('div', {},
        h('h2', { class: 'verdict-title' }, rec.headline),
        h('p', { class: 'muted' }, rec.detail))),
    h('div', { class: 'skip' },
      h('div', { class: 'eyebrow' }, rec.verdict === 'done' ? 'This week' : 'Can I skip today?'),
      h('div', {}, rec.skipAnswer)),
    h('ul', { class: 'reasons' }, rec.reasons.map((r) => h('li', { class: `impact-${r.impact}` }, r.text))));
}

function planSection(ctx, plan) {
  const fallbackUnit = ctx.state.settings.unit;
  return section(`Today’s exercises · ${plan.name} · ~${plan.estimatedMinutes} min`,
    card(
      plan.exercises.map((item) => h('div', { class: 'plan-item' },
        h('div', { class: 'plan-line' },
          h('span', { class: 'row-title grow' }, item.exercise.name),
          h('span', { class: 'pill' }, planTarget(item, item.exercise.defaultUnit ?? fallbackUnit))),
        item.hint ? adviceBox(item.hint, item.exercise, item.exercise.defaultUnit ?? fallbackUnit) : newExerciseNote(item.exercise))),
      h('div', { class: 'row' }, h('button', {
        class: 'btn primary block',
        onClick: () => ctx.update((s) => startSession(s, plan)),
      }, icon('play', 16), 'Start workout'))),
    plan.isLight
      ? 'Light day: fewer sets, and stop about 3 reps before failure.'
      : 'Starting fills in every set with these targets. Adjust them as you go and tick each set off.');
}

function planTarget(item, unit) {
  const suffix = item.exercise.isTimed ? ' s' : '';
  if (!item.hint) return `${item.sets} × ${item.exercise.repLow}–${item.exercise.repHigh}${suffix}`;
  const load = item.hint.weightKg > 0 ? ` @ ${fmt.weight(item.hint.weightKg, unit)}` : '';
  return `${item.sets} × ${item.hint.targetReps}${suffix}${load}`;
}

// During the workout: log every set right here

function liveWorkout(ctx, session) {
  const catalog = catalogFor(ctx.state);
  const history = ctx.state.sessions.filter((s) => s.id !== session.id).map(toWorkout);
  const done = workingSets(session);
  const planned = plannedSets(session);
  const elapsed = h('span', { class: 'mono live-clock' }, fmt.clock(Date.now() - Date.parse(session.date)));
  ctx.tick(() => { elapsed.textContent = fmt.clock(Date.now() - Date.parse(session.date)); });

  return [
    h('section', { class: 'card live' },
      h('div', { class: 'live-top' },
        h('div', { class: 'grow' },
          h('div', { class: 'eyebrow' }, 'Workout in progress'),
          h('h2', { class: 'live-title' }, session.title || 'Workout')),
        elapsed),
      planned > 0 && h('div', { class: 'meter state-ready' }, h('i', { style: { width: `${Math.round((done / planned) * 100)}%` } })),
      h('div', { class: 'small muted' }, planned > 0 ? `${done} of ${planned} sets done` : 'Add an exercise to get started.'),
      h('div', { class: 'live-actions' },
        h('button', { class: 'btn primary', onClick: () => finish(ctx, session) }, 'Finish workout'),
        h('button', { class: 'btn tinted', onClick: () => ctx.go(`#/workout/${session.id}`) }, 'Notes & details'))),
    h('p', { class: 'section-footer tip' }, 'Change the weight or reps if they differ. Tap Last rep → Failure to save a set whose final rep failed (0 reps left). Tap ✓ Done when you completed it without failure. Tap a set number to mark a warm-up or delete it.'),
    session.entries.map((entry) => exerciseLogger(ctx, session, entry, {
      exercise: catalog.get(entry.exerciseId),
      history,
      onRemove: () => {
        if (entry.sets.some((s) => s.done !== false) && !confirm(`Remove ${entry.name} and its logged sets?`)) return;
        ctx.update(() => removeById(session.entries, entry.id));
      },
    })),
    h('div', { class: 'section' }, h('button', {
      class: 'btn tinted block',
      onClick: () => { ctx.ui.picker = { sessionId: session.id, query: '', draft: null }; ctx.render(); },
    }, icon('plus', 18), 'Add exercise')),
  ];
}

function finish(ctx, session) {
  if (workingSets(session) === 0 && !confirm('No sets are ticked off yet. Discard this workout?')) return;
  ctx.update((state) => finishSession(state, session));
  window.scrollTo(0, 0);
}

// After the workout: what you did and the call for next time

function summary(ctx, session) {
  const catalog = catalogFor(ctx.state);
  const fallbackUnit = ctx.state.settings.unit;
  const date = new Date(session.date);
  const workout = toWorkout(session);
  const analysis = analyzeWorkout(workout, catalog);
  const calls = [];
  const recap = section(`Today’s workout · ${session.title || 'Workout'}`,
    card(
      session.entries.map((entry) => {
        const exercise = catalog.get(entry.exerciseId);
        const unit = entry.unit ?? exercise?.defaultUnit ?? fallbackUnit;
        const done = entry.sets.filter((s) => s.done !== false && !s.warmup && s.reps > 0);
        const next = nextHint(ctx, exercise, entry, date, unit);
        if (next) calls.push(next.kind);
        return h('div', { class: 'plan-item' },
          h('div', { class: 'plan-line' },
            h('span', { class: 'row-title grow' }, entry.name),
            h('span', { class: 'small muted' }, `${done.length} sets`)),
          h('div', { class: 'small muted done-sets' }, fmt.setList(done, unit, exercise?.isTimed) + (done.some((s) => s.rir === 0) ? ' · last rep failure' : '')),
          next && adviceBox(next, exercise, unit, { prefix: 'Next time: ', showLast: false }));
      }),
      h('button', { class: 'row row-button accent', onClick: () => ctx.go(`#/workout/${session.id}`) },
        h('span', { class: 'grow' }, 'Edit this workout'), icon('chevron', 18))),
    'These calls are also shown on the exercise the next time it comes up.');
  return [recap, workoutAnalysis(analysis, calls, fallbackUnit)];
}

function workoutAnalysis(analysis, calls, unit) {
  const focus = analysis.focus.slice(0, 3)
    .map((item) => `${muscleName(item.muscle)} ${fmt.sets(item.sets)}`)
    .join(' · ');
  const increases = calls.filter((kind) => kind === 'increaseLoad').length;
  const decreases = calls.filter((kind) => kind === 'decreaseLoad').length;
  const failureRate = analysis.workingSets ? analysis.failureSets / analysis.workingSets : 0;
  const effort = analysis.failureSets === 0
    ? 'No sets were marked to failure.'
    : failureRate > 0.25
      ? `${analysis.failureSets} of ${analysis.workingSets} sets reached failure. That is a high-effort session, so allow extra recovery.`
      : `${analysis.failureSets} ${analysis.failureSets === 1 ? 'set' : 'sets'} reached failure; most work stayed short of failure.`;
  const progression = increases
    ? `${increases} ${increases === 1 ? 'exercise is' : 'exercises are'} ready for more weight next time.`
    : decreases
      ? `${decreases} ${decreases === 1 ? 'exercise needs' : 'exercises need'} a lighter load next time.`
      : 'Keep the load and build reps on the next session.';

  return section('Workout analysis', card(
    h('div', { class: 'analysis-stats' },
      analysisStat('Working sets', analysis.workingSets),
      analysisStat('Exercises', analysis.exercises),
      analysis.durationMinutes != null && analysisStat('Duration', `${analysis.durationMinutes} min`),
      analysis.volumeKg > 0 && analysisStat('Recorded volume', `${fmt.num(fmt.fromKg(analysis.volumeKg, unit), 0)} ${unit}`)),
    focus && h('div', { class: 'analysis-focus' }, h('div', { class: 'eyebrow' }, 'Muscle focus'), h('div', {}, focus)),
    h('ul', { class: 'analysis-notes' }, h('li', {}, effort), h('li', {}, progression))),
  'Volume is weight × reps for loaded exercises. Muscle sets include half credit for supporting muscles.');
}

function analysisStat(label, value) {
  return h('div', { class: 'analysis-stat' }, h('strong', {}, value), h('span', { class: 'small muted' }, label));
}

// Check-in, readiness and muscles

function checkInSection(ctx, checkIn) {
  return section('How do you feel?', card(
    h('div', { class: 'row feelings' }, Object.entries(FEELINGS).map(([key, feeling]) => {
      const on = checkIn?.feeling === key;
      return h('button', { class: `feeling${on ? ' on' : ''}`, 'aria-pressed': String(on), onClick: () => ctx.update((s) => setFeeling(s, key)) },
        h('span', { class: 'feeling-emoji', 'aria-hidden': 'true' }, feeling.emoji),
        h('span', {}, feeling.name));
    })),
    h('label', { class: 'row field' },
      h('span', { class: 'label grow' }, 'Sleep last night'),
      select({
        value: checkIn?.sleepHours ?? '', options: SLEEP_OPTIONS, label: 'Sleep last night',
        onChange: (v) => ctx.update((s) => setSleep(s, v === '' ? null : Number(v))),
      }))));
}

function readinessSection(readiness) {
  const [title, tone] = LEVELS[readiness.level];
  return section('Readiness', card(
    h('div', { class: 'row readiness-head' },
      ring(readiness.score, tone),
      h('div', {},
        h('div', { class: 'row-title' }, title),
        h('div', { class: 'small muted' }, 'From your check-in, sleep and recent training.'))),
    readiness.signals.map((s) => h('div', { class: 'row signal' },
      h('span', { class: 'signal-icon', 'aria-hidden': 'true' }, SIGNAL_ICONS[s.kind] ?? '•'),
      h('div', { class: 'grow' }, h('div', {}, s.title), h('div', { class: 'small muted' }, s.detail)),
      h('span', { class: `signal-value impact-${s.impact}` }, s.value)))),
  'Websites can’t read Apple Watch data, so HRV and resting heart rate aren’t part of the score.');
}

function ring(score, tone) {
  const r = 22;
  const circumference = 2 * Math.PI * r;
  return h('div', { class: `ring tone-${tone}`, role: 'img', 'aria-label': `Readiness ${score} out of 100` },
    svg('svg', { viewBox: '0 0 56 56', width: 56, height: 56 },
      svg('circle', { cx: 28, cy: 28, r, class: 'ring-track' }),
      svg('circle', { cx: 28, cy: 28, r, class: 'ring-fill', 'stroke-dasharray': `${(circumference * score) / 100} ${circumference}`, transform: 'rotate(-90 28 28)' })),
    h('span', { class: 'ring-label' }, String(score)));
}

function muscleSection(muscles) {
  return section('Muscles',
    card(muscles.filter((m) => m.weeklyTarget > 0 || m.recovery < 0.99).map(muscleRow)),
    'Sets from the last 7 days. Indirect work counts as half a set.');
}

function muscleRow(m) {
  const percent = Math.round(m.recovery * 100);
  const status = m.state === 'ready' ? 'Ready' : `${percent}% · ready in ~${Math.max(1, Math.ceil(m.hoursUntilReady))} h`;
  const volume = m.weeklyTarget > 0 ? `${fmt.sets(m.setsThisWeek)} of ${m.weeklyTarget} sets this week` : `${fmt.sets(m.setsThisWeek)} sets this week`;
  return h('div', { class: 'row muscle' },
    h('div', { class: 'muscle-line' },
      h('span', { class: 'row-title' }, muscleName(m.muscle)),
      h('span', { class: `small state-${m.state}` }, status)),
    h('div', { class: `meter state-${m.state}` }, h('i', { style: { width: `${percent}%` } })),
    h('div', { class: 'muscle-line tiny muted' },
      h('span', {}, volume),
      m.lastTrained && h('span', {}, `Last: ${fmt.relativeDay(m.lastTrained)}`)));
}

function rowButton(label, onClick) {
  return h('button', { class: 'row row-button', onClick }, h('span', { class: 'grow' }, label), icon('chevron', 18));
}

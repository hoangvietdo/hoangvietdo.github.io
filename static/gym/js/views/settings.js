import { h, icon, section, card, navBar, numberInput, select, stepper, toggle, segmented } from '../dom.js';
import { MUSCLES, muscleName, defaultTargets } from '../engine/muscles.js';
import { SPLITS } from '../engine/settings.js';
import { dayKey } from '../engine/calendar.js';
import { backupJSON, finishBackupJSON, safetyBackupJSON, mergeBackup, sampleData, emptyState } from '../store.js';
import { isInstalled } from './today.js';
import * as fmt from '../format.js';

export const VERSION = '1.6';

export function renderSettings(ctx) {
  const s = ctx.state.settings;
  const change = (apply) => ctx.update((state) => apply(state.settings));
  const mutate = (apply) => ctx.mutate((state) => apply(state.settings));
  return h('main', { class: 'screen' },
    h('header', { class: 'page-head' }, h('h1', {}, 'Settings')),
    section('Training', card(
      h('div', { class: 'row field' },
        h('span', { class: 'label grow' }, 'Gym sessions per week'),
        stepper({ value: s.weeklyGoal, min: 1, max: 7, label: 'sessions per week', onChange: (v) => change((x) => { x.weeklyGoal = v; }) })),
      h('label', { class: 'row field' },
        h('span', { class: 'label grow' }, 'Training split'),
        select({ value: s.split, options: Object.entries(SPLITS), label: 'Training split', onChange: (v) => change((x) => { x.split = v; }) })),
      profileNumber('Barbell weight', fmt.inputWeight(s.barbellWeightKg, s.unit), s.unit, true,
        (value) => mutate((x) => { x.barbellWeightKg = value > 0 ? fmt.toKg(value, s.unit) : 20; })),
      profileNumber('Smith starting weight', s.smithBarWeightKg > 0 ? fmt.inputWeight(s.smithBarWeightKg, s.unit) : '0', s.unit, true,
        (value) => mutate((x) => { x.smithBarWeightKg = value > 0 ? fmt.toKg(value, s.unit) : 0; })),
      linkRow('Weekly set targets', () => ctx.go('#/settings/targets')),
      h('label', { class: 'row field' },
        h('span', { class: 'label grow' }, 'Week starts on Monday'),
        toggle({ checked: s.weekStartsMonday, label: 'Week starts on Monday', onChange: (v) => change((x) => { x.weekStartsMonday = v; }) }))),
    'For barbell and Smith exercises, enter the total plates on both sides without the bar. Their separate configured starting weights are added only to workout volume. Smith machines vary, so its default is 0.'),
    section('You', card(
      h('div', { class: 'row field' },
        h('span', { class: 'label grow' }, 'Age'),
        stepper({ value: s.age, min: 14, max: 90, label: 'age', onChange: (v) => change((x) => { x.age = v; }) })),
      h('div', { class: 'row field' },
        h('span', { class: 'label grow' }, 'Weight unit'),
        segmented({ value: s.unit, options: [['kg', 'kg'], ['lb', 'lb']], label: 'Weight unit', onChange: (v) => change((x) => { x.unit = v; }) })),
      profileNumber('Current weight', s.bodyWeightKg == null ? '' : fmt.inputWeight(s.bodyWeightKg, s.unit), s.unit, true,
        (value) => mutate((x) => { x.bodyWeightKg = value > 0 ? fmt.toKg(value, s.unit) : null; })),
      profileNumber('Height', heightFromCm(s.heightCm, s.unit), s.unit === 'lb' ? 'in' : 'cm', true,
        (value) => mutate((x) => { x.heightCm = value > 0 ? heightToCm(value, s.unit) : null; }))),
    'Age estimates your max heart rate for cardio. Weight and height add body-relative context to the finished-workout analysis; BMI is shown only as a rough screening number.'),
    section('Your data', card(
      actionRow('Export backup', () => exportBackup(ctx)),
      actionRow('Export last-finish backup', () => exportFinishBackup()),
      actionRow('Restore from last-finish backup', () => restoreFinishBackup(ctx)),
      actionRow('Export pre-update safety copy', () => exportSafetyBackup()),
      actionRow('Restore missing data from safety copy', () => restoreSafetyBackup(ctx)),
      importRow(ctx),
      actionRow('Load sample data', () => loadSampleData(ctx)),
      actionRow('Erase all data', () => eraseAll(ctx), 'danger')),
    'Everything is stored only in this browser on this device; nothing is uploaded. Clearing Safari’s website data deletes it, so export a backup now and then.'),
    !isInstalled() && section('Install on iPhone', card(h('div', { class: 'row small' },
      h('ol', { class: 'steps' },
        h('li', {}, 'Open this page in Safari.'),
        h('li', {}, 'Tap ', icon('share', 15), ' Share, then “Add to Home Screen”.'),
        h('li', {}, 'Open GymTrack from the Home Screen. It works offline and keeps its own data.'))))),
    section(null, card(linkRow('How suggestions work', () => ctx.go('#/settings/about')))),
    h('p', { class: 'version' }, `GymTrack ${VERSION} · data stays on this device`));
}

function profileNumber(label, value, unit, decimal, onInput) {
  return h('label', { class: 'row field' },
    h('span', { class: 'label grow' }, label),
    numberInput({ value, decimal, label: `${label} in ${unit}`, className: 'profile-num', onInput }),
    h('span', { class: 'small muted profile-unit' }, unit));
}

function heightFromCm(cm, unit) {
  if (cm == null) return '';
  const value = unit === 'lb' ? cm / 2.54 : cm;
  return Math.round(value * 10) / 10;
}

function heightToCm(value, unit) {
  return unit === 'lb' ? value * 2.54 : value;
}

function linkRow(label, onClick) {
  return h('button', { class: 'row row-button', onClick }, h('span', { class: 'grow' }, label), icon('chevron', 18));
}

function actionRow(label, onClick, tone = 'accent') {
  return h('button', { class: `row row-button ${tone}`, onClick }, h('span', { class: 'grow' }, label));
}

function importRow(ctx) {
  const input = h('input', {
    type: 'file', accept: 'application/json,.json', class: 'visually-hidden',
    onChange: async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        let added = 0;
        ctx.update((state) => { added = mergeBackup(state, data); });
        alert(added ? `Imported ${added} items.` : 'Nothing new to import. Everything in that backup is already here.');
      } catch {
        alert('That file isn’t a GymTrack backup.');
      }
    },
  });
  return h('label', { class: 'row row-button accent' }, h('span', { class: 'grow' }, 'Import backup'), input);
}

async function exportBackup(ctx) {
  await ctx.flush();
  const name = `gymtrack-backup-${dayKey(new Date())}.json`;
  await shareOrDownload(backupJSON(ctx.state), name, 'GymTrack backup');
}

async function exportSafetyBackup() {
  const json = await safetyBackupJSON();
  if (!json) {
    alert('No pre-update safety copy is available. Your current data is still included in Export backup.');
    return;
  }
  await shareOrDownload(json, `gymtrack-before-v1.1-${dayKey(new Date())}.json`, 'GymTrack pre-update safety copy');
}

async function exportFinishBackup() {
  const json = await finishBackupJSON();
  if (!json) {
    alert('No finished-workout backup exists yet. GymTrack creates one immediately before the next Finish action.');
    return;
  }
  await shareOrDownload(json, `gymtrack-before-last-finish-${dayKey(new Date())}.json`, 'GymTrack last-finish backup');
}

async function restoreFinishBackup(ctx) {
  const json = await finishBackupJSON();
  if (!json) {
    alert('No finished-workout backup exists yet.');
    return;
  }
  if (!confirm('Restore workouts, exercises or sets missing from the backup saved before the last Finish action? Existing data will not be overwritten.')) return;
  let added = 0;
  ctx.update((state) => { added = mergeBackup(state, JSON.parse(json)); });
  alert(added ? `Restored ${added} missing ${added === 1 ? 'item' : 'items'}.` : 'Nothing is missing from the current data.');
}

async function restoreSafetyBackup(ctx) {
  const json = await safetyBackupJSON();
  if (!json) {
    alert('No pre-update safety copy is available on this device. You can still import the backup file you saved earlier.');
    return;
  }
  if (!confirm('Restore workouts, exercises or sets that are missing from the pre-update safety copy? Existing data will not be overwritten.')) return;
  let added = 0;
  ctx.update((state) => { added = mergeBackup(state, JSON.parse(json)); });
  alert(added ? `Restored ${added} missing ${added === 1 ? 'item' : 'items'}.` : 'Nothing is missing from the current data.');
}

async function shareOrDownload(json, name, title) {
  const file = new File([json], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  const link = h('a', { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function loadSampleData(ctx) {
  if (!confirm('Add three weeks of example workouts and runs? You can erase them later.')) return;
  ctx.update((state) => {
    const sample = sampleData();
    state.sessions.push(...sample.sessions);
    state.cardio.push(...sample.cardio);
  });
}

function eraseAll(ctx) {
  if (!confirm('Erase all workouts, runs, check-ins and custom exercises on this device? This can’t be undone.')) return;
  ctx.update((state) => {
    const fresh = emptyState();
    state.sessions = fresh.sessions;
    state.cardio = fresh.cardio;
    state.customExercises = fresh.customExercises;
    state.checkIns = fresh.checkIns;
  });
}

export function renderTargets(ctx) {
  const targets = ctx.state.settings.targets;
  return h('main', { class: 'screen detail' },
    navBar({ left: { label: 'Settings', icon: 'back', onClick: () => ctx.go('#/settings') }, title: 'Weekly set targets' }),
    section(null, card(MUSCLES.map((m) => h('div', { class: 'row field' },
      h('span', { class: 'label grow' }, muscleName(m)),
      stepper({
        value: targets[m] ?? 0, min: 0, max: 30, label: `${muscleName(m)} sets`,
        format: (v) => (v === 0 ? 'Track only' : `${v} sets`),
        onChange: (v) => ctx.update((state) => { state.settings.targets[m] = v; }),
      })))),
    'Muscle growth research points to roughly 10–20 hard sets per muscle per week, spread over two or more sessions. Indirect work counts as half a set. Set a muscle to 0 to track it without prioritising it.'),
    h('div', { class: 'section' }, h('button', {
      class: 'btn tinted block',
      onClick: () => ctx.update((state) => { state.settings.targets = defaultTargets(); }),
    }, 'Reset to defaults')));
}

export function renderAbout(ctx) {
  const block = (title, ...paragraphs) => section(title, card(paragraphs.map((p) => h('p', { class: 'row prose' }, p))));
  return h('main', { class: 'screen detail' },
    navBar({ left: { label: 'Settings', icon: 'back', onClick: () => ctx.go('#/settings') }, title: 'How suggestions work' }),
    block('Muscle recovery',
      'Every hard set adds fatigue to the muscles it trains: a full set for the main muscles and half a set for helpers, so a bench press set counts 1 for chest and 0.5 for triceps and shoulders. Fatigue fades over time. Small muscles such as biceps and calves recover in about 1½–2 days; quads, hamstrings and glutes take about 3. A muscle counts as ready again at 90%.',
      'Warm-ups don’t count, and sets with 4 or more reps in reserve count less. Runs and rides add fatigue to your legs based on duration and heart rate or effort, but they don’t count toward muscle-building volume.'),
    block('Weekly volume',
      'Muscle growth follows weekly hard sets: roughly 10–20 per muscle, split over at least two sessions. Today’s plan favours muscles that are recovered, furthest behind their target, and haven’t been trained for a while. It then fills about 22 sets (15 on light days), preferring exercises you already do.'),
    block('Readiness',
      'Starts at 75 and moves with your morning check-in, your sleep, how many days in a row you’ve trained, and sudden jumps in running load. Below 45 means rest; 45–64 means train light. Websites can’t read Apple Watch data, so HRV and resting heart rate aren’t used.'),
    block('Can I skip today?',
      'Compares your weekly session goal with the days left this week. If skipping still leaves room to hit the goal, it says so, even when training today would be better because your muscles are ready.'),
    block('Progression',
      'Double progression: when every set at your top weight reaches the top of the rep range, go up by the smallest step (2.5 kg on barbells and Smith machines, 2 kg on dumbbells, 5 lb if you use pounds). Otherwise add a rep. Estimated 1-rep max uses the Epley formula.'),
    h('p', { class: 'version' }, 'These are evidence-based rules of thumb, not medical advice. Pain, illness or unusual fatigue matter more than any number here.'));
}

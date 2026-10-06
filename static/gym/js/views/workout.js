import { h, icon, section, card, navBar, select, toggle } from '../dom.js';
import { MUSCLES, muscleName } from '../engine/muscles.js';
import { EQUIPMENT, CUSTOM_PREFIX, defaultRepRange, exerciseMuscles } from '../engine/exercises.js';
import * as fmt from '../format.js';
import { catalogFor, toWorkout, addEntry, finishSession, removeById } from '../model.js';
import { saveFinishBackup, uid } from '../store.js';
import { exerciseLogger, previousHint } from './exercise.js';

/** Full editor for a workout: name, start time, notes and every set. Opened from History
 * (past workouts) or from Today (notes & details of the live one). Edits save immediately. */
export function renderWorkout(ctx, id) {
  const { state } = ctx;
  const session = state.sessions.find((s) => s.id === id);
  if (!session) return missing(ctx, 'This workout no longer exists.');
  const catalog = catalogFor(state);
  const history = state.sessions.filter((s) => s.id !== id).map(toWorkout);
  const live = !session.endDate;

  const elapsed = h('span', { class: 'mono' }, fmt.clock(Date.now() - Date.parse(session.date)));
  if (live) ctx.tick(() => { elapsed.textContent = fmt.clock(Date.now() - Date.parse(session.date)); });

  return h('main', { class: 'screen detail' },
    navBar({
      left: { label: live ? 'Back' : 'Close', icon: live ? 'back' : null, onClick: () => close(ctx, session) },
      title: session.title || 'Workout',
      right: { label: live ? 'Finish' : 'Done', bold: true, onClick: () => finish(ctx, session) },
    }),
    section(null, card(
      h('label', { class: 'row field' },
        h('span', { class: 'label' }, 'Name'),
        h('input', { type: 'text', class: 'text', value: session.title, placeholder: 'Workout name', onInput: (e) => ctx.mutate(() => { session.title = e.target.value; }) })),
      h('label', { class: 'row field' },
        h('span', { class: 'label' }, 'Started'),
        h('input', {
          type: 'datetime-local', class: 'text', value: fmt.toLocalInput(session.date),
          onChange: (e) => {
            const iso = fmt.fromLocalInput(e.target.value);
            if (iso) ctx.update(() => { session.date = iso; });
          },
        })),
      live && h('div', { class: 'row field' }, h('span', { class: 'label' }, 'Elapsed'), elapsed))),
    session.entries.map((entry) => exerciseLogger(ctx, session, entry, {
      exercise: catalog.get(entry.exerciseId),
      history,
      onRemove: () => removeEntry(ctx, session, entry),
    })),
    h('div', { class: 'section' },
      h('button', {
        class: 'btn tinted block',
        onClick: () => { ctx.ui.picker = { sessionId: session.id, query: '', draft: null }; ctx.render(); },
      }, icon('plus', 18), 'Add exercise')),
    section('Notes', card(h('div', { class: 'row' },
      h('textarea', { rows: 3, class: 'text', placeholder: 'How did it go?', value: session.note, onInput: (e) => ctx.mutate(() => { session.note = e.target.value; }) })))),
    h('div', { class: 'section' }, h('button', { class: 'btn danger block', onClick: () => discard(ctx, session) }, live ? 'Discard workout' : 'Delete workout')));
}

/** Goes back without finishing. A workout with nothing in it is dropped. */
function close(ctx, session) {
  if (!session.entries.length) ctx.mutate((s) => removeById(s.sessions, session.id));
  ctx.back();
}

async function finish(ctx, session) {
  if (!session.entries.some((e) => e.sets.some((s) => s.done !== false && !s.warmup && s.reps > 0))) {
    if (session.entries.length && !confirm('No sets are ticked off yet. Delete this workout?')) return;
  }
  const saved = await saveFinishBackup(ctx.state, session);
  ctx.ui.lastFinishBackup = saved ? session.id : null;
  ctx.mutate((s) => finishSession(s, session));
  ctx.back();
}

function discard(ctx, session) {
  if (!confirm('Delete this workout? All exercises and sets in it will be removed.')) return;
  ctx.mutate((s) => removeById(s.sessions, session.id));
  ctx.back();
}

function removeEntry(ctx, session, entry) {
  if (entry.sets.length && !confirm(`Remove ${entry.name} and its ${entry.sets.length} sets?`)) return;
  ctx.update(() => removeById(session.entries, entry.id));
}

export function missing(ctx, message) {
  return h('main', { class: 'screen detail' },
    navBar({ left: { label: 'Back', icon: 'back', onClick: () => ctx.back() }, title: '' }),
    h('div', { class: 'empty-state' }, h('p', { class: 'muted' }, message)));
}

// Exercise picker (full-screen sheet over Today or the workout editor)

export function renderPicker(ctx) {
  const picker = ctx.ui.picker;
  const session = ctx.state.sessions.find((s) => s.id === picker.sessionId);
  if (!session) {
    ctx.ui.picker = null;
    return null;
  }
  const close = () => { ctx.ui.picker = null; ctx.render(); };
  const choose = (exercise) => {
    ctx.ui.picker = null;
    ctx.update((state) => {
      const entry = addEntry(session, exercise);
      // During a live workout, lay out three sets from the progression target to tick off.
      if (!session.endDate) {
        const history = state.sessions.filter((s) => s.id !== session.id).map(toWorkout);
        const unit = entry.unit ?? exercise.defaultUnit ?? state.settings.unit;
        const hint = previousHint(ctx, exercise, history, new Date(session.date), unit);
        for (let i = 0; i < 3; i += 1) {
          entry.sets.push({ id: uid(), reps: hint?.targetReps ?? exercise.repLow, weightKg: hint?.weightKg ?? 0, rir: null, warmup: false, done: false });
        }
      }
    });
  };
  return h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': picker.draft ? 'New exercise' : 'Add exercise' },
    h('div', { class: 'sheet-panel' }, picker.draft ? customForm(ctx, picker, choose) : pickerList(ctx, picker, close, choose)));
}

function pickerList(ctx, picker, close, choose) {
  const catalog = catalogFor(ctx.state);
  const recent = recentExercises(ctx.state, catalog);
  const results = h('div', { class: 'picker-results' });
  const fill = () => results.replaceChildren(...pickerSections(catalog, recent, picker.query, choose));
  fill();
  return [
    navBar({
      left: { label: 'Cancel', onClick: close },
      title: 'Add exercise',
      right: { label: 'New', onClick: () => { picker.draft = { name: picker.query.trim(), equipment: 'machine', primary: [], secondary: [], isTimed: false }; ctx.render(); } },
    }),
    h('div', { class: 'search-wrap' },
      h('input', {
        type: 'search', class: 'search', placeholder: 'Exercise, muscle or equipment', value: picker.query, 'aria-label': 'Search exercises',
        onInput: (e) => { picker.query = e.target.value; fill(); },
      })),
    results,
  ];
}

function pickerSections(catalog, recent, query, choose) {
  const q = query.trim().toLowerCase();
  const matches = (e) => !q
    || e.name.toLowerCase().includes(q)
    || exerciseMuscles(e).some((m) => muscleName(m).toLowerCase().includes(q))
    || (EQUIPMENT[e.equipment]?.name ?? '').toLowerCase().includes(q);
  const sections = [];
  if (!q && recent.length) sections.push(section('Recent', card(recent.map((e) => exerciseRow(e, choose)))));
  for (const muscle of MUSCLES) {
    const items = catalog.list.filter((e) => e.primary[0] === muscle && matches(e));
    if (items.length) sections.push(section(muscleName(muscle), card(items.map((e) => exerciseRow(e, choose)))));
  }
  if (!sections.length) sections.push(h('p', { class: 'empty' }, 'No exercises match. Tap New to create it.'));
  return sections;
}

function exerciseRow(exercise, choose) {
  const main = exercise.primary.map(muscleName).join(', ');
  const helpers = exercise.secondary.map((m) => muscleName(m).toLowerCase()).join(', ');
  return h('button', { class: 'row row-button', onClick: () => choose(exercise) },
    h('div', { class: 'grow' },
      h('div', { class: 'row-title' }, exercise.name),
      h('div', { class: 'small muted' }, `${EQUIPMENT[exercise.equipment]?.name ?? 'Other'} · ${helpers ? `${main}, also ${helpers}` : main}`)));
}

function recentExercises(state, catalog) {
  const seen = new Set();
  const result = [];
  const latest = [...state.sessions].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 15);
  for (const session of latest) {
    for (const entry of session.entries) {
      if (seen.has(entry.exerciseId)) continue;
      seen.add(entry.exerciseId);
      const exercise = catalog.get(entry.exerciseId);
      if (exercise) result.push(exercise);
    }
  }
  return result.slice(0, 8);
}

function customForm(ctx, picker, choose) {
  const draft = picker.draft;
  const chips = (key, exclude = []) => h('div', { class: 'chips' },
    MUSCLES.filter((m) => !exclude.includes(m)).map((m) => {
      const on = draft[key].includes(m);
      return h('button', {
        class: `chip${on ? ' on' : ''}`, 'aria-pressed': String(on),
        onClick: () => {
          const chosen = new Set(draft[key]);
          if (on) chosen.delete(m); else chosen.add(m);
          draft[key] = MUSCLES.filter((x) => chosen.has(x));
          if (key === 'primary') draft.secondary = draft.secondary.filter((x) => !chosen.has(x));
          ctx.render();
        },
      }, muscleName(m));
    }));
  const save = () => {
    const name = draft.name.trim();
    if (!name || !draft.primary.length) {
      alert('Give the exercise a name and pick at least one main muscle.');
      return;
    }
    const [repLow, repHigh] = defaultRepRange(draft.primary, draft.secondary, draft.isTimed);
    const exercise = { id: CUSTOM_PREFIX + uid(), name, primary: draft.primary, secondary: draft.secondary, equipment: draft.equipment, repLow, repHigh, isTimed: draft.isTimed };
    ctx.mutate((s) => { s.customExercises.push(exercise); });
    choose(exercise);
  };
  return [
    navBar({
      left: { label: 'Back', icon: 'back', onClick: () => { picker.draft = null; ctx.render(); } },
      title: 'New exercise',
      right: { label: 'Save', bold: true, onClick: save },
    }),
    section(null, card(
      h('label', { class: 'row field' },
        h('span', { class: 'label' }, 'Name'),
        h('input', { type: 'text', class: 'text', value: draft.name, placeholder: 'e.g. Landmine Press', onInput: (e) => { draft.name = e.target.value; } })),
      h('label', { class: 'row field' },
        h('span', { class: 'label grow' }, 'Equipment'),
        select({ value: draft.equipment, options: Object.entries(EQUIPMENT).map(([k, v]) => [k, v.name]), label: 'Equipment', onChange: (v) => { draft.equipment = v; } })),
      h('label', { class: 'row field' },
        h('span', { class: 'label grow' }, 'Timed hold (seconds, not reps)'),
        toggle({ checked: draft.isTimed, label: 'Timed hold', onChange: (v) => { draft.isTimed = v; } })))),
    section('Main muscles', chips('primary'), 'Each set counts as a full set for these muscles.'),
    section('Also works', chips('secondary', draft.primary), 'Counts as half a set, like triceps during a bench press.'),
  ];
}

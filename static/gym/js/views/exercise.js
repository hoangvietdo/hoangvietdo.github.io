// One exercise of a workout: what to lift today, set rows to log weight / reps / failure /
// done, and the call for next time. Used on Today and in the workout editor.

import { h, icon, numberInput, select } from '../dom.js';
import { hintFromSets, progressionHint } from '../engine/progression.js';
import { loadIncrementKg } from '../engine/settings.js';
import { isWorking } from '../engine/sets.js';
import * as fmt from '../format.js';
import { addSet, removeById, toggleDone, toggleFailure } from '../model.js';

/** What to lift, from the sessions before `before`. */
export function previousHint(ctx, exercise, history, before, unit = ctx.state.settings.unit) {
  if (!exercise) return null;
  return progressionHint(exercise, history, { before, incrementKg: loadIncrementKg({ ...ctx.state.settings, unit }, exercise.equipment) });
}

/** The call for next time, from the sets ticked off in this workout. */
export function nextHint(ctx, exercise, entry, date, unit = entry.unit ?? exercise?.defaultUnit ?? ctx.state.settings.unit) {
  const done = entry.sets.filter(isWorking);
  if (!exercise || !done.length) return null;
  return hintFromSets(exercise, done, date, loadIncrementKg({ ...ctx.state.settings, unit }, exercise.equipment));
}

export function adviceBox(hint, exercise, unit, { prefix = '', showLast = true } = {}) {
  const call = fmt.advice(hint, unit, exercise.isTimed);
  return h('div', { class: `advice tone-${call.tone}` },
    h('div', {},
      h('span', { class: 'advice-title' }, `${call.icon} ${prefix}${call.title}`),
      h('span', { class: 'advice-text' }, ` · ${call.text}`)),
    h('div', { class: 'advice-why' }, fmt.adviceReason(hint, exercise)),
    showLast && h('div', { class: 'advice-last' }, fmt.lastTime(hint, unit, exercise.isTimed)),
    isPlateLoaded(exercise) && h('div', { class: 'advice-last' }, `Plate weight only; ${exercise.equipment === 'smith' ? 'Smith starting weight' : 'bar'} excluded.`));
}

export function newExerciseNote(exercise) {
  return h('div', { class: 'advice tone-new' },
    h('div', { class: 'advice-title' }, '✨ First time'),
    h('div', { class: 'advice-why' }, `Start light and find a weight you can lift ${exercise.repLow}–${exercise.repHigh} times with 1–3 reps to spare.`));
}

/** Editable card for one exercise of `session`. */
export function exerciseLogger(ctx, session, entry, { exercise, history, onRemove }) {
  const unit = entry.unit ?? exercise?.defaultUnit ?? ctx.state.settings.unit;
  const timed = exercise?.isTimed ?? false;
  const platesOnly = isPlateLoaded(exercise);
  const date = new Date(session.date);
  const before = previousHint(ctx, exercise, history, date, unit);
  const after = nextHint(ctx, exercise, entry, date, unit);
  const done = entry.sets.filter(isWorking).length;
  const live = !session.endDate;
  let number = 0;
  return h('section', { class: 'card exercise' },
    h('div', { class: 'exercise-head' },
      h('h3', { class: 'grow' }, entry.name),
      platesOnly && h('span', { class: 'pill' }, 'plates only'),
      entry.targetSets > 0 && h('span', { class: `pill${done >= entry.targetSets ? ' done' : ''}` }, `${done}/${entry.targetSets} sets`),
      h('button', { class: 'icon-btn', 'aria-label': `Remove ${entry.name}`, onClick: onRemove }, icon('trash', 18))),
    before ? adviceBox(before, exercise, unit, { prefix: 'Today: ' }) : exercise && newExerciseNote(exercise),
    entry.sets.length > 0 && h('div', { class: 'set-row set-head' },
      h('span', { 'aria-hidden': 'true' }, 'Set'),
      select({
        className: 'set-unit', value: unit, options: [['kg', 'kg'], ['lb', 'lb']], label: `Weight unit for ${entry.name}`,
        onChange: (value) => ctx.update(() => { entry.unit = value; }),
      }),
      h('span', {}), h('span', { 'aria-hidden': 'true' }, timed ? 'Sec' : 'Reps'),
      h('span', { 'aria-hidden': 'true' }, 'Last rep'), h('span', { 'aria-hidden': 'true' }, 'Done')),
    entry.sets.map((set) => setRow(ctx, entry, set, set.warmup ? 'W' : String(++number), unit, platesOnly)),
    h('button', {
      class: 'row row-button accent add-set',
      onClick: () => ctx.update(() => addSet(entry, before, exercise, { done: !live })),
    }, icon('plus', 18), h('span', { class: 'grow' }, 'Add set')),
    after && adviceBox(after, exercise, unit, { prefix: 'Next time: ', showLast: false }));
}

function isPlateLoaded(exercise) {
  return exercise?.equipment === 'barbell' || exercise?.equipment === 'smith';
}

function setRow(ctx, entry, set, label, unit, platesOnly) {
  const done = set.done !== false;
  const failed = set.rir === 0;
  return h('div', { class: `set-row${done ? ' is-done' : ''}` },
    // The set number doubles as a menu: warm-up or delete.
    select({
      className: `set-num${set.warmup ? ' warm' : ''}`,
      value: '',
      label: `Set ${label} options`,
      options: [['', label], ['warmup', set.warmup ? 'Make it a working set' : 'Mark as warm-up'], ['delete', 'Delete set']],
      onChange: (choice) => {
        if (choice === 'warmup') ctx.update(() => { set.warmup = !set.warmup; });
        else if (choice === 'delete') ctx.update(() => removeById(entry.sets, set.id));
      },
    }),
    numberInput({
      value: fmt.inputWeight(set.weightKg, unit), decimal: true,
      label: platesOnly ? `Total plate weight in ${unit}, excluding the bar` : `Weight in ${unit}`,
      onInput: (v) => ctx.mutate(() => { set.weightKg = fmt.toKg(v, unit); }),
    }),
    h('span', { class: 'times muted', 'aria-hidden': 'true' }, '×'),
    numberInput({ value: set.reps, label: 'Reps', onInput: (v) => ctx.mutate(() => { set.reps = Math.round(v); }) }),
    h('button', {
      class: `fail${failed ? ' on' : ''}`, 'aria-pressed': String(failed), 'aria-label': 'Last rep was a failure; save this as a completed set at zero reps in reserve',
      onClick: () => ctx.update(() => toggleFailure(entry, set)),
    }, 'Failure'),
    h('button', {
      class: `check${done && !failed ? ' on' : ''}`, 'aria-pressed': String(done && !failed),
      'aria-label': done && !failed ? 'Completed without failure. Tap to undo' : 'Save as completed without failure',
      onClick: () => ctx.update(() => toggleDone(entry, set)),
    }, icon('check', 18)));
}

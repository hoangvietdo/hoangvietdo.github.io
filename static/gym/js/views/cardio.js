import { h, section, card, navBar, select, numberInput } from '../dom.js';
import { CARDIO } from '../engine/cardio.js';
import * as fmt from '../format.js';
import { removeById } from '../model.js';
import { uid } from '../store.js';
import { missing } from './workout.js';

const EFFORT_LABELS = ['very easy', 'very easy', 'easy', 'easy', 'moderate', 'moderate', 'hard', 'hard', 'very hard', 'all out'];
const EFFORT_OPTIONS = [['', 'Not set'], ...EFFORT_LABELS.map((label, i) => [String(i + 1), `${i + 1} · ${label}`])];

/** Manual run / ride / walk entry. `id` is "new" or an existing cardio id. */
export function renderCardio(ctx, id) {
  const existing = id === 'new' ? null : ctx.state.cardio.find((c) => c.id === id);
  if (id !== 'new' && !existing) return missing(ctx, 'This session no longer exists.');

  let draft = ctx.ui.cardioDraft;
  if (!draft || draft.routeId !== id) {
    draft = existing
      ? { ...existing, routeId: id }
      : { routeId: id, kind: 'run', date: new Date().toISOString(), durationMinutes: 30, distanceKm: null, avgHr: null, effort: null, note: '' };
    ctx.ui.cardioDraft = draft;
  }

  const paceText = h('span', { class: 'value' });
  const updatePace = () => {
    const show = draft.kind !== 'cycle' && draft.durationMinutes > 0 && draft.distanceKm > 0;
    paceText.textContent = show ? fmt.pace(draft.durationMinutes / draft.distanceKm) : '–';
  };
  updatePace();

  const leave = () => { ctx.ui.cardioDraft = null; ctx.back(); };
  const save = () => {
    if (!(draft.durationMinutes > 0)) {
      alert('Enter how many minutes it took.');
      return;
    }
    const { routeId, ...fields } = draft;
    ctx.mutate((s) => {
      if (existing) Object.assign(existing, fields);
      else s.cardio.push({ ...fields, id: uid() });
    });
    leave();
  };
  const remove = () => {
    if (!confirm('Delete this session?')) return;
    ctx.mutate((s) => removeById(s.cardio, existing.id));
    leave();
  };

  return h('main', { class: 'screen detail' },
    navBar({ left: { label: 'Cancel', onClick: leave }, title: existing ? 'Edit cardio' : 'Log cardio', right: { label: 'Save', bold: true, onClick: save } }),
    section(null, card(
      h('label', { class: 'row field' },
        h('span', { class: 'label grow' }, 'Activity'),
        select({ value: draft.kind, options: Object.entries(CARDIO).map(([k, v]) => [k, v.name]), label: 'Activity', onChange: (v) => { draft.kind = v; updatePace(); } })),
      h('label', { class: 'row field' },
        h('span', { class: 'label' }, 'Start'),
        h('input', {
          type: 'datetime-local', class: 'text', value: fmt.toLocalInput(draft.date),
          onChange: (e) => { const iso = fmt.fromLocalInput(e.target.value); if (iso) draft.date = iso; },
        })),
      h('label', { class: 'row field' },
        h('span', { class: 'label grow' }, 'Duration (min)'),
        numberInput({ value: draft.durationMinutes, decimal: true, label: 'Duration in minutes', className: 'wide', onInput: (v) => { draft.durationMinutes = v; updatePace(); } })),
      h('label', { class: 'row field' },
        h('span', { class: 'label grow' }, 'Distance (km)'),
        numberInput({ value: draft.distanceKm, decimal: true, label: 'Distance in km', className: 'wide', placeholder: 'Optional', onInput: (v) => { draft.distanceKm = v || null; updatePace(); } })),
      h('div', { class: 'row field' }, h('span', { class: 'label grow' }, 'Pace'), paceText))),
    section(null, card(
      h('label', { class: 'row field' },
        h('span', { class: 'label grow' }, 'Avg heart rate'),
        numberInput({ value: draft.avgHr, label: 'Average heart rate', className: 'wide', placeholder: 'Optional', onInput: (v) => { draft.avgHr = v || null; } })),
      h('label', { class: 'row field' },
        h('span', { class: 'label grow' }, 'Effort'),
        select({ value: draft.effort ?? '', options: EFFORT_OPTIONS, label: 'Effort', onChange: (v) => { draft.effort = v === '' ? null : Number(v); } }))),
    'Heart rate (from your watch) or effort tells GymTrack how hard it was, which affects leg recovery and readiness.'),
    section('Notes', card(h('div', { class: 'row' },
      h('textarea', { rows: 2, class: 'text', placeholder: 'Optional', value: draft.note, onInput: (e) => { draft.note = e.target.value; } })))),
    existing && h('div', { class: 'section' }, h('button', { class: 'btn danger block', onClick: remove }, 'Delete')));
}

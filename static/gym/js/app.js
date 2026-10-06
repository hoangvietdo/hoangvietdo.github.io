import { h, icon } from './dom.js';
import { loadState, saveState } from './store.js';
import { closeForgottenWorkouts } from './model.js';
import { renderToday } from './views/today.js';
import { renderWorkout, renderPicker } from './views/workout.js';
import { renderCardio } from './views/cardio.js';
import { renderHistory } from './views/history.js';
import { renderProgress } from './views/progress.js';
import { renderSettings, renderTargets, renderAbout } from './views/settings.js';

const TABS = [['today', 'Today'], ['history', 'History'], ['progress', 'Progress'], ['settings', 'Settings']];

const app = {
  state: null,
  ui: { progressTab: 'muscles', progressMuscle: 'chest', progressExercise: null, picker: null, cardioDraft: null, lastFinishBackup: null },
  ticker: null,
  lastTab: 'today',
  lastScreen: null,
};

let saveTimer = null;

function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveState(app.state), 250);
}

function flush() {
  clearTimeout(saveTimer);
  return saveState(app.state);
}

/** What every screen gets: state access, navigation and mutation helpers. */
const ctx = {
  get state() { return app.state; },
  ui: app.ui,
  go(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  },
  /** Back to the tab the user came from. */
  back() { ctx.go(`#/${app.lastTab}`); },
  /** Change state, save it and redraw. */
  update(change) {
    change(app.state);
    persist();
    render();
  },
  /** Change state and save without redrawing (used while typing). */
  mutate(change) {
    change(app.state);
    persist();
  },
  render: () => render(),
  /** Calls `fn` every second while the current screen is showing. */
  tick(fn) {
    clearInterval(app.ticker);
    app.ticker = setInterval(fn, 1000);
  },
  flush,
};

function currentRoute() {
  const [name = 'today', ...args] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return { name, args };
}

function screenFor(route) {
  switch (route.name) {
    case 'workout': return renderWorkout(ctx, route.args[0]);
    case 'cardio': return renderCardio(ctx, route.args[0] ?? 'new');
    case 'history': return renderHistory(ctx);
    case 'progress': return renderProgress(ctx);
    case 'settings':
      if (route.args[0] === 'targets') return renderTargets(ctx);
      if (route.args[0] === 'about') return renderAbout(ctx);
      return renderSettings(ctx);
    default: return renderToday(ctx);
  }
}

function tabBar(active) {
  return h('nav', { class: 'tab-bar', 'aria-label': 'Main' },
    TABS.map(([name, label]) => h('a', {
      href: `#/${name}`, class: name === active ? 'on' : '', 'aria-current': name === active ? 'page' : null,
    }, icon(name, 24), h('span', {}, label))));
}

function render() {
  const route = currentRoute();
  const screenKey = [route.name, ...route.args].join('/');
  const sameScreen = screenKey === app.lastScreen;
  app.lastScreen = screenKey;
  const isTab = TABS.some(([tab]) => tab === route.name);
  if (isTab) app.lastTab = route.name;
  if (route.name !== 'workout' && route.name !== 'today') app.ui.picker = null;

  clearInterval(app.ticker);
  const scrollY = sameScreen ? window.scrollY : 0;
  const picker = app.ui.picker ? renderPicker(ctx) : null;
  const nodes = [screenFor(route), isTab && tabBar(route.name), picker].filter(Boolean);
  document.getElementById('app').replaceChildren(...nodes);
  document.body.classList.toggle('locked', Boolean(picker));
  window.scrollTo(0, scrollY);
}

async function start() {
  app.state = await loadState();
  if (closeForgottenWorkouts(app.state)) persist();
  navigator.storage?.persist?.().catch(() => {});
  window.addEventListener('hashchange', render);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
    else if (!document.activeElement?.matches('input, textarea, select')) render();
  });
  window.addEventListener('pagehide', flush);
  render();

  // Offline support. Skipped on localhost so edits show up without clearing caches.
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  if ('serviceWorker' in navigator && !local) navigator.serviceWorker.register('./sw.js').catch(() => {});
}

start();

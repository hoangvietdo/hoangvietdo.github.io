// The daily decision: train, train light, optional, rest or done, plus the plan and reasons.

import { muscleName } from './muscles.js';
import { addDays, daysBetween, isSameDay, startOfDay, weekStart } from './calendar.js';
import { muscleStatuses } from './recovery.js';
import { evaluateReadiness } from './readiness.js';
import { plan } from './planner.js';
import { workingSetCount } from './sets.js';

/**
 * now: Date. workouts: [{ date, exercises }]. cardio: [{ date, kind, durationMinutes, … }].
 * health: optional daily watch data. checkIn: today's { date, feeling?, sleepHours? }.
 * verdict: 'train' | 'trainLight' | 'optional' | 'rest' | 'done'.
 */
export function recommend({ now, workouts, cardio = [], health = [], checkIn = null, settings, catalog }) {
  const muscles = muscleStatuses({ now, workouts, cardio, settings, catalog });
  const readiness = evaluateReadiness({ now, health, checkIn, workouts, cardio, settings });
  const week = weekProgress(now, workouts, settings.weeklyGoal, settings.weekStartsMonday);

  const result = (verdict, headline, detail, skipAnswer, sessionPlan) => ({
    verdict,
    headline,
    detail,
    skipAnswer,
    reasons: reasons(verdict, week, readiness, muscles, sessionPlan),
    readiness,
    muscles,
    plan: sessionPlan,
    week,
  });

  if (workouts.some((w) => workingSetCount(w) > 0 && isSameDay(w.date, now))) {
    const skip = week.remaining === 0 ? 'Weekly goal reached.' : `${count(week.remaining, 'session')} left this week.`;
    return result('done', 'Done for today', 'Nice work. Recovery is underway, so check back tomorrow for the next suggestion.', skip, null);
  }

  const skip = skipAnswer(week);
  if (readiness.isSick) {
    return result('rest', 'Rest today', 'You checked in as sick or hurt. Training now slows recovery, so rest, eat and sleep well.', 'Yes. Skipping is the right call.', null);
  }
  if (readiness.score < 45) {
    return result('rest', 'Recovery day', "Your recovery signals are low. A walk or light mobility is fine; save the heavy work for when you've bounced back.", "Yes. You'll get more out of training once you've recovered.", null);
  }

  const full = plan({ statuses: muscles, workouts, catalog, settings, now });
  if (!full || full.score < 0.2) {
    const waiting = muscles.filter((m) => m.weeklyTarget > 0 && m.deficit >= 1.5 && m.state !== 'ready');
    if (waiting.length) {
      const soonest = waiting.reduce((a, b) => (b.hoursUntilReady < a.hoursUntilReady ? b : a));
      const hours = Math.max(1, Math.round(soonest.hoursUntilReady));
      return result('rest', 'Let your muscles recover', `The muscles that still need work this week need about ${count(hours, 'more hour')} to recover. Easy cardio or mobility is fine today.`, 'Yes. Nothing is ready to train productively yet.', null);
    }
    return result('optional', 'Weekly targets covered', 'Your recovered muscles have already hit their weekly volume. Rest, or do something easy.', 'Yes. Skipping costs you nothing this week.', null);
  }

  // Only training every remaining day still reaches the goal.
  const lastChance = week.remaining > 0 && week.remaining === week.daysLeft;
  if (week.remaining === 0) {
    if (readiness.score >= 70) {
      return result('optional', 'Weekly goal reached', `You've done ${week.sessionsDone} of ${week.goal} sessions. An extra ${full.name.toLowerCase()} is optional.`, skip, full);
    }
    return result('rest', 'Weekly goal reached', `You've hit ${count(week.goal, 'session')} this week. Enjoy the rest day.`, skip, null);
  }
  if (readiness.trainingStreak >= 4 && !lastChance) {
    return result('rest', 'Take a rest day', `You've trained ${readiness.trainingStreak} days in a row. A day off now lets you train harder for the rest of the week.`, skip, null);
  }
  if (readiness.score < 65) {
    const light = plan({ statuses: muscles, workouts, catalog, settings, now, light: true }) ?? full;
    const lightSkip = lastChance ? 'You can, but it puts your weekly goal out of reach.' : skip;
    return result('trainLight', 'Train light', 'Readiness is moderate. Train, but do about 30% fewer sets and stop ~3 reps short of failure.', lightSkip, light);
  }
  if (lastChance) {
    return result('train', 'Train today', `You need ${count(week.remaining, 'more session')} in ${count(week.daysLeft, 'day')} to hit your weekly goal.`, skip, full);
  }
  const leading = leadingMuscles(full);
  const verb = leading.length === 1 ? 'is' : 'are';
  return result('train', 'Train today', `${joined(leading.map(muscleName))} ${verb} recovered and furthest behind this week.`, skip, full);
}

export function weekProgress(now, workouts, goal, mondayFirst = true) {
  const start = weekStart(now, mondayFirst);
  const end = addDays(start, 7);
  const trainingDays = new Set(
    workouts
      .filter((w) => workingSetCount(w) > 0 && +w.date >= +start && +w.date < +end)
      .map((w) => +startOfDay(w.date)),
  );
  const daysLeft = Math.max(1, daysBetween(now, end));
  const remaining = Math.max(0, goal - trainingDays.size);
  // bufferIfSkipping: spare rest days left after today if you skip today. Negative = goal lost.
  return { sessionsDone: trainingDays.size, goal, daysLeft, remaining, bufferIfSkipping: daysLeft - 1 - remaining };
}

export function skipAnswer(week) {
  if (week.remaining === 0) return 'Yes. Your weekly goal is already met.';
  if (week.remaining > week.daysLeft) {
    return `Your goal of ${count(week.goal, 'session')} is out of reach this week, but today still counts. Skip only if you need the rest.`;
  }
  const daysAfterToday = week.daysLeft - 1;
  if (week.bufferIfSkipping < 0) return `Skipping today means missing your goal of ${count(week.goal, 'session')} this week.`;
  if (week.bufferIfSkipping === 0) return `You can, but then you'd have to train on each of the remaining ${count(daysAfterToday, 'day')}.`;
  return `Yes. You'd still have ${count(daysAfterToday, 'day')} for ${count(week.remaining, 'session')}.`;
}

function reasons(verdict, week, readiness, muscles, sessionPlan) {
  const list = [];
  if (week.remaining === 0) {
    list.push({ text: `Weekly goal reached: ${week.sessionsDone} of ${week.goal} sessions`, impact: 'positive' });
  } else {
    list.push({ text: `This week: ${week.sessionsDone} of ${week.goal} sessions, ${count(week.daysLeft, 'day')} left`, impact: 'neutral' });
  }

  if (sessionPlan && verdict !== 'rest' && verdict !== 'done') {
    const behind = leadingMuscles(sessionPlan).map((m) => muscles.find((s) => s.muscle === m)).filter(Boolean);
    if (behind.length) {
      const text = behind.map((s) => `${muscleName(s.muscle)} (${formatSets(s.setsThisWeek)} of ${formatSets(s.weeklyTarget)} sets)`).join(', ');
      list.push({ text: `Most behind this week: ${text}`, impact: 'positive' });
    }
  }

  const recovering = muscles
    .filter((m) => m.weeklyTarget > 0 && m.state !== 'ready')
    .sort((a, b) => a.recovery - b.recovery)
    .slice(0, 3);
  if (recovering.length) {
    const text = recovering.map((m) => `${muscleName(m.muscle)} ${Math.round(m.recovery * 100)}%`).join(', ');
    list.push({ text: `Still recovering: ${text}`, impact: 'neutral' });
  }

  for (const impact of ['negative', 'positive']) {
    for (const s of readiness.signals) {
      if (s.impact === impact) list.push({ text: `${s.title}: ${lowercasedFirst(s.detail)}`, impact });
    }
  }
  return list;
}

/** Up to three focus muscles to name in summaries; the abs finisher only if it's alone. */
function leadingMuscles(sessionPlan) {
  const main = sessionPlan.focus.filter((m) => m !== 'abs');
  return (main.length ? main : sessionPlan.focus).slice(0, 3);
}

/** Sets rounded to the nearest half: "6", "6.5". */
export function formatSets(value) {
  const half = Math.round(value * 2) / 2;
  return Number.isInteger(half) ? String(half) : half.toFixed(1);
}

export function count(value, noun) {
  return `${value} ${noun}${value === 1 ? '' : 's'}`;
}

export function joined(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Lowercases the first letter but keeps acronyms such as "HRV". */
function lowercasedFirst(text) {
  if (!text) return text;
  const second = text[1];
  if (second && second !== second.toLowerCase()) return text;
  return text[0].toLowerCase() + text.slice(1);
}

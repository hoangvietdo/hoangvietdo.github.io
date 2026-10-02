// Cardio sessions: how taxing they are and which leg muscles they tire.

export const CARDIO = {
  run: { name: 'Run', loadFactor: 1, weights: { calves: 1, quads: 0.8, hamstrings: 0.6, glutes: 0.6 } },
  cycle: { name: 'Ride', loadFactor: 0.8, weights: { quads: 1, glutes: 0.5, calves: 0.3, hamstrings: 0.3 } },
  walk: { name: 'Walk / hike', loadFactor: 0.3, weights: { calves: 0.5, quads: 0.3, glutes: 0.3, hamstrings: 0.2 } },
  other: { name: 'Other cardio', loadFactor: 0.8, weights: { quads: 0.4, calves: 0.3, glutes: 0.3, hamstrings: 0.2 } },
};

export const cardioKind = (kind) => CARDIO[kind] ?? CARDIO.other;

/** Relative intensity, from average heart rate when known, otherwise session RPE (1–10). */
export function intensity(session, maxHeartRate) {
  if (session.avgHr > 0 && maxHeartRate > 0) {
    const fraction = session.avgHr / maxHeartRate;
    if (fraction < 0.65) return 0.6;
    if (fraction < 0.75) return 0.8;
    if (fraction < 0.85) return 1.0;
    if (fraction < 0.9) return 1.2;
    return 1.4;
  }
  if (session.effort != null) return 0.4 + 0.1 * Math.min(Math.max(session.effort, 1), 10);
  return 0.85;
}

/** Training load in intensity-weighted minutes. */
export function cardioLoad(session, maxHeartRate) {
  return session.durationMinutes * intensity(session, maxHeartRate) * cardioKind(session.kind).loadFactor;
}

export function paceMinutesPerKm(session) {
  return session.distanceKm > 0.05 ? session.durationMinutes / session.distanceKm : null;
}

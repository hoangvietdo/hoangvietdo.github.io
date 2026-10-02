// Muscle groups, how fast each recovers, and default weekly hard-set targets.
//
// tau: hours for accumulated fatigue to decay by a factor of e. Large lower-body muscles take
// ~72 h to bounce back from a hard session, small muscles ~36–48 h.
// target: hypertrophy research points to roughly 10–20 weekly sets per muscle, with indirect
// work (triceps during bench press) counting as half a set. 0 = tracked, never prioritised.

export const MUSCLES = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'abs', 'quads', 'hamstrings', 'glutes', 'calves', 'lowerBack'];

export const MUSCLE_INFO = {
  chest: { name: 'Chest', tau: 26, target: 12 },
  back: { name: 'Back', tau: 26, target: 14 },
  shoulders: { name: 'Shoulders', tau: 21, target: 12 },
  biceps: { name: 'Biceps', tau: 21, target: 8 },
  triceps: { name: 'Triceps', tau: 21, target: 8 },
  forearms: { name: 'Forearms', tau: 17, target: 0 },
  abs: { name: 'Abs', tau: 17, target: 6 },
  quads: { name: 'Quads', tau: 30, target: 12 },
  hamstrings: { name: 'Hamstrings', tau: 30, target: 10 },
  glutes: { name: 'Glutes', tau: 30, target: 8 },
  calves: { name: 'Calves', tau: 17, target: 8 },
  lowerBack: { name: 'Lower back', tau: 30, target: 0 },
};

export const muscleName = (muscle) => MUSCLE_INFO[muscle]?.name ?? muscle;

export function defaultTargets() {
  return Object.fromEntries(MUSCLES.map((m) => [m, MUSCLE_INFO[m].target]));
}

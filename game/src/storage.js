const BEST_KEY = 'aether-tide.best.v1';
const MUTE_KEY = 'aether-tide.muted.v1';

function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key, value) {
  try { localStorage.setItem(key, String(value)); } catch { /* A private browser may disable storage. */ }
}
export function readBest() {
  const score = Number(read(BEST_KEY));
  return Number.isSafeInteger(score) && score >= 0 ? score : 0;
}
export function saveBest(score) {
  const best = Math.max(readBest(), score);
  write(BEST_KEY, best);
  return best;
}
export const readMuted = () => read(MUTE_KEY) === 'true';
export const saveMuted = value => write(MUTE_KEY, value);

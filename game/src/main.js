import { ShipAudio } from './audio.js';
import { FlightInput } from './input.js';
import { StarChartRenderer } from './render.js';
import { composeShot, readShotOptions } from './shots.js';
import { readBest, readMuted, saveBest, saveMuted } from './storage.js';
import { FlightUI } from './ui.js';
import { LightRun } from './world.js';

const options = readShotOptions(window.location.search);
const canvas = document.getElementById('space');
const input = new FlightInput(canvas);
const audio = new ShipAudio(readMuted());
const ui = new FlightUI();
const renderer = new StarChartRenderer(canvas, options.seed);
let world = options.shot ? composeShot(options.shot, options.seed) : new LightRun(options.seed);
let mode = options.shot === 'play' ? 'playing' : options.shot === 'end' ? 'end' : 'title';
let frozen = Boolean(options.shot);
let paused = false;
let best = readBest();
let lastFrame = performance.now();
let visualTime = 0;
let accumulator = 0;
let runNumber = 0;

ui.setBest(best);
ui.setMuted(audio.muted);
ui.show(mode);
if (mode === 'end') ui.finish(world, Math.max(best, world.score));
if (mode === 'playing') ui.update(world);

function beginRun() {
  world = new LightRun((options.seed + runNumber++ * 997) >>> 0);
  input.clear();
  mode = 'playing';
  frozen = false;
  paused = false;
  accumulator = 0;
  lastFrame = performance.now();
  audio.unlock();
  audio.play('start');
  ui.show(mode);
  ui.pause(false);
  ui.update(world);
  document.activeElement?.blur();
}

document.getElementById('begin').addEventListener('click', beginRun);
document.getElementById('restart').addEventListener('click', beginRun);
document.getElementById('mute').addEventListener('click', () => {
  audio.unlock();
  audio.muted = !audio.muted;
  saveMuted(audio.muted);
  ui.setMuted(audio.muted);
  if (!audio.muted) audio.play('cell');
});

function setPaused(value) {
  if (mode !== 'playing' || frozen) return;
  paused = value;
  input.clear();
  accumulator = 0;
  lastFrame = performance.now();
  ui.pause(paused);
}
window.addEventListener('blur', () => setPaused(true));
window.addEventListener('focus', () => setPaused(document.hidden));
document.addEventListener('visibilitychange', () => setPaused(document.hidden || !document.hasFocus()));

function updateSimulation(dt) {
  world.update(dt, { direction: input.direction(world.ship), dash: input.consume('Space'), pulse: input.consume('KeyE') });
  for (const event of world.events.splice(0)) audio.play(event.type, event.detail);
  if (world.status !== 'playing') {
    mode = 'end';
    input.clear();
    best = saveBest(world.score);
    ui.setBest(best);
    ui.finish(world, best);
  }
}

function frame(now) {
  const dt = Math.min(0.1, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  if (input.consume('Enter') && mode !== 'playing') beginRun();
  if (!frozen && !paused) visualTime += dt;
  if (mode === 'playing' && !paused && !frozen) {
    accumulator += dt;
    while (accumulator >= 1 / 120 && mode === 'playing') {
      updateSimulation(1 / 120);
      accumulator -= 1 / 120;
    }
    ui.update(world);
  } else if (mode === 'end' && !frozen) world.updateEffects(dt);
  renderer.draw(world, mode, frozen ? 12.8 : visualTime);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

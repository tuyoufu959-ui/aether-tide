import test from 'node:test';
import assert from 'node:assert/strict';
import { LightRun } from '../game/src/world.js';
import { composeShot } from '../game/src/shots.js';
import { distance, unit } from '../game/src/math.js';

const idle = { direction: { x: 0, y: 0 }, dash: false, pulse: false };

test('the same seed and flight commands produce the same run', () => {
  const a = new LightRun(87);
  const b = new LightRun(87);
  for (let step = 0; step < 300; step++) {
    const command = { direction: unit(Math.cos(step / 80), Math.sin(step / 80)), dash: step === 50, pulse: step === 160 };
    a.update(1 / 120, command);
    b.update(1 / 120, command);
  }
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

test('a collision recovers light, chains score, and the eighth light wins', () => {
  const run = new LightRun(1);
  run.shades.length = 0;
  let lastScore = 0;
  for (let count = 0; count < 8; count++) {
    const cell = run.cells[0];
    run.ship.x = cell.x;
    run.ship.y = cell.y;
    run.update(1 / 120, idle);
    assert.equal(run.cellsCollected, count + 1);
    assert.ok(run.score > lastScore);
    assert.equal(run.status, count === 7 ? 'won' : 'playing');
    lastScore = run.score;
  }
  assert.ok(run.timeBonus > 0 && run.hullBonus > 0);
  const finalScore = run.score;
  run.update(1, idle);
  assert.equal(run.score, finalScore);
});

test('phase dash moves quickly through a Shade without losing hull', () => {
  const run = new LightRun(1);
  run.ship.invulnerable = 0;
  run.cells.length = 0;
  run.shades = [{ x: 675, y: 480, angle: 0, stun: 0, phase: 0 }];
  const start = run.ship.x;
  for (let step = 0; step < 24; step++) run.update(1 / 120, { direction: { x: 1, y: 0 }, dash: step === 0, pulse: false });
  assert.ok(run.ship.x - start > 130);
  assert.equal(run.ship.hull, 3);
  assert.ok(run.ship.dashCooldown > 0);
});

test('sonic pulse stuns nearby pursuers, and respects its cooldown', () => {
  const run = new LightRun(1);
  run.shades = [{ x: 710, y: 480, angle: 0, stun: 0, phase: 0 }, { x: 1100, y: 480, angle: 0, stun: 0, phase: 0 }];
  run.update(1 / 120, { ...idle, pulse: true });
  assert.ok(run.shades[0].stun > 3);
  assert.equal(run.shades[1].stun, 0);
  run.update(1 / 120, { ...idle, pulse: true });
  assert.equal(run.events.filter(event => event.type === 'pulse').length, 1);
});

test('three distinct hull impacts end a run, with protection between hits', () => {
  const run = new LightRun(1);
  run.ship.invulnerable = 0;
  run.cells.length = 0;
  const collide = () => {
    run.shades = [{ x: run.ship.x + 1, y: run.ship.y, angle: 0, stun: 0, phase: 0 }];
    run.update(1 / 120, idle);
  };
  collide();
  assert.equal(run.ship.hull, 2);
  collide();
  assert.equal(run.ship.hull, 2);
  run.ship.invulnerable = 0;
  collide();
  assert.equal(run.ship.hull, 1);
  run.ship.invulnerable = 0;
  collide();
  assert.equal(run.status, 'lost');
  assert.equal(run.reason, 'hull');
});

test('the sixty-second tide ends a run even with a sound hull', () => {
  const run = new LightRun(1);
  run.shades.length = 0;
  for (let frame = 0; frame < 3601; frame++) run.update(1 / 60, idle);
  assert.equal(run.status, 'lost');
  assert.equal(run.reason, 'time');
  assert.equal(run.remaining, 0);
  assert.equal(run.ship.hull, 3);
});

test('steering and defensive abilities can complete runs across multiple seeds', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const run = new LightRun(seed);
    for (let frame = 0; frame < 7200 && run.status === 'playing'; frame++) {
      const target = [...run.cells].sort((a, b) => distance(a, run.ship) - distance(b, run.ship))[0];
      const danger = run.shades.some(shade => shade.stun <= 0 && distance(shade, run.ship) < 170);
      const closeDanger = run.shades.some(shade => shade.stun <= 0 && distance(shade, run.ship) < 90);
      let heading = unit(target.x - run.ship.x, target.y - run.ship.y);
      if (run.ship.pulseCooldown > 0 && run.ship.dashCooldown > 0) {
        for (const shade of run.shades) {
          const gap = distance(shade, run.ship);
          if (shade.stun > 0 || gap > 125) continue;
          const escape = unit(run.ship.x - shade.x, run.ship.y - shade.y);
          heading = unit(heading.x + escape.x * 1.8, heading.y + escape.y * 1.8);
        }
      }
      run.update(1 / 120, { direction: heading, dash: closeDanger && run.ship.pulseCooldown > 1, pulse: danger });
    }
    assert.equal(run.status, 'won', `seed ${seed}: ${run.cellsCollected} lights, ${run.ship.hull} hull`);
    assert.ok(run.remaining > 0);
  }
});

test('screenshot scenes are repeatable and show actual gameplay and win states', () => {
  const play = composeShot('play', 1);
  assert.equal(JSON.stringify(play), JSON.stringify(composeShot('play', 1)));
  assert.equal(play.status, 'playing');
  assert.equal(play.cellsCollected, 4);
  assert.ok(play.cells.length >= 3 && play.shades.length >= 4);
  const end = composeShot('end', 1);
  assert.equal(end.status, 'won');
  assert.equal(end.cellsCollected, 8);
  assert.ok(end.score > play.score);
});

import { LightRun } from './world.js';

export function readShotOptions(search) {
  const query = new URLSearchParams(search);
  const requestedSeed = Number(query.get('seed') ?? 1);
  return {
    shot: ['start', 'play', 'end'].includes(query.get('shot')) ? query.get('shot') : null,
    seed: Number.isFinite(requestedSeed) ? requestedSeed >>> 0 : 1,
  };
}

// Screenshot scenes use the normal simulation and renderer, with a fixed clock.
// They never write a record to localStorage. A normal run always starts fresh.
export function composeShot(shot, seed) {
  const world = new LightRun(seed);
  if (shot === 'start') return world;
  for (let count = 0; count < 4; count++) world.collect(0);
  world.events.length = 0;
  world.particles.length = 0;
  world.rings.length = 0;
  world.labels.length = 0;
  world.elapsed = 23.6;
  world.remaining = 36.4;
  world.ship.x = 645; world.ship.y = 443; world.ship.angle = -0.48;
  world.ship.vx = 200; world.ship.vy = -100;
  world.ship.invulnerable = 0;
  world.ship.hull = 2;
  world.ship.dashCooldown = 0.7;
  world.ship.pulseCooldown = 2.8;
  world.cells = [{ x: 826, y: 350, phase: 1 }, { x: 410, y: 540, phase: 3 }, { x: 1048, y: 548, phase: 5 }];
  world.shades.forEach((shade, i) => {
    shade.x = [265, 1040, 485, 1120, 820][i];
    shade.y = [350, 310, 425, 615, 586][i];
    shade.angle = Math.atan2(world.ship.y - shade.y, world.ship.x - shade.x);
    shade.stun = i === 2 ? 1.2 : 0;
  });
  world.announce('FOUR LIGHTS SECURED / HALFWAY HOME', 5);
  world.labels.push({ x: 632, y: 405, text: '+550', life: 1, total: 1.3 });
  for (let i = 0; i < 30; i++) {
    const life = 0.1 + i / 60;
    world.particles.push({ x: 547 + i * 3, y: 495 - i * 1.5, vx: 0, vy: 0, color: '#9af7dc', size: 0.8 + i / 17, life, total: 0.65 });
  }
  if (shot === 'end') {
    while (world.cellsCollected < 8) {
      if (!world.cells.length) world.spawnCell();
      world.collect(0);
    }
    world.events.length = 0;
  }
  return world;
}

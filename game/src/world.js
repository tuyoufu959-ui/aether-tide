import { DASH_COOLDOWN, FIELD, GOAL, PULSE_COOLDOWN, RUN_SECONDS } from './config.js';
import { clamp, distance, seededRandom, turnToward, unit } from './math.js';

// This simulation has no browser dependencies: movement, collisions and scoring live here.
export class LightRun {
  constructor(seed = 1) {
    this.random = seededRandom(seed);
    this.ship = { x: 640, y: 480, vx: 0, vy: 0, angle: -Math.PI / 2, hull: 3, invulnerable: 1.4, dash: 0, dashCooldown: 0, pulseCooldown: 0 };
    this.elapsed = 0;
    this.remaining = RUN_SECONDS;
    this.cellsCollected = 0;
    this.score = 0;
    this.combo = 0;
    this.comboTime = 0;
    this.timeBonus = 0;
    this.hullBonus = 0;
    this.status = 'playing';
    this.cells = [{ x: 360, y: 370, phase: 0 }, { x: 858, y: 505, phase: 2 }, { x: 1020, y: 310, phase: 4 }];
    this.shades = [];
    this.particles = [];
    this.rings = [];
    this.labels = [];
    this.events = [];
    this.message = 'RECOVER 8 LIGHT CELLS. THE TIDE IS COMING.';
    this.messageTime = 4;
    this.trailClock = 0;
    this.shake = 0;
    this.warningSecond = 11;
    for (let i = 0; i < 3; i++) this.spawnShade(i);
  }

  spawnShade(index = this.shades.length) {
    const fromLeft = index % 2 === 0;
    this.shades.push({ x: fromLeft ? FIELD.left - 32 : FIELD.right + 32, y: FIELD.top + 35 + this.random() * 315, angle: 0, stun: 0, phase: this.random() * Math.PI * 2 });
  }

  spawnCell() {
    let point = null;
    for (let attempt = 0; attempt < 80; attempt++) {
      const candidate = { x: 120 + this.random() * 1040, y: 297 + this.random() * 310, phase: this.random() * 6.28 };
      point = candidate;
      if (distance(candidate, this.ship) > 190 && this.cells.every(cell => distance(candidate, cell) > 150) && this.shades.every(shade => distance(candidate, shade) > 90)) break;
    }
    this.cells.push(point);
  }

  burst(x, y, color, count = 22, speed = 130) {
    for (let i = 0; i < count; i++) {
      const angle = this.random() * Math.PI * 2;
      const velocity = speed * (0.2 + this.random() * 0.8);
      const life = 0.3 + this.random() * 0.6;
      this.particles.push({ x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity, life, total: life, size: 1 + this.random() * 2.5, color });
    }
  }

  announce(text, seconds = 2.8) {
    this.message = text;
    this.messageTime = seconds;
  }

  dash(direction) {
    const ship = this.ship;
    if (ship.dashCooldown > 0 || ship.dash > 0) return;
    const heading = direction.x || direction.y ? direction : { x: Math.cos(ship.angle), y: Math.sin(ship.angle) };
    ship.angle = Math.atan2(heading.y, heading.x);
    ship.vx = heading.x * 850;
    ship.vy = heading.y * 850;
    ship.dash = 0.23;
    ship.dashCooldown = DASH_COOLDOWN;
    ship.invulnerable = Math.max(ship.invulnerable, 0.4);
    this.rings.push({ x: ship.x, y: ship.y, radius: 9, max: 85, life: 0.4, total: 0.4, color: '#9af7dc' });
    this.events.push({ type: 'dash' });
  }

  pulse() {
    const ship = this.ship;
    if (ship.pulseCooldown > 0) return;
    ship.pulseCooldown = PULSE_COOLDOWN;
    let stunned = 0;
    for (const shade of this.shades) {
      if (distance(ship, shade) > 210) continue;
      shade.stun = 3.2;
      const push = unit(shade.x - ship.x, shade.y - ship.y);
      shade.x += push.x * 38;
      shade.y += push.y * 38;
      this.burst(shade.x, shade.y, '#b2f6ee', 12, 80);
      stunned++;
    }
    this.rings.push({ x: ship.x, y: ship.y, radius: 10, max: 210, life: 0.7, total: 0.7, color: '#9af7dc' });
    this.announce(stunned ? `SONIC PULSE / ${stunned} SHADE${stunned === 1 ? '' : 'S'} STUNNED` : 'SONIC PULSE / CLEAR WATER');
    this.events.push({ type: 'pulse' });
  }

  collect(index) {
    const cell = this.cells[index];
    this.cells.splice(index, 1);
    this.cellsCollected++;
    this.combo = this.comboTime > 0 ? Math.min(this.combo + 1, 4) : 1;
    this.comboTime = 6;
    const points = 250 + (this.combo - 1) * 100;
    this.score += points;
    this.labels.push({ x: cell.x, y: cell.y - 15, text: `+${points}`, life: 1.3, total: 1.3 });
    this.burst(cell.x, cell.y, '#a6ffe1', 30, 160);
    this.rings.push({ x: cell.x, y: cell.y, radius: 12, max: 72, life: 0.5, total: 0.5, color: '#9af7dc' });
    this.events.push({ type: 'cell', detail: this.combo });
    this.announce(this.cellsCollected === 7 ? 'ONE LAST LIGHT. BRING IT HOME.' : this.combo > 1 ? `LIGHT CHAIN ×${this.combo} / KEEP MOVING` : 'LIGHT SECURED / THE CURRENT IS RISING');
    if (this.cellsCollected === GOAL) { this.finish(true); return; }
    if (this.cellsCollected % 2 === 0) {
      this.spawnShade();
      this.announce(`SECTOR ${String(this.sector + 1).padStart(2, '0')} / MORE SHADES INBOUND`);
    }
    if (this.cellsCollected + this.cells.length < GOAL) this.spawnCell();
  }

  get sector() { return Math.min(3, Math.floor(this.cellsCollected / 2)); }

  finish(won, reason = 'hull') {
    if (this.status !== 'playing') return;
    this.status = won ? 'won' : 'lost';
    this.reason = reason;
    if (won) {
      this.timeBonus = Math.ceil(this.remaining) * 40;
      this.hullBonus = this.ship.hull * 200;
      this.score += this.timeBonus + this.hullBonus;
      this.burst(this.ship.x, this.ship.y, '#a6ffe1', 70, 240);
    } else {
      this.burst(this.ship.x, this.ship.y, '#ff9686', 55, 190);
    }
    this.events.push({ type: won ? 'win' : 'lose' });
  }

  update(dt, command) {
    if (this.status !== 'playing') return;
    this.elapsed += dt;
    this.remaining = Math.max(0, RUN_SECONDS - this.elapsed);
    this.messageTime = Math.max(0, this.messageTime - dt);
    this.comboTime = Math.max(0, this.comboTime - dt);
    if (this.comboTime === 0) this.combo = 0;
    this.shake = Math.max(0, this.shake - dt * 35);
    const ship = this.ship;
    ship.invulnerable = Math.max(0, ship.invulnerable - dt);
    ship.dashCooldown = Math.max(0, ship.dashCooldown - dt);
    ship.pulseCooldown = Math.max(0, ship.pulseCooldown - dt);
    if (command.dash) this.dash(command.direction);
    if (command.pulse) this.pulse();
    if (ship.dash > 0) ship.dash = Math.max(0, ship.dash - dt);
    else {
      const smoothing = 1 - Math.exp(-10 * dt);
      ship.vx += (command.direction.x * 245 - ship.vx) * smoothing;
      ship.vy += (command.direction.y * 245 - ship.vy) * smoothing;
      if (command.direction.x || command.direction.y) ship.angle = turnToward(ship.angle, Math.atan2(command.direction.y, command.direction.x), 14 * dt);
    }
    ship.x = clamp(ship.x + ship.vx * dt, FIELD.left + 15, FIELD.right - 15);
    ship.y = clamp(ship.y + ship.vy * dt, FIELD.top + 12, FIELD.bottom - 12);
    this.trailClock += dt;
    if (this.trailClock > 0.025 && Math.hypot(ship.vx, ship.vy) > 15) {
      this.trailClock = 0;
      const life = ship.dash > 0 ? 0.65 : 0.35;
      this.particles.push({ x: ship.x - Math.cos(ship.angle) * 17, y: ship.y - Math.sin(ship.angle) * 17, vx: -ship.vx * 0.12, vy: -ship.vy * 0.12, life, total: life, color: '#9af7dc', size: ship.dash > 0 ? 5 : 2 });
    }
    for (let i = this.cells.length - 1; i >= 0; i--) {
      const cell = this.cells[i];
      const gap = distance(ship, cell);
      // A short recovery field rewards close passes, especially during a dash.
      if (gap < 73) {
        const pull = Math.min(1, dt * 8);
        cell.x += (ship.x - cell.x) * pull;
        cell.y += (ship.y - cell.y) * pull;
      }
      if (distance(ship, cell) < 29) this.collect(i);
      if (this.status !== 'playing') return;
    }
    for (let index = 0; index < this.shades.length; index++) {
      const shade = this.shades[index];
      shade.stun = Math.max(0, shade.stun - dt);
      if (shade.stun > 0) continue;
      let dx = ship.x - shade.x;
      let dy = ship.y - shade.y;
      // Gentle separation keeps a pack readable instead of becoming a single sprite.
      for (const other of this.shades) {
        const gap = distance(shade, other);
        if (other === shade || gap > 58 || gap < 0.01) continue;
        dx += (shade.x - other.x) * (58 - gap) * 0.11;
        dy += (shade.y - other.y) * (58 - gap) * 0.11;
      }
      const heading = unit(dx, dy);
      const speed = 61 + this.cellsCollected * 6 + Math.min(18, this.elapsed * 0.25);
      shade.x += heading.x * speed * dt;
      shade.y += heading.y * speed * dt;
      shade.angle = turnToward(shade.angle, Math.atan2(heading.y, heading.x), 4 * dt);
      if (distance(ship, shade) < 29 && ship.invulnerable <= 0) {
        ship.hull--;
        ship.invulnerable = 1.8;
        this.shake = 9;
        this.combo = 0;
        this.comboTime = 0;
        this.burst(ship.x, ship.y, '#ff9686', 26, 160);
        const repel = unit(shade.x - ship.x, shade.y - ship.y);
        shade.x += repel.x * 80;
        shade.y += repel.y * 80;
        shade.stun = 0.7;
        this.announce(ship.hull === 1 ? 'HULL CRITICAL / DASH TO BREAK CONTACT' : 'HULL HIT / KEEP MOVING');
        this.events.push({ type: 'hit' });
        if (ship.hull <= 0) { this.finish(false, 'hull'); return; }
      }
    }
    if (this.remaining <= 10 && Math.ceil(this.remaining) < this.warningSecond) {
      this.warningSecond = Math.ceil(this.remaining);
      this.events.push({ type: 'warning' });
    }
    this.updateEffects(dt);
    if (this.remaining <= 0) this.finish(false, 'time');
  }

  updateEffects(dt) {
    for (const particle of this.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.exp(-2 * dt);
      particle.vy *= Math.exp(-2 * dt);
      particle.life -= dt;
    }
    this.particles = this.particles.filter(particle => particle.life > 0);
    for (const ring of this.rings) { ring.life -= dt; ring.radius += (ring.max - ring.radius) * dt * 8; }
    this.rings = this.rings.filter(ring => ring.life > 0);
    for (const label of this.labels) { label.y -= dt * 29; label.life -= dt; }
    this.labels = this.labels.filter(label => label.life > 0);
  }
}

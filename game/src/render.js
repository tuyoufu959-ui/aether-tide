import { COLORS, FIELD, HEIGHT, WIDTH } from './config.js';
import { seededRandom } from './math.js';

const TAU = Math.PI * 2;
function polygon(ctx, points, fill, stroke, width = 1) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}
function circle(ctx, x, y, radius, color, width = 1) {
  ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU);
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}
function glow(ctx, x, y, radius, color) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color); gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

export class StarChartRenderer {
  constructor(canvas, seed) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    const random = seededRandom(seed ^ 0x571ac);
    this.stars = Array.from({ length: 210 }, () => ({ x: random() * WIDTH, y: random() * HEIGHT, size: 0.4 + random() * 1.3, phase: random() * TAU, alpha: 0.12 + random() * 0.55 }));
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.canvas.clientWidth * ratio);
    this.canvas.height = Math.round(this.canvas.clientHeight * ratio);
  }

  draw(world, mode, time) {
    const ctx = this.ctx;
    ctx.setTransform(this.canvas.width / WIDTH, 0, 0, this.canvas.height / HEIGHT, 0, 0);
    this.background(ctx, time, mode === 'title');
    if (mode === 'title') { this.titleIllustration(ctx, time); return; }
    this.flightField(ctx, world, time);
    ctx.save();
    if (world.shake > 0) ctx.translate(Math.sin(time * 97) * world.shake, Math.cos(time * 83) * world.shake * 0.6);
    for (const particle of world.particles) {
      ctx.globalAlpha = Math.max(0, particle.life / particle.total);
      ctx.fillStyle = particle.color;
      ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size * (particle.life / particle.total), 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const cell of world.cells) this.lightCell(ctx, cell, time);
    for (const shade of world.shades) this.shade(ctx, shade, time);
    const ship = world.ship;
    if (ship.hull > 0) {
      if (ship.invulnerable > 0 && ship.dash === 0) {
        circle(ctx, ship.x, ship.y, 30, `rgba(154,247,220,${0.15 + Math.sin(time * 20) * 0.1})`);
        ctx.globalAlpha = 0.62 + Math.sin(time * 25) * 0.25;
      }
      this.ship(ctx, ship.x, ship.y, ship.angle, 1, time, Math.hypot(ship.vx, ship.vy) > 20, ship.dash > 0);
      ctx.globalAlpha = 1;
    }
    for (const ring of world.rings) {
      ctx.globalAlpha = ring.life / ring.total;
      circle(ctx, ring.x, ring.y, ring.radius, ring.color, 1.5);
      circle(ctx, ring.x, ring.y, ring.radius * 0.85, '#9af7dc44');
    }
    ctx.globalAlpha = 1;
    ctx.font = 'bold 15px "Courier New", monospace';
    ctx.textAlign = 'center';
    for (const label of world.labels) {
      ctx.globalAlpha = Math.min(1, label.life * 2);
      ctx.fillStyle = COLORS.mint; ctx.fillText(label.text, label.x, label.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    ctx.restore();
  }

  background(ctx, time, title) {
    const backdrop = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    backdrop.addColorStop(0, '#080f1b'); backdrop.addColorStop(0.6, '#0b1b28'); backdrop.addColorStop(1, '#08121f');
    ctx.fillStyle = backdrop; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    glow(ctx, 980, 410, 440, title ? '#246d652c' : '#1c63552a');
    glow(ctx, 240, 760, 400, '#273c6525');
    glow(ctx, 1200, 120, 400, '#29395d22');
    ctx.strokeStyle = '#9ccfce08'; ctx.lineWidth = 1;
    for (let x = 24; x < WIDTH; x += 64) { ctx.beginPath(); ctx.moveTo(x, 74); ctx.lineTo(x, 748); ctx.stroke(); }
    for (let y = 108; y < 748; y += 64) { ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(1240, y); ctx.stroke(); }
    for (const star of this.stars) {
      const twinkle = 0.76 + Math.sin(time * 0.6 + star.phase) * 0.24;
      ctx.globalAlpha = star.alpha * twinkle;
      ctx.fillStyle = star.phase > 4 ? '#93d8d2' : '#d8e3e3';
      ctx.fillRect(star.x, star.y, star.size, star.size);
      if (star.size > 1.5 && star.alpha > 0.5) {
        ctx.globalAlpha *= 0.3;
        ctx.fillRect(star.x - 3, star.y + 0.5, 7, 0.6);
        ctx.fillRect(star.x + 0.5, star.y - 3, 0.6, 7);
      }
    }
    ctx.globalAlpha = 1;
    // Contour lines suggest a tide flowing across an astronomical chart.
    ctx.save(); ctx.beginPath(); ctx.rect(title ? 560 : 30, 80, title ? 720 : 1220, 650); ctx.clip();
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      ctx.moveTo(555 + i * 31, 80);
      ctx.bezierCurveTo(1310 - i * 14, 280 + i * 12, 430 + i * 38, 520, 1050 + i * 35, 760);
      ctx.strokeStyle = `rgba(111,197,185,${title ? 0.024 : 0.012})`; ctx.stroke();
    }
    ctx.restore();
  }

  titleIllustration(ctx, time) {
    ctx.save();
    const cx = 932, cy = 343;
    glow(ctx, cx, cy, 280, '#60c3aa14');
    // The unlit homeworld and its engraved latitude lines are all canvas geometry.
    const planet = ctx.createRadialGradient(cx - 110, cy - 100, 10, cx + 30, cy + 35, 240);
    planet.addColorStop(0, '#294e50'); planet.addColorStop(0.5, '#152f39'); planet.addColorStop(1, '#0a1421');
    ctx.fillStyle = planet; ctx.beginPath(); ctx.arc(cx, cy, 173, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, 173, 0, TAU); ctx.clip();
    ctx.translate(cx, cy); ctx.rotate(-0.43);
    for (let i = -5; i <= 5; i++) {
      ctx.beginPath(); ctx.ellipse(0, i * 32, 178, 19 + (5 - Math.abs(i)) * 4, 0, 0, TAU);
      ctx.strokeStyle = '#9af7dc0d'; ctx.stroke();
    }
    for (let i = 0; i < 6; i++) {
      ctx.beginPath(); ctx.ellipse(0, 0, 20 + i * 27, 180, 0, 0, TAU); ctx.strokeStyle = '#9af7dc09'; ctx.stroke();
    }
    ctx.restore();
    circle(ctx, cx, cy, 173, '#9af7dc36'); circle(ctx, cx, cy, 181, '#9af7dc0c');
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.45);
    ctx.setLineDash([2, 10]);
    for (const radius of [226, 274, 312]) {
      ctx.beginPath(); ctx.ellipse(0, 0, radius, radius * 0.66, 0, 0, TAU); ctx.strokeStyle = '#92e2d42a'; ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.ellipse(0, 0, 240, 150, 0, 0.1, 2.8); ctx.strokeStyle = '#8fe4ce70'; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, 310, 205, 0, 3.5, 4.65); ctx.strokeStyle = '#8fe4ce48'; ctx.stroke();
    ctx.restore();
    // A home signal, still alive, on the terminator of the world.
    const beacon = { x: 1046, y: 238 };
    glow(ctx, beacon.x, beacon.y, 50, '#a6ffe13a');
    circle(ctx, beacon.x, beacon.y, 13, '#9af7dc55');
    ctx.fillStyle = COLORS.mint; ctx.fillRect(beacon.x - 2, beacon.y - 2, 4, 4);
    this.chartLabel(ctx, 1082, 206, 'HOME SIGNAL', 'FADING / 08 REQUIRED');
    ctx.beginPath(); ctx.moveTo(1055, 229); ctx.lineTo(1071, 210); ctx.lineTo(1169, 210); ctx.strokeStyle = '#9af7dc44'; ctx.stroke();

    ctx.save(); ctx.translate(853, 433); ctx.rotate(-0.47);
    const wake = ctx.createLinearGradient(-200, 0, 20, 0);
    wake.addColorStop(0, '#9af7dc00'); wake.addColorStop(1, '#9af7dc4a');
    polygon(ctx, [[-200, -1], [-15, -16], [0, 0], [-15, 16]], wake);
    ctx.restore();
    this.ship(ctx, 853, 433, -0.47, 3.2, time, true, false);
    this.lightCell(ctx, { x: 730, y: 277, phase: 1 }, time, 1.1);
    this.lightCell(ctx, { x: 1111, y: 457, phase: 3 }, time, 0.9);
    this.lightCell(ctx, { x: 766, y: 560, phase: 4 }, time, 0.75);
    ctx.globalAlpha = 0.7;
    this.shade(ctx, { x: 1118, y: 597, angle: -2.4, stun: 0, phase: 1 }, time, 1.05);
    this.shade(ctx, { x: 1190, y: 530, angle: -2.5, stun: 0, phase: 2 }, time, 0.7);
    ctx.globalAlpha = 1;
    this.chartLabel(ctx, 680, 182, 'THE QUIET REACH', 'CHART 006 / UNSTABLE CURRENT');
    ctx.strokeStyle = '#9af7dc2e'; ctx.beginPath(); ctx.moveTo(678, 201); ctx.lineTo(748, 201); ctx.stroke();
    ctx.font = '9px "Courier New", monospace'; ctx.fillStyle = '#879da97a'; ctx.fillText('N', 932, 114);
    ctx.beginPath(); ctx.moveTo(932, 124); ctx.lineTo(932, 143); ctx.strokeStyle = '#9af7dc60'; ctx.stroke();
    ctx.restore();
  }

  chartLabel(ctx, x, y, title, detail) {
    ctx.font = '9px "Courier New", monospace'; ctx.fillStyle = '#a9cbc6'; ctx.fillText(title, x, y);
    ctx.font = '7px "Courier New", monospace'; ctx.fillStyle = '#718e99'; ctx.fillText(detail, x, y + 16);
  }

  flightField(ctx, world, time) {
    const progress = world.elapsed / 60;
    ctx.save();
    ctx.strokeStyle = '#9af7dc18'; ctx.setLineDash([3, 8]);
    ctx.strokeRect(FIELD.left - 14, FIELD.top - 16, FIELD.right - FIELD.left + 28, FIELD.bottom - FIELD.top + 32);
    ctx.setLineDash([]);
    const corners = [[44, 249, 1, 1], [1236, 249, -1, 1], [44, 675, 1, -1], [1236, 675, -1, -1]];
    ctx.strokeStyle = '#9af7dc55';
    for (const [x, y, dx, dy] of corners) {
      ctx.beginPath(); ctx.moveTo(x, y + dy * 16); ctx.lineTo(x, y); ctx.lineTo(x + dx * 16, y); ctx.stroke();
    }
    // The tide visibly eats into the chart as its sixty seconds disappear.
    const tideX = WIDTH + 175 - progress * 240;
    const tide = ctx.createLinearGradient(tideX - 100, 0, WIDTH, 0);
    tide.addColorStop(0, '#ff968600'); tide.addColorStop(1, '#ff968618');
    ctx.fillStyle = tide; ctx.fillRect(tideX - 100, 251, WIDTH - tideX + 100, 423);
    ctx.strokeStyle = `rgba(255,150,134,${0.07 + progress * 0.18})`;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      for (let y = 251; y < 675; y += 7) {
        const x = tideX + i * 15 + Math.sin(y * 0.025 + time * 0.8 + i * 0.5) * 16;
        if (y === 251) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.font = '7px "Courier New", monospace'; ctx.fillStyle = '#6b8d983f';
    for (let x = 120; x < 1200; x += 180) ctx.fillText(String(x / 10).padStart(3, '0'), x, 665);
    if (world.remaining < 10) {
      ctx.fillStyle = `rgba(255,110,90,${0.025 + Math.sin(time * 5) * 0.015})`; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
    ctx.restore();
  }

  lightCell(ctx, cell, time, scale = 1) {
    const breathing = Math.sin(time * 2 + cell.phase);
    ctx.save(); ctx.translate(cell.x, cell.y); ctx.scale(scale, scale);
    glow(ctx, 0, 0, 48 + breathing * 4, '#8bf4cc1f');
    circle(ctx, 0, 0, 25 + breathing * 2, '#9af7dc27');
    ctx.save(); ctx.rotate(time * 0.25 + cell.phase);
    ctx.strokeStyle = '#9af7dc70'; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.arc(0, 0, 30, i * Math.PI / 2, i * Math.PI / 2 + 0.23); ctx.stroke();
    }
    ctx.restore();
    ctx.translate(0, breathing * 2);
    polygon(ctx, [[0, -14], [10, 0], [0, 14], [-10, 0]], '#164c43', '#9af7dc', 1.2);
    polygon(ctx, [[0, -8], [5, 0], [0, 8], [-5, 0]], '#b5ffe4');
    ctx.fillStyle = '#f0fff5'; ctx.fillRect(-1.5, -2, 3, 4);
    ctx.restore();
  }

  ship(ctx, x, y, angle, scale, time, moving, dashing) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);
    glow(ctx, -4, 0, dashing ? 70 : 37, dashing ? '#b5ffe155' : '#9af7dc22');
    if (moving) {
      const exhaust = 14 + Math.sin(time * 35) * 4;
      polygon(ctx, [[-13, -4], [-25 - exhaust * (dashing ? 3 : 1), 0], [-13, 4]], '#9af7dc38');
      polygon(ctx, [[-13, -2], [-22 - exhaust * 0.4, 0], [-13, 2]], '#bcffe6');
    }
    polygon(ctx, [[8, -6], [-14, -16], [-10, -3], [-18, 0], [-10, 3], [-14, 16], [8, 6]], '#24494b', '#89bdb5', 0.7);
    polygon(ctx, [[24, 0], [-10, -9], [-5, 0], [-10, 9]], '#d9e5db', '#ecfff0', 0.6);
    polygon(ctx, [[11, 0], [-3, -4], [-1, 0], [-3, 4]], '#163c42', '#7ed8c7', 0.5);
    ctx.strokeStyle = '#9af7dc'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-12, -12); ctx.lineTo(-9, -5); ctx.moveTo(-12, 12); ctx.lineTo(-9, 5); ctx.stroke();
    ctx.fillStyle = '#effff1'; ctx.fillRect(16, -0.6, 5, 1.2);
    ctx.restore();
  }

  shade(ctx, shade, time, scale = 1) {
    ctx.save(); ctx.translate(shade.x, shade.y); ctx.rotate(shade.angle); ctx.scale(scale, scale);
    const stunned = shade.stun > 0;
    const color = stunned ? '#9ec6e4' : '#ff9686';
    glow(ctx, 0, 0, 43, stunned ? '#9ec6e41c' : '#ff79641b');
    const flutter = Math.sin(time * 4 + shade.phase) * 3;
    ctx.strokeStyle = stunned ? '#9ec6e433' : '#ff968628';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(-8, i * 6); ctx.quadraticCurveTo(-27, i * 17 + flutter, -48, i * 11); ctx.stroke();
    }
    polygon(ctx, [[20, 0], [-11, -18 - flutter], [-6, -4], [-20, 0], [-6, 4], [-11, 18 + flutter]], '#251e32', stunned ? '#9ec6e4aa' : '#cd777a9a', 1);
    polygon(ctx, [[10, 0], [-3, -5], [-8, 0], [-3, 5]], stunned ? '#48667d' : '#7b3d50');
    polygon(ctx, [[7, 0], [0, -2.5], [-3, 0], [0, 2.5]], color);
    if (stunned) {
      ctx.rotate(-shade.angle + time);
      ctx.setLineDash([2, 5]); circle(ctx, 0, 0, 29, '#b3def2aa'); ctx.setLineDash([]);
    }
    ctx.restore();
  }
}

import { DASH_COOLDOWN, GOAL, PULSE_COOLDOWN, SECTORS } from './config.js';

export const scoreText = score => String(Math.floor(score)).padStart(6, '0');
const el = id => document.getElementById(id);

export class FlightUI {
  constructor() {
    this.pips = Array.from({ length: GOAL }, () => el('cell-pips').appendChild(document.createElement('i')));
    this.hull = Array.from({ length: 3 }, () => el('hull-value').appendChild(document.createElement('i')));
    this.timerValue = -1;
    this.nodes = Object.fromEntries(['cells-value', 'score-value', 'time-value', 'sector-value', 'message', 'combo', 'dash-state', 'pulse-state', 'dash-charge', 'pulse-charge'].map(id => [id, el(id)]));
  }

  show(mode) {
    el('title-screen').hidden = mode !== 'title';
    el('hud').hidden = mode !== 'playing';
    el('end-screen').hidden = mode !== 'end';
    el('footer-message').textContent = mode === 'playing' ? 'WASD / ARROWS / HOLD LEFT MOUSE TO PILOT' : 'AN OFFLINE ARCADE EXPEDITION';
  }

  setBest(best) { el('title-best').textContent = scoreText(best); }

  setMuted(muted) {
    el('sound-state').textContent = muted ? 'OFF' : 'ON';
    el('mute').setAttribute('aria-pressed', String(muted));
    el('mute').setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
  }

  update(world) {
    const n = this.nodes;
    n['cells-value'].textContent = String(world.cellsCollected).padStart(2, '0');
    n['score-value'].textContent = scoreText(world.score);
    const tenths = Math.ceil(world.remaining * 10);
    if (tenths !== this.timerValue) {
      this.timerValue = tenths;
      const whole = Math.floor(tenths / 10);
      n['time-value'].replaceChildren(document.createTextNode(String(whole).padStart(2, '0')));
      const decimal = document.createElement('small');
      decimal.textContent = '.' + tenths % 10;
      n['time-value'].appendChild(decimal);
    }
    n['time-value'].parentElement.classList.toggle('danger', world.remaining < 11);
    n['sector-value'].textContent = `SECTOR ${String(world.sector + 1).padStart(2, '0')} / ${SECTORS[world.sector]}`;
    this.pips.forEach((pip, index) => pip.classList.toggle('lit', index < world.cellsCollected));
    this.hull.forEach((bar, index) => bar.classList.toggle('empty', index >= world.ship.hull));
    el('hull-value').setAttribute('aria-label', `${world.ship.hull} hull remaining`);
    n.message.textContent = world.message;
    n.message.style.opacity = world.messageTime > 0 ? '1' : '0';
    n.combo.hidden = world.combo < 2;
    n.combo.textContent = `LIGHT CHAIN ×${world.combo}`;
    this.ability('dash', world.ship.dashCooldown, DASH_COOLDOWN);
    this.ability('pulse', world.ship.pulseCooldown, PULSE_COOLDOWN);
  }

  ability(name, cooldown, max) {
    this.nodes[`${name}-state`].textContent = cooldown > 0 ? `${cooldown.toFixed(1)}s` : 'READY';
    this.nodes[`${name}-charge`].style.transform = `scaleX(${1 - cooldown / max})`;
  }

  pause(paused) { el('pause-note').hidden = !paused; }

  finish(world, best) {
    const won = world.status === 'won';
    el('end-screen').classList.toggle('lost', !won);
    el('end-sigil').textContent = won ? '✧' : '◇';
    el('end-eyebrow').textContent = won ? 'TRANSMISSION RECEIVED / MISSION COMPLETE' : 'TRANSMISSION LOST / RECOVERY INCOMPLETE';
    const heading = el('end-title');
    heading.replaceChildren();
    heading.append(document.createTextNode(won ? 'YOU BROUGHT' : 'THE TIDE'), document.createElement('br'), document.createTextNode(won ? 'THE LIGHT HOME.' : 'TOOK THE LIGHT.'));
    el('end-description').textContent = won ? 'Eight small suns. A whole new dawn.' : world.reason === 'time' ? 'The current caught up. There is still light worth returning for.' : 'The Shades found you. Fly again. The stars are waiting.';
    el('end-score').textContent = scoreText(world.score);
    el('end-cells').replaceChildren(document.createTextNode(String(world.cellsCollected).padStart(2, '0')));
    const denominator = document.createElement('small'); denominator.textContent = ' / 08'; el('end-cells').appendChild(denominator);
    el('end-best').textContent = scoreText(best);
    el('score-breakdown').textContent = won ? `LIGHT & CHAINS ${world.score - world.timeBonus - world.hullBonus}  ·  TIME +${world.timeBonus}  ·  HULL +${world.hullBonus}` : `${world.cellsCollected} OF 8 LIGHT CELLS RECOVERED  ·  ${Math.floor(world.elapsed)} SECONDS IN THE CURRENT`;
    this.show('end');
  }
}

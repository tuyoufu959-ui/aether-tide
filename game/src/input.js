import { WIDTH, HEIGHT } from './config.js';
import { unit } from './math.js';

export class FlightInput {
  constructor(canvas) {
    this.keys = new Set();
    this.actions = new Set();
    this.pointer = { x: WIDTH / 2, y: HEIGHT / 2, down: false };
    const controlled = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'Enter']);
    window.addEventListener('keydown', event => {
      if (!controlled.has(event.code)) return;
      if (event.target instanceof HTMLButtonElement && event.code === 'Enter') return;
      event.preventDefault();
      this.keys.add(event.code);
      if (!event.repeat) this.actions.add(event.code);
    });
    window.addEventListener('keyup', event => this.keys.delete(event.code));
    window.addEventListener('pointermove', event => {
      const bounds = canvas.getBoundingClientRect();
      this.pointer.x = (event.clientX - bounds.left) * WIDTH / bounds.width;
      this.pointer.y = (event.clientY - bounds.top) * HEIGHT / bounds.height;
    });
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      this.pointer.down = true;
      canvas.setPointerCapture(event.pointerId);
    });
    window.addEventListener('pointerup', () => { this.pointer.down = false; });
    window.addEventListener('pointercancel', () => { this.pointer.down = false; });
    window.addEventListener('blur', () => this.clear());
  }

  direction(ship) {
    const x = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    const y = Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) - Number(this.keys.has('KeyW') || this.keys.has('ArrowUp'));
    if (x || y) return unit(x, y);
    if (this.pointer.down && Math.hypot(this.pointer.x - ship.x, this.pointer.y - ship.y) > 12) {
      return unit(this.pointer.x - ship.x, this.pointer.y - ship.y);
    }
    return { x: 0, y: 0 };
  }

  consume(code) {
    const pending = this.actions.has(code);
    this.actions.delete(code);
    return pending;
  }

  clear() {
    this.keys.clear();
    this.actions.clear();
    this.pointer.down = false;
  }
}

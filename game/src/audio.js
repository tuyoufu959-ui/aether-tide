export class ShipAudio {
  constructor(muted = false) {
    this.muted = muted;
    this.context = null;
  }

  unlock() {
    try {
      const AudioEngine = window.AudioContext || window.webkitAudioContext;
      if (!AudioEngine) return;
      this.context ??= new AudioEngine();
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
    } catch { this.context = null; }
  }

  tone(frequency, duration, delay = 0, waveform = 'sine', volume = 0.09, slide = frequency) {
    if (this.muted || !this.context || this.context.state !== 'running') return;
    const context = this.context;
    const start = context.currentTime + delay;
    const voice = context.createOscillator();
    const envelope = context.createGain();
    voice.type = waveform;
    voice.frequency.setValueAtTime(frequency, start);
    voice.frequency.exponentialRampToValueAtTime(Math.max(20, slide), start + duration);
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(volume, start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    voice.connect(envelope);
    envelope.connect(context.destination);
    voice.start(start);
    voice.stop(start + duration + 0.02);
    voice.onended = () => { voice.disconnect(); envelope.disconnect(); };
  }

  play(event, detail = 0) {
    if (event === 'start') [220, 330, 440, 660].forEach((note, i) => this.tone(note, 0.4, i * 0.11, 'triangle', 0.055));
    if (event === 'cell') {
      const note = 440 * 2 ** ((detail % 5) / 6);
      this.tone(note, 0.19, 0, 'sine', 0.12);
      this.tone(note * 1.5, 0.45, 0.09, 'sine', 0.075);
    }
    if (event === 'dash') this.tone(120, 0.22, 0, 'triangle', 0.08, 1100);
    if (event === 'pulse') {
      this.tone(620, 0.6, 0, 'sine', 0.12, 90);
      this.tone(930, 0.4, 0.02, 'triangle', 0.035, 150);
    }
    if (event === 'hit') this.tone(155, 0.32, 0, 'sawtooth', 0.065, 35);
    if (event === 'warning') this.tone(240, 0.12, 0, 'triangle', 0.045);
    if (event === 'win') [330, 440, 550, 660, 880].forEach((note, i) => this.tone(note, 0.8, i * 0.13, 'sine', 0.075));
    if (event === 'lose') [220, 165, 110].forEach((note, i) => this.tone(note, 0.6, i * 0.2, 'triangle', 0.07));
  }
}

/*
 * Sound Manager - Generate and play chess sounds using Web Audio API
 */

class SoundManager {
  constructor() {
    this.audioContext = null;
    this.enabled = true;
    this.volume = 0.3;
    this.theme = 'dark';
    this.initAudioContext();
  }

  initAudioContext() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
    } catch {
      console.warn('Web Audio API not supported');
    }
  }

  playTone(frequency, duration, type = 'sine') {
    if (!this.enabled || !this.audioContext) return;

    try {
      const now = this.audioContext.currentTime;
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const filter = this.audioContext.createBiquadFilter();

      osc.type = type;
      osc.frequency.value = frequency;

      // Envelope: fast attack, exponential decay
      gain.gain.setValueAtTime(this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      console.warn('Error playing tone:', e);
    }
  }

  playSequence(frequencies, durations) {
    if (!this.enabled || !this.audioContext) return;
    let delayMs = 0;
    for (let i = 0; i < frequencies.length; i++) {
      setTimeout(() => {
        this.playTone(frequencies[i], durations[i] || 0.1);
      }, delayMs);
      delayMs += (durations[i] || 0.1) * 1000;
    }
  }

  moveSound() {
    if (this.theme === 'light') {
      this.playTone(880, 0.07, 'triangle');
      setTimeout(() => this.playTone(660, 0.07, 'triangle'), 90);
    } else {
      this.playTone(760, 0.08, 'sine');
      setTimeout(() => this.playTone(580, 0.08, 'sine'), 100);
    }
  }

  captureSound() {
    // Descending tones (lower pitched)
    this.playSequence([700, 500], [0.12, 0.15]);
  }

  checkSound() {
    // Alert-like ascending tones
    this.playSequence([400, 600, 800], [0.1, 0.1, 0.15]);
  }

  checkmateSound() {
    // Triumphant fanfare
    this.playSequence([523.25, 659.25, 783.99, 1046.5], [0.2, 0.2, 0.2, 0.4]);
  }

  illegalMoveSound() {
    // Error buzz
    this.playTone(200, 0.2);
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, value));
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  setTheme(theme) {
    this.theme = theme;
  }

  toggleAudio() {
    this.enabled = !this.enabled;
  }
}

export default new SoundManager();

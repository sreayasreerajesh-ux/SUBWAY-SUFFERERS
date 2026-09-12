// Web Audio API Procedural Synthesizer for retro arcade SFX and chiptune music

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.bgmPlaying = false;
    this.bgmInterval = null;
    this.musicVolume = 0.18;
    this.sfxVolume = 0.35;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted && this.bgmPlaying) {
      this.stopMusic();
    } else if (!this.muted && !this.bgmPlaying) {
      this.startMusic();
    }
    return this.muted;
  }

  // --- SOUND EFFECTS ---

  // Triumphant fanfare when player CRASHES into an obstacle (Positive reinforcement!)
  playCrashSound(isTrain = false) {
    if (this.muted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    
    // Major triad celebratory arpeggio (C5 -> E5 -> G5 -> C6)
    const notes = isTrain ? [261.63, 329.63, 392.00, 523.25, 659.25, 783.99] : [329.63, 392.00, 523.25, 659.25];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      
      gain.gain.setValueAtTime(0.001, now + idx * 0.05);
      gain.gain.linearRampToValueAtTime(this.sfxVolume * (isTrain ? 0.4 : 0.3), now + idx * 0.05 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.35);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.4);
    });

    // Impact punch noise
    this.playNoise(0.2, 800, isTrain ? 0.5 : 0.25);
  }

  // Sad trombone / womp-womp when player collects a coin (Punishment!)
  playSadCoinSound() {
    if (this.muted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    // Descending slide: E-flat down to low C
    osc.frequency.setValueAtTime(311.13, now);
    osc.frequency.exponentialRampToValueAtTime(146.83, now + 0.38);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.25, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    // Low pass filter for muffled 'sad' quality
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  // Pleasant crisp ka-ching when player successfully MISSES a coin (Reward!)
  playMissCoinSound() {
    if (this.muted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    [1046.50, 1318.51].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0.001, now + idx * 0.07);
      gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.25, now + idx * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.07 + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.28);
    });
  }

  // Disappointed buzzer when player dodges an obstacle
  playAvoidSound() {
    if (this.muted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.setValueAtTime(196, now + 0.08);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.15, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  // Jump sound: retro spring blip
  playJumpSound() {
    if (this.muted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.15);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.2, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Duck sound: low swoosh
  playDuckSound() {
    if (this.muted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.22, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  // Combo level up fanfare
  playComboSound(level) {
    if (this.muted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    const base = 440 + Math.min(level, 10) * 40;
    const notes = [base, base * 1.25, base * 1.5];

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.001, now + idx * 0.06);
      gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.3, now + idx * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.25);
    });
  }

  // Train horn sound
  playTrainHorn() {
    if (this.muted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    [220, 277.18].forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.25, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.65);
    });
  }

  // Powerup trigger sound
  playPowerupSound() {
    if (this.muted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(600, now + 0.25);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.2, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  // Achievement celebration chime
  playAchievementSound() {
    if (this.muted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    const chords = [523.25, 659.25, 783.99, 1046.50];
    chords.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0.001, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.3, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.45);
    });
  }

  // Noise generator for impacts
  playNoise(duration, cutoff, volume) {
    if (this.muted || !this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume * this.sfxVolume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
  }

  // --- BACKGROUND CHIPTUNE MUSIC ---
  startMusic() {
    if (this.muted || !this.ctx || this.bgmPlaying) return;
    this.resume();
    this.bgmPlaying = true;

    // Upbeat comedic bassline & arpeggio
    const bassNotes = [130.81, 130.81, 164.81, 196.00, 174.61, 164.81, 146.83, 196.00];
    const leadNotes = [261.63, 329.63, 392.00, 523.25, 493.88, 392.00, 329.63, 293.66];
    let step = 0;

    const tick = () => {
      if (!this.bgmPlaying || this.muted || !this.ctx) return;
      const now = this.ctx.currentTime;

      // Bass note (Square wave)
      const bOsc = this.ctx.createOscillator();
      const bGain = this.ctx.createGain();
      bOsc.type = 'square';
      bOsc.frequency.setValueAtTime(bassNotes[step % bassNotes.length], now);

      bGain.gain.setValueAtTime(0.001, now);
      bGain.gain.linearRampToValueAtTime(this.musicVolume * 0.22, now + 0.02);
      bGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

      bOsc.connect(bGain);
      bGain.connect(this.ctx.destination);
      bOsc.start(now);
      bOsc.stop(now + 0.18);

      // Lead note on alternate beats
      if (step % 2 === 0) {
        const lOsc = this.ctx.createOscillator();
        const lGain = this.ctx.createGain();
        lOsc.type = 'triangle';
        lOsc.frequency.setValueAtTime(leadNotes[(step / 2) % leadNotes.length], now);

        lGain.gain.setValueAtTime(0.001, now);
        lGain.gain.linearRampToValueAtTime(this.musicVolume * 0.18, now + 0.02);
        lGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

        lOsc.connect(lGain);
        lGain.connect(this.ctx.destination);
        lOsc.start(now);
        lOsc.stop(now + 0.26);
      }

      step++;
    };

    this.bgmInterval = setInterval(tick, 180);
  }

  stopMusic() {
    this.bgmPlaying = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}

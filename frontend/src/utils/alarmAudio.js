/**
 * Web Audio API Continuous Emergency Alarm / Siren Beeper
 * Plays repeating high-priority alert pulses until stopped by Super Admin.
 */
class AlarmService {
  constructor() {
    this.audioCtx = null;
    this.intervalId = null;
    this.isPlaying = false;
  }

  start() {
    if (this.isPlaying) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('Web Audio API not supported in this browser.');
        return;
      }

      this.audioCtx = new AudioContextClass();
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      this.isPlaying = true;

      const triggerPulse = () => {
        if (!this.isPlaying || !this.audioCtx) return;
        try {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();

          osc.type = 'sawtooth';
          const now = this.audioCtx.currentTime;

          // Piercing two-tone emergency siren pulse: 880Hz down to 440Hz
          osc.frequency.setValueAtTime(880, now);
          osc.frequency.exponentialRampToValueAtTime(440, now + 0.35);

          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);

          osc.start(now);
          osc.stop(now + 0.35);
        } catch (e) {
          console.warn('Error during alarm pulse:', e);
        }
      };

      triggerPulse();
      this.intervalId = setInterval(triggerPulse, 700);
    } catch (err) {
      console.warn('Unable to initialize Web Audio context:', err);
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch (e) {}
      this.audioCtx = null;
    }
  }
}

export const alarmAudio = new AlarmService();

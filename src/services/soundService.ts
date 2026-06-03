
class SoundService {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  private initCtx() {
    if (this.muted) return;
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.1, slideTo?: number) {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);
    }

    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playDraw() {
    // Short high-pitched slide up
    this.playTone(440, 'square', 0.1, 0.05, 880);
  }

  playPlay() {
    // Medium-pitched blip
    this.playTone(330, 'triangle', 0.1, 0.1);
  }

  playTurn() {
    // Two-tone notification
    this.playTone(523.25, 'sine', 0.1, 0.05); // C5
    setTimeout(() => this.playTone(659.25, 'sine', 0.1, 0.05), 100); // E5
  }

  playRoundEnd() {
    // Upward scale
    [261.63, 329.63, 392.00, 523.25].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'square', 0.15, 0.05), i * 150);
    });
  }

  playWin() {
    // Victory jingle
    const notes = [523.23, 523.23, 523.23, 659.25, 783.99, 1046.50];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'square', 0.2, 0.05), i * 100);
    });
  }

  playLose() {
    // Defeat slide down
    this.playTone(392.00, 'sawtooth', 0.5, 0.05, 130.81);
  }

  playMessage() {
    // Soft high beep for chat message
    this.playTone(880, 'sine', 0.1, 0.05, 1000);
  }
}

export const soundService = new SoundService();

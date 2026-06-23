
class SoundService {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private masterVolume: number = 1.0;
  private profile: string = 'classic';

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  setVolume(volume: number) {
    this.masterVolume = volume;
  }

  setProfile(profile: string) {
    this.profile = profile || 'classic';
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

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.1, slideTo?: number, slideDuration?: number) {
    if (this.muted || this.masterVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + (slideDuration || duration));
    }

    const actualVolume = volume * this.masterVolume;
    gain.gain.setValueAtTime(actualVolume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playDraw() {
    switch (this.profile) {
      case 'arcade':
        this.playTone(300, 'square', 0.1, 0.05, 600);
        break;
      case 'casino':
        this.playTone(800, 'sine', 0.05, 0.1);
        setTimeout(() => this.playTone(1200, 'sine', 0.05, 0.1), 50);
        break;
      case 'minimal':
        this.playTone(150, 'sine', 0.05, 0.05);
        break;
      case 'classic':
      default:
        this.playTone(440, 'square', 0.1, 0.05, 880);
        break;
    }
  }

  playPlay() {
    switch (this.profile) {
      case 'arcade':
        this.playTone(400, 'sawtooth', 0.1, 0.05, 200);
        break;
      case 'casino':
        this.playTone(1000, 'triangle', 0.1, 0.1);
        break;
      case 'minimal':
        this.playTone(200, 'sine', 0.05, 0.05);
        break;
      case 'classic':
      default:
        this.playTone(330, 'triangle', 0.1, 0.1);
        break;
    }
  }

  playTurn() {
    switch (this.profile) {
      case 'arcade':
        this.playTone(440, 'square', 0.1, 0.05);
        setTimeout(() => this.playTone(880, 'square', 0.1, 0.05), 100);
        break;
      case 'casino':
        this.playTone(880, 'sine', 0.1, 0.1);
        setTimeout(() => this.playTone(1318.51, 'sine', 0.2, 0.1), 100);
        break;
      case 'minimal':
        this.playTone(200, 'sine', 0.04, 0.04);
        break;
      case 'classic':
      default:
        this.playTone(523.25, 'sine', 0.1, 0.05); // C5
        setTimeout(() => this.playTone(659.25, 'sine', 0.1, 0.05), 100); // E5
        break;
    }
  }

  playRoundEnd() {
    switch (this.profile) {
      case 'arcade':
        [220, 440, 660, 880].forEach((f, i) => {
          setTimeout(() => this.playTone(f, 'square', 0.1, 0.05), i * 100);
        });
        break;
      case 'casino':
        [659.25, 783.99, 1046.50, 1318.51].forEach((f, i) => {
          setTimeout(() => this.playTone(f, 'sine', 0.15, 0.05), i * 100);
        });
        break;
      case 'minimal':
        this.playTone(250, 'sine', 0.08, 0.04);
        setTimeout(() => this.playTone(350, 'sine', 0.08, 0.04), 150);
        break;
      case 'classic':
      default:
        [261.63, 329.63, 392.00, 523.25].forEach((f, i) => {
          setTimeout(() => this.playTone(f, 'square', 0.15, 0.05), i * 150);
        });
        break;
    }
  }

  playWin() {
    switch (this.profile) {
      case 'arcade':
        const arcadeNotes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
        arcadeNotes.forEach((f, i) => {
          setTimeout(() => this.playTone(f, 'square', 0.15, 0.05), i * 80);
        });
        break;
      case 'casino':
        const casinoNotes = [1046.50, 1318.51, 1567.98, 2093.00, 1567.98, 2093.00];
        casinoNotes.forEach((f, i) => {
          setTimeout(() => this.playTone(f, 'sine', 0.15, 0.1), i * 100);
        });
        break;
      case 'minimal':
        this.playTone(300, 'sine', 0.1, 0.04);
        setTimeout(() => this.playTone(400, 'sine', 0.1, 0.04), 150);
        setTimeout(() => this.playTone(500, 'sine', 0.15, 0.04), 300);
        break;
      case 'classic':
      default:
        const notes = [523.23, 523.23, 523.23, 659.25, 783.99, 1046.50];
        notes.forEach((f, i) => {
          setTimeout(() => this.playTone(f, 'square', 0.2, 0.05), i * 100);
        });
        break;
    }
  }

  playLose() {
    switch (this.profile) {
      case 'arcade':
        this.playTone(200, 'sawtooth', 0.6, 0.05, 50);
        break;
      case 'casino':
        this.playTone(300, 'triangle', 0.4, 0.05, 150);
        setTimeout(() => this.playTone(200, 'triangle', 0.4, 0.05, 100), 200);
        break;
      case 'minimal':
        this.playTone(200, 'sine', 0.4, 0.05, 150);
        break;
      case 'classic':
      default:
        this.playTone(392.00, 'sawtooth', 0.5, 0.05, 130.81);
        break;
    }
  }

  playMessage() {
    switch (this.profile) {
      case 'minimal':
        this.playTone(800, 'sine', 0.05, 0.05);
        break;
      case 'casino':
        this.playTone(1500, 'sine', 0.1, 0.05);
        break;
      case 'arcade':
        this.playTone(600, 'square', 0.1, 0.05, 800);
        break;
      case 'classic':
      default:
        this.playTone(880, 'sine', 0.1, 0.05, 1000);
        break;
    }
  }
}

export const soundService = new SoundService();

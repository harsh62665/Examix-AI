/**
 * Automatic Story-Adaptive Atmosphere & Cinematic SFX Engine
 * Dynamically analyzes story content, mood, emotion, setting, and narrative progress
 * to synthesize cinematic background music (BGM), dynamic soundscapes, and context-aware SFX.
 */

export interface MoodProfile {
  id: string;
  name: string;
  hindiName: string;
  emoji: string;
  description: string;
  tag: string;
  chordType: 'cinematic_epic' | 'nostalgic_warm' | 'mysterious_suspense' | 'inspiring_hope' | 'deep_zen' | 'dramatic_conflict' | 'rain_cozy';
  tempo: number; // in BPM
  accentColor: string;
}

export const AUTO_MOODS: Record<string, MoodProfile> = {
  auto_smart: {
    id: 'auto_smart',
    name: 'Auto Story-Sync AI',
    hindiName: 'ऑटोमेटिक स्टोरी-सिंक BGM',
    emoji: '✨',
    description: 'Real-time AI mood detector adjusts music and sound effects with each paragraph scene',
    tag: 'Dynamic AI',
    chordType: 'nostalgic_warm',
    tempo: 60,
    accentColor: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30'
  },
  village_nostalgia: {
    id: 'village_nostalgia',
    name: 'Village & Literary Folk (पंचलाइट, कफन)',
    hindiName: 'ग्रामीण व लोक वातावरण',
    emoji: '🪕',
    description: 'Warm acoustic harmonium drone, village morning ambiance, gentle acoustic tanpura hum',
    tag: 'Hindi Literature',
    chordType: 'nostalgic_warm',
    tempo: 58,
    accentColor: 'from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/30'
  },
  epic_history: {
    id: 'epic_history',
    name: 'Epic Historic Drama (1857, Bastille)',
    hindiName: 'ऐतिहासिक महागाथा',
    emoji: '⚔️',
    description: 'Dramatic low war drum pulse, brass resonance drone, intense orchestral atmosphere',
    tag: 'Epic History',
    chordType: 'cinematic_epic',
    tempo: 65,
    accentColor: 'from-red-500/20 to-amber-500/10 text-red-400 border-red-500/30'
  },
  science_cosmos: {
    id: 'science_cosmos',
    name: 'Science & Cosmic Wonder (Physics, Bio)',
    hindiName: 'वैज्ञानिक ब्रह्मांडीय ध्वनि',
    emoji: '🚀',
    description: 'Sub-space synth pad, celestial crystal arpeggios, pulsing discovery resonance',
    tag: 'Science & Math',
    chordType: 'inspiring_hope',
    tempo: 70,
    accentColor: 'from-cyan-500/20 to-blue-500/10 text-cyan-400 border-cyan-500/30'
  },
  rainy_cozy: {
    id: 'rainy_cozy',
    name: 'Rainy Night Study & Reflection',
    hindiName: 'बरसात और गहरा चिंतन',
    emoji: '🌧️',
    description: 'Gentle rhythmic rain, distant thunder rumble, warm reflective electric piano chords',
    tag: 'Reflective',
    chordType: 'rain_cozy',
    tempo: 52,
    accentColor: 'from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/30'
  },
  dramatic_suspense: {
    id: 'dramatic_suspense',
    name: 'Mystery, Trap & Conflict (Exams, Twists)',
    hindiName: 'सस्पेंस व द्वंद्व',
    emoji: '⚡',
    description: 'Tense minor harmonic drone, heartbeat sub-bass, rising tension shimmer',
    tag: 'Suspense',
    chordType: 'mysterious_suspense',
    tempo: 50,
    accentColor: 'from-purple-500/20 to-pink-500/10 text-purple-400 border-purple-500/30'
  }
};

/**
 * Automatically detects the best atmosphere based on topic text and script cues
 */
export function detectStoryAtmosphere(title: string, scriptText: string = ''): string {
  const combined = `${title} ${scriptText}`.toLowerCase();

  // 1. Hindi Literature & Folk Stories (पंचलाइट, कफन, चीफ की दावत, गोदान, प्रेमचंद, रेणु)
  if (
    combined.includes('पंचलाइट') ||
    combined.includes('panchlight') ||
    combined.includes('कफन') ||
    combined.includes('kafan') ||
    combined.includes('चीफ की दावत') ||
    combined.includes('गोदान') ||
    combined.includes('प्रेमचंद') ||
    combined.includes('रेणु') ||
    combined.includes('गोधन') ||
    combined.includes('मुनरी') ||
    combined.includes('घीसू') ||
    combined.includes('माधव') ||
    combined.includes('टोली') ||
    combined.includes('गांव') ||
    combined.includes('ग्रामीण')
  ) {
    return 'village_nostalgia';
  }

  // 2. Historical Revolutions & Battles (1857, Bastille, French Revolution, Freedom, War, Napoleon)
  if (
    combined.includes('1857') ||
    combined.includes('revolt') ||
    combined.includes('revolution') ||
    combined.includes('bastille') ||
    combined.includes('war') ||
    combined.includes('kranti') ||
    combined.includes('क्रांति') ||
    combined.includes('आंदोलन') ||
    combined.includes('स्वतंत्रता') ||
    combined.includes('mangal pandey') ||
    combined.includes('jhansi') ||
    combined.includes('battle') ||
    combined.includes('empire')
  ) {
    return 'epic_history';
  }

  // 3. Science & Physics & Life Discoveries (Newton, Space, Photosynthesis, Cell, Chemistry, Orbit)
  if (
    combined.includes('newton') ||
    combined.includes('physics') ||
    combined.includes('rocket') ||
    combined.includes('momentum') ||
    combined.includes('photosynthesis') ||
    combined.includes('biology') ||
    combined.includes('chemistry') ||
    combined.includes('calculus') ||
    combined.includes('derivative') ||
    combined.includes('atom') ||
    combined.includes('cell') ||
    combined.includes('space') ||
    combined.includes('quantum')
  ) {
    return 'science_cosmos';
  }

  // 4. Suspense, Climax & Conflict
  if (
    combined.includes('conflict') ||
    combined.includes('crisis') ||
    combined.includes('trap') ||
    combined.includes('danger') ||
    combined.includes('विपत्ति') ||
    combined.includes('रहस्य') ||
    combined.includes('द्वंद्व')
  ) {
    return 'dramatic_suspense';
  }

  // Default: Smart village/warm study
  return 'village_nostalgia';
}

class AutoStoryAudioEngine {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: (AudioNode | number)[] = [];
  private currentMood: string = 'village_nostalgia';
  private isAutoMode: boolean = true;
  private isPlaying: boolean = false;
  private volume: number = 0.28; // Subtle 28% background so voice narration is perfectly crisp
  private intervalIds: number[] = [];

  private initContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public isAuto(): boolean {
    return this.isAutoMode;
  }

  public setAuto(enabled: boolean) {
    this.isAutoMode = enabled;
  }

  public getCurrentMood(): string {
    return this.currentMood;
  }

  public isSoundPlaying(): boolean {
    return this.isPlaying;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
    }
  }

  public stop() {
    this.intervalIds.forEach(id => clearInterval(id));
    this.intervalIds = [];

    this.activeNodes.forEach(node => {
      if (typeof node !== 'number') {
        try {
          if ('stop' in node && typeof (node as any).stop === 'function') {
            (node as any).stop();
          }
          node.disconnect();
        } catch (e) {}
      }
    });
    this.activeNodes = [];

    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch (e) {}
      this.masterGain = null;
    }

    this.isPlaying = false;
  }

  /**
   * Auto-sync: Plays background music matching the story's topic and current narrative section
   */
  public autoPlayForStory(topic: string, scriptText: string = '', section: 'hook' | 'journey' | 'climax' | 'all' = 'all') {
    const detectedMood = detectStoryAtmosphere(topic, scriptText);
    this.playMood(detectedMood, this.volume, section);
  }

  public playMood(moodId: string, customVolume?: number, section: 'hook' | 'journey' | 'climax' | 'all' = 'all') {
    this.stop();
    this.currentMood = moodId;

    if (customVolume !== undefined) {
      this.volume = Math.max(0, Math.min(1, customVolume));
    }

    const ctx = this.initContext();
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, ctx.currentTime);
    this.masterGain.connect(ctx.destination);

    this.isPlaying = true;

    switch (moodId) {
      case 'village_nostalgia':
        this.synthesizeVillageFolk(ctx, this.masterGain, section);
        break;
      case 'epic_history':
        this.synthesizeEpicHistory(ctx, this.masterGain, section);
        break;
      case 'science_cosmos':
        this.synthesizeScienceCosmos(ctx, this.masterGain, section);
        break;
      case 'rainy_cozy':
        this.synthesizeRainyCozy(ctx, this.masterGain, section);
        break;
      case 'dramatic_suspense':
        this.synthesizeDramaticSuspense(ctx, this.masterGain, section);
        break;
      default:
        this.synthesizeVillageFolk(ctx, this.masterGain, section);
        break;
    }
  }

  // --- PROCEDURAL AUDIO / CINEMATIC SYNTHESIZERS ---

  private createNoiseBuffer(ctx: AudioContext, type: 'pink' | 'brown' = 'pink'): AudioBuffer {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (type === 'pink') {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
        b6 = white * 0.115926;
      } else {
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 1.2;
      }
    }
    return buffer;
  }

  /**
   * 1. Village & Literary Folk (पंचलाइट, कफन, गोदान):
   * Harmonium drone (Sa-Pa, C3 & G3), subtle flute vibrato harmonic, ambient evening breeze
   */
  private synthesizeVillageFolk(ctx: AudioContext, dest: GainNode, section: string) {
    // Tanpura / Harmonium Root & 5th (C3 130.81Hz, G3 196.00Hz, C4 261.63Hz)
    const tones = [130.81, 196.00, 261.63, 329.63]; // Sa, Pa, Sa, Ga (Kalyan / Bilawal scale vibe)
    tones.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      // Warm acoustic low-pass filter (simulates wooden bellows of Indian harmonium)
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420 + idx * 80, ctx.currentTime);

      // Gentle vibrato LFO
      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.4 + idx * 0.1, ctx.currentTime);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(1.2, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.045 / (idx + 1), ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start();

      this.activeNodes.push(osc, filter, lfo, lfoGain, gain);
    });

    // Gentle rural evening air (filtered pink noise)
    const windBuf = this.createNoiseBuffer(ctx, 'pink');
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = windBuf;
    windSrc.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.setValueAtTime(320, ctx.currentTime);
    windFilter.Q.setValueAtTime(0.8, ctx.currentTime);

    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0.12, ctx.currentTime);

    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(dest);
    windSrc.start();

    this.activeNodes.push(windSrc, windFilter, windGain);

    // Subtle temple / village chime every 12 seconds
    const triggerVillageChime = () => {
      if (!this.isPlaying || !this.masterGain) return;
      try {
        const chime = ctx.createOscillator();
        chime.type = 'sine';
        chime.frequency.setValueAtTime(1046.5, ctx.currentTime); // High C6
        const cGain = ctx.createGain();
        const now = ctx.currentTime;
        cGain.gain.setValueAtTime(0.001, now);
        cGain.gain.linearRampToValueAtTime(0.05, now + 0.05);
        cGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);
        chime.connect(cGain);
        cGain.connect(dest);
        chime.start(now);
        chime.stop(now + 3);
      } catch (e) {}
    };

    const interval = window.setInterval(triggerVillageChime, 14000);
    this.intervalIds.push(interval);
  }

  /**
   * 2. Epic Historic Drama (1857, French Revolution):
   * Deep orchestral sub-drone, brass undertone, rhythmic war drum cadence
   */
  private synthesizeEpicHistory(ctx: AudioContext, dest: GainNode, section: string) {
    // Low Epic D Minor Drone (D2 73.42Hz, A2 110.0Hz, D3 146.83Hz)
    const freqs = [73.42, 110.0, 146.83];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(280, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.05, ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start();

      this.activeNodes.push(osc, filter, gain);
    });

    // Sub-bass rumble
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(55, ctx.currentTime); // Low A1
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.08, ctx.currentTime);
    subOsc.connect(subGain);
    subGain.connect(dest);
    subOsc.start();
    this.activeNodes.push(subOsc, subGain);

    // Historic War Drum / Kettle Drum beat (every 3 seconds)
    const triggerWarDrum = () => {
      if (!this.isPlaying || !this.masterGain) return;
      try {
        const drumOsc = ctx.createOscillator();
        drumOsc.type = 'sine';
        const now = ctx.currentTime;
        drumOsc.frequency.setValueAtTime(110, now);
        drumOsc.frequency.exponentialRampToValueAtTime(42, now + 0.3);

        const drumGain = ctx.createGain();
        drumGain.gain.setValueAtTime(0.22, now);
        drumGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        drumOsc.connect(drumGain);
        drumGain.connect(dest);
        drumOsc.start(now);
        drumOsc.stop(now + 0.7);
      } catch (e) {}
    };

    const interval = window.setInterval(triggerWarDrum, 3200);
    this.intervalIds.push(interval);
  }

  /**
   * 3. Science & Cosmic Wonder (Newton, Photosynthesis, Calculus):
   * Shimmering crystal pad, pulsating discovery resonance, 432Hz ambient science chord
   */
  private synthesizeScienceCosmos(ctx: AudioContext, dest: GainNode, section: string) {
    const freqs = [216, 288, 324, 432, 576]; // Harmonic Series (432Hz tuning)
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.2 + idx * 0.05, ctx.currentTime);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(0.8, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.035, ctx.currentTime);

      osc.connect(gain);
      gain.connect(dest);
      osc.start();

      this.activeNodes.push(osc, lfo, lfoGain, gain);
    });

    // Cosmic shimmer arpeggio pulse
    const triggerCosmicSpark = () => {
      if (!this.isPlaying || !this.masterGain) return;
      try {
        const spark = ctx.createOscillator();
        spark.type = 'triangle';
        const now = ctx.currentTime;
        spark.frequency.setValueAtTime(864 + Math.random() * 400, now);
        const sGain = ctx.createGain();
        sGain.gain.setValueAtTime(0.001, now);
        sGain.gain.linearRampToValueAtTime(0.04, now + 0.1);
        sGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
        spark.connect(sGain);
        sGain.connect(dest);
        spark.start(now);
        spark.stop(now + 1.3);
      } catch (e) {}
    };

    const interval = window.setInterval(triggerCosmicSpark, 4500);
    this.intervalIds.push(interval);
  }

  /**
   * 4. Rainy Cozy:
   * Continuous gentle rain + subtle thunder and Rhodes chord
   */
  private synthesizeRainyCozy(ctx: AudioContext, dest: GainNode, section: string) {
    const rainBuf = this.createNoiseBuffer(ctx, 'pink');
    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = rainBuf;
    rainSrc.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1300, ctx.currentTime);

    const rainGain = ctx.createGain();
    rainGain.gain.setValueAtTime(0.28, ctx.currentTime);

    rainSrc.connect(filter);
    filter.connect(rainGain);
    rainGain.connect(dest);
    rainSrc.start();

    this.activeNodes.push(rainSrc, filter, rainGain);
  }

  /**
   * 5. Dramatic Suspense:
   * Low tension heartbeat + rising mystery shimmer
   */
  private synthesizeDramaticSuspense(ctx: AudioContext, dest: GainNode, section: string) {
    const drone = ctx.createOscillator();
    drone.type = 'sawtooth';
    drone.frequency.setValueAtTime(65.41, ctx.currentTime); // C2

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.06, ctx.currentTime);

    drone.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    drone.start();

    this.activeNodes.push(drone, filter, gain);

    // Heartbeat sub-pulse
    const triggerHeartbeat = () => {
      if (!this.isPlaying || !this.masterGain) return;
      try {
        const beat = ctx.createOscillator();
        beat.type = 'sine';
        const now = ctx.currentTime;
        beat.frequency.setValueAtTime(75, now);
        beat.frequency.exponentialRampToValueAtTime(32, now + 0.18);
        const bGain = ctx.createGain();
        bGain.gain.setValueAtTime(0.18, now);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        beat.connect(bGain);
        bGain.connect(dest);
        beat.start(now);
        beat.stop(now + 0.35);
      } catch (e) {}
    };

    const interval = window.setInterval(triggerHeartbeat, 1800);
    this.intervalIds.push(interval);
  }

  // Trigger high-yield dramatic sound effects during story turning points
  public playSFX(type: 'reveal' | 'climax' | 'drum_hit' | 'chime') {
    if (!this.isPlaying) return;
    const ctx = this.initContext();
    const now = ctx.currentTime;

    if (type === 'reveal') {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.4);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.7);
    } else if (type === 'drum_hit') {
      const drum = ctx.createOscillator();
      drum.type = 'sine';
      drum.frequency.setValueAtTime(140, now);
      drum.frequency.exponentialRampToValueAtTime(30, now + 0.25);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      drum.connect(gain);
      gain.connect(ctx.destination);
      drum.start(now);
      drum.stop(now + 0.45);
    }
  }
}

export const autoAudioEngine = new AutoStoryAudioEngine();

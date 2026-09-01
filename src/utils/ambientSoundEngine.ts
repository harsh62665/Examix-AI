/**
 * Ambient Background Soundscape Engine for Examix AI Podcast & Audio Studio
 * Procedural Web Audio API sound generator for zero-latency, realistic study atmospheres.
 */

export interface AmbientProfile {
  id: string;
  name: string;
  emoji: string;
  description: string;
  tag: string;
  accentColor: string;
}

export const AMBIENT_PROFILES: AmbientProfile[] = [
  {
    id: 'rainy_library',
    name: 'Rainy Library',
    emoji: '🌧️',
    description: 'Soft pattering raindrops, distant cozy thunder, and warm acoustic resonance',
    tag: 'Deep Focus',
    accentColor: 'from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/30'
  },
  {
    id: 'cafe_study',
    name: 'Cafe Study',
    emoji: '☕',
    description: 'Warm coffeehouse murmur, soft acoustic hum, and gentle ceramic clinks',
    tag: 'Cozy Ambience',
    accentColor: 'from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/30'
  },
  {
    id: 'lofi_beats',
    name: 'Lo-fi Beats',
    emoji: '🎧',
    description: 'Smooth vinyl crackle, mellow electric Rhodes chords, and relaxing sub-rhythm',
    tag: 'Flow State',
    accentColor: 'from-purple-500/20 to-pink-500/10 text-purple-400 border-purple-500/30'
  },
  {
    id: 'deep_ocean',
    name: 'Deep Ocean Waves',
    emoji: '🌊',
    description: 'Calming rhythmic tidal surges and soothing pink noise for stress reduction',
    tag: 'Calm & Zen',
    accentColor: 'from-cyan-500/20 to-teal-500/10 text-cyan-400 border-cyan-500/30'
  },
  {
    id: 'alpha_binaural',
    name: 'Alpha Waves (10Hz)',
    emoji: '🧘',
    description: 'Pure 10Hz alpha binaural brainwave entrainment with 432Hz harmonic meditation drone',
    tag: 'Memory Retention',
    accentColor: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30'
  },
  {
    id: 'forest_wind',
    name: 'Forest & Gentle Wind',
    emoji: '🌲',
    description: 'Rustling leaves, gentle mountain breeze, and serene pine forest vibe',
    tag: 'Nature Solitude',
    accentColor: 'from-green-500/20 to-emerald-500/10 text-green-400 border-green-500/30'
  },
  {
    id: 'none',
    name: 'Pure Voice Only',
    emoji: '🔇',
    description: 'Crystal clear studio narration without background ambience',
    tag: 'Studio Pure',
    accentColor: 'from-gray-500/20 to-slate-500/10 text-gray-400 border-gray-500/30'
  }
];

class AmbientSoundEngine {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: (AudioNode | number)[] = [];
  private activeProfileId: string = 'none';
  private currentVolume: number = 0.35; // Default 35% background volume
  private isPlaying: boolean = false;
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

  public getActiveProfile(): string {
    return this.activeProfileId;
  }

  public isSoundPlaying(): boolean {
    return this.isPlaying;
  }

  public getVolume(): number {
    return this.currentVolume;
  }

  public setVolume(volume: number) {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(this.currentVolume, this.audioCtx.currentTime);
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
        } catch (e) {
          // ignore already stopped nodes
        }
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

  public play(profileId: string, volume?: number) {
    this.stop();
    this.activeProfileId = profileId;

    if (profileId === 'none') {
      this.isPlaying = false;
      return;
    }

    if (volume !== undefined) {
      this.currentVolume = Math.max(0, Math.min(1, volume));
    }

    const ctx = this.initContext();
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.currentVolume, ctx.currentTime);
    this.masterGain.connect(ctx.destination);

    this.isPlaying = true;

    switch (profileId) {
      case 'rainy_library':
        this.synthesizeRainyLibrary(ctx, this.masterGain);
        break;
      case 'cafe_study':
        this.synthesizeCafeStudy(ctx, this.masterGain);
        break;
      case 'lofi_beats':
        this.synthesizeLofiBeats(ctx, this.masterGain);
        break;
      case 'deep_ocean':
        this.synthesizeOceanWaves(ctx, this.masterGain);
        break;
      case 'alpha_binaural':
        this.synthesizeAlphaBinaural(ctx, this.masterGain);
        break;
      case 'forest_wind':
        this.synthesizeForestWind(ctx, this.masterGain);
        break;
      default:
        break;
    }
  }

  // --- SOUND SYNTHESIS METHODS ---

  private createNoiseBuffer(ctx: AudioContext, type: 'white' | 'pink' | 'brown' = 'pink'): AudioBuffer {
    const bufferSize = ctx.sampleRate * 2; // 2 seconds looping buffer
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (type === 'white') {
        data[i] = white * 0.3;
      } else if (type === 'pink') {
        // Paul Kellet's refined pink noise filter
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
        b6 = white * 0.115926;
      } else {
        // Brown noise
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 1.5;
      }
    }
    return buffer;
  }

  /**
   * 1. Rainy Library: continuous soft rain noise + occasional distant thunder rumble
   */
  private synthesizeRainyLibrary(ctx: AudioContext, destination: GainNode) {
    // Continuous Rain Sound
    const rainBuffer = this.createNoiseBuffer(ctx, 'pink');
    const rainSource = ctx.createBufferSource();
    rainSource.buffer = rainBuffer;
    rainSource.loop = true;

    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'lowpass';
    rainFilter.frequency.setValueAtTime(1400, ctx.currentTime);

    const rainGain = ctx.createGain();
    rainGain.gain.setValueAtTime(0.4, ctx.currentTime);

    rainSource.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(destination);
    rainSource.start();

    this.activeNodes.push(rainSource, rainFilter, rainGain);

    // Distant Thunder periodic trigger (every 8-15 seconds)
    const triggerThunder = () => {
      if (!this.isPlaying || !this.masterGain) return;
      try {
        const thunderBuffer = this.createNoiseBuffer(ctx, 'brown');
        const thunderSource = ctx.createBufferSource();
        thunderSource.buffer = thunderBuffer;

        const thunderFilter = ctx.createBiquadFilter();
        thunderFilter.type = 'lowpass';
        thunderFilter.frequency.setValueAtTime(120, ctx.currentTime);
        thunderFilter.Q.setValueAtTime(3, ctx.currentTime);

        const thunderGain = ctx.createGain();
        const now = ctx.currentTime;
        thunderGain.gain.setValueAtTime(0.001, now);
        thunderGain.gain.linearRampToValueAtTime(0.35, now + 1.2);
        thunderGain.gain.exponentialRampToValueAtTime(0.001, now + 4.5);

        thunderSource.connect(thunderFilter);
        thunderFilter.connect(thunderGain);
        thunderGain.connect(destination);

        thunderSource.start(now);
        thunderSource.stop(now + 5);
      } catch (e) {}
    };

    const interval = window.setInterval(triggerThunder, 10000);
    this.intervalIds.push(interval);
  }

  /**
   * 2. Cafe Study: Warm chatter murmur + subtle cup clinks + low ambient resonance
   */
  private synthesizeCafeStudy(ctx: AudioContext, destination: GainNode) {
    // Cafe Murmur / Atmosphere
    const murmurBuffer = this.createNoiseBuffer(ctx, 'pink');
    const murmurSource = ctx.createBufferSource();
    murmurSource.buffer = murmurBuffer;
    murmurSource.loop = true;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(450, ctx.currentTime);
    bandpass.Q.setValueAtTime(1.2, ctx.currentTime);

    const murmurGain = ctx.createGain();
    murmurGain.gain.setValueAtTime(0.3, ctx.currentTime);

    murmurSource.connect(bandpass);
    bandpass.connect(murmurGain);
    murmurGain.connect(destination);
    murmurSource.start();

    // Warm Low Drone
    const drone = ctx.createOscillator();
    drone.type = 'sine';
    drone.frequency.setValueAtTime(110, ctx.currentTime);
    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.08, ctx.currentTime);
    drone.connect(droneGain);
    droneGain.connect(destination);
    drone.start();

    this.activeNodes.push(murmurSource, bandpass, murmurGain, drone, droneGain);

    // Subtle Cafe Ceramic Clink (randomly every 6-12 seconds)
    const triggerClink = () => {
      if (!this.isPlaying || !this.masterGain) return;
      try {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2200 + Math.random() * 800, ctx.currentTime);

        const clinkGain = ctx.createGain();
        const now = ctx.currentTime;
        clinkGain.gain.setValueAtTime(0.001, now);
        clinkGain.gain.linearRampToValueAtTime(0.08, now + 0.02);
        clinkGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

        osc.connect(clinkGain);
        clinkGain.connect(destination);
        osc.start(now);
        osc.stop(now + 0.4);
      } catch (e) {}
    };

    const interval = window.setInterval(triggerClink, 7500);
    this.intervalIds.push(interval);
  }

  /**
   * 3. Lo-fi Beats: Vinyl crackle + smooth Rhodes electric piano pad + subtle kick
   */
  private synthesizeLofiBeats(ctx: AudioContext, destination: GainNode) {
    // Vinyl crackle (pink noise with high pass filter)
    const vinylBuffer = this.createNoiseBuffer(ctx, 'pink');
    const vinylSource = ctx.createBufferSource();
    vinylSource.buffer = vinylBuffer;
    vinylSource.loop = true;

    const vinylFilter = ctx.createBiquadFilter();
    vinylFilter.type = 'highpass';
    vinylFilter.frequency.setValueAtTime(3000, ctx.currentTime);

    const vinylGain = ctx.createGain();
    vinylGain.gain.setValueAtTime(0.08, ctx.currentTime);

    vinylSource.connect(vinylFilter);
    vinylFilter.connect(vinylGain);
    vinylGain.connect(destination);
    vinylSource.start();

    // Lo-fi Chord Drone (Warm F minor / Ab Major Chord)
    const freqs = [174.61, 220.0, 261.63, 329.63]; // F3, A3, C4, E4 mellow chord
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      // Add gentle vibrato
      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.3 + idx * 0.05, ctx.currentTime);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(1.5, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();

      const chordGain = ctx.createGain();
      chordGain.gain.setValueAtTime(0.06, ctx.currentTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, ctx.currentTime);

      osc.connect(filter);
      filter.connect(chordGain);
      chordGain.connect(destination);
      osc.start();

      this.activeNodes.push(osc, lfo, lfoGain, chordGain, filter);
    });

    this.activeNodes.push(vinylSource, vinylFilter, vinylGain);

    // Subtle Lo-fi Heartbeat Kick (every 2.4 seconds = 50 BPM)
    const triggerLofiKick = () => {
      if (!this.isPlaying || !this.masterGain) return;
      try {
        const kickOsc = ctx.createOscillator();
        kickOsc.type = 'sine';
        const now = ctx.currentTime;
        kickOsc.frequency.setValueAtTime(90, now);
        kickOsc.frequency.exponentialRampToValueAtTime(35, now + 0.15);

        const kickGain = ctx.createGain();
        kickGain.gain.setValueAtTime(0.18, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        kickOsc.connect(kickGain);
        kickGain.connect(destination);
        kickOsc.start(now);
        kickOsc.stop(now + 0.4);
      } catch (e) {}
    };

    const interval = window.setInterval(triggerLofiKick, 2400);
    this.intervalIds.push(interval);
  }

  /**
   * 4. Deep Ocean Waves: Rhythmic tidal surge using LFO-modulated pink noise
   */
  private synthesizeOceanWaves(ctx: AudioContext, destination: GainNode) {
    const waveBuffer = this.createNoiseBuffer(ctx, 'pink');
    const waveSource = ctx.createBufferSource();
    waveSource.buffer = waveBuffer;
    waveSource.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, ctx.currentTime);

    // LFO to create rhythmic surge every 7 seconds
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.14, ctx.currentTime); // ~7.1s wave cycle

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(300, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    const waveGain = ctx.createGain();
    waveGain.gain.setValueAtTime(0.35, ctx.currentTime);

    waveSource.connect(filter);
    filter.connect(waveGain);
    waveGain.connect(destination);
    waveSource.start();

    this.activeNodes.push(waveSource, filter, lfo, lfoGain, waveGain);
  }

  /**
   * 5. Alpha Binaural (10Hz): 200Hz left ear + 210Hz right ear + 432Hz meditation tone
   */
  private synthesizeAlphaBinaural(ctx: AudioContext, destination: GainNode) {
    // Stereo panner for Left (200Hz) & Right (210Hz) -> 10Hz difference
    const leftOsc = ctx.createOscillator();
    leftOsc.type = 'sine';
    leftOsc.frequency.setValueAtTime(200, ctx.currentTime);

    const rightOsc = ctx.createOscillator();
    rightOsc.type = 'sine';
    rightOsc.frequency.setValueAtTime(210, ctx.currentTime);

    const leftGain = ctx.createGain();
    leftGain.gain.setValueAtTime(0.12, ctx.currentTime);

    const rightGain = ctx.createGain();
    rightGain.gain.setValueAtTime(0.12, ctx.currentTime);

    // Create stereo panners if supported
    if (ctx.createStereoPanner) {
      const leftPan = ctx.createStereoPanner();
      leftPan.pan.setValueAtTime(-0.9, ctx.currentTime);
      const rightPan = ctx.createStereoPanner();
      rightPan.pan.setValueAtTime(0.9, ctx.currentTime);

      leftOsc.connect(leftGain);
      leftGain.connect(leftPan);
      leftPan.connect(destination);

      rightOsc.connect(rightGain);
      rightGain.connect(rightPan);
      rightPan.connect(destination);

      this.activeNodes.push(leftPan, rightPan);
    } else {
      leftOsc.connect(leftGain);
      leftGain.connect(destination);
      rightOsc.connect(rightGain);
      rightGain.connect(destination);
    }

    // 432 Hz Harmonic Ambient Pad
    const pad = ctx.createOscillator();
    pad.type = 'sine';
    pad.frequency.setValueAtTime(432, ctx.currentTime);
    const padGain = ctx.createGain();
    padGain.gain.setValueAtTime(0.04, ctx.currentTime);
    pad.connect(padGain);
    padGain.connect(destination);

    leftOsc.start();
    rightOsc.start();
    pad.start();

    this.activeNodes.push(leftOsc, rightOsc, leftGain, rightGain, pad, padGain);
  }

  /**
   * 6. Forest & Gentle Wind: Whispering breeze with subtle harmonic rustle
   */
  private synthesizeForestWind(ctx: AudioContext, destination: GainNode) {
    const windBuffer = this.createNoiseBuffer(ctx, 'pink');
    const windSource = ctx.createBufferSource();
    windSource.buffer = windBuffer;
    windSource.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500, ctx.currentTime);
    filter.Q.setValueAtTime(0.8, ctx.currentTime);

    // Slow wind modulation
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.2, ctx.currentTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(250, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0.28, ctx.currentTime);

    windSource.connect(filter);
    filter.connect(windGain);
    windGain.connect(destination);
    windSource.start();

    this.activeNodes.push(windSource, filter, lfo, lfoGain, windGain);
  }
}

// Export singleton instance
export const ambientEngine = new AmbientSoundEngine();

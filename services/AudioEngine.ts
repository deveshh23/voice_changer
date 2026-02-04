
import { EffectSettings } from '../types';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  
  // High-Fidelity Signal Chain
  private noiseGate: GainNode | null = null;
  private preAmp: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private deEsser: BiquadFilterNode | null = null;
  
  // Transform Nodes
  private filter: BiquadFilterNode | null = null;
  private presenceFilter: BiquadFilterNode | null = null;
  private distortion: WaveShaperNode | null = null;
  
  // Robot / Ring Mod
  private robotModulator: OscillatorNode | null = null;
  private robotGain: GainNode | null = null;
  
  // Spatial
  private reverb: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private delay: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;

  // Mixing & Output
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private masterLimiter: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;

  private gateThreshold = -50; 

  constructor() {}

  async initialize(inputDeviceId?: string) {
    if (this.ctx) await this.ctx.close();
    
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
      latencyHint: 'interactive',
      sampleRate: 44100
    });

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: inputDeviceId ? { 
        deviceId: { exact: inputDeviceId },
        autoGainControl: true,
        noiseSuppression: false, // We handle it manually for better clarity
        echoCancellation: true
      } : true,
      video: false
    });

    this.source = this.ctx.createMediaStreamSource(this.stream);
    
    this.preAmp = this.ctx.createGain();
    this.noiseGate = this.ctx.createGain();
    
    this.deEsser = this.ctx.createBiquadFilter();
    this.deEsser.type = 'peaking';
    this.deEsser.frequency.value = 6000;
    this.deEsser.Q.value = 4;
    this.deEsser.gain.value = -12;

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-24, this.ctx.currentTime);
    this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);

    this.filter = this.ctx.createBiquadFilter();
    this.presenceFilter = this.ctx.createBiquadFilter();
    this.presenceFilter.type = 'highshelf';
    this.presenceFilter.frequency.value = 8000;

    this.distortion = this.ctx.createWaveShaper();
    this.distortion.curve = this.makeSoftCurve(0.1);
    
    this.robotGain = this.ctx.createGain();
    this.robotModulator = this.ctx.createOscillator();
    this.robotModulator.type = 'sine';
    this.robotModulator.connect(this.robotGain.gain);
    this.robotModulator.start();

    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = this.createImpulseResponse(1.5, 2.0);
    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.value = 0.05;

    this.delay = this.ctx.createDelay(1.0);
    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.value = 0.2;

    this.dryGain = this.ctx.createGain();
    this.wetGain = this.ctx.createGain();
    
    this.masterGain = this.ctx.createGain();
    this.masterLimiter = this.ctx.createDynamicsCompressor();
    this.masterLimiter.threshold.setValueAtTime(-1, this.ctx.currentTime);
    
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;

    // Routing
    this.source.connect(this.preAmp);
    this.preAmp.connect(this.noiseGate);
    this.noiseGate.connect(this.deEsser);
    this.deEsser.connect(this.compressor);

    // Dry
    this.compressor.connect(this.dryGain);
    this.dryGain.connect(this.masterLimiter);

    // Wet
    this.compressor.connect(this.filter);
    this.filter.connect(this.presenceFilter);
    this.presenceFilter.connect(this.distortion);
    this.distortion.connect(this.robotGain);
    this.robotGain.connect(this.wetGain);

    // Spatial Parallel
    this.wetGain.connect(this.reverb);
    this.reverb.connect(this.reverbGain);
    this.reverbGain.connect(this.masterLimiter);

    this.wetGain.connect(this.delay);
    this.delay.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delay);
    this.delay.connect(this.masterLimiter);

    this.wetGain.connect(this.masterLimiter);

    // Output
    this.masterLimiter.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    this.startNoiseGateMonitor();
  }

  private createImpulseResponse(duration: number, decay: number) {
    if (!this.ctx) return null;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    for (let i = 0; i < 2; i++) {
      const channelData = impulse.getChannelData(i);
      for (let j = 0; j < length; j++) {
        channelData[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, decay);
      }
    }
    return impulse;
  }

  private startNoiseGateMonitor() {
    if (!this.analyser || !this.noiseGate || !this.ctx) return;
    const buffer = new Float32Array(this.analyser.fftSize);
    const monitor = () => {
      if (!this.analyser || !this.noiseGate || !this.ctx) return;
      this.analyser.getFloatTimeDomainData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
      const rms = Math.sqrt(sum / buffer.length);
      const db = 20 * Math.log10(rms || 1e-10);
      const targetGain = db > this.gateThreshold ? 1 : 0;
      this.noiseGate.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
      requestAnimationFrame(monitor);
    };
    monitor();
  }

  setGateThreshold(db: number) {
    this.gateThreshold = db;
  }

  updateSettings(settings: EffectSettings) {
    if (!this.ctx || !this.robotModulator || !this.dryGain || !this.wetGain || !this.filter || !this.presenceFilter) return;
    const { pitch, robotFreq, distortion, gain, dryWet, bypass, clarity, resonance, filterFreq } = settings;
    const time = this.ctx.currentTime;

    if (bypass) {
      this.dryGain.gain.setTargetAtTime(1, time, 0.05);
      this.wetGain.gain.setTargetAtTime(0, time, 0.05);
      return;
    }

    this.dryGain.gain.setTargetAtTime(1 - dryWet, time, 0.05);
    this.wetGain.gain.setTargetAtTime(dryWet, time, 0.05);

    // Filter Logic: Formant-like shifting simulation via peaking filters and shelf
    this.filter.type = pitch < 0 ? 'lowpass' : 'highpass';
    this.filter.frequency.setTargetAtTime(filterFreq, time, 0.05);
    this.filter.Q.setTargetAtTime(resonance, time, 0.05);

    this.presenceFilter.gain.setTargetAtTime(clarity * 12, time, 0.05);

    this.robotModulator.frequency.setTargetAtTime(robotFreq, time, 0.05);
    this.distortion!.curve = this.makeSoftCurve(distortion);
    
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(gain, time, 0.05);
    }
  }

  private makeSoftCurve(amount: number) {
    const k = amount * 10;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = (1 + k) * x / (1 + k * Math.abs(x));
    }
    return curve;
  }

  getAnalyser() { return this.analyser; }

  async stop() {
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    if (this.ctx) await this.ctx.close();
  }
}

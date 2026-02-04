
export interface AudioDevice {
  deviceId: string;
  label: string;
}

export interface EffectSettings {
  pitch: number;      // Semitones (-12 to 12)
  robotFreq: number;  // Modulation frequency (0 to 100)
  distortion: number; // WaveShaper amount (0 to 1)
  filterFreq: number; // Low/High pass cutoff
  gain: number;       // Master gain
  dryWet: number;     // Mix balance
  bypass: boolean;
  clarity: number;    // High-end presence (0 to 1)
  resonance: number;  // Filter resonance (0 to 20)
}

export interface Preset {
  id: string;
  name: string;
  settings: EffectSettings;
  icon: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  INITIALIZING = 'INITIALIZING',
  ACTIVE = 'ACTIVE',
  ERROR = 'ERROR'
}

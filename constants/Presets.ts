
import { Preset } from '../types';

export const DEFAULT_PRESETS: Preset[] = [
  {
    id: 'clean',
    name: 'Natural',
    icon: '🎙️',
    settings: {
      pitch: 0, robotFreq: 0, distortion: 0, filterFreq: 12000, gain: 1.0, dryWet: 1.0, bypass: false, clarity: 0.5, resonance: 1.0
    }
  },
  {
    id: 'girl',
    name: 'Young Girl',
    icon: '👧',
    settings: {
      pitch: 7, robotFreq: 0, distortion: 0, filterFreq: 8000, gain: 1.0, dryWet: 1.0, bypass: false, clarity: 0.8, resonance: 2.0
    }
  },
  {
    id: 'woman',
    name: 'Woman',
    icon: '👩',
    settings: {
      pitch: 3, robotFreq: 0, distortion: 0, filterFreq: 6000, gain: 1.0, dryWet: 1.0, bypass: false, clarity: 0.6, resonance: 1.5
    }
  },
  {
    id: 'man',
    name: 'Man',
    icon: '👨',
    settings: {
      pitch: -3, robotFreq: 0, distortion: 0, filterFreq: 4000, gain: 1.1, dryWet: 1.0, bypass: false, clarity: 0.4, resonance: 1.2
    }
  },
  {
    id: 'uncle',
    name: 'Old Uncle',
    icon: '👴',
    settings: {
      pitch: -6, robotFreq: 5, distortion: 0.1, filterFreq: 3000, gain: 1.2, dryWet: 0.9, bypass: false, clarity: 0.3, resonance: 3.0
    }
  },
  {
    id: 'demon',
    name: 'Underworld',
    icon: '😈',
    settings: {
      pitch: -10, robotFreq: 20, distortion: 0.6, filterFreq: 2000, gain: 1.3, dryWet: 0.8, bypass: false, clarity: 0.2, resonance: 5.0
    }
  },
  {
    id: 'robot',
    name: 'Cybernetic',
    icon: '🤖',
    settings: {
      pitch: -2, robotFreq: 60, distortion: 0.3, filterFreq: 5000, gain: 1.1, dryWet: 0.7, bypass: false, clarity: 0.7, resonance: 4.0
    }
  },
  {
    id: 'radio',
    name: 'Vintage Radio',
    icon: '📻',
    settings: {
      pitch: 0, robotFreq: 0, distortion: 0.5, filterFreq: 2500, gain: 1.0, dryWet: 1.0, bypass: false, clarity: 0.9, resonance: 8.0
    }
  }
];

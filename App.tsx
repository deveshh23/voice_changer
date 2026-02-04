
import React, { useState, useEffect, useRef } from 'react';
import { AudioEngine } from './services/AudioEngine';
import { GeminiStylist } from './services/GeminiStylist';
import { Visualizer } from './components/Visualizer';
import { EffectSlider } from './components/EffectSlider';
import { DEFAULT_PRESETS } from './constants/Presets';
import { AppStatus, EffectSettings, AudioDevice, Preset } from './types';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedInput, setSelectedInput] = useState<string>('');
  const [settings, setSettings] = useState<EffectSettings>(DEFAULT_PRESETS[0].settings);
  const [activePreset, setActivePreset] = useState<string>(DEFAULT_PRESETS[0].id);
  const [stylistPrompt, setStylistPrompt] = useState('');
  const [isStylistLoading, setIsStylistLoading] = useState(false);
  const [gateThreshold, setGateThreshold] = useState(-50);

  const engineRef = useRef<AudioEngine>(new AudioEngine());
  const stylistRef = useRef<GeminiStylist>(new GeminiStylist());

  const initDevices = async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const inputs = allDevices
        .filter(d => d.kind === 'audioinput')
        .map(d => ({ deviceId: d.deviceId, label: d.label || 'Default Microphone' }));
      setDevices(inputs);
      if (inputs.length > 0) setSelectedInput(inputs[0].deviceId);
    } catch (err) {
      console.error('Device listing failed', err);
    }
  };

  useEffect(() => { initDevices(); }, []);
  
  useEffect(() => {
    if (status === AppStatus.ACTIVE) {
      engineRef.current.updateSettings(settings);
    }
  }, [settings, status]);

  const toggleEngine = async () => {
    if (status === AppStatus.ACTIVE) {
      await engineRef.current.stop();
      setStatus(AppStatus.IDLE);
    } else {
      setStatus(AppStatus.INITIALIZING);
      try {
        await engineRef.current.initialize(selectedInput);
        engineRef.current.setGateThreshold(gateThreshold);
        engineRef.current.updateSettings(settings);
        setStatus(AppStatus.ACTIVE);
      } catch (err) {
        setStatus(AppStatus.ERROR);
      }
    }
  };

  const handleGateChange = (val: number) => {
    setGateThreshold(val);
    engineRef.current.setGateThreshold(val);
  };

  const updateSetting = <K extends keyof EffectSettings>(key: K, val: EffectSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: val }));
    setActivePreset('custom');
  };

  const handleStylistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stylistPrompt.trim()) return;
    setIsStylistLoading(true);
    try {
      const res = await stylistRef.current.generateStyle(stylistPrompt);
      setSettings(res);
      setActivePreset('ai-stylist');
      setStylistPrompt('');
    } finally {
      setIsStylistLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#070708] text-zinc-100 font-sans overflow-hidden">
      <style>{`
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(24, 24, 27, 0.4);
        }
        ::-webkit-scrollbar-thumb {
          background: #3f3f46;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #4f46e5;
        }
      `}</style>

      {/* Precision Sidebar */}
      <aside className="w-80 border-r border-zinc-800 bg-zinc-900/10 flex flex-col backdrop-blur-3xl shrink-0">
        <div className="p-8 border-b border-zinc-800/50">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shadow-xl shadow-indigo-500/20">
               <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            </div>
            <div>
              <h1 className="font-black text-lg leading-none tracking-tight">VOICE PULSE</h1>
              <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-[0.3em] mt-1 block">Refined DSP v2</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-6 space-y-1 scrollbar-thin">
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4 px-2">Identity Presets</p>
          <div className="space-y-1.5">
            {DEFAULT_PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => { setActivePreset(p.id); setSettings(p.settings); }}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all border ${activePreset === p.id ? 'bg-indigo-600 border-indigo-400 text-white shadow-xl shadow-indigo-500/10' : 'bg-transparent border-transparent hover:bg-zinc-800/40 text-zinc-500'}`}
              >
                <span className="text-lg opacity-80">{p.icon}</span>
                <span className="text-sm font-bold truncate">{p.name}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="p-6 border-t border-zinc-800">
          <label className="block text-[10px] font-black text-zinc-600 uppercase mb-4 tracking-widest">Input Engine</label>
          <div className="space-y-4">
            <select 
              className="w-full bg-zinc-800/40 text-xs rounded-xl p-3 border border-zinc-700/50 outline-none focus:ring-2 ring-indigo-500/30 transition-all text-zinc-300"
              value={selectedInput}
              onChange={(e) => setSelectedInput(e.target.value)}
              disabled={status === AppStatus.ACTIVE}
            >
              {devices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}
            </select>
            
            <button
              onClick={toggleEngine}
              className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg ${status === AppStatus.ACTIVE ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/10' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/10'}`}
            >
              {status === AppStatus.ACTIVE ? 'Shutdown' : 'Initialize'}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Studio Interface */}
      <main className="flex-1 p-10 overflow-y-auto bg-[#070708]">
        <div className="max-w-6xl mx-auto space-y-10">
          
          <header className="flex justify-between items-end">
            <div>
              <h2 className="text-4xl font-black tracking-tighter text-white">Manual Tuning Deck</h2>
              <p className="text-zinc-500 mt-2">Sculpt your vocal presence with modular DSP precision.</p>
            </div>
            <div className="flex gap-4">
              <div className="px-5 py-3 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 flex flex-col items-center">
                <span className="text-[9px] font-black text-zinc-600 uppercase mb-1">Gate Sensitivity</span>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-indigo-400">{gateThreshold}dB</span>
                  <input type="range" min="-80" max="-10" value={gateThreshold} onChange={(e) => handleGateChange(parseInt(e.target.value))} className="w-20 h-1 bg-zinc-800 rounded-lg accent-indigo-500" />
                </div>
              </div>
              <button 
                onClick={() => updateSetting('bypass', !settings.bypass)}
                className={`px-6 rounded-2xl border transition-all flex flex-col justify-center items-center ${settings.bypass ? 'bg-rose-500/10 border-rose-500' : 'bg-zinc-900/30 border-zinc-800'}`}
              >
                <span className="text-[9px] font-black uppercase text-zinc-500">Bypass</span>
                <span className={`text-[10px] font-bold ${settings.bypass ? 'text-rose-500' : 'text-emerald-500'}`}>{settings.bypass ? 'ACTIVE' : 'READY'}</span>
              </button>
            </div>
          </header>

          <Visualizer analyser={engineRef.current.getAnalyser()} />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Tuner Col 1: Identity */}
            <div className="p-8 bg-zinc-900/10 rounded-[2rem] border border-zinc-800/40 space-y-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Vocal Identity</h3>
              </div>
              <EffectSlider label="Gender Transpose" unit="st" min={-12} max={12} step={1} value={settings.pitch} onChange={v => updateSetting('pitch', v)} />
              <EffectSlider label="Presence / Clarity" unit="%" min={0} max={1} step={0.01} value={settings.clarity} onChange={v => updateSetting('clarity', v)} />
              <EffectSlider label="Resonance" unit="Q" min={0.1} max={10} step={0.1} value={settings.resonance} onChange={v => updateSetting('resonance', v)} />
            </div>

            {/* Tuner Col 2: Character */}
            <div className="p-8 bg-zinc-900/10 rounded-[2rem] border border-zinc-800/40 space-y-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Acoustic Texture</h3>
              </div>
              <EffectSlider label="Spectral Cutoff" unit="Hz" min={500} max={15000} step={100} value={settings.filterFreq} onChange={v => updateSetting('filterFreq', v)} />
              <EffectSlider label="Harmonic Grit" unit="%" min={0} max={1} step={0.01} value={settings.distortion} onChange={v => updateSetting('distortion', v)} />
              <EffectSlider label="Robot Ring" unit="Hz" min={0} max={100} step={1} value={settings.robotFreq} onChange={v => updateSetting('robotFreq', v)} />
            </div>

            {/* Tuner Col 3: Master */}
            <div className="p-8 bg-zinc-900/10 rounded-[2rem] border border-zinc-800/40 space-y-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Master Mix</h3>
              </div>
              <EffectSlider label="DSP Wetness" unit="%" min={0} max={1} step={0.01} value={settings.dryWet} onChange={v => updateSetting('dryWet', v)} />
              <EffectSlider label="Output Volume" unit="x" min={0} max={2} step={0.05} value={settings.gain} onChange={v => updateSetting('gain', v)} />
              <div className="pt-4 border-t border-zinc-800/40">
                <p className="text-[9px] font-bold text-zinc-600 uppercase mb-2">Signal Health</p>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                   <div className="h-full bg-emerald-500/50 w-[85%]"></div>
                </div>
              </div>
            </div>
          </div>

          <section>
            <div className="relative p-[1px] bg-gradient-to-br from-indigo-500/30 via-zinc-800 to-indigo-500/30 rounded-[2.5rem] overflow-hidden group">
              <div className="bg-[#0c0c0e]/80 rounded-[2.45rem] p-8 transition-all group-hover:bg-[#111114]/90">
                <div className="flex items-center gap-5 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-2xl shadow-inner">⚡</div>
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight">AI Style Generator</h3>
                    <p className="text-zinc-500 text-sm">Convert descriptive text into complex identity chains.</p>
                  </div>
                </div>
                <form onSubmit={handleStylistSubmit} className="flex gap-4">
                  <input 
                    className="flex-1 bg-zinc-900/40 border border-zinc-800/80 rounded-[1.2rem] px-6 py-4 outline-none focus:border-indigo-500/50 transition-all placeholder:text-zinc-700 text-base" 
                    placeholder="E.g. 'Smooth deep-voiced narrator with a hint of robotic mystery'..."
                    value={stylistPrompt}
                    onChange={e => setStylistPrompt(e.target.value)}
                  />
                  <button 
                    disabled={isStylistLoading || !stylistPrompt}
                    className="bg-zinc-100 text-zinc-950 px-8 py-4 rounded-[1.2rem] font-black text-xs uppercase tracking-widest hover:bg-white disabled:opacity-20 transition-all"
                  >
                    {isStylistLoading ? 'Modeling...' : 'Sync Settings'}
                  </button>
                </form>
              </div>
            </div>
          </section>

          <footer className="pt-10 border-t border-zinc-900 flex justify-between items-center text-zinc-600 text-[9px] font-black uppercase tracking-[0.4em]">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              LOW-LATENCY KERNEL ACTIVE
            </div>
            <div className="flex gap-8">
              <span>PRECISION_TUNER: ENABLED</span>
              <span>FFT_SAMPLING: 1024</span>
              <span>MODULAR_DSP_V2</span>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default App;

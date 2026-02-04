
import React from 'react';

interface EffectSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (val: number) => void;
}

export const EffectSlider: React.FC<EffectSliderProps> = ({ 
  label, value, min, max, step, unit = '', onChange 
}) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center px-1">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{label}</label>
        <span className="text-xs font-mono text-indigo-400">{value.toFixed(2)}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
      />
    </div>
  );
};

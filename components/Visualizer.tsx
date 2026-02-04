
import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  analyser: AnalyserNode | null;
}

export const Visualizer: React.FC<VisualizerProps> = ({ analyser }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let animationId: number;

    const draw = () => {
      animationId = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = 'rgba(9, 9, 11, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#4f46e5'); // Indigo-600
        gradient.addColorStop(1, '#06b6d4'); // Cyan-500

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [analyser]);

  return (
    <div className="w-full h-32 bg-zinc-900/50 rounded-xl overflow-hidden border border-zinc-800">
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={128} 
        className="w-full h-full"
      />
    </div>
  );
};

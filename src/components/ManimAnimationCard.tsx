import React, { useState, useEffect, useRef } from 'react';
import { Code2, Play, Pause, Copy, Check, Sparkles, Terminal, RotateCcw } from 'lucide-react';

interface ManimAnimationCardProps {
  code: string;
}

export function ManimAnimationCard({ code }: ManimAnimationCardProps) {
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
  const [isPlaying, setIsPlaying] = useState(true);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);

  // Extract Scene name if present
  const sceneMatch = code.match(/class\s+(\w+)\s*\(/);
  const sceneName = sceneMatch ? sceneMatch[1] : 'MathPhysicsAnimation';

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Live mathematical & geometric canvas animation to visually represent Manim equations and curves
  useEffect(() => {
    if (activeTab !== 'visual') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    let height = (canvas.height = 300);
    let t = 0;

    const render = () => {
      ctx.fillStyle = '#08090C';
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      // Coordinate Grid Lines (Manim style dark blue/cyan grid)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      const step = 30;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // X and Y Axes
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(width, cy);
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, height);
      ctx.stroke();

      // Animated Sine/Cosine Transformations & Vector Morphing
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#38BDF8';
      ctx.beginPath();
      for (let x = 0; x < width; x += 3) {
        const normX = (x - cx) * 0.035;
        const y = cy - Math.sin(normX + t) * 60 * Math.cos(normX * 0.5);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Secondary Harmonics curve (Manim morphing)
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#4ADE80';
      ctx.beginPath();
      for (let x = 0; x < width; x += 3) {
        const normX = (x - cx) * 0.035;
        const y = cy - Math.cos(normX * 1.5 - t * 0.8) * 45;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Dynamic tangent vector on curve
      const tangentX = cx + Math.sin(t * 0.5) * 160;
      const normTX = (tangentX - cx) * 0.035;
      const tangentY = cy - Math.sin(normTX + t) * 60 * Math.cos(normTX * 0.5);

      // Tangent point
      ctx.fillStyle = '#FBBF24';
      ctx.beginPath();
      ctx.arc(tangentX, tangentY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Tangent line
      const deriv = -Math.cos(normTX + t) * 60 * 0.035;
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tangentX - 45, tangentY - 45 * deriv);
      ctx.lineTo(tangentX + 45, tangentY + 45 * deriv);
      ctx.stroke();

      // Label
      ctx.fillStyle = '#FBBF24';
      ctx.font = '11px monospace';
      ctx.fillText(`f'(x) Tangent Vector`, tangentX + 12, tangentY - 10);

      // Watermark Scene Name
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`Manim Community Engine • ${sceneName}`, 16, height - 16);

      if (isPlaying) {
        t += 0.03;
      }
      animRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [activeTab, isPlaying, sceneName]);

  return (
    <div className="my-5 overflow-hidden rounded-2xl border border-sky-500/30 bg-[#08090C] shadow-2xl">
      {/* Header bar with tabs */}
      <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-sky-950/40 via-[#08090C] to-emerald-950/30 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <Terminal size={15} />
          </div>
          <div>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-sky-400 tracking-wide font-mono">
              <Sparkles size={12} className="text-sky-300" />
              Manim Mathematical Animation ({sceneName})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Switcher */}
          <div className="flex rounded-lg bg-white/5 p-0.5 border border-white/10">
            <button
              onClick={() => setActiveTab('visual')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                activeTab === 'visual'
                  ? 'bg-sky-500 text-black font-semibold shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Play size={12} />
              Visual Studio
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                activeTab === 'code'
                  ? 'bg-sky-500 text-black font-semibold shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Code2 size={12} />
              Python Code
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            title="Copy Manim Python Script"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Visual Canvas Tab */}
      {activeTab === 'visual' ? (
        <div className="relative w-full overflow-hidden bg-[#08090C]">
          <canvas ref={canvasRef} className="w-full h-[260px] sm:h-[290px] block" />
          
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex h-7 px-3 items-center gap-1.5 rounded-lg bg-white/10 text-gray-200 hover:bg-white/20 text-xs font-mono backdrop-blur-md border border-white/10 transition-colors"
            >
              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
          </div>
        </div>
      ) : (
        /* Python Code Tab */
        <div className="p-4 bg-[#0A0C10] overflow-x-auto">
          <pre className="font-mono text-xs text-emerald-300 leading-relaxed">
            <code>{code}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

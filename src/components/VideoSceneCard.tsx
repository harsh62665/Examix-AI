import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Copy, Check, Film, Sparkles, Maximize2 } from 'lucide-react';

interface VideoSceneCardProps {
  promptText: string;
}

export function VideoSceneCard({ promptText }: VideoSceneCardProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  const cleanPrompt = promptText.replace(/^\[VIDEO_SCENE:\s*/i, '').replace(/\]$/, '').trim();

  // Procedural dynamic visual simulation on canvas tailored to prompt keywords (orbits, DNA, physics, particles, waves)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    let height = (canvas.height = 320);

    const isOrbit = /orbit|planet|solar|gravit|space|star/i.test(cleanPrompt);
    const isDNA = /dna|cell|bio|replicat|gene|molecul/i.test(cleanPrompt);
    const isWave = /wave|light|optics|sound|frequenc|harmon/i.test(cleanPrompt);
    const isPhysics = /projectile|motion|force|vector|collis|speed|veloc/i.test(cleanPrompt);

    let t = 0;
    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      size: Math.random() * 3 + 1,
      hue: Math.random() * 60 + 130 // emerald to cyan
    }));

    const render = () => {
      if (!ctx) return;

      // Dark cinematic canvas background
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, width, height);

      // Grid mesh
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      const gridSize = 35;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      if (isOrbit) {
        // Render Orbital System Simulation
        const cx = width / 2;
        const cy = height / 2;

        // Central Star (Glow)
        const sunGlow = ctx.createRadialGradient(cx, cy, 5, cx, cy, 45);
        sunGlow.addColorStop(0, 'rgba(250, 204, 21, 1)');
        sunGlow.addColorStop(0.5, 'rgba(234, 88, 12, 0.4)');
        sunGlow.addColorStop(1, 'rgba(234, 88, 12, 0)');
        ctx.fillStyle = sunGlow;
        ctx.beginPath();
        ctx.arc(cx, cy, 45, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FDE047';
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.fill();

        // Orbits
        [70, 115, 160].forEach((r, idx) => {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.beginPath();
          ctx.ellipse(cx, cy, r, r * 0.55, 0, 0, Math.PI * 2);
          ctx.stroke();

          const angle = t * (0.8 / (idx + 1)) + idx * 2;
          const px = cx + Math.cos(angle) * r;
          const py = cy + Math.sin(angle) * (r * 0.55);

          ctx.fillStyle = idx === 0 ? '#60A5FA' : idx === 1 ? '#34D399' : '#F87171';
          ctx.beginPath();
          ctx.arc(px, py, 6 + idx, 0, Math.PI * 2);
          ctx.fill();

          // Orbit trail
          ctx.strokeStyle = idx === 0 ? 'rgba(96, 165, 250, 0.3)' : 'rgba(52, 211, 153, 0.3)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(px, py, 12 + idx, 0, Math.PI * 2);
          ctx.stroke();
        });
      } else if (isDNA) {
        // Render DNA Double Helix Simulation
        const startX = 60;
        const endX = width - 60;
        const midY = height / 2;
        const totalRungs = 24;

        for (let i = 0; i <= totalRungs; i++) {
          const x = startX + (i / totalRungs) * (endX - startX);
          const phase = t * 2 + i * 0.35;
          const offset = Math.sin(phase) * 55;
          const y1 = midY + offset;
          const y2 = midY - offset;

          // Connective hydrogen bond rung
          const grad = ctx.createLinearGradient(x, y1, x, y2);
          grad.addColorStop(0, '#34D399');
          grad.addColorStop(0.5, '#FBBF24');
          grad.addColorStop(1, '#60A5FA');
          ctx.strokeStyle = grad;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(x, y1);
          ctx.lineTo(x, y2);
          ctx.stroke();

          // Strand 1 node
          ctx.fillStyle = '#34D399';
          ctx.beginPath();
          ctx.arc(x, y1, 5, 0, Math.PI * 2);
          ctx.fill();

          // Strand 2 node
          ctx.fillStyle = '#60A5FA';
          ctx.beginPath();
          ctx.arc(x, y2, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (isWave) {
        // Render Wave Interference & Harmonics
        ctx.lineWidth = 2.5;
        for (let w = 0; w < 3; w++) {
          ctx.beginPath();
          ctx.strokeStyle = w === 0 ? '#34D399' : w === 1 ? '#60A5FA' : '#F472B6';
          for (let x = 0; x < width; x += 4) {
            const y = height / 2 + Math.sin(x * 0.02 + t * (1.5 + w * 0.5)) * 40 * Math.cos(x * 0.005);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      } else if (isPhysics) {
        // Projectile trajectory with animated payload & vector arrows
        const originX = 70;
        const originY = height - 60;
        const range = width - 140;
        const apexY = 80;

        // Trace parabolic path
        ctx.strokeStyle = 'rgba(74, 222, 128, 0.4)';
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        for (let x = originX; x <= originX + range; x += 10) {
          const normX = (x - originX) / range;
          const y = originY - 4 * (originY - apexY) * normX * (1 - normX);
          ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Animated Projectile body
        const progressT = (t * 0.3) % 1;
        const currX = originX + progressT * range;
        const currY = originY - 4 * (originY - apexY) * progressT * (1 - progressT);

        // Velocity vector arrow
        const dx = 1;
        const dy = -4 * (originY - apexY) * (1 - 2 * progressT) / range;
        const angle = Math.atan2(dy, dx);

        ctx.strokeStyle = '#FBBF24';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(currX, currY);
        ctx.lineTo(currX + Math.cos(angle) * 35, currY + Math.sin(angle) * 35);
        ctx.stroke();

        // Projectile dot
        ctx.fillStyle = '#34D399';
        ctx.beginPath();
        ctx.arc(currX, currY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // General Scientific Dynamic Particle Field
        particles.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > width) p.vx *= -1;
          if (p.y < 0 || p.y > height) p.vy *= -1;

          ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, 0.75)`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        });

        // Inter-particle connections
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dist = Math.hypot(particles[i].x - particles[j].x, particles[i].y - particles[j].y);
            if (dist < 80) {
              ctx.strokeStyle = `rgba(74, 222, 128, ${1 - dist / 80 * 0.8})`;
              ctx.lineWidth = 0.8;
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.stroke();
            }
          }
        }
      }

      // HUD Overlay Graphics (Cinematic Viewfinder)
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.4)';
      ctx.lineWidth = 2;
      const cornerLen = 14;

      // Top-left
      ctx.beginPath();
      ctx.moveTo(15, 15 + cornerLen);
      ctx.lineTo(15, 15);
      ctx.lineTo(15 + cornerLen, 15);
      ctx.stroke();

      // Top-right
      ctx.beginPath();
      ctx.moveTo(width - 15 - cornerLen, 15);
      ctx.lineTo(width - 15, 15);
      ctx.lineTo(width - 15, 15 + cornerLen);
      ctx.stroke();

      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(15, height - 15 - cornerLen);
      ctx.lineTo(15, height - 15);
      ctx.lineTo(15 + cornerLen, height - 15);
      ctx.stroke();

      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(width - 15 - cornerLen, height - 15);
      ctx.lineTo(width - 15, height - 15);
      ctx.lineTo(width - 15, height - 15 - cornerLen);
      ctx.stroke();

      if (isPlaying) {
        t += 0.025 * speed;
        setProgress((prev) => (prev + 0.35 * speed) % 100);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      if (canvas && canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = 320;
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [cleanPrompt, isPlaying, speed]);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(cleanPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-5 overflow-hidden rounded-2xl border border-[#4ADE80]/30 bg-[#0E0E12] shadow-2xl transition-all">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-emerald-950/40 via-black to-blue-950/30 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/30">
            <Film size={15} />
          </div>
          <div>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 tracking-wide">
              <Sparkles size={12} className="text-yellow-400" />
              AI Visual Video Scene
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
            SIMULATION READY
          </span>
          <button
            onClick={handleCopyPrompt}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
            title="Copy prompt for Video AI (Sora / Veo / Runway)"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy Prompt'}</span>
          </button>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="relative w-full overflow-hidden bg-black flex items-center justify-center">
        <canvas ref={canvasRef} className="w-full h-[280px] sm:h-[320px] block" />

        {/* Floating badge inside canvas */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-[11px] font-mono text-gray-300 border border-white/10 backdrop-blur-md">
          <div className={`h-2 w-2 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          {isPlaying ? 'Live Simulation Running' : 'Simulation Paused'}
        </div>

        {/* Video Scrubber & Play Controls */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 pt-6 flex flex-col gap-2">
          {/* Progress bar */}
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden cursor-pointer" onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickPos = (e.clientX - rect.left) / rect.width;
            setProgress(clickPos * 100);
          }}>
            <div className="bg-gradient-to-r from-emerald-400 to-cyan-400 h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-black hover:bg-emerald-400 transition-transform active:scale-95 cursor-pointer font-bold"
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
              </button>
              <button
                onClick={() => { setProgress(0); setIsPlaying(true); }}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-gray-300 hover:bg-white/20 transition-colors cursor-pointer"
                title="Restart"
              >
                <RotateCcw size={13} />
              </button>
              <span className="font-mono text-[11px] text-gray-400">
                00:{Math.floor(progress * 0.15).toString().padStart(2, '0')} / 00:15
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSpeed((s) => (s === 1 ? 2 : s === 2 ? 0.5 : 1))}
                className="rounded px-2 py-0.5 font-mono text-[11px] bg-white/10 text-gray-300 hover:bg-white/15 cursor-pointer"
              >
                {speed}x
              </button>
              <span className="text-[10px] text-gray-500 font-mono hidden sm:inline">60 FPS REALTIME</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Scene Description Box */}
      <div className="p-4 bg-[#121217] border-t border-white/10">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 flex items-center gap-1.5">
          <Sparkles size={13} className="text-emerald-400" />
          High-Fidelity Scene Direction Prompt:
        </div>
        <p className="text-xs sm:text-sm text-gray-200 leading-relaxed font-sans bg-black/40 p-3 rounded-xl border border-white/5 selection:bg-emerald-500/30">
          {cleanPrompt}
        </p>
      </div>
    </div>
  );
}

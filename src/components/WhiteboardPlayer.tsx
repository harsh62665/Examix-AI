import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Sparkles, Layers, RotateCcw } from 'lucide-react';
import { cleanTextForSpeech, getOptimalVoice } from '../utils/speechConverter';

export interface WhiteboardStep {
  time: string;
  element: string;
  narration: string;
}

interface WhiteboardPlayerProps {
  rawSequenceText: string;
}

export function parseWhiteboardSteps(rawText: string): WhiteboardStep[] {
  const steps: WhiteboardStep[] = [];
  const lines = rawText.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('[') || trimmed.startsWith('#')) continue;

    // Matches format like: 00:05 | Draw parabolic curve | "Now we observe..."
    // or: 1. 00:00 - Draw coordinate axes - "Let's start..."
    const pipeMatch = trimmed.match(/^(\d{1,2}:\d{2})\s*[\|\-]\s*(.*?)\s*[\|\-]\s*["']?(.*?)["']?$/);
    if (pipeMatch) {
      steps.push({
        time: pipeMatch[1],
        element: pipeMatch[2].replace(/^["']|["']$/g, '').trim(),
        narration: pipeMatch[3].replace(/^["']|["']$/g, '').trim()
      });
      continue;
    }

    // Secondary match if only element and narration are present
    const secondaryMatch = trimmed.match(/^(\d+[\.\)]|\-|\*)\s*(\d{1,2}:\d{2})?\s*:?\s*(.*?)(?:\s*[-–—:]\s*|\s*\|\s*)(.*)$/);
    if (secondaryMatch) {
      steps.push({
        time: secondaryMatch[2] || `00:${String(steps.length * 5).padStart(2, '0')}`,
        element: secondaryMatch[3].replace(/^["']|["']$/g, '').trim(),
        narration: secondaryMatch[4].replace(/^["']|["']$/g, '').trim()
      });
      continue;
    }

    // Fallback line parse
    if (trimmed.length > 5 && !trimmed.toLowerCase().includes('whiteboard_sequence')) {
      steps.push({
        time: `00:${String(steps.length * 4).padStart(2, '0')}`,
        element: trimmed,
        narration: trimmed
      });
    }
  }

  return steps;
}

export function WhiteboardPlayer({ rawSequenceText }: WhiteboardPlayerProps) {
  const steps = parseWhiteboardSteps(rawSequenceText);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const activeStep = steps[currentStepIndex] || steps[0] || { time: '00:00', element: 'Initialization', narration: 'Starting whiteboard lecture...' };

  // Speak narration when step changes and not muted
  useEffect(() => {
    if (!isPlaying || isMuted || typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const spokenNarration = cleanTextForSpeech(activeStep.narration);
    if (!spokenNarration) return;

    const utterance = new SpeechSynthesisUtterance(spokenNarration);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const optimalVoice = getOptimalVoice(voices, spokenNarration);
    if (optimalVoice) {
      utterance.voice = optimalVoice;
    }

    utterance.onend = () => {
      if (isPlaying) {
        if (currentStepIndex < steps.length - 1) {
          setTimeout(() => setCurrentStepIndex((prev) => prev + 1), 600);
        } else {
          setIsPlaying(false);
        }
      }
    };

    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [currentStepIndex, isPlaying, isMuted]);

  // Handle timer if speech synthesis is not active or muted
  useEffect(() => {
    if (!isPlaying || (!isMuted && window.speechSynthesis)) return;

    const timer = setTimeout(() => {
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex((prev) => prev + 1);
      } else {
        setIsPlaying(false);
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [currentStepIndex, isPlaying, isMuted]);

  // Render Whiteboard Drawing on Canvas based on active step count
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    const height = (canvas.height = 300);

    // Chalkboard / Dark Slate Background
    ctx.fillStyle = '#0c1015';
    ctx.fillRect(0, 0, width, height);

    // Subtle blackboard grid texture
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 25) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Step-by-step progressive drawing cumulative layer
    const totalDrawn = currentStepIndex + 1;
    const paddingLeft = 50;
    const midY = height / 2;

    // Draw coordinate axes
    ctx.strokeStyle = '#4B5563';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, 30);
    ctx.lineTo(paddingLeft, height - 40);
    ctx.lineTo(width - 40, height - 40);
    ctx.stroke();

    // Draw Axis arrows
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '12px sans-serif';
    ctx.fillText('Y-Axis', paddingLeft - 5, 22);
    ctx.fillText('X-Axis', width - 35, height - 25);

    // Progressive visual elements for each step
    steps.slice(0, totalDrawn).forEach((step, idx) => {
      const isCurrent = idx === currentStepIndex;
      const hue = (idx * 65 + 130) % 360;

      ctx.save();
      if (isCurrent) {
        ctx.shadowColor = 'rgba(74, 222, 128, 0.8)';
        ctx.shadowBlur = 12;
      }

      // Draw mathematical curves / shapes based on step text or index
      if (step.element.toLowerCase().includes('parabol') || step.element.toLowerCase().includes('curve') || step.element.toLowerCase().includes('motion')) {
        // Draw Parabola
        ctx.strokeStyle = isCurrent ? '#4ADE80' : '#38BDF8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        const startX = paddingLeft;
        const groundY = height - 40;
        const curveW = width - 120;
        ctx.moveTo(startX, groundY);
        for (let x = 0; x <= curveW; x += 5) {
          const normX = x / curveW;
          const y = groundY - 4 * (groundY - 70) * normX * (1 - normX);
          ctx.lineTo(startX + x, y);
        }
        ctx.stroke();
      } else if (step.element.toLowerCase().includes('vector') || step.element.toLowerCase().includes('arrow') || step.element.toLowerCase().includes('force')) {
        // Draw Vector Arrow
        ctx.strokeStyle = isCurrent ? '#FBBF24' : '#F472B6';
        ctx.fillStyle = isCurrent ? '#FBBF24' : '#F472B6';
        ctx.lineWidth = 3;
        const vStartX = paddingLeft;
        const vStartY = height - 40;
        const vEndX = paddingLeft + 100;
        const vEndY = height - 130;

        ctx.beginPath();
        ctx.moveTo(vStartX, vStartY);
        ctx.lineTo(vEndX, vEndY);
        ctx.stroke();

        // Arrow head
        const angle = Math.atan2(vEndY - vStartY, vEndX - vStartX);
        ctx.beginPath();
        ctx.moveTo(vEndX, vEndY);
        ctx.lineTo(vEndX - 12 * Math.cos(angle - Math.PI / 6), vEndY - 12 * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(vEndX - 12 * Math.cos(angle + Math.PI / 6), vEndY - 12 * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();

        ctx.font = 'bold 13px sans-serif';
        ctx.fillText('v₀ (Vector)', vEndX + 8, vEndY);
      } else {
        // Geometric node / Marker
        const nodeX = paddingLeft + ((idx + 1) / (steps.length + 1)) * (width - 120);
        const nodeY = midY + Math.sin(idx * 1.5) * 45;

        ctx.fillStyle = `hsl(${hue}, 85%, 60%)`;
        ctx.beginPath();
        ctx.arc(nodeX, nodeY, isCurrent ? 9 : 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Step Label
        ctx.fillStyle = isCurrent ? '#4ADE80' : '#E5E7EB';
        ctx.font = isCurrent ? 'bold 12px sans-serif' : '11px sans-serif';
        ctx.fillText(`Step ${idx + 1}: ${step.element.slice(0, 22)}`, nodeX - 25, nodeY - 14);
      }

      ctx.restore();
    });

    // Step watermark on board
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = '11px monospace';
    ctx.fillText(`WHITEBOARD STEP ${currentStepIndex + 1} OF ${steps.length} | TIME: ${activeStep.time}`, paddingLeft, height - 12);
  }, [currentStepIndex, steps]);

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    } else {
      setIsPlaying(true);
    }
  };

  return (
    <div className="my-5 overflow-hidden rounded-2xl border border-emerald-500/30 bg-[#0C1015] shadow-2xl">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-emerald-950/50 via-[#0C1015] to-[#121921] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Layers size={15} />
          </div>
          <div>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 tracking-wide">
              <Sparkles size={12} className="text-emerald-300" />
              Interactive Whiteboard Studio (Step-by-Step)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-gray-300 hover:bg-white/10 transition-colors"
            title={isMuted ? 'Unmute Audio Narration' : 'Mute Audio Narration'}
          >
            {isMuted ? <VolumeX size={13} className="text-rose-400" /> : <Volume2 size={13} className="text-emerald-400" />}
            <span className="text-[11px]">{isMuted ? 'Muted' : 'Voice On'}</span>
          </button>
        </div>
      </div>

      {/* Canvas Chalkboard */}
      <div className="relative w-full overflow-hidden bg-[#0C1015] flex flex-col items-center">
        <canvas ref={canvasRef} className="w-full h-[260px] sm:h-[300px] block" />

        {/* Live Subtitle Narration Overlay */}
        <div className="w-full bg-[#111822] border-t border-white/10 p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-14 shrink-0 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-bold border border-emerald-500/30">
              {activeStep.time}
            </div>
            <div className="flex-1">
              <div className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider mb-0.5">
                {activeStep.element}
              </div>
              <p className="text-xs sm:text-sm text-gray-100 font-sans leading-relaxed">
                "{activeStep.narration}"
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Scrubbing Bar & Controls */}
        <div className="w-full border-t border-white/5 bg-[#090D12] px-4 py-2.5 flex items-center justify-between text-xs text-gray-300">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentStepIndex === 0}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 hover:bg-white/15 disabled:opacity-30 transition-all cursor-pointer"
            >
              <SkipBack size={13} />
            </button>

            <button
              onClick={togglePlay}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-transform active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              {isPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
            </button>

            <button
              onClick={() => setCurrentStepIndex((prev) => Math.min(steps.length - 1, prev + 1))}
              disabled={currentStepIndex === steps.length - 1}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 hover:bg-white/15 disabled:opacity-30 transition-all cursor-pointer"
            >
              <SkipForward size={13} />
            </button>

            <button
              onClick={() => {
                setCurrentStepIndex(0);
                setIsPlaying(false);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 hover:bg-white/15 transition-all text-gray-400 hover:text-white"
              title="Reset Whiteboard"
            >
              <RotateCcw size={12} />
            </button>
          </div>

          {/* Steps Breadcrumbs */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-[50%] py-1">
            {steps.map((s, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentStepIndex
                    ? 'w-6 bg-emerald-400'
                    : idx < currentStepIndex
                    ? 'w-2 bg-emerald-700/60'
                    : 'w-2 bg-white/20'
                }`}
                title={`Jump to Step ${idx + 1} (${s.time})`}
              />
            ))}
          </div>

          <span className="font-mono text-[11px] text-gray-400">
            {currentStepIndex + 1} / {steps.length} Steps
          </span>
        </div>
      </div>
    </div>
  );
}

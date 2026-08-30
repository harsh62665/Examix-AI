import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  Copy,
  Check,
  Download,
  Move
} from 'lucide-react';

export interface SvgDiagramCardProps {
  svgContent: string;
  className?: string;
}

// Clean, sanitize, and optimize raw SVG strings to render standalone vector diagrams responsively with high-contrast text
export function sanitizeSvg(svgStr: string): string {
  let cleaned = svgStr
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:[^"']*/gi, '');

  // Ensure <svg> has viewBox with good default aspect ratio
  if (!/viewBox=/i.test(cleaned)) {
    const widthMatch = cleaned.match(/\bwidth="?([0-9.]+)(?:px)?"?/i);
    const heightMatch = cleaned.match(/\bheight="?([0-9.]+)(?:px)?"?/i);
    const w = widthMatch ? widthMatch[1] : '800';
    const h = heightMatch ? heightMatch[1] : '500';
    cleaned = cleaned.replace(/<svg\b/i, `<svg viewBox="0 0 ${w} ${h}"`);
  }

  // Ensure preserveAspectRatio
  if (!/preserveAspectRatio=/i.test(cleaned)) {
    cleaned = cleaned.replace(/<svg\b/i, '<svg preserveAspectRatio="xMidYMid meet"');
  }

  // Ensure <svg> has width="100%"
  if (!/\bwidth=/i.test(cleaned)) {
    cleaned = cleaned.replace(/<svg\b/i, '<svg width="100%"');
  } else {
    // Standardize fixed pixel widths on root svg to 100% for responsiveness
    cleaned = cleaned.replace(/<svg([^>]*?)\bwidth="[0-9]+px?"/i, '<svg$1 width="100%"');
  }

  // Ensure text labels have high-contrast white on dark card backgrounds
  cleaned = cleaned.replace(/<text([^>]*?)fill="(?:#000|#000000|black|#111827|#1f2937|#374151)"/gi, '<text$1 fill="#FFFFFF"');
  cleaned = cleaned.replace(/<tspan([^>]*?)fill="(?:#000|#000000|black|#111827|#1f2937|#374151)"/gi, '<tspan$1 fill="#FFFFFF"');

  // If text tag has no fill attribute specified, default to fill="#FFFFFF"
  cleaned = cleaned.replace(/<text(?![^>]*\bfill=)([^>]*)>/gi, '<text fill="#FFFFFF"$1>');

  return cleaned;
}

export const SvgDiagramCard: React.FC<SvgDiagramCardProps> = ({ svgContent, className = '' }) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const sanitized = sanitizeSvg(svgContent);

  return (
    <>
      <div
        onClick={() => setIsLightboxOpen(true)}
        className={`group relative my-5 overflow-hidden rounded-2xl border border-white/10 bg-[#18181B] p-4 sm:p-6 transition-all duration-200 hover:border-[#4ADE80]/50 hover:bg-[#18181B]/90 hover:shadow-[0_0_25px_rgba(74,222,128,0.12)] cursor-zoom-in select-none ${className}`}
        title="Click or tap to inspect full-screen with pinch-to-zoom"
      >
        {/* Subtle Hover / Tap Fullscreen Zoom Badge */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/70 px-2.5 py-1 text-[11px] font-medium text-emerald-300 opacity-0 backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100 shadow-md pointer-events-none">
          <Maximize2 size={12} className="text-[#4ADE80]" />
          <span>Full Screen & Zoom</span>
        </div>

        {/* Clean, Zero-Clutter Embedded Vector Diagram */}
        <div
          className="flex justify-center items-center overflow-x-auto text-white [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:block pointer-events-none"
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
      </div>

      {/* Fullscreen Interactive Lightbox Modal */}
      {isLightboxOpen && (
        <SvgLightboxModal
          svgHtml={sanitized}
          onClose={() => setIsLightboxOpen(false)}
        />
      )}
    </>
  );
};

interface SvgLightboxModalProps {
  svgHtml: string;
  onClose: () => void;
}

export const SvgLightboxModal: React.FC<SvgLightboxModalProps> = ({ svgHtml, onClose }) => {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isTouchActive, setIsTouchActive] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPanRef = useRef({ x: 0, y: 0 });
  const touchDistanceRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1);

  // Keyboard Shortcuts: Escape to close, +/- to zoom, 0 to reset
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        setScale(s => Math.min(5, Number((s + 0.25).toFixed(2))));
      } else if (e.key === '-' || e.key === '_') {
        setScale(s => Math.max(0.5, Number((s - 0.25).toFixed(2))));
      } else if (e.key === '0') {
        setScale(1);
        setPan({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Lock body scroll while lightbox is open
  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = origOverflow;
    };
  }, []);

  // Zoom Controls
  const handleZoomIn = () => setScale(s => Math.min(5, Number((s + 0.3).toFixed(2))));
  const handleZoomOut = () => setScale(s => Math.max(0.5, Number((s - 0.3).toFixed(2))));
  const handleResetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  // Copy SVG Code
  const handleCopySvg = async () => {
    try {
      await navigator.clipboard.writeText(svgHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = svgHtml;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Download SVG File
  const handleDownloadSvg = () => {
    try {
      const blob = new Blob([svgHtml], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `examix-diagram-${Date.now()}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download SVG failed:', err);
    }
  };

  // Mouse Drag to Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // only left click
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPanRef.current = { ...pan };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: initialPanRef.current.x + dx,
      y: initialPanRef.current.y + dy
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Mouse Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setScale(s => Math.min(5, Math.max(0.5, Number((s + delta).toFixed(2)))));
  };

  // Double Click to Toggle 1x / 2x
  const handleDoubleClick = () => {
    if (scale > 1.2) {
      handleResetZoom();
    } else {
      setScale(2);
    }
  };

  // Touch Pinch-to-Zoom and 1-Finger Pan
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsTouchActive(true);
    if (e.touches.length === 2) {
      // 2 fingers = pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      touchDistanceRef.current = dist;
      initialScaleRef.current = scale;
    } else if (e.touches.length === 1) {
      // 1 finger = pan
      const touch = e.touches[0];
      dragStartRef.current = { x: touch.clientX, y: touch.clientY };
      initialPanRef.current = { ...pan };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const ratio = currentDist / touchDistanceRef.current;
      const newScale = Math.min(5, Math.max(0.5, Number((initialScaleRef.current * ratio).toFixed(2))));
      setScale(newScale);
    } else if (e.touches.length === 1 && !touchDistanceRef.current) {
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartRef.current.x;
      const dy = touch.clientY - dragStartRef.current.y;
      setPan({
        x: initialPanRef.current.x + dx,
        y: initialPanRef.current.y + dy
      });
    }
  };

  const handleTouchEnd = () => {
    touchDistanceRef.current = null;
    setIsTouchActive(false);
  };

  return (
    <div
      id="svg-lightbox-overlay"
      className="fixed inset-0 z-[9999] flex flex-col bg-[#0B0F17]/98 backdrop-blur-2xl animate-in fade-in duration-200 select-none"
    >
      {/* Top Floating Control Bar */}
      <div className="relative z-50 flex items-center justify-between border-b border-white/10 bg-[#0B0F17]/80 px-4 sm:px-6 py-3 backdrop-blur-xl shrink-0">
        
        {/* Left: Zoom Indicator & Pan Helper */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-mono font-semibold text-emerald-400">
            <span>{Math.round(scale * 100)}%</span>
          </div>
          <span className="hidden sm:inline text-xs text-gray-400 font-medium">
            Drag to pan • Pinch / Scroll to zoom
          </span>
        </div>

        {/* Center / Right: Interactive Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Zoom Out Button */}
          <button
            id="lightbox-zoom-out-btn"
            onClick={handleZoomOut}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-300 transition-all hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer"
            title="Zoom Out (-)"
          >
            <ZoomOut size={16} />
          </button>

          {/* Reset Zoom Button */}
          <button
            id="lightbox-reset-zoom-btn"
            onClick={handleResetZoom}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 text-xs font-medium text-gray-300 transition-all hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer"
            title="Reset Zoom (0)"
          >
            <RotateCcw size={14} />
            <span className="hidden md:inline">Reset</span>
          </button>

          {/* Zoom In Button */}
          <button
            id="lightbox-zoom-in-btn"
            onClick={handleZoomIn}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-300 transition-all hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer"
            title="Zoom In (+)"
          >
            <ZoomIn size={16} />
          </button>

          <div className="h-5 w-px bg-white/10 mx-1 hidden sm:block" />

          {/* Copy SVG Button */}
          <button
            id="lightbox-copy-svg-btn"
            onClick={handleCopySvg}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-medium text-gray-300 transition-all hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer"
            title="Copy SVG Code"
          >
            {copied ? (
              <>
                <Check size={14} className="text-[#4ADE80]" />
                <span className="text-[#4ADE80] font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span className="hidden sm:inline">Copy SVG</span>
              </>
            )}
          </button>

          {/* Download SVG File Button */}
          <button
            id="lightbox-download-svg-btn"
            onClick={handleDownloadSvg}
            className="flex h-9 w-9 sm:w-auto items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 text-xs font-medium text-gray-300 transition-all hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer"
            title="Download SVG file"
          >
            <Download size={14} />
            <span className="hidden md:inline">Download</span>
          </button>

          {/* Clean Prominent Close Button */}
          <button
            id="lightbox-close-btn"
            onClick={onClose}
            className="ml-2 flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 transition-all hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/50 active:scale-95 cursor-pointer"
            title="Close Fullscreen (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Interactive Pan & Zoom Viewport Canvas */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative flex-1 overflow-hidden flex items-center justify-center p-4 sm:p-8 ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {/* Transform Stage */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isDragging || isTouchActive ? 'none' : 'transform 0.15s ease-out'
          }}
          className="relative flex items-center justify-center w-full h-full max-w-[92vw] max-h-[82vh] text-white select-none [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:object-contain [&>svg]:block drop-shadow-[0_0_35px_rgba(0,0,0,0.8)]"
          dangerouslySetInnerHTML={{ __html: svgHtml }}
        />
      </div>

      {/* Bottom Floating Mobile/Desktop Helper Bar */}
      <div className="relative z-50 flex items-center justify-center border-t border-white/10 bg-[#0B0F17]/80 px-4 py-2.5 backdrop-blur-xl shrink-0 text-center">
        <span className="text-xs text-gray-400 flex items-center gap-1.5">
          <Move size={12} className="text-emerald-400" />
          <span>Double-click or double-tap to toggle 2x zoom • Drag anywhere to pan • Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono text-[10px]">Esc</kbd> to exit</span>
        </span>
      </div>
    </div>
  );
};

export interface ImageLightboxModalProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({ src, alt = 'Diagram View', onClose }) => {
  const isSvg = typeof src === 'string' && (src.trim().startsWith('<svg') || src.includes('</svg>'));

  if (isSvg) {
    return <SvgLightboxModal svgHtml={sanitizeSvg(src)} onClose={onClose} />;
  }

  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isTouchActive, setIsTouchActive] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPanRef = useRef({ x: 0, y: 0 });
  const touchDistanceRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1);

  // Keyboard Shortcuts: Escape to close, +/- to zoom, 0 to reset
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        setScale(s => Math.min(5, Number((s + 0.25).toFixed(2))));
      } else if (e.key === '-' || e.key === '_') {
        setScale(s => Math.max(0.5, Number((s - 0.25).toFixed(2))));
      } else if (e.key === '0') {
        setScale(1);
        setPan({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Lock body scroll while lightbox is open
  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = origOverflow;
    };
  }, []);

  const handleZoomIn = () => setScale(s => Math.min(5, Number((s + 0.3).toFixed(2))));
  const handleZoomOut = () => setScale(s => Math.max(0.5, Number((s - 0.3).toFixed(2))));
  const handleResetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.href = src;
      link.download = `examix-diagram-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPanRef.current = { ...pan };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: initialPanRef.current.x + dx,
      y: initialPanRef.current.y + dy
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setScale(s => Math.min(5, Math.max(0.5, Number((s + delta).toFixed(2)))));
  };

  const handleDoubleClick = () => {
    if (scale > 1.2) {
      handleResetZoom();
    } else {
      setScale(2);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsTouchActive(true);
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      touchDistanceRef.current = dist;
      initialScaleRef.current = scale;
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      dragStartRef.current = { x: touch.clientX, y: touch.clientY };
      initialPanRef.current = { ...pan };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const ratio = currentDist / touchDistanceRef.current;
      const newScale = Math.min(5, Math.max(0.5, Number((initialScaleRef.current * ratio).toFixed(2))));
      setScale(newScale);
    } else if (e.touches.length === 1 && !touchDistanceRef.current) {
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartRef.current.x;
      const dy = touch.clientY - dragStartRef.current.y;
      setPan({
        x: initialPanRef.current.x + dx,
        y: initialPanRef.current.y + dy
      });
    }
  };

  const handleTouchEnd = () => {
    touchDistanceRef.current = null;
    setIsTouchActive(false);
  };

  return (
    <div
      id="image-lightbox-overlay"
      className="fixed inset-0 z-[9999] flex flex-col bg-[#0B0F17]/98 backdrop-blur-2xl animate-in fade-in duration-200 select-none"
    >
      {/* Top Floating Control Bar */}
      <div className="relative z-50 flex items-center justify-between border-b border-white/10 bg-[#0B0F17]/80 px-4 sm:px-6 py-3 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-mono font-semibold text-emerald-400">
            <span>{Math.round(scale * 100)}%</span>
          </div>
          <span className="hidden sm:inline text-xs text-gray-400 font-medium truncate max-w-xs">
            {alt || 'Diagram / Image View'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={handleZoomOut}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-300 transition-all hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer"
            title="Zoom Out (-)"
          >
            <ZoomOut size={16} />
          </button>
          <button
            onClick={handleResetZoom}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 text-xs font-medium text-gray-300 transition-all hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer"
            title="Reset Zoom (0)"
          >
            <RotateCcw size={14} />
            <span className="hidden md:inline">Reset</span>
          </button>
          <button
            onClick={handleZoomIn}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-300 transition-all hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer"
            title="Zoom In (+)"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={handleDownload}
            className="flex h-9 w-9 sm:w-auto items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 text-xs font-medium text-gray-300 transition-all hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer"
            title="Download image"
          >
            <Download size={14} />
            <span className="hidden md:inline">Download</span>
          </button>
          <button
            onClick={onClose}
            className="ml-2 flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 transition-all hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/50 active:scale-95 cursor-pointer"
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative flex-1 overflow-hidden flex items-center justify-center p-4 sm:p-8 ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isDragging || isTouchActive ? 'none' : 'transform 0.15s ease-out'
          }}
          className="relative flex items-center justify-center w-full h-full max-w-[92vw] max-h-[82vh] select-none"
        >
          <img
            src={src}
            alt={alt}
            referrerPolicy="no-referrer"
            className="w-auto h-auto max-w-[92vw] max-h-[82vh] object-contain rounded-xl drop-shadow-[0_10px_40px_rgba(0,0,0,0.85)] pointer-events-none"
          />
        </div>
      </div>

      <div className="relative z-50 flex items-center justify-center border-t border-white/10 bg-[#0B0F17]/80 px-4 py-2.5 backdrop-blur-xl shrink-0 text-center">
        <span className="text-xs text-gray-400 flex items-center gap-1.5">
          <Move size={12} className="text-emerald-400" />
          <span>Double-click or double-tap to toggle 2x zoom • Drag anywhere to pan • Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono text-[10px]">Esc</kbd> to exit</span>
        </span>
      </div>
    </div>
  );
};

export default SvgDiagramCard;

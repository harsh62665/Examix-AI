import React, { useState, useRef, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface Marker {
  x: number;
  y: number;
  label: string;
}

interface ImageAnnotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  initialMarkers: Marker[];
  onSave: (markers: Marker[]) => void;
}

export function ImageAnnotationModal({ isOpen, onClose, imageUrl, initialMarkers, onSave }: ImageAnnotationModalProps) {
  const [markers, setMarkers] = useState<Marker[]>(initialMarkers || []);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMarkers(initialMarkers || []);
    }
  }, [isOpen, initialMarkers]);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    
    // Calculate percentages
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (x < 0 || x > 100 || y < 0 || y > 100) return;

    const label = `P${markers.length + 1}`;
    setMarkers([...markers, { x, y, label }]);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      >
        <motion.div 
          initial={{ scale: 0.95 }} 
          animate={{ scale: 1 }} 
          exit={{ scale: 0.95 }}
          className="bg-[#1A1A1E] border border-white/10 rounded-2xl p-4 w-full max-w-4xl flex flex-col gap-4 shadow-2xl"
        >
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-100">Annotate Diagram</h3>
              <p className="text-sm text-gray-400">Click on the image to add reference markers.</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-gray-400 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="relative flex-1 bg-black/50 rounded-xl overflow-hidden flex items-center justify-center border border-white/5 min-h-[50vh]">
            <div 
              className="relative cursor-crosshair inline-block max-w-full max-h-full"
              onClick={handleImageClick}
            >
              <img 
                ref={imgRef}
                src={imageUrl} 
                alt="Annotate" 
                className="max-h-[60vh] object-contain pointer-events-none"
              />
              
              {markers.map((marker, idx) => (
                <div 
                  key={idx}
                  className="absolute w-6 h-6 -ml-3 -mt-3 bg-green-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-lg pointer-events-none"
                  style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                >
                  {marker.label}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button 
              onClick={() => setMarkers([])}
              className="px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
            >
              Clear All
            </button>
            <button 
              onClick={() => { onSave(markers); onClose(); }}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-black font-semibold rounded-lg flex items-center gap-2 transition-colors"
            >
              <Check size={18} />
              Save Markers
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

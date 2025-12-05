
import React, { useRef, useState, useEffect } from 'react';
import { Eraser, PenTool, RotateCcw, Check, X } from 'lucide-react';

interface DrawingCanvasProps {
  onSave: (blob: Blob) => void;
  onCancel: () => void;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#1e293b');
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set resolution
    const parent = canvas.parentElement;
    if (parent) {
       canvas.width = parent.clientWidth;
       canvas.height = 400;
    }

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const { x, y } = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      ctx.lineWidth = tool === 'eraser' ? 20 : lineWidth;
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleSave = () => {
    canvasRef.current?.toBlob((blob) => {
      if (blob) onSave(blob);
    }, 'image/png');
  };

  const clearCanvas = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
  }

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
      <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between">
         <div className="flex gap-2">
            <button 
               onClick={() => setTool('pen')}
               className={`p-2 rounded-lg transition-colors ${tool === 'pen' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:text-slate-600'}`}
            >
               <PenTool size={18} />
            </button>
            <button 
               onClick={() => setTool('eraser')}
               className={`p-2 rounded-lg transition-colors ${tool === 'eraser' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:text-slate-600'}`}
            >
               <Eraser size={18} />
            </button>
            <div className="w-px h-8 bg-slate-200 mx-1"></div>
            <div className="flex items-center gap-1">
               {['#1e293b', '#ef4444', '#3b82f6', '#10b981'].map(c => (
                  <button 
                     key={c} 
                     onClick={() => { setColor(c); setTool('pen'); }}
                     className={`w-6 h-6 rounded-full border-2 ${color === c && tool === 'pen' ? 'border-indigo-500 scale-110' : 'border-transparent'}`}
                     style={{ backgroundColor: c }}
                  />
               ))}
            </div>
            <input 
               type="range" 
               min="1" max="10" 
               value={lineWidth} 
               onChange={(e) => setLineWidth(Number(e.target.value))}
               className="w-20 ml-2"
            />
         </div>
         <div className="flex gap-2">
            <button onClick={clearCanvas} className="p-2 text-slate-400 hover:text-red-500"><RotateCcw size={18} /></button>
            <button onClick={onCancel} className="p-2 text-slate-400 hover:text-slate-600"><X size={18} /></button>
            <button onClick={handleSave} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
               <Check size={16} /> Save Art
            </button>
         </div>
      </div>
      <div className="w-full relative touch-none cursor-crosshair">
         <canvas 
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full bg-white"
            style={{ height: '400px' }}
         />
      </div>
    </div>
  );
};

export default DrawingCanvas;

import { useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface SimpleImageZoomProps {
  imageSrc: string;
  alt: string;
}

const SimpleImageZoom = ({ imageSrc, alt }: SimpleImageZoomProps) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.5, 5));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.5, 0.5));
  };

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    
    const startX = e.clientX - position.x;
    const startY = e.clientY - position.y;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - startX,
        y: e.clientY - startY,
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="relative w-full h-full border-2 border-gray-200 rounded overflow-hidden bg-gray-50">
      {/* Controles de Zoom */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={zoomIn}
          disabled={scale >= 5}
          className="bg-white hover:bg-gray-50 border border-gray-300 rounded p-2 shadow-sm disabled:opacity-50"
          title="Aumentar zoom"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={zoomOut}
          disabled={scale <= 0.5}
          className="bg-white hover:bg-gray-50 border border-gray-300 rounded p-2 shadow-sm disabled:opacity-50"
          title="Diminuir zoom"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={resetZoom}
          className="bg-white hover:bg-gray-50 border border-gray-300 rounded p-2 shadow-sm"
          title="Resetar zoom"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Indicador de Zoom */}
      <div className="absolute bottom-4 right-4 z-10 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
        {(scale * 100).toFixed(0)}%
      </div>

      {/* Instruções */}
      {scale > 1 && (
        <div className="absolute bottom-4 left-4 z-10 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
          Arraste para mover a imagem
        </div>
      )}

      {/* Imagem */}
      <div className="w-full h-full flex items-center justify-center">
        <img
          src={imageSrc}
          alt={alt}
          className="max-w-full max-h-full object-contain select-none transition-transform duration-200"
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            cursor: scale > 1 ? 'grab' : 'default',
          }}
          onMouseDown={handleMouseDown}
          draggable={false}
        />
      </div>
    </div>
  );
};

export default SimpleImageZoom;
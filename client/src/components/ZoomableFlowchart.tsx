import { useState, useRef, useCallback, useEffect } from "react";

interface ZoomableFlowchartProps {
  imageSrc: string;
  alt: string;
}

const ZoomableFlowchart = ({ imageSrc, alt }: ZoomableFlowchartProps) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState({ scale: 1, originX: 50, originY: 50 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!imageRef.current || !containerRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsSelecting(true);
    setStartPos({ x, y });
    setSelectionBox({ x, y, width: 0, height: 0 });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSelecting || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const width = currentX - startPos.x;
    const height = currentY - startPos.y;

    setSelectionBox({
      x: width < 0 ? currentX : startPos.x,
      y: height < 0 ? currentY : startPos.y,
      width: Math.abs(width),
      height: Math.abs(height),
    });
  }, [isSelecting, startPos]);

  const handleMouseUp = useCallback(() => {
    if (!isSelecting || !imageRef.current) return;

    setIsSelecting(false);

    // Aplicar zoom se a seleção for significativa (maior que 20px)
    if (selectionBox.width > 20 && selectionBox.height > 20) {
      const rect = imageRef.current.getBoundingClientRect();
      
      // Calcular o centro da seleção em porcentagem
      const centerX = ((selectionBox.x + selectionBox.width / 2) / rect.width) * 100;
      const centerY = ((selectionBox.y + selectionBox.height / 2) / rect.height) * 100;
      
      // Calcular o fator de zoom baseado na área selecionada
      const scaleX = rect.width / selectionBox.width;
      const scaleY = rect.height / selectionBox.height;
      const scale = Math.min(scaleX, scaleY, 5); // Máximo 5x zoom
      
      setZoom({
        scale: scale,
        originX: centerX,
        originY: centerY,
      });
    }

    // Limpar seleção
    setSelectionBox({ x: 0, y: 0, width: 0, height: 0 });
  }, [isSelecting, selectionBox]);

  const resetZoom = useCallback(() => {
    setZoom({ scale: 1, originX: 50, originY: 50 });
  }, []);

  // Event listeners para mouse up global
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSelecting) {
        handleMouseUp();
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isSelecting, handleMouseUp]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative flex items-center justify-center border-2 border-gray-200 rounded overflow-hidden"
      style={{ cursor: isSelecting ? 'crosshair' : 'default' }}
    >
      <img
        ref={imageRef}
        src={imageSrc}
        alt={alt}
        className="max-w-full max-h-full object-contain select-none"
        style={{
          transform: `scale(${zoom.scale})`,
          transformOrigin: `${zoom.originX}% ${zoom.originY}%`,
          transition: isSelecting ? 'none' : 'transform 0.3s ease-out',
        }}
        draggable={false}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
      />

      {/* Caixa de seleção */}
      {isSelecting && selectionBox.width > 0 && selectionBox.height > 0 && (
        <div
          className="absolute border-2 border-blue-500 bg-blue-200 bg-opacity-30 pointer-events-none"
          style={{
            left: `${selectionBox.x}px`,
            top: `${selectionBox.y}px`,
            width: `${selectionBox.width}px`,
            height: `${selectionBox.height}px`,
          }}
        />
      )}

      {/* Botão de reset */}
      {zoom.scale > 1 && (
        <button
          onClick={resetZoom}
          className="absolute top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded shadow-lg text-sm font-medium transition-colors"
        >
          Resetar Zoom
        </button>
      )}

      {/* Indicador de zoom */}
      {zoom.scale > 1 && (
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
          {zoom.scale.toFixed(1)}x
        </div>
      )}

      {/* Instruções */}
      {zoom.scale === 1 && (
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
          Clique e arraste para selecionar área
        </div>
      )}
    </div>
  );
};

export default ZoomableFlowchart;
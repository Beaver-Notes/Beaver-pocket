import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import EraserFillIcon from 'remixicon-react/EraserFillIcon';

const PaperComponent: React.FC<{ node: any, updateAttributes: (attributes: any) => void }> = ({ node, updateAttributes }) => {
  const { lines } = node.attrs;
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const [tool, setTool] = useState<'brush' | 'pen' | 'highlighter' | 'eraser'>('brush');
  const [brushColor, setBrushColor] = useState<string>('#000000');
  const [brushWidth, setBrushWidth] = useState<number>(5);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []);

  useEffect(() => {
    const initCanvas = () => {
      canvasRef.current = new fabric.Canvas('drawing-canvas', {
        width: 800,
        height: 600,
        isDrawingMode: true,
      });

      // Load existing lines
      if (lines) {
        canvasRef.current.loadFromJSON(lines, () => {
          canvasRef.current?.renderAll();
        });
      }

      // Save canvas state to lines
      canvasRef.current.on('path:created', () => {
        updateAttributes({ lines: JSON.stringify(canvasRef.current?.toJSON()) });
      });
    };

    if (!canvasRef.current) {
      initCanvas();
    }

    return () => {
      canvasRef.current?.dispose();
      canvasRef.current = null;
    };
  }, [lines, updateAttributes]);

  useEffect(() => {
    if (canvasRef.current) {
      if (tool === 'eraser') {
        canvasRef.current.freeDrawingBrush = new fabric.PencilBrush(canvasRef.current);
        canvasRef.current.freeDrawingBrush.color = isDarkMode ? '#000000' : '#FFFFFF'; // Set eraser color based on mode
        canvasRef.current.freeDrawingBrush.width = brushWidth; // Set eraser width
      } else if (tool === 'highlighter') {
        canvasRef.current.freeDrawingBrush = new fabric.PencilBrush(canvasRef.current);
        canvasRef.current.freeDrawingBrush.color = 'rgba(255, 255, 0, 0.3)'; // Set highlighter color
        canvasRef.current.freeDrawingBrush.width = brushWidth * 2; // Adjust highlighter width
      } else {
        canvasRef.current.freeDrawingBrush = new fabric.PencilBrush(canvasRef.current);
        canvasRef.current.freeDrawingBrush.color = brushColor === '#000000' ? (isDarkMode ? '#FFFFFF' : '#000000') : brushColor; // Adjust brush color for dark mode
        canvasRef.current.freeDrawingBrush.width = brushWidth; // Set brush width
      }
    }
  }, [tool, brushColor, brushWidth, isDarkMode]);

  const selectTool = (selectedTool: 'brush' | 'pen' | 'highlighter' | 'eraser') => {
    setTool(selectedTool);
  };

  const clearCanvas = () => {
    if (canvasRef.current) {
      canvasRef.current.clear();
      updateAttributes({ lines: [] });
    }
  };

  return (
    <NodeViewWrapper>
      <div className="flex flex-col items-center">
        <div className="controls flex flex-wrap gap-2 mb-4">
          <button onClick={() => selectTool('brush')} className={`btn ${tool === 'brush' ? 'btn-active' : ''}`}>
            Brush
          </button>
          <button onClick={() => selectTool('pen')} className={`btn ${tool === 'pen' ? 'btn-active' : ''}`}>
            Pen
          </button>
          <button onClick={() => selectTool('highlighter')} className={`btn ${tool === 'highlighter' ? 'btn-active' : ''}`}>
            Highlighter
          </button>
          <button onClick={() => selectTool('eraser')} className={`btn ${tool === 'eraser' ? 'btn-active' : ''}`}>
            Eraser
          </button>
          <button onClick={clearCanvas} className="btn">
            <EraserFillIcon className="h-6 w-6 mr-1" />
            Clear
          </button>
          <label className="flex items-center">
            Brush Color:
            <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} disabled={tool === 'eraser'} className="ml-2" />
          </label>
          <label className="flex items-center">
            Brush Size:
            <input
              type="range"
              min="1"
              max="50"
              value={brushWidth}
              onChange={(e) => setBrushWidth(Number(e.target.value))}
              className="ml-2"
            />
          </label>
        </div>
        <canvas id="drawing-canvas"></canvas>
        <NodeViewContent />
      </div>
    </NodeViewWrapper>
  );
};

export default PaperComponent;
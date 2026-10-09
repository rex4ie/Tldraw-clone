import React, { useState, useRef } from 'react';
import { useCanvas } from '../../context/CanvasContext';
import { ToolType, Shape } from '../../types/canvas';
import {
  MousePointer,
  Hand,
  Pencil,
  Highlighter,
  Eraser,
  Square,
  Circle,
  Triangle,
  Diamond,
  Star,
  Cloud,
  MessageSquare,
  ArrowUpRight,
  Minus,
  Type,
  StickyNote,
  Frame,
  Sparkles,
  Image as ImageIcon,
  ChevronUp,
} from 'lucide-react';
import { sound } from '../../utils/sound';

export const BottomToolbar: React.FC = () => {
  const { activeTool, setActiveTool, theme, addShape, camera } = useCanvas();
  const [shapesMenuOpen, setShapesMenuOpen] = useState(false);
  const [selectedShapeTool, setSelectedShapeTool] = useState<ToolType>('rectangle');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isDark = theme === 'dark' || theme === 'midnight';

  const shapeChoices: { id: ToolType; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: 'rectangle', label: 'Rectangle', icon: <Square size={18} />, shortcut: 'R' },
    { id: 'ellipse', label: 'Ellipse', icon: <Circle size={18} />, shortcut: 'O' },
    { id: 'triangle', label: 'Triangle', icon: <Triangle size={18} />, shortcut: '8' },
    { id: 'diamond', label: 'Diamond', icon: <Diamond size={18} />, shortcut: 'W' },
    { id: 'star', label: 'Star', icon: <Star size={18} />, shortcut: 'S' },
    { id: 'cloud', label: 'Cloud', icon: <Cloud size={18} />, shortcut: 'C' },
    { id: 'bubble', label: 'Speech Bubble', icon: <MessageSquare size={18} />, shortcut: 'B' },
  ];

  const handleToolSelect = (tool: ToolType) => {
    setActiveTool(tool);
    setShapesMenuOpen(false);
    sound.playClick();
  };

  const handleShapeSelect = (shapeId: ToolType) => {
    setSelectedShapeTool(shapeId);
    setActiveTool(shapeId);
    setShapesMenuOpen(false);
    sound.playClick();
  };

  // Image Upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxW = 340;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const w = img.width * scale;
        const h = img.height * scale;

        // Place near center of viewport
        const cx = (window.innerWidth / 2 - camera.x) / camera.z;
        const cy = (window.innerHeight / 2 - camera.y) / camera.z;

        const newImage: Shape = {
          id: `img-${Date.now()}`,
          type: 'image',
          x: cx - w / 2,
          y: cy - h / 2,
          width: w,
          height: h,
          imageUrl: dataUrl,
          color: '#1e1e1e',
          fill: 'none',
          dash: 'solid',
          size: 's',
          font: 'sans',
          textAlign: 'left',
          opacity: 1,
        };
        addShape(newImage);
        setActiveTool('select');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const activeShapeItem = shapeChoices.find((s) => s.id === selectedShapeTool) || shapeChoices[0];
  const isGeometricShapeActive = shapeChoices.some((s) => s.id === activeTool);

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center">
      {/* Shapes Sub-Menu Popover */}
      {shapesMenuOpen && (
        <div
          className={`mb-2 p-1.5 flex items-center gap-1 rounded-xl shadow-xl border backdrop-blur-md transition-all animate-in fade-in zoom-in-95 duration-150 ${
            isDark
              ? 'bg-zinc-900/95 border-zinc-700/80 text-zinc-200'
              : 'bg-white/95 border-slate-200/80 text-slate-800'
          }`}
        >
          {shapeChoices.map((shape) => {
            const isCurrent = activeTool === shape.id;
            return (
              <button
                key={shape.id}
                onClick={() => handleShapeSelect(shape.id)}
                className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-colors group ${
                  isCurrent
                    ? 'bg-blue-500 text-white shadow-sm'
                    : isDark
                    ? 'hover:bg-zinc-800 text-zinc-300'
                    : 'hover:bg-slate-100 text-slate-700'
                }`}
                title={`${shape.label} (${shape.shortcut})`}
              >
                {shape.icon}
                <span className="sr-only">{shape.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Floating Dock */}
      <div
        className={`flex items-center gap-1 px-2 py-1.5 rounded-2xl shadow-2xl border backdrop-blur-md select-none transition-colors ${
          isDark
            ? 'bg-zinc-900/90 border-zinc-700/60 shadow-black/40 text-zinc-200'
            : 'bg-white/90 border-slate-200/80 shadow-slate-900/10 text-slate-700'
        }`}
      >
        {/* Select */}
        <button
          onClick={() => handleToolSelect('select')}
          className={`relative p-2.5 rounded-xl transition-all ${
            activeTool === 'select'
              ? 'bg-blue-500 text-white shadow-sm scale-105'
              : isDark
              ? 'hover:bg-zinc-800 text-zinc-300'
              : 'hover:bg-slate-100 text-slate-700'
          }`}
          title="Select (V / 1)"
        >
          <MousePointer size={19} />
        </button>

        {/* Hand */}
        <button
          onClick={() => handleToolSelect('hand')}
          className={`relative p-2.5 rounded-xl transition-all ${
            activeTool === 'hand'
              ? 'bg-blue-500 text-white shadow-sm scale-105'
              : isDark
              ? 'hover:bg-zinc-800 text-zinc-300'
              : 'hover:bg-slate-100 text-slate-700'
          }`}
          title="Hand / Pan (H / Space)"
        >
          <Hand size={19} />
        </button>

        <div className={`w-[1px] h-6 mx-0.5 ${isDark ? 'bg-zinc-700' : 'bg-slate-200'}`} />

        {/* Draw */}
        <button
          onClick={() => handleToolSelect('draw')}
          className={`relative p-2.5 rounded-xl transition-all ${
            activeTool === 'draw'
              ? 'bg-blue-500 text-white shadow-sm scale-105'
              : isDark
              ? 'hover:bg-zinc-800 text-zinc-300'
              : 'hover:bg-slate-100 text-slate-700'
          }`}
          title="Draw / Pen (D / 2)"
        >
          <Pencil size={19} />
        </button>

        {/* Highlighter */}
        <button
          onClick={() => handleToolSelect('highlighter')}
          className={`relative p-2.5 rounded-xl transition-all ${
            activeTool === 'highlighter'
              ? 'bg-blue-500 text-white shadow-sm scale-105'
              : isDark
              ? 'hover:bg-zinc-800 text-zinc-300'
              : 'hover:bg-slate-100 text-slate-700'
          }`}
          title="Highlighter (M)"
        >
          <Highlighter size={19} />
        </button>

        {/* Eraser */}
        <button
          onClick={() => handleToolSelect('eraser')}
          className={`relative p-2.5 rounded-xl transition-all ${
            activeTool === 'eraser'
              ? 'bg-blue-500 text-white shadow-sm scale-105'
              : isDark
              ? 'hover:bg-zinc-800 text-zinc-300'
              : 'hover:bg-slate-100 text-slate-700'
          }`}
          title="Eraser (E / 3)"
        >
          <Eraser size={19} />
        </button>

        <div className={`w-[1px] h-6 mx-0.5 ${isDark ? 'bg-zinc-700' : 'bg-slate-200'}`} />

        {/* Arrow */}
        <button
          onClick={() => handleToolSelect('arrow')}
          className={`relative p-2.5 rounded-xl transition-all ${
            activeTool === 'arrow'
              ? 'bg-blue-500 text-white shadow-sm scale-105'
              : isDark
              ? 'hover:bg-zinc-800 text-zinc-300'
              : 'hover:bg-slate-100 text-slate-700'
          }`}
          title="Arrow (A / 4)"
        >
          <ArrowUpRight size={19} />
        </button>

        {/* Line */}
        <button
          onClick={() => handleToolSelect('line')}
          className={`relative p-2.5 rounded-xl transition-all ${
            activeTool === 'line'
              ? 'bg-blue-500 text-white shadow-sm scale-105'
              : isDark
              ? 'hover:bg-zinc-800 text-zinc-300'
              : 'hover:bg-slate-100 text-slate-700'
          }`}
          title="Line (L / 5)"
        >
          <Minus size={19} />
        </button>

        {/* Shapes Dropdown / Trigger */}
        <div className="relative flex items-center">
          <button
            onClick={() => {
              if (isGeometricShapeActive) {
                setShapesMenuOpen((prev) => !prev);
              } else {
                handleToolSelect(selectedShapeTool);
              }
            }}
            className={`flex items-center gap-0.5 p-2.5 rounded-xl transition-all ${
              isGeometricShapeActive
                ? 'bg-blue-500 text-white shadow-sm scale-105'
                : isDark
                ? 'hover:bg-zinc-800 text-zinc-300'
                : 'hover:bg-slate-100 text-slate-700'
            }`}
            title={`${activeShapeItem.label} (${activeShapeItem.shortcut})`}
          >
            {activeShapeItem.icon}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShapesMenuOpen((prev) => !prev);
            }}
            className={`p-1 -ml-1 rounded-md transition-colors ${
              isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-200 text-slate-500'
            }`}
          >
            <ChevronUp size={12} className={`transition-transform ${shapesMenuOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Text */}
        <button
          onClick={() => handleToolSelect('text')}
          className={`relative p-2.5 rounded-xl transition-all ${
            activeTool === 'text'
              ? 'bg-blue-500 text-white shadow-sm scale-105'
              : isDark
              ? 'hover:bg-zinc-800 text-zinc-300'
              : 'hover:bg-slate-100 text-slate-700'
          }`}
          title="Text (T / X)"
        >
          <Type size={19} />
        </button>

        {/* Sticky Note */}
        <button
          onClick={() => handleToolSelect('sticky')}
          className={`relative p-2.5 rounded-xl transition-all ${
            activeTool === 'sticky'
              ? 'bg-blue-500 text-white shadow-sm scale-105'
              : isDark
              ? 'hover:bg-zinc-800 text-zinc-300'
              : 'hover:bg-slate-100 text-slate-700'
          }`}
          title="Sticky Note (N)"
        >
          <StickyNote size={19} />
        </button>

        {/* Frame */}
        <button
          onClick={() => handleToolSelect('frame')}
          className={`relative p-2.5 rounded-xl transition-all ${
            activeTool === 'frame'
              ? 'bg-blue-500 text-white shadow-sm scale-105'
              : isDark
              ? 'hover:bg-zinc-800 text-zinc-300'
              : 'hover:bg-slate-100 text-slate-700'
          }`}
          title="Frame (F)"
        >
          <Frame size={19} />
        </button>

        <div className={`w-[1px] h-6 mx-0.5 ${isDark ? 'bg-zinc-700' : 'bg-slate-200'}`} />

        {/* Laser */}
        <button
          onClick={() => handleToolSelect('laser')}
          className={`relative p-2.5 rounded-xl transition-all ${
            activeTool === 'laser'
              ? 'bg-red-500 text-white shadow-sm scale-105'
              : isDark
              ? 'hover:bg-zinc-800 text-zinc-300'
              : 'hover:bg-slate-100 text-slate-700'
          }`}
          title="Laser Pointer (K)"
        >
          <Sparkles size={19} />
        </button>

        {/* Image Upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className={`relative p-2.5 rounded-xl transition-all ${
            isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-slate-100 text-slate-700'
          }`}
          title="Insert Image (Upload or Paste)"
        >
          <ImageIcon size={19} />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>
    </div>
  );
};

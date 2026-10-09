import React, { useRef } from 'react';
import { useCanvas } from '../../context/CanvasContext';
import { getCombinedBounds } from '../../utils/math';
import { MapPin, X } from 'lucide-react';

export const MiniMap: React.FC = () => {
  const { shapes, camera, setCamera, theme, showMiniMap, setShowMiniMap } = useCanvas();
  const miniMapRef = useRef<HTMLDivElement | null>(null);

  if (!showMiniMap) return null;

  const isDark = theme === 'dark' || theme === 'midnight';
  const bounds = getCombinedBounds(shapes);

  const miniW = 180;
  const miniH = 120;

  // Viewport in canvas coords
  const vpW = window.innerWidth / camera.z;
  const vpH = window.innerHeight / camera.z;
  const vpX = -camera.x / camera.z;
  const vpY = -camera.y / camera.z;

  // Global bounds enclosing both shapes and current viewport
  const worldMinX = Math.min(bounds?.minX || 0, vpX) - 200;
  const worldMaxX = Math.max(bounds?.maxX || 1000, vpX + vpW) + 200;
  const worldMinY = Math.min(bounds?.minY || 0, vpY) - 200;
  const worldMaxY = Math.max(bounds?.maxY || 1000, vpY + vpH) + 200;

  const worldW = Math.max(worldMaxX - worldMinX, 100);
  const worldH = Math.max(worldMaxY - worldMinY, 100);

  const scale = Math.min(miniW / worldW, miniH / worldH);

  // Convert canvas coord to mini-map coord
  const toMiniX = (cx: number) => (cx - worldMinX) * scale;
  const toMiniY = (cy: number) => (cy - worldMinY) * scale;

  const handleMiniMapClick = (e: React.MouseEvent) => {
    if (!miniMapRef.current) return;
    const rect = miniMapRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Convert back to canvas point
    const targetCanvasX = mx / scale + worldMinX;
    const targetCanvasY = my / scale + worldMinY;

    // Center viewport at target
    const newCamX = window.innerWidth / 2 - targetCanvasX * camera.z;
    const newCamY = window.innerHeight / 2 - targetCanvasY * camera.z;

    setCamera((prev) => ({ ...prev, x: newCamX, y: newCamY }));
  };

  return (
    <div
      className={`fixed bottom-20 left-5 z-40 p-2.5 rounded-xl shadow-xl border backdrop-blur-md select-none transition-all animate-in fade-in duration-150 ${
        isDark
          ? 'bg-zinc-900/90 border-zinc-700/60 shadow-black/40 text-zinc-200'
          : 'bg-white/90 border-slate-200/80 shadow-slate-900/10 text-slate-800'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5 px-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1">
          <MapPin size={12} />
          Navigator
        </span>
        <button
          onClick={() => setShowMiniMap(false)}
          className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 p-0.5"
          title="Close Navigator"
        >
          <X size={12} />
        </button>
      </div>

      <div
        ref={miniMapRef}
        onClick={handleMiniMapClick}
        style={{ width: miniW, height: miniH }}
        className={`relative overflow-hidden rounded-lg cursor-pointer border ${
          isDark ? 'bg-zinc-950/80 border-zinc-800' : 'bg-slate-50 border-slate-200'
        }`}
      >
        {/* Render simplified shape silhouettes */}
        {shapes.map((s) => (
          <div
            key={s.id}
            style={{
              position: 'absolute',
              left: `${toMiniX(s.x)}px`,
              top: `${toMiniY(s.y)}px`,
              width: `${Math.max(2, s.width * scale)}px`,
              height: `${Math.max(2, s.height * scale)}px`,
              backgroundColor: isDark ? '#52525b' : '#94a3b8',
              opacity: 0.7,
              borderRadius: s.type === 'ellipse' ? '50%' : '1px',
            }}
          />
        ))}

        {/* Viewport Frame */}
        <div
          style={{
            position: 'absolute',
            left: `${toMiniX(vpX)}px`,
            top: `${toMiniY(vpY)}px`,
            width: `${vpW * scale}px`,
            height: `${vpH * scale}px`,
            border: '1.5px solid #3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '2px',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
};

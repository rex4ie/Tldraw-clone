import React from 'react';
import { useCanvas } from '../../context/CanvasContext';
import { StrokeSize, DashStyle, FillStyle, FontFamily, TextAlign, TextDirection } from '../../types/canvas';
import { COLORS, STROKE_SIZES } from '../../utils/constants';
import { measureTextDimensions } from '../../utils/textMeasure';
import {
  Copy,
  Trash2,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  FlipHorizontal,
  FlipVertical,
  Type,
  List,
  ListOrdered,
} from 'lucide-react';

export const StylePanel: React.FC = () => {
  const {
    shapes,
    selectedIds,
    activeTool,
    theme,
    currentStyle,
    setCurrentStyle,
    setShapes,
    updateSelectedShapes,
    deleteSelected,
    duplicateSelected,
    reorderShapes,
    alignSelected,
    flipSelected,
    lockSelected,
  } = useCanvas();

  const isDark = theme === 'dark' || theme === 'midnight';
  const hasSelection = selectedIds.length > 0;
  const isMultiSelection = selectedIds.length > 1;

  // Shapes selected
  const selectedShapes = shapes.filter((s) => selectedIds.includes(s.id));
  const isAllLocked = selectedShapes.length > 0 && selectedShapes.every((s) => s.isLocked);

  // If no selection and active tool is not a drawing/shape tool, don't clutter screen
  const isShapeTool = [
    'draw',
    'highlighter',
    'rectangle',
    'ellipse',
    'triangle',
    'diamond',
    'star',
    'cloud',
    'bubble',
    'arrow',
    'line',
    'text',
    'sticky',
  ].includes(activeTool);

  if (!hasSelection && !isShapeTool) {
    return null;
  }

  // Active properties (either from single selected shape or currentStyle)
  const activeColor = hasSelection && selectedShapes[0] ? selectedShapes[0].color : currentStyle.color;
  const activeFill = hasSelection && selectedShapes[0] ? selectedShapes[0].fill : currentStyle.fill;
  const activeDash = hasSelection && selectedShapes[0] ? selectedShapes[0].dash : currentStyle.dash;
  const activeSize = hasSelection && selectedShapes[0] ? selectedShapes[0].size : currentStyle.size;
  const activeFont = hasSelection && selectedShapes[0] ? selectedShapes[0].font : currentStyle.font;
  const activeAlign = hasSelection && selectedShapes[0] ? selectedShapes[0].textAlign : currentStyle.textAlign;
  const activeDir = hasSelection && selectedShapes[0] ? selectedShapes[0].textDirection || 'ltr' : currentStyle.textDirection || 'ltr';
  const activeOpacity = hasSelection && selectedShapes[0] ? selectedShapes[0].opacity : currentStyle.opacity;

  const handleColorChange = (colorVal: string) => {
    if (isAllLocked) return;
    setCurrentStyle((prev) => ({ ...prev, color: colorVal }));
    if (hasSelection) {
      updateSelectedShapes({ color: colorVal });
    }
  };

  const handleFillChange = (fill: FillStyle) => {
    if (isAllLocked) return;
    setCurrentStyle((prev) => ({ ...prev, fill }));
    if (hasSelection) {
      updateSelectedShapes({ fill });
    }
  };

  const handleDashChange = (dash: DashStyle) => {
    if (isAllLocked) return;
    setCurrentStyle((prev) => ({ ...prev, dash }));
    if (hasSelection) {
      updateSelectedShapes({ dash });
    }
  };

  const handleSizeChange = (size: StrokeSize) => {
    if (isAllLocked) return;
    setCurrentStyle((prev) => ({ ...prev, size }));
    if (hasSelection) {
      updateSelectedShapes({ size });
    }
  };

  const handleFontChange = (font: FontFamily) => {
    if (isAllLocked) return;
    setCurrentStyle((prev) => ({ ...prev, font }));
    if (hasSelection) {
      updateSelectedShapes({ font });
    }
  };

  const handleAlignChange = (textAlign: TextAlign) => {
    if (isAllLocked) return;
    setCurrentStyle((prev) => ({ ...prev, textAlign }));
    if (hasSelection) {
      setShapes((prev) =>
        prev.map((s) => {
          if (!selectedIds.includes(s.id) || s.isLocked) return s;
          if (s.type === 'text') {
            const anchorX =
              s.anchorX ??
              (s.textAlign === 'center'
                ? s.x + s.width / 2
                : s.textAlign === 'right'
                ? s.x + s.width
                : s.x);

            let newX = anchorX;
            if (textAlign === 'center') {
              newX = anchorX - s.width / 2;
            } else if (textAlign === 'right') {
              newX = anchorX - s.width;
            } else {
              newX = anchorX;
            }

            return {
              ...s,
              textAlign,
              anchorX,
              x: newX,
            };
          }
          return { ...s, textAlign };
        })
      );
    }
  };

  const handleDirectionChange = (textDirection: TextDirection) => {
    if (isAllLocked) return;
    setCurrentStyle((prev) => ({ ...prev, textDirection }));
    if (hasSelection) {
      updateSelectedShapes({ textDirection });
    }
  };

  const handleOpacityChange = (opacity: number) => {
    if (isAllLocked) return;
    setCurrentStyle((prev) => ({ ...prev, opacity }));
    if (hasSelection) {
      updateSelectedShapes({ opacity });
    }
  };

  const handleToggleBulletList = () => {
    if (isAllLocked) return;
    if (hasSelection) {
      setShapes((prev) =>
        prev.map((s) => {
          if (!selectedIds.includes(s.id)) return s;
          const text = s.text || '';
          if (!text) {
            const newText = '• ';
            const measured = measureTextDimensions(newText, s.fontSize || STROKE_SIZES[s.size]?.fontSize || 24, s.font);
            return {
              ...s,
              text: newText,
              width: s.autoWidth ? measured.width : s.width,
              height: s.autoWidth ? measured.height : s.height,
            };
          }
          const lines = text.split('\n');
          const allBullets = lines.every((l) => !l.trim() || /^\s*(•|[-*])\s/.test(l));
          const newLines = lines.map((l) => {
            if (!l.trim()) return l;
            if (allBullets) {
              return l.replace(/^(\s*)(•|[-*])\s/, '$1');
            }
            const clean = l.replace(/^(\s*)(\d+[.-]|•|[-*])\s/, '$1');
            return l.replace(/^(\s*).*/, '$1• ') + clean.trimStart();
          });
          const newText = newLines.join('\n');
          const measured = measureTextDimensions(newText, s.fontSize || STROKE_SIZES[s.size]?.fontSize || 24, s.font);
          let newX = s.x;
          if (s.autoWidth) {
            const anchorX = s.anchorX ?? (s.textAlign === 'center' ? s.x + s.width / 2 : s.textAlign === 'right' ? s.x + s.width : s.x);
            if (s.textAlign === 'center') newX = anchorX - measured.width / 2;
            else if (s.textAlign === 'right') newX = anchorX - measured.width;
            else newX = anchorX;
          }
          return {
            ...s,
            x: newX,
            text: newText,
            width: s.autoWidth ? measured.width : s.width,
            height: s.autoWidth ? measured.height : Math.max(s.height, measured.height),
          };
        }),
        true
      );
    }
  };

  const handleToggleNumberedList = () => {
    if (isAllLocked) return;
    if (hasSelection) {
      setShapes((prev) =>
        prev.map((s) => {
          if (!selectedIds.includes(s.id)) return s;
          const text = s.text || '';
          if (!text) {
            const newText = '1. ';
            const measured = measureTextDimensions(newText, s.fontSize || STROKE_SIZES[s.size]?.fontSize || 24, s.font);
            return {
              ...s,
              text: newText,
              width: s.autoWidth ? measured.width : s.width,
              height: s.autoWidth ? measured.height : s.height,
            };
          }
          const lines = text.split('\n');
          const allNumbered = lines.every((l) => !l.trim() || /^\s*\d+[.-]\s/.test(l));
          let num = 1;
          const newLines = lines.map((l) => {
            if (!l.trim()) return l;
            if (allNumbered) {
              return l.replace(/^(\s*)\d+[.-]\s/, '$1');
            }
            const clean = l.replace(/^(\s*)(\d+[.-]|•|[-*])\s/, '$1');
            return l.replace(/^(\s*).*/, `$1${num++}. `) + clean.trimStart();
          });
          const newText = newLines.join('\n');
          const measured = measureTextDimensions(newText, s.fontSize || STROKE_SIZES[s.size]?.fontSize || 24, s.font);
          let newX = s.x;
          if (s.autoWidth) {
            const anchorX = s.anchorX ?? (s.textAlign === 'center' ? s.x + s.width / 2 : s.textAlign === 'right' ? s.x + s.width : s.x);
            if (s.textAlign === 'center') newX = anchorX - measured.width / 2;
            else if (s.textAlign === 'right') newX = anchorX - measured.width;
            else newX = anchorX;
          }
          return {
            ...s,
            x: newX,
            text: newText,
            width: s.autoWidth ? measured.width : s.width,
            height: s.autoWidth ? measured.height : Math.max(s.height, measured.height),
          };
        }),
        true
      );
    }
  };

  const currentText = hasSelection && selectedShapes[0] ? selectedShapes[0].text || '' : '';
  const isBulletListActive = Boolean(
    currentText &&
    currentText.split('\n').filter((l) => l.trim()).length > 0 &&
    currentText.split('\n').filter((l) => l.trim()).every((l) => /^\s*(•|[-*])\s/.test(l))
  );
  const isNumberedListActive = Boolean(
    currentText &&
    currentText.split('\n').filter((l) => l.trim()).length > 0 &&
    currentText.split('\n').filter((l) => l.trim()).every((l) => /^\s*\d+[.-]\s/.test(l))
  );

  const showTextControls =
    !hasSelection ||
    selectedShapes.some((s) => ['text', 'sticky', 'rectangle', 'ellipse', 'triangle', 'diamond', 'cloud', 'bubble'].includes(s.type));

  return (
    <div
      className={`fixed top-18 right-5 z-40 w-64 p-3.5 rounded-2xl shadow-xl border backdrop-blur-md transition-all select-none animate-in fade-in slide-in-from-right-2 duration-150 ${
        isDark
          ? 'bg-zinc-900/90 border-zinc-700/60 shadow-black/40 text-zinc-200'
          : 'bg-white/90 border-slate-200/80 shadow-slate-900/10 text-slate-800'
      }`}
    >
      <div className="flex flex-col gap-3">
        {/* Locked notification banner */}
        {isAllLocked && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs">
            <div className="flex items-center gap-1.5 font-medium">
              <Lock size={14} />
              <span>Object is locked</span>
            </div>
            <button
              onClick={lockSelected}
              className="px-2 py-0.5 rounded-md bg-amber-500 text-white font-semibold text-[11px] shadow-xs hover:bg-amber-600 transition-colors"
            >
              Unlock
            </button>
          </div>
        )}

        {/* Customization controls (disabled when locked) */}
        <div className={`flex flex-col gap-3 ${isAllLocked ? 'opacity-40 pointer-events-none' : ''}`}>
          {/* Color Palette */}
          <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1.5">
            Color
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {COLORS.slice(0, 10).map((c) => {
              const val = isDark ? c.darkValue : c.lightValue;
              const isSelected = activeColor === val || activeColor === c.value;
              return (
                <button
                  key={c.id}
                  onClick={() => handleColorChange(val)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
                    isSelected ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 scale-105' : ''
                  }`}
                  style={{ backgroundColor: val, border: c.id === 'white' ? '1px solid #cbd5e1' : 'none' }}
                  title={c.label}
                />
              );
            })}
          </div>
        </div>

        {/* Fill Style */}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1.5">
            Fill
          </div>
          <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-lg">
            {(['none', 'semi', 'solid'] as FillStyle[]).map((fill) => (
              <button
                key={fill}
                onClick={() => handleFillChange(fill)}
                className={`py-1 text-xs font-medium capitalize rounded-md transition-colors ${
                  activeFill === fill
                    ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {fill}
              </button>
            ))}
          </div>
        </div>

        {/* Dash Style */}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1.5">
            Stroke
          </div>
          <div className="grid grid-cols-4 gap-1 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-lg">
            {(['draw', 'solid', 'dashed', 'dotted'] as DashStyle[]).map((dash) => (
              <button
                key={dash}
                onClick={() => handleDashChange(dash)}
                className={`py-1 text-xs font-medium capitalize rounded-md transition-colors ${
                  activeDash === dash
                    ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {dash === 'draw' ? 'Draw' : dash}
              </button>
            ))}
          </div>
        </div>

        {/* Size (S, M, L, XL) */}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1.5">
            Size
          </div>
          <div className="grid grid-cols-4 gap-1 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-lg">
            {(Object.keys(STROKE_SIZES) as StrokeSize[]).map((size) => (
              <button
                key={size}
                onClick={() => handleSizeChange(size)}
                className={`py-1 text-xs font-bold uppercase rounded-md transition-colors ${
                  activeSize === size
                    ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Font Family (if applicable) */}
        {showTextControls && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1.5">
              Font
            </div>
            <div className="grid grid-cols-5 gap-1 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-lg">
              {(
                [
                  { id: 'vazir', label: 'Vazir' },
                  { id: 'draw', label: 'Draw' },
                  { id: 'sans', label: 'Sans' },
                  { id: 'serif', label: 'Serif' },
                  { id: 'mono', label: 'Mono' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleFontChange(f.id)}
                  className={`py-1 text-xs font-medium rounded-md transition-colors ${
                    activeFont === f.id
                      ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Text Alignment & Direction */}
        {showTextControls && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              <span>Text Align & Dir</span>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Alignment */}
              <div className="flex-1 grid grid-cols-3 gap-1 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-lg">
                {(
                  [
                    { id: 'left', icon: <AlignLeft size={14} /> },
                    { id: 'center', icon: <AlignCenter size={14} /> },
                    { id: 'right', icon: <AlignRight size={14} /> },
                  ] as const
                ).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => handleAlignChange(a.id)}
                    className={`py-1 flex items-center justify-center rounded-md transition-colors ${
                      activeAlign === a.id
                        ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {a.icon}
                  </button>
                ))}
              </div>

              {/* Direction LTR / RTL */}
              <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-lg text-[10px] font-bold">
                <button
                  onClick={() => handleDirectionChange('ltr')}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    activeDir === 'ltr'
                      ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400'
                  }`}
                  title="Left-to-Right"
                >
                  LTR
                </button>
                <button
                  onClick={() => handleDirectionChange('rtl')}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    activeDir === 'rtl'
                      ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400'
                  }`}
                  title="Right-to-Left (Persian/Arabic)"
                >
                  RTL
                </button>
              </div>
            </div>

            {/* List Formatting (Bullet List & Numbered List) */}
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="flex-1 grid grid-cols-2 gap-1 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-lg">
                <button
                  onClick={handleToggleBulletList}
                  disabled={isAllLocked}
                  className={`py-1 px-2 flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors ${
                    isBulletListActive
                      ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Bullet List (- or * then Space)"
                >
                  <List size={14} />
                  <span>Bullet List</span>
                </button>
                <button
                  onClick={handleToggleNumberedList}
                  disabled={isAllLocked}
                  className={`py-1 px-2 flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors ${
                    isNumberedListActive
                      ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Numbered List (1. or 1- then Space)"
                >
                  <ListOrdered size={14} />
                  <span>Numbered</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Opacity */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1.5">
            <span>Opacity</span>
            <span>{Math.round(activeOpacity * 100)}%</span>
          </div>
          <div className="grid grid-cols-4 gap-1 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-lg">
            {[0.25, 0.5, 0.75, 1].map((op) => (
              <button
                key={op}
                onClick={() => handleOpacityChange(op)}
                className={`py-1 text-xs font-medium rounded-md transition-colors ${
                  activeOpacity === op
                    ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {Math.round(op * 100)}%
              </button>
            ))}
          </div>
        </div>
        </div>

        {/* Actions for Selected Shapes */}
        {hasSelection && (
          <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 flex flex-col gap-2">
            {/* Multi-selection Alignment */}
            {isMultiSelection && (
              <div className={isAllLocked ? 'opacity-30 pointer-events-none' : ''}>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
                  Align Objects
                </div>
                <div className="flex items-center justify-between gap-1">
                  <button
                    onClick={() => alignSelected('left')}
                    disabled={isAllLocked}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-600 dark:text-zinc-300"
                    title="Align Left"
                  >
                    <AlignLeft size={16} />
                  </button>
                  <button
                    onClick={() => alignSelected('center')}
                    disabled={isAllLocked}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-600 dark:text-zinc-300"
                    title="Align Center"
                  >
                    <AlignCenter size={16} />
                  </button>
                  <button
                    onClick={() => alignSelected('right')}
                    disabled={isAllLocked}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-600 dark:text-zinc-300"
                    title="Align Right"
                  >
                    <AlignRight size={16} />
                  </button>
                  <button
                    onClick={() => alignSelected('top')}
                    disabled={isAllLocked}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-600 dark:text-zinc-300"
                    title="Align Top"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="4" y1="4" x2="20" y2="4" />
                      <rect x="6" y="8" width="4" height="12" rx="1" />
                      <rect x="14" y="8" width="4" height="8" rx="1" />
                    </svg>
                  </button>
                  <button
                    onClick={() => alignSelected('middle')}
                    disabled={isAllLocked}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-600 dark:text-zinc-300"
                    title="Align Middle"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="2" y1="12" x2="22" y2="12" strokeDasharray="2 2" />
                      <rect x="6" y="6" width="4" height="12" rx="1" />
                      <rect x="14" y="8" width="4" height="8" rx="1" />
                    </svg>
                  </button>
                  <button
                    onClick={() => alignSelected('bottom')}
                    disabled={isAllLocked}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-600 dark:text-zinc-300"
                    title="Align Bottom"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="4" y1="20" x2="20" y2="20" />
                      <rect x="6" y="4" width="4" height="12" rx="1" />
                      <rect x="14" y="8" width="4" height="8" rx="1" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Quick Action buttons */}
            <div className="flex items-center justify-between gap-1">
              <button
                onClick={duplicateSelected}
                disabled={isAllLocked}
                className={`p-2 rounded-lg transition-colors ${
                  isAllLocked
                    ? 'opacity-30 cursor-not-allowed text-slate-400'
                    : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300'
                }`}
                title="Duplicate (Cmd+D)"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={() => reorderShapes('front')}
                disabled={isAllLocked}
                className={`p-2 rounded-lg transition-colors ${
                  isAllLocked
                    ? 'opacity-30 cursor-not-allowed text-slate-400'
                    : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300'
                }`}
                title="Bring to Front (])"
              >
                <ArrowUp size={16} />
              </button>
              <button
                onClick={() => reorderShapes('back')}
                disabled={isAllLocked}
                className={`p-2 rounded-lg transition-colors ${
                  isAllLocked
                    ? 'opacity-30 cursor-not-allowed text-slate-400'
                    : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300'
                }`}
                title="Send to Back ([)"
              >
                <ArrowDown size={16} />
              </button>
              <button
                onClick={() => flipSelected('horizontal')}
                disabled={isAllLocked}
                className={`p-2 rounded-lg transition-colors ${
                  isAllLocked
                    ? 'opacity-30 cursor-not-allowed text-slate-400'
                    : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300'
                }`}
                title="Flip Horizontal (Shift+H)"
              >
                <FlipHorizontal size={16} />
              </button>
              <button
                onClick={() => flipSelected('vertical')}
                disabled={isAllLocked}
                className={`p-2 rounded-lg transition-colors ${
                  isAllLocked
                    ? 'opacity-30 cursor-not-allowed text-slate-400'
                    : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300'
                }`}
                title="Flip Vertical (Shift+V)"
              >
                <FlipVertical size={16} />
              </button>
              <button
                onClick={lockSelected}
                className={`p-2 rounded-lg transition-colors ${
                  isAllLocked
                    ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 ring-1 ring-amber-400'
                    : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300'
                }`}
                title="Lock / Unlock (Cmd+L)"
              >
                {isAllLocked ? <Lock size={16} /> : <Unlock size={16} />}
              </button>
              <button
                onClick={deleteSelected}
                disabled={isAllLocked}
                className={`p-2 rounded-lg transition-colors ${
                  isAllLocked
                    ? 'opacity-30 cursor-not-allowed text-slate-400'
                    : 'hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500'
                }`}
                title="Delete (Backspace)"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useCanvas } from '../../context/CanvasContext';
import { exportCanvasToPng, exportCanvasToSvg, exportToJson } from '../../utils/export';
import confetti from 'canvas-confetti';
import { X, Download, Copy, Check, FileCode, Image as ImgIcon, FileText } from 'lucide-react';

export const ExportModal: React.FC = () => {
  const {
    showExportModal,
    setShowExportModal,
    shapes,
    selectedIds,
    theme,
    pages,
    gridMode,
  } = useCanvas();

  const [format, setFormat] = useState<'png' | 'svg' | 'json'>('png');
  const [scale, setScale] = useState<number>(2);
  const [transparent, setTransparent] = useState<boolean>(false);
  const [exportScope, setExportScope] = useState<'all' | 'selected'>('all');
  const [copied, setCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  if (!showExportModal) return null;

  const isDark = theme === 'dark' || theme === 'midnight';
  const targetShapes =
    exportScope === 'selected' && selectedIds.length > 0
      ? shapes.filter((s) => selectedIds.includes(s.id))
      : shapes;

  const handleDownload = async () => {
    setIsExporting(true);

    try {
      if (format === 'json') {
        exportToJson({ pages, theme, gridMode }, 'my-board.json');
      } else if (format === 'svg') {
        exportCanvasToSvg(targetShapes, theme, {
          transparent,
          filename: 'my-board.svg',
        });
      } else {
        await exportCanvasToPng(targetShapes, theme, {
          scale,
          transparent,
          filename: `my-board@${scale}x.png`,
        });
      }

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
      setShowExportModal(false);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    setIsExporting(true);

    try {
      const blob = await exportCanvasToPng(targetShapes, theme, {
        scale: 2,
        transparent,
      });

      if (blob && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopied(true);
        confetti({
          particleCount: 30,
          spread: 40,
          origin: { y: 0.8 },
        });
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      alert('Unable to copy image to clipboard');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden ${
          isDark
            ? 'bg-zinc-900 border-zinc-700/80 text-zinc-200'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Download size={18} className="text-blue-500" />
            <h2 className="text-base font-semibold">Export Canvas</h2>
          </div>
          <button
            onClick={() => setShowExportModal(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 flex flex-col gap-4">
          {/* Format Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">
              Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setFormat('png')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                  format === 'png'
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20'
                    : isDark
                    ? 'border-zinc-800 hover:bg-zinc-800/50 text-zinc-400'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <ImgIcon size={20} />
                <span>PNG Image</span>
              </button>

              <button
                onClick={() => setFormat('svg')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                  format === 'svg'
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20'
                    : isDark
                    ? 'border-zinc-800 hover:bg-zinc-800/50 text-zinc-400'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <FileCode size={20} />
                <span>Vector SVG</span>
              </button>

              <button
                onClick={() => setFormat('json')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                  format === 'json'
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20'
                    : isDark
                    ? 'border-zinc-800 hover:bg-zinc-800/50 text-zinc-400'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <FileText size={20} />
                <span>JSON Project</span>
              </button>
            </div>
          </div>

          {/* Export Scope (All or Selection) */}
          {selectedIds.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1.5">
                Export Target
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-lg text-xs">
                <button
                  onClick={() => setExportScope('all')}
                  className={`py-1.5 rounded-md font-medium transition-colors ${
                    exportScope === 'all'
                      ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400'
                  }`}
                >
                  All Shapes ({shapes.length})
                </button>
                <button
                  onClick={() => setExportScope('selected')}
                  className={`py-1.5 rounded-md font-medium transition-colors ${
                    exportScope === 'selected'
                      ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-zinc-400'
                  }`}
                >
                  Selected ({selectedIds.length})
                </button>
              </div>
            </div>
          )}

          {/* PNG Scale */}
          {format === 'png' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1.5">
                Resolution Scale
              </label>
              <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-lg text-xs">
                {[
                  { value: 1, label: '1x (Standard)' },
                  { value: 2, label: '2x (Retina HD)' },
                  { value: 3, label: '3x (Print 4K)' },
                ].map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setScale(s.value)}
                    className={`py-1.5 rounded-md font-medium transition-colors ${
                      scale === s.value
                        ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-zinc-400'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Background toggle */}
          {format !== 'json' && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-medium text-slate-600 dark:text-zinc-300">
                Transparent Background
              </span>
              <button
                type="button"
                onClick={() => setTransparent((prev) => !prev)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  transparent ? 'bg-blue-500' : isDark ? 'bg-zinc-700' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    transparent ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-3">
          {format === 'png' ? (
            <button
              onClick={handleCopyToClipboard}
              disabled={isExporting}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                copied
                  ? 'border-emerald-500 text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
                  : isDark
                  ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied PNG!' : 'Copy to Clipboard'}</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold shadow-lg shadow-blue-500/25 transition-all active:scale-95"
          >
            <Download size={14} />
            <span>{isExporting ? 'Exporting...' : 'Download File'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

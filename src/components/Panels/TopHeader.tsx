import React, { useState, useRef } from 'react';
import { useCanvas } from '../../context/CanvasContext';
import { PagesPanel } from './PagesPanel';
import { ThemeType, GridMode } from '../../types/canvas';
import {
  Menu,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Magnet,
  Grid,
  Sun,
  Moon,
  Compass,
  Volume2,
  VolumeX,
  HelpCircle,
  Download,
  Share2,
  FileText,
  FolderOpen,
  Trash2,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { exportToJson } from '../../utils/export';

export const TopHeader: React.FC = () => {
  const {
    camera,
    canUndo,
    canRedo,
    undo,
    redo,
    zoomIn,
    zoomOut,
    resetZoom,
    zoomToFit,
    theme,
    setTheme,
    gridMode,
    setGridMode,
    snapToGrid,
    setSnapToGrid,
    soundEnabled,
    setSoundEnabled,
    showMiniMap,
    setShowMiniMap,
    setShowShortcutsModal,
    setShowExportModal,
    clearCanvas,
    selectAll,
    pages,
    loadProjectData,
    docTitle,
    setDocTitle,
  } = useCanvas();

  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isDark = theme === 'dark' || theme === 'midnight';
  const zoomPercent = Math.round(camera.z * 100);

  const themeOptions: { id: ThemeType; label: string; icon: React.ReactNode }[] = [
    { id: 'light', label: 'Light', icon: <Sun size={14} className="text-amber-500" /> },
    { id: 'dark', label: 'Dark', icon: <Moon size={14} className="text-blue-400" /> },
    { id: 'midnight', label: 'Midnight', icon: <Compass size={14} className="text-cyan-400" /> },
    { id: 'sepia', label: 'Warm Sepia', icon: <Sparkles size={14} className="text-orange-400" /> },
  ];

  const gridModes: { id: GridMode; label: string }[] = [
    { id: 'dots', label: 'Dots' },
    { id: 'grid', label: 'Grid' },
    { id: 'none', label: 'Blank' },
  ];

  // Open JSON project file
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        loadProjectData(json);
      } catch {
        alert('Invalid board JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
    setMenuOpen(false);
  };

  const handleExportJson = () => {
    exportToJson({ pages, theme, gridMode }, `${docTitle.toLowerCase().replace(/\s+/g, '-')}.json`);
    setMenuOpen(false);
  };

  return (
    <header className="fixed top-3 left-4 right-4 z-40 flex items-center justify-between pointer-events-none select-none">
      {/* Left side: Hamburger menu, Pages dropdown, and Project Title */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Main Hamburger Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className={`p-2 rounded-xl shadow-md border backdrop-blur-md transition-colors ${
              isDark
                ? 'bg-zinc-900/90 border-zinc-700/60 hover:bg-zinc-800 text-zinc-200'
                : 'bg-white/90 border-slate-200/80 hover:bg-slate-100 text-slate-700'
            }`}
            title="Menu"
          >
            <Menu size={18} />
          </button>

          {/* Menu Dropdown */}
          {menuOpen && (
            <div
              className={`absolute top-full left-0 mt-2 w-56 rounded-2xl shadow-2xl border backdrop-blur-md p-1.5 z-50 animate-in fade-in duration-100 ${
                isDark
                  ? 'bg-zinc-900/95 border-zinc-700/80 text-zinc-200'
                  : 'bg-white/95 border-slate-200/80 text-slate-800'
              }`}
            >
              <div className="px-2 py-1.5 mb-1 flex items-center justify-between border-b border-slate-100 dark:border-zinc-800">
                <span className="font-bold text-xs tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                  My Board
                </span>
                <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">v1.2</span>
              </div>

              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-2 py-1">
                File
              </div>
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <FolderOpen size={14} />
                <span>Open JSON Project...</span>
              </button>
              <button
                onClick={handleExportJson}
                className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <FileText size={14} />
                <span>Save Project JSON</span>
              </button>
              <button
                onClick={() => {
                  setShowExportModal(true);
                  setMenuOpen(false);
                }}
                className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Download size={14} />
                <span>Export as PNG / SVG...</span>
              </button>

              <div className={`h-[1px] my-1 ${isDark ? 'bg-zinc-800' : 'bg-slate-100'}`} />

              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-2 py-1">
                Edit
              </div>
              <button
                onClick={() => {
                  selectAll();
                  setMenuOpen(false);
                }}
                className="flex items-center justify-between w-full px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <span>Select All</span>
                <span className="text-slate-400 dark:text-zinc-500 font-mono text-[10px]">Cmd+A</span>
              </button>
              <button
                onClick={() => {
                  clearCanvas();
                  setMenuOpen(false);
                }}
                className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
              >
                <Trash2 size={14} />
                <span>Clear Canvas</span>
              </button>

              <div className={`h-[1px] my-1 ${isDark ? 'bg-zinc-800' : 'bg-slate-100'}`} />

              <button
                onClick={() => {
                  setShowShortcutsModal(true);
                  setMenuOpen(false);
                }}
                className="flex items-center justify-between w-full px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <HelpCircle size={14} />
                  Keyboard Shortcuts
                </span>
                <span className="text-slate-400 dark:text-zinc-500 font-mono text-[10px]">?</span>
              </button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImportJson}
        />

        {/* Pages Dropdown */}
        <PagesPanel />

        {/* Project Title */}
        <div className="hidden sm:flex items-center">
          {isEditingTitle ? (
            <input
              autoFocus
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setIsEditingTitle(false);
              }}
              className={`px-2 py-1 rounded-lg text-xs font-semibold border outline-none ${
                isDark ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-white border-blue-400 text-slate-800'
              }`}
            />
          ) : (
            <button
              onClick={() => setIsEditingTitle(true)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors hover:underline ${
                isDark ? 'text-zinc-300 hover:bg-zinc-800/60' : 'text-slate-700 hover:bg-white/60'
              }`}
              title="Click to rename"
            >
              {docTitle}
            </button>
          )}
        </div>

        {/* Undo / Redo controls */}
        <div
          className={`flex items-center gap-0.5 px-1 py-1 rounded-xl shadow-md border backdrop-blur-md ${
            isDark ? 'bg-zinc-900/90 border-zinc-700/60' : 'bg-white/90 border-slate-200/80'
          }`}
        >
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`p-1.5 rounded-lg transition-colors ${
              canUndo
                ? isDark
                  ? 'hover:bg-zinc-800 text-zinc-200'
                  : 'hover:bg-slate-100 text-slate-700'
                : 'text-slate-300 dark:text-zinc-600 cursor-not-allowed'
            }`}
            title="Undo (Cmd+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className={`p-1.5 rounded-lg transition-colors ${
              canRedo
                ? isDark
                  ? 'hover:bg-zinc-800 text-zinc-200'
                  : 'hover:bg-slate-100 text-slate-700'
                : 'text-slate-300 dark:text-zinc-600 cursor-not-allowed'
            }`}
            title="Redo (Cmd+Shift+Z)"
          >
            <Redo2 size={16} />
          </button>
        </div>
      </div>

      {/* Right side: View controls, Theme, Grid toggle, Sound, Export */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Zoom controls dock */}
        <div
          className={`hidden md:flex items-center gap-0.5 px-1 py-1 rounded-xl shadow-md border backdrop-blur-md ${
            isDark ? 'bg-zinc-900/90 border-zinc-700/60' : 'bg-white/90 border-slate-200/80'
          }`}
        >
          <button
            onClick={zoomOut}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-zinc-800 text-zinc-200' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Zoom Out (Cmd+-)"
          >
            <ZoomOut size={15} />
          </button>
          <button
            onClick={resetZoom}
            className={`px-1.5 py-1 text-xs font-mono font-medium rounded-md transition-colors ${
              isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Reset to 100% (Shift+0)"
          >
            {zoomPercent}%
          </button>
          <button
            onClick={zoomIn}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-zinc-800 text-zinc-200' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Zoom In (Cmd+=)"
          >
            <ZoomIn size={15} />
          </button>
          <button
            onClick={zoomToFit}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-zinc-800 text-zinc-200' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Zoom to Fit All (Shift+1)"
          >
            <Maximize2 size={14} />
          </button>
        </div>

        {/* Snap to grid toggle */}
        <button
          onClick={() => setSnapToGrid((prev) => !prev)}
          className={`p-2 rounded-xl shadow-md border backdrop-blur-md transition-all ${
            snapToGrid
              ? 'bg-blue-500 text-white border-blue-600 shadow-blue-500/20'
              : isDark
              ? 'bg-zinc-900/90 border-zinc-700/60 hover:bg-zinc-800 text-zinc-300'
              : 'bg-white/90 border-slate-200/80 hover:bg-slate-100 text-slate-700'
          }`}
          title={snapToGrid ? 'Snap to Grid: ON' : 'Snap to Grid: OFF'}
        >
          <Magnet size={16} />
        </button>

        {/* Grid mode toggle (Dots / Grid / Blank) */}
        <div
          className={`flex items-center gap-0.5 p-1 rounded-xl shadow-md border backdrop-blur-md ${
            isDark ? 'bg-zinc-900/90 border-zinc-700/60' : 'bg-white/90 border-slate-200/80'
          }`}
        >
          {gridModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setGridMode(mode.id)}
              className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                gridMode === mode.id
                  ? 'bg-blue-500 text-white font-medium shadow-xs'
                  : isDark
                  ? 'text-zinc-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Theme Picker Dropdown */}
        <div
          className={`flex items-center gap-0.5 p-1 rounded-xl shadow-md border backdrop-blur-md ${
            isDark ? 'bg-zinc-900/90 border-zinc-700/60' : 'bg-white/90 border-slate-200/80'
          }`}
        >
          {themeOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setTheme(opt.id)}
              className={`p-1.5 rounded-lg transition-colors ${
                theme === opt.id
                  ? isDark
                    ? 'bg-zinc-700/90 text-white shadow-xs'
                    : 'bg-slate-200/80 text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
              title={`Theme: ${opt.label}`}
            >
              {opt.icon}
            </button>
          ))}
        </div>

        {/* MiniMap Toggle */}
        <button
          onClick={() => setShowMiniMap((prev) => !prev)}
          className={`hidden sm:flex p-2 rounded-xl shadow-md border backdrop-blur-md transition-colors ${
            showMiniMap
              ? 'bg-blue-500 text-white border-blue-600'
              : isDark
              ? 'bg-zinc-900/90 border-zinc-700/60 hover:bg-zinc-800 text-zinc-300'
              : 'bg-white/90 border-slate-200/80 hover:bg-slate-100 text-slate-700'
          }`}
          title="Toggle Mini-map Navigator"
        >
          <Grid size={16} />
        </button>

        {/* Sound Toggle */}
        <button
          onClick={() => setSoundEnabled((prev) => !prev)}
          className={`p-2 rounded-xl shadow-md border backdrop-blur-md transition-colors ${
            isDark
              ? 'bg-zinc-900/90 border-zinc-700/60 hover:bg-zinc-800 text-zinc-300'
              : 'bg-white/90 border-slate-200/80 hover:bg-slate-100 text-slate-700'
          }`}
          title={soundEnabled ? 'Mute Audio Effects' : 'Enable Audio Effects'}
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} className="text-slate-400" />}
        </button>

        {/* Help Center & Shortcuts Button */}
        <button
          onClick={() => setShowShortcutsModal(true)}
          className={`p-2 rounded-xl shadow-md border backdrop-blur-md transition-colors ${
            isDark
              ? 'bg-zinc-900/90 border-zinc-700/60 hover:bg-zinc-800 text-zinc-300'
              : 'bg-white/90 border-slate-200/80 hover:bg-slate-100 text-slate-700'
          }`}
          title="Help Center, Guides & Shortcuts (?)"
        >
          <HelpCircle size={16} />
        </button>

        {/* Export / Share Button */}
        <button
          onClick={() => setShowExportModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold shadow-lg shadow-blue-500/25 transition-all active:scale-95"
        >
          <Share2 size={14} />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};

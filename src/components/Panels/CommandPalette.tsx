import React, { useState, useEffect } from 'react';
import { useCanvas } from '../../context/CanvasContext';
import { Search, Sparkles, Command } from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const {
    showCommandPalette,
    setShowCommandPalette,
    theme,
    setTheme,
    gridMode,
    setGridMode,
    snapToGrid,
    setSnapToGrid,
    setActiveTool,
    selectAll,
    clearCanvas,
    zoomToFit,
    resetZoom,
    setShowExportModal,
    setShowShortcutsModal,
    setShowMiniMap,
    shapes,
    selectedIds,
    setShapes,
  } = useCanvas();

  const toggleListType = (type: 'bullet' | 'numbered') => {
    if (selectedIds.length === 0) return;
    setShapes((prev) =>
      prev.map((s) => {
        if (!selectedIds.includes(s.id)) return s;
        const text = s.text || '';
        const lines = text.split('\n');
        if (type === 'bullet') {
          const allBullets = lines.every((l) => !l.trim() || /^\s*(•|[-*])\s/.test(l));
          const newLines = lines.map((l) => {
            if (!l.trim()) return l;
            if (allBullets) return l.replace(/^(\s*)(•|[-*])\s/, '$1');
            const clean = l.replace(/^(\s*)(\d+[.-]|•|[-*])\s/, '$1');
            return l.replace(/^(\s*).*/, '$1• ') + clean.trimStart();
          });
          return { ...s, text: newLines.join('\n') };
        } else {
          const allNumbered = lines.every((l) => !l.trim() || /^\s*\d+[.-]\s/.test(l));
          let num = 1;
          const newLines = lines.map((l) => {
            if (!l.trim()) return l;
            if (allNumbered) return l.replace(/^(\s*)\d+[.-]\s/, '$1');
            const clean = l.replace(/^(\s*)(\d+[.-]|•|[-*])\s/, '$1');
            return l.replace(/^(\s*).*/, `$1${num++}. `) + clean.trimStart();
          });
          return { ...s, text: newLines.join('\n') };
        }
      }),
      true
    );
  };

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const isDark = theme === 'dark' || theme === 'midnight';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette(!showCommandPalette);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCommandPalette, setShowCommandPalette]);

  if (!showCommandPalette) return null;

  const commands = [
    { label: 'Select Tool', category: 'Tools', action: () => setActiveTool('select'), shortcut: 'V' },
    { label: 'Draw / Pencil', category: 'Tools', action: () => setActiveTool('draw'), shortcut: 'D' },
    { label: 'Highlighter', category: 'Tools', action: () => setActiveTool('highlighter'), shortcut: 'M' },
    { label: 'Eraser', category: 'Tools', action: () => setActiveTool('eraser'), shortcut: 'E' },
    { label: 'Sticky Note', category: 'Tools', action: () => setActiveTool('sticky'), shortcut: 'N' },
    { label: 'Text Tool', category: 'Tools', action: () => setActiveTool('text'), shortcut: 'T' },
    { label: 'Bullet List', category: 'Format', action: () => toggleListType('bullet'), shortcut: '- / * + Space' },
    { label: 'Numbered List', category: 'Format', action: () => toggleListType('numbered'), shortcut: '1. / 1- + Space' },
    { label: 'Rectangle', category: 'Shapes', action: () => setActiveTool('rectangle'), shortcut: 'R' },
    { label: 'Ellipse / Circle', category: 'Shapes', action: () => setActiveTool('ellipse'), shortcut: 'O' },
    { label: 'Triangle', category: 'Shapes', action: () => setActiveTool('triangle'), shortcut: '8' },
    { label: 'Diamond', category: 'Shapes', action: () => setActiveTool('diamond'), shortcut: 'W' },
    { label: 'Cloud Shape', category: 'Shapes', action: () => setActiveTool('cloud'), shortcut: 'C' },
    { label: 'Star Shape', category: 'Shapes', action: () => setActiveTool('star'), shortcut: 'S' },
    { label: 'Arrow Tool', category: 'Shapes', action: () => setActiveTool('arrow'), shortcut: 'A' },
    { label: 'Line Tool', category: 'Shapes', action: () => setActiveTool('line'), shortcut: 'L' },
    { label: 'Frame Container', category: 'Tools', action: () => setActiveTool('frame'), shortcut: 'F' },
    { label: 'Laser Pointer', category: 'Tools', action: () => setActiveTool('laser'), shortcut: 'K' },
    { label: 'Zoom to Fit All', category: 'View', action: zoomToFit, shortcut: 'Shift+1' },
    { label: 'Reset Zoom (100%)', category: 'View', action: resetZoom, shortcut: 'Shift+0' },
    { label: 'Toggle Mini-Map Navigator', category: 'View', action: () => setShowMiniMap((p) => !p) },
    { label: 'Theme: Light', category: 'Preferences', action: () => setTheme('light') },
    { label: 'Theme: Dark', category: 'Preferences', action: () => setTheme('dark') },
    { label: 'Theme: Midnight Slate', category: 'Preferences', action: () => setTheme('midnight') },
    { label: 'Theme: Warm Sepia', category: 'Preferences', action: () => setTheme('sepia') },
    { label: 'Background: Dotted Grid', category: 'Preferences', action: () => setGridMode('dots') },
    { label: 'Background: Line Grid', category: 'Preferences', action: () => setGridMode('grid') },
    { label: 'Background: Blank Canvas', category: 'Preferences', action: () => setGridMode('none') },
    { label: snapToGrid ? 'Disable Snap to Grid' : 'Enable Snap to Grid', category: 'Preferences', action: () => setSnapToGrid((p) => !p) },
    { label: 'Export as PNG / SVG...', category: 'File', action: () => setShowExportModal(true) },
    { label: 'Keyboard Shortcuts', category: 'Help', action: () => setShowShortcutsModal(true), shortcut: '?' },
    { label: 'Select All Shapes', category: 'Edit', action: selectAll, shortcut: 'Cmd+A' },
    { label: 'Clear Canvas', category: 'Edit', action: clearCanvas },
  ];

  const filtered = commands.filter(
    (c) =>
      c.label.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (action: () => void) => {
    action();
    setShowCommandPalette(false);
    setQuery('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/40 backdrop-blur-xs select-none animate-in fade-in duration-100"
      onClick={() => setShowCommandPalette(false)}
    >
      <div
        className={`w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden ${
          isDark
            ? 'bg-zinc-900 border-zinc-700/80 text-zinc-200'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-zinc-800">
          <Search size={18} className="text-slate-400" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command or search tools..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((i) => Math.min(filtered.length - 1, i + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((i) => Math.max(0, i - 1));
              } else if (e.key === 'Enter' && filtered[selectedIndex]) {
                e.preventDefault();
                handleSelect(filtered[selectedIndex].action);
              } else if (e.key === 'Escape') {
                setShowCommandPalette(false);
              }
            }}
            className="flex-1 bg-transparent text-sm outline-none placeholder-slate-400"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700 text-slate-400">
            ESC
          </kbd>
        </div>

        <div className="max-h-72 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No matching commands</div>
          ) : (
            filtered.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.label}
                  onClick={() => handleSelect(item.action)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs transition-colors ${
                    isSelected
                      ? 'bg-blue-500 text-white font-medium'
                      : isDark
                      ? 'hover:bg-zinc-800 text-zinc-300'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={isSelected ? 'text-blue-100' : 'text-slate-400 text-[10px]'}>
                      {item.category}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.shortcut && (
                    <kbd
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-blue-600 text-blue-100'
                          : isDark
                          ? 'bg-zinc-800 text-zinc-400'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.shortcut}
                    </kbd>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

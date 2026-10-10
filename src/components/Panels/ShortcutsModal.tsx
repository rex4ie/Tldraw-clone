import React from 'react';
import { useCanvas } from '../../context/CanvasContext';
import { X, Keyboard } from 'lucide-react';

export const ShortcutsModal: React.FC = () => {
  const { showShortcutsModal, setShowShortcutsModal, theme } = useCanvas();

  if (!showShortcutsModal) return null;

  const isDark = theme === 'dark' || theme === 'midnight';

  const shortcutGroups = [
    {
      title: 'Tools',
      items: [
        { label: 'Select Tool', keys: ['V', '1'] },
        { label: 'Hand / Pan Canvas', keys: ['H', 'Space'] },
        { label: 'Draw / Pencil', keys: ['D', '2'] },
        { label: 'Highlighter', keys: ['M'] },
        { label: 'Eraser', keys: ['E', '3'] },
        { label: 'Arrow', keys: ['A', '4'] },
        { label: 'Line', keys: ['L', '5'] },
        { label: 'Rectangle', keys: ['R', '6'] },
        { label: 'Ellipse / Circle', keys: ['O', '7'] },
        { label: 'Triangle', keys: ['8', 'G'] },
        { label: 'Diamond', keys: ['W'] },
        { label: 'Star', keys: ['S'] },
        { label: 'Cloud', keys: ['C'] },
        { label: 'Speech Bubble', keys: ['B'] },
        { label: 'Sticky Note', keys: ['N', '9'] },
        { label: 'Text', keys: ['T', 'X'] },
        { label: 'Frame', keys: ['F'] },
        { label: 'Laser Pointer', keys: ['K'] },
      ],
    },
    {
      title: 'View & Navigation',
      items: [
        { label: 'Pan Canvas', keys: ['Space + Drag'] },
        { label: 'Vertical Scroll', keys: ['Scroll'] },
        { label: 'Horizontal Scroll', keys: ['Shift + Scroll'] },
        { label: 'Zoom Canvas', keys: ['Ctrl + Scroll'] },
        { label: 'Resize Object', keys: ['Ctrl + Scroll (Selected)'] },
        { label: 'Change Thickness', keys: ['Alt + Scroll (Selected)'] },
        { label: 'Toggle Color', keys: ['Shift + Scroll (Selected)'] },
        { label: 'Zoom In / Out', keys: ['Cmd / Ctrl', '+ / -'] },
        { label: 'Zoom to 100%', keys: ['Shift', '0'] },
        { label: 'Zoom to Fit All', keys: ['Shift', '1'] },
      ],
    },
    {
      title: 'Editing & Arrangement',
      items: [
        { label: 'Undo', keys: ['Cmd / Ctrl', 'Z'] },
        { label: 'Redo', keys: ['Cmd / Ctrl', 'Shift', 'Z'] },
        { label: 'Delete Selected', keys: ['Backspace', 'Del'] },
        { label: 'Duplicate', keys: ['Cmd / Ctrl', 'D'] },
        { label: 'Select All', keys: ['Cmd / Ctrl', 'A'] },
        { label: 'Lock / Unlock', keys: ['Cmd / Ctrl', 'L'] },
        { label: 'Bring to Front', keys: [']'] },
        { label: 'Send to Back', keys: ['['] },
        { label: 'Flip Horizontal', keys: ['Shift', 'H'] },
        { label: 'Flip Vertical', keys: ['Shift', 'V'] },
        { label: 'Edit Text', keys: ['Double Click'] },
        { label: 'Bullet List', keys: ['- / *', 'Space'] },
        { label: 'Numbered List', keys: ['1. / 1-', 'Space'] },
        { label: 'Next List Item', keys: ['Enter'] },
        { label: 'Exit / Delete List', keys: ['Enter', 'Backspace'] },
        { label: 'Indent List Item', keys: ['Tab', 'Shift+Tab'] },
        { label: 'Escape / Deselect', keys: ['Esc'] },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div
        className={`w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${
          isDark
            ? 'bg-zinc-900 border-zinc-700/80 text-zinc-200'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Keyboard size={20} className="text-blue-500" />
            <h2 className="text-base font-semibold">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={() => setShowShortcutsModal(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {shortcutGroups.map((group) => (
            <div key={group.title} className="flex flex-col gap-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 pb-1 border-b border-slate-100 dark:border-zinc-800">
                {group.title}
              </h3>
              <div className="flex flex-col gap-2">
                {group.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-zinc-300">{item.label}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k, i) => (
                        <kbd
                          key={i}
                          className={`px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded shadow-xs border ${
                            isDark
                              ? 'bg-zinc-800 border-zinc-700 text-zinc-300'
                              : 'bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-400 dark:text-zinc-500">
          <span>Tip: Press Space anytime to quickly pan around your infinite canvas.</span>
          <button
            onClick={() => setShowShortcutsModal(false)}
            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useCanvas } from '../../context/CanvasContext';
import {
  X,
  Keyboard,
  Compass,
  Shapes,
  Lightbulb,
  MousePointer,
  Pencil,
  Highlighter,
  Eraser,
  ArrowUpRight,
  Square,
  StickyNote,
  Type,
  Frame,
  Sparkles,
  Search,
  Lock,
} from 'lucide-react';

export const HelpModal: React.FC = () => {
  const { showShortcutsModal, setShowShortcutsModal, theme } = useCanvas();
  const [activeTab, setActiveTab] = useState<'tools' | 'navigation' | 'shortcuts' | 'tips'>('tools');
  const [searchQuery, setSearchQuery] = useState('');

  if (!showShortcutsModal) return null;

  const isDark = theme === 'dark' || theme === 'midnight';

  const toolsList = [
    {
      name: 'Select Tool',
      key: 'V or 1',
      icon: <MousePointer size={18} className="text-blue-500" />,
      desc: 'Select individual shapes or drag a marquee box over multiple objects. Move, transform with 8 resize handles, rotate with top handle, or lock.',
    },
    {
      name: 'Draw (Pencil)',
      key: 'D or 2',
      icon: <Pencil size={18} className="text-indigo-500" />,
      desc: 'Vector freehand ink with dynamic pressure simulation and path smoothing powered by perfect-freehand.',
    },
    {
      name: 'Highlighter',
      key: 'M',
      icon: <Highlighter size={18} className="text-amber-500" />,
      desc: 'Semi-transparent wide stroke that layers smoothly over text and diagrams for emphasizing key areas.',
    },
    {
      name: 'Eraser',
      key: 'E or 3',
      icon: <Eraser size={18} className="text-rose-500" />,
      desc: 'Click any stroke or scrub across objects to cleanly remove them.',
    },
    {
      name: 'Arrow & Line',
      key: 'A (Arrow) / L (Line)',
      icon: <ArrowUpRight size={18} className="text-orange-500" />,
      desc: 'Draw connectors with customizable arrowheads. When an arrow is selected, drag the middle amber handle dot to bend it into a curved arrow.',
    },
    {
      name: 'Text Tool',
      key: 'T or X',
      icon: <Type size={18} className="text-blue-400" />,
      desc: 'Click anywhere on canvas to create a text layer and start typing right away. Supports Vazirmatn font, RTL/LTR Persian/Arabic direction, and font scaling on resize.',
    },
    {
      name: 'Sticky Note',
      key: 'N or 9',
      icon: <StickyNote size={18} className="text-yellow-400" />,
      desc: 'Square pastel cards with soft drop shadows. Double-click to type formatted notes inside.',
    },
    {
      name: 'Geometric Shapes',
      key: 'R, O, 8, W, S, C, B',
      icon: <Square size={18} className="text-emerald-500" />,
      desc: 'Rectangle (R), Ellipse (O), Triangle (8/G), Diamond (W), Star (S), Cloud (C), and Speech Bubble (B). Double-click any shape to type centered text inside.',
    },
    {
      name: 'Frame Container',
      key: 'F',
      icon: <Frame size={18} className="text-slate-400" />,
      desc: 'Create titled artboard frames to visually organize wireframes, user flows, and diagrams.',
    },
    {
      name: 'Laser Pointer',
      key: 'K',
      icon: <Sparkles size={18} className="text-red-400" />,
      desc: 'A glowing, decaying laser trail for live presentations that automatically disappears after 1 second.',
    },
  ];

  const shortcutsCategories = [
    {
      category: 'Tools Selection',
      items: [
        { label: 'Select Tool', keys: ['V', '1'] },
        { label: 'Hand / Pan Canvas', keys: ['H'] },
        { label: 'Draw / Pencil', keys: ['D', '2'] },
        { label: 'Highlighter', keys: ['M'] },
        { label: 'Eraser', keys: ['E', '3'] },
        { label: 'Text Tool', keys: ['T', 'X'] },
        { label: 'Arrow Tool', keys: ['A', '4'] },
        { label: 'Line Tool', keys: ['L', '5'] },
        { label: 'Rectangle', keys: ['R', '6'] },
        { label: 'Ellipse / Circle', keys: ['O', '7'] },
        { label: 'Triangle', keys: ['8', 'G'] },
        { label: 'Diamond', keys: ['W'] },
        { label: 'Star', keys: ['S'] },
        { label: 'Cloud Shape', keys: ['C'] },
        { label: 'Speech Bubble', keys: ['B'] },
        { label: 'Sticky Note', keys: ['N', '9'] },
        { label: 'Frame Tool', keys: ['F'] },
        { label: 'Laser Pointer', keys: ['K'] },
      ],
    },
    {
      category: 'Canvas & Viewport Navigation',
      items: [
        { label: 'Zoom In / Out', keys: ['Ctrl + Scroll'] },
        { label: 'Pinch to Zoom', keys: ['Trackpad Pinch'] },
        { label: 'Pan Canvas', keys: ['Space + Drag', 'Middle Click'] },
        { label: 'Zoom to 100%', keys: ['Shift', '0'] },
        { label: 'Zoom to Fit All', keys: ['Shift', '1'] },
        { label: 'Zoom to Selection', keys: ['Shift', '2'] },
        { label: 'Quick Zoom In / Out', keys: ['Cmd / Ctrl', '+ / -'] },
      ],
    },
    {
      category: 'Editing, Arranging & Locking',
      items: [
        { label: 'Undo Action', keys: ['Cmd / Ctrl', 'Z'] },
        { label: 'Redo Action', keys: ['Cmd / Ctrl', 'Shift', 'Z'] },
        { label: 'Delete Selected', keys: ['Backspace', 'Del'] },
        { label: 'Duplicate Selected', keys: ['Cmd / Ctrl', 'D'] },
        { label: 'Select All Objects', keys: ['Cmd / Ctrl', 'A'] },
        { label: 'Lock / Unlock Object', keys: ['Cmd / Ctrl', 'L'] },
        { label: 'Bring to Front', keys: [']'] },
        { label: 'Send to Back', keys: ['['] },
        { label: 'Flip Horizontally', keys: ['Shift', 'H'] },
        { label: 'Flip Vertically', keys: ['Shift', 'V'] },
        { label: 'Hold Shortcut (Temporary Tool)', keys: ['Hold Key', '(e.g. K, E, H)'] },
        { label: 'Nudge 2px (or 10px)', keys: ['Arrow Keys', '(+Shift)'] },
        { label: 'Ctrl + Transform Text', keys: ['Ctrl', 'Resize Handle'] },
        { label: 'Quick Command Palette', keys: ['Cmd / Ctrl', 'K'] },
      ],
    },
  ];

  const filteredTools = toolsList.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredShortcuts = shortcutsCategories.map((cat) => ({
    category: cat.category,
    items: cat.items.filter(
      (item) =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.keys.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()))
    ),
  })).filter((cat) => cat.items.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150"
      onClick={() => setShowShortcutsModal(false)}
    >
      <div
        className={`w-full max-w-3xl max-h-[88vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${
          isDark
            ? 'bg-zinc-900 border-zinc-700/80 text-zinc-200'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-400/10 text-blue-500 dark:text-blue-400 flex items-center justify-center">
              <Compass size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Help Center & User Guide</h2>
              <p className="text-xs text-slate-400 dark:text-zinc-500">
                Complete guide to tools, gestures, shortcuts, and whiteboard features
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowShortcutsModal(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/30 dark:bg-zinc-900/30">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search tools, shortcuts, gestures, tips..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-8 pr-8 py-1.5 rounded-lg text-xs border outline-none transition-colors ${
                isDark
                  ? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-blue-500'
                  : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 text-xs font-medium gap-2 pt-2">
          {[
            { id: 'tools', label: 'Tools & Shapes', icon: <Shapes size={14} /> },
            { id: 'navigation', label: 'Canvas & Gestures', icon: <Compass size={14} /> },
            { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: <Keyboard size={14} /> },
            { id: 'tips', label: 'Pro Tips & Locking', icon: <Lightbulb size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 1. TOOLS & SHAPES */}
          {activeTab === 'tools' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTools.map((t) => (
                <div
                  key={t.name}
                  className={`p-3.5 rounded-xl border flex flex-col gap-1.5 transition-colors ${
                    isDark
                      ? 'bg-zinc-800/40 border-zinc-800 hover:border-zinc-700'
                      : 'bg-slate-50/70 border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {t.icon}
                      <span className="font-semibold text-xs">{t.name}</span>
                    </div>
                    <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-bold">
                      {t.key}
                    </kbd>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                    {t.desc}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* 2. CANVAS & GESTURES */}
          {activeTab === 'navigation' && (
            <div className="flex flex-col gap-5 text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
              <div className="p-4 rounded-xl border bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50">
                <h4 className="font-bold text-sm text-blue-900 dark:text-blue-300 mb-1">
                  Infinite Canvas Navigation
                </h4>
                <p>
                  The whiteboard is an infinite, limitless vector canvas. You can zoom in and out
                  freely from 10% to 500% with sub-pixel precision.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">
                    Zooming
                  </h5>
                  <ul className="list-disc pl-4 space-y-1.5">
                    <li>
                      <strong>Ctrl + Scroll:</strong> Hold Ctrl and roll mouse wheel to zoom in and out centered directly at your mouse cursor.
                    </li>
                    <li>
                      <strong>Trackpad Pinch:</strong> Pinch with two fingers to zoom smoothly.
                    </li>
                    <li>
                      <strong>Zoom to Fit (Shift+1):</strong> Automatically frames all shapes on screen.
                    </li>
                    <li>
                      <strong>Zoom to Selection (Shift+2):</strong> Focuses in on your selected items.
                    </li>
                    <li>
                      <strong>Reset to 100% (Shift+0):</strong> Restores 1:1 pixel scale.
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">
                    Panning
                  </h5>
                  <ul className="list-disc pl-4 space-y-1.5">
                    <li>
                      <strong>Spacebar + Drag:</strong> Hold down the Spacebar and drag with your mouse.
                    </li>
                    <li>
                      <strong>Two-finger scroll:</strong> Swipe two fingers on a trackpad to pan in any direction.
                    </li>
                    <li>
                      <strong>Middle Click:</strong> Click and hold mouse scroll wheel to pan.
                    </li>
                    <li>
                      <strong>Hand Tool (H):</strong> Dedicated pan mode.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
                <h5 className="font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">
                  Dotted Grid & Themes
                </h5>
                <p>
                  You can toggle the canvas background between <strong>Dots</strong>, <strong>Line Grid</strong>, and <strong>Blank</strong> from the top bar. You can also switch between 4 curated themes: <strong>Dark</strong> (default), <strong>Light</strong>, <strong>Midnight</strong>, and <strong>Sepia Paper</strong>.
                </p>
              </div>
            </div>
          )}

          {/* 3. SHORTCUTS TABLE */}
          {activeTab === 'shortcuts' && (
            <div className="flex flex-col gap-6">
              {filteredShortcuts.map((cat) => (
                <div key={cat.category} className="flex flex-col gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 pb-1 border-b border-slate-100 dark:border-zinc-800">
                    {cat.category}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {cat.items.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50/50 dark:bg-zinc-800/40 text-xs"
                      >
                        <span className="text-slate-700 dark:text-zinc-300 font-medium">
                          {item.label}
                        </span>
                        <div className="flex items-center gap-1">
                          {item.keys.map((k, idx) => (
                            <kbd
                              key={idx}
                              className={`px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded border ${
                                isDark
                                  ? 'bg-zinc-800 border-zinc-700 text-zinc-300'
                                  : 'bg-white border-slate-200 text-slate-700'
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
          )}

          {/* 4. TIPS & LOCKING */}
          {activeTab === 'tips' && (
            <div className="flex flex-col gap-4 text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 flex flex-col gap-2">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Lock size={16} className="text-amber-500" />
                  <span>Object Locking Protection</span>
                </h4>
                <p>
                  Lock any shape with <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">Cmd+L</kbd> or the lock button.
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Locked objects cannot be moved, resized, styled, rotated, or deleted.</li>
                  <li>Click the amber Lock badge directly on the canvas selection box or in the Style Panel to quickly unlock anytime.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 flex flex-col gap-2">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span>🇮🇷 🇦🇪 Multi-lingual Typography & RTL Support</span>
                </h4>
                <p>
                  My Board includes full native support for <strong>Vazirmatn</strong> as the default font. It renders Persian, Arabic, Hebrew, and Latin typography with crisp metrics.
                </p>
                <p>
                  Use the <strong>LTR / RTL</strong> toggle in the Style Panel to switch text direction effortlessly.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 flex flex-col gap-2">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span>📐 Text Scaling Behavior</span>
                </h4>
                <p>
                  When resizing text with handles, you can choose between two modes in the Style Panel:
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    <strong>Scale Font:</strong> Dragging handles smoothly scales the font size larger or smaller.
                  </li>
                  <li>
                    <strong>Wrap Box:</strong> Dragging handles reflows and wraps the text container without altering font size.
                  </li>
                  <li>
                    <strong>Ctrl Key Toggle:</strong> Hold <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">Ctrl</kbd> while dragging resize handles to temporarily toggle between wrapping text and scaling the font!
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 flex flex-col gap-2">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span>📋 Clipboard & High-Res Exports</span>
                </h4>
                <p>
                  You can paste images and text directly from your clipboard with <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">Ctrl+V</kbd>.
                  Export high-resolution PNGs (up to 3x 4K), standalone vector SVGs, or save the complete multi-page JSON project file.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-400 dark:text-zinc-500 bg-slate-50/50 dark:bg-zinc-900/50">
          <span>Press <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">?</kbd> anytime to open this guide.</span>
          <button
            onClick={() => setShowShortcutsModal(false)}
            className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};

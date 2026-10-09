import { useEffect, useRef } from 'react';
import { useCanvas } from '../context/CanvasContext';
import { ToolType } from '../types/canvas';

const TOOL_SHORTCUTS: Record<string, ToolType> = {
  v: 'select',
  '1': 'select',
  h: 'hand',
  d: 'draw',
  p: 'draw',
  '2': 'draw',
  m: 'highlighter',
  e: 'eraser',
  '3': 'eraser',
  a: 'arrow',
  '4': 'arrow',
  l: 'line',
  '5': 'line',
  r: 'rectangle',
  '6': 'rectangle',
  o: 'ellipse',
  '7': 'ellipse',
  g: 'triangle',
  '8': 'triangle',
  w: 'diamond',
  s: 'star',
  c: 'cloud',
  b: 'bubble',
  n: 'sticky',
  '9': 'sticky',
  t: 'text',
  x: 'text',
  f: 'frame',
  k: 'laser',
};

export function useKeyboardShortcuts() {
  const {
    activeTool,
    setActiveTool,
    selectedIds,
    shapes,
    editingTextId,
    setEditingTextId,
    undo,
    redo,
    deleteSelected,
    duplicateSelected,
    selectAll,
    lockSelected,
    reorderShapes,
    flipSelected,
    zoomIn,
    zoomOut,
    resetZoom,
    zoomToFit,
    zoomToSelection,
    setShapes,
    setShowShortcutsModal,
    setSelectedIds,
  } = useCanvas();

  const activeToolRef = useRef<ToolType>(activeTool);
  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  const heldToolStateRef = useRef<{
    key: string;
    prevTool: ToolType;
    startTime: number;
  } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.getAttribute('contenteditable') === 'true';

      // If user is currently typing in an input or text area, only intercept Escape
      if (isInput || editingTextId) {
        if (e.key === 'Escape') {
          setEditingTextId(null);
          (activeEl as HTMLElement)?.blur();
        }
        return;
      }

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      // 1. UNDO / REDO
      if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }
      if (isCmdOrCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      // 2. SELECT ALL
      if (isCmdOrCtrl && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        selectAll();
        return;
      }

      // 3. DUPLICATE
      if (isCmdOrCtrl && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelected();
        return;
      }

      // 4. LOCK / UNLOCK
      if (isCmdOrCtrl && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        lockSelected();
        return;
      }

      // 5. LAYER REORDERING
      if (e.key === ']') {
        e.preventDefault();
        reorderShapes(isCmdOrCtrl ? 'front' : 'forward');
        return;
      }
      if (e.key === '[') {
        e.preventDefault();
        reorderShapes(isCmdOrCtrl ? 'back' : 'backward');
        return;
      }

      // 6. FLIP
      if (e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        flipSelected('horizontal');
        return;
      }
      if (e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        flipSelected('vertical');
        return;
      }

      // 7. ZOOM HOTKEYS
      if (e.shiftKey && e.key === '0') {
        e.preventDefault();
        resetZoom();
        return;
      }
      if (e.shiftKey && e.key === '1') {
        e.preventDefault();
        zoomToFit();
        return;
      }
      if (e.shiftKey && e.key === '2') {
        e.preventDefault();
        zoomToSelection();
        return;
      }
      if (isCmdOrCtrl && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        zoomIn();
        return;
      }
      if (isCmdOrCtrl && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        zoomOut();
        return;
      }

      // 8. DELETE
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        deleteSelected();
        return;
      }

      // 9. ESCAPE
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedIds([]);
        setActiveTool('select');
        return;
      }

      // 10. SHORTCUTS HELP MODAL
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowShortcutsModal(true);
        return;
      }

      // 11. ARROW KEYS NUDGE
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedIds.length > 0) {
        e.preventDefault();
        const dist = e.shiftKey ? 10 : 2;
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowUp') dy = -dist;
        if (e.key === 'ArrowDown') dy = dist;
        if (e.key === 'ArrowLeft') dx = -dist;
        if (e.key === 'ArrowRight') dx = dist;

        setShapes(
          (prev) =>
            prev.map((s) =>
              selectedIds.includes(s.id) && !s.isLocked
                ? {
                    ...s,
                    x: s.x + dx,
                    y: s.y + dy,
                    anchorX: s.anchorX !== undefined ? s.anchorX + dx : undefined,
                    anchorY: s.anchorY !== undefined ? s.anchorY + dy : undefined,
                  }
                : s
            ),
          true
        );
        return;
      }

      // 12. TOOL SELECTION SHORTCUTS (single keys or hold for temporary tool activation)
      if (!isCmdOrCtrl && !e.altKey) {
        const key = e.key.toLowerCase();
        const targetTool = TOOL_SHORTCUTS[key];
        if (targetTool) {
          if (e.repeat) {
            // Key is currently held down; tool was already activated on initial keydown
            return;
          }

          // Initial press: record previous active tool and press timestamp
          if (!heldToolStateRef.current) {
            heldToolStateRef.current = {
              key,
              prevTool: activeToolRef.current,
              startTime: Date.now(),
            };
          }
          setActiveTool(targetTool);
          return;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (heldToolStateRef.current && heldToolStateRef.current.key === key) {
        const duration = Date.now() - heldToolStateRef.current.startTime;
        const prevTool = heldToolStateRef.current.prevTool;
        heldToolStateRef.current = null;

        // If held for >= 220ms, revert to previously active tool!
        if (duration >= 220) {
          setActiveTool(prevTool);
        }
      }
    };

    const handleBlur = () => {
      heldToolStateRef.current = null;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [
    activeTool,
    setActiveTool,
    selectedIds,
    shapes,
    editingTextId,
    setEditingTextId,
    undo,
    redo,
    deleteSelected,
    duplicateSelected,
    selectAll,
    lockSelected,
    reorderShapes,
    flipSelected,
    zoomIn,
    zoomOut,
    resetZoom,
    zoomToFit,
    zoomToSelection,
    setShapes,
    setShowShortcutsModal,
    setSelectedIds,
  ]);
}

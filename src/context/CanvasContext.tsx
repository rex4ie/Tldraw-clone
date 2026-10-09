import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import {
  ToolType,
  Shape,
  Camera,
  Page,
  ThemeType,
  GridMode,
  ShapeStyle,
  LaserPoint,
  AlignmentGuide,
} from '../types/canvas';
import { DEFAULT_STYLE, INITIAL_PAGES, STROKE_SIZES } from '../utils/constants';
import { sound } from '../utils/sound';
import { getCombinedBounds } from '../utils/math';
import { measureTextDimensions } from '../utils/textMeasure';

interface CanvasContextType {
  pages: Page[];
  activePageId: string;
  shapes: Shape[];
  selectedIds: string[];
  activeTool: ToolType;
  camera: Camera;
  theme: ThemeType;
  gridMode: GridMode;
  snapToGrid: boolean;
  currentStyle: ShapeStyle;
  soundEnabled: boolean;
  showMiniMap: boolean;
  showShortcutsModal: boolean;
  showExportModal: boolean;
  showCommandPalette: boolean;
  editingTextId: string | null;
  laserTrail: LaserPoint[];
  alignmentGuides: AlignmentGuide[];
  canUndo: boolean;
  canRedo: boolean;
  canvasSvgRef: React.RefObject<SVGSVGElement | null>;
  docTitle: string;

  // Setters
  setActiveTool: (tool: ToolType) => void;
  setCamera: React.Dispatch<React.SetStateAction<Camera>>;
  setTheme: (theme: ThemeType) => void;
  setGridMode: (mode: GridMode) => void;
  setSnapToGrid: (snap: boolean | ((prev: boolean) => boolean)) => void;
  setCurrentStyle: React.Dispatch<React.SetStateAction<ShapeStyle>>;
  setSoundEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void;
  setShowMiniMap: (show: boolean | ((prev: boolean) => boolean)) => void;
  setShowShortcutsModal: (show: boolean) => void;
  setShowExportModal: (show: boolean) => void;
  setShowCommandPalette: (show: boolean) => void;
  setEditingTextId: (id: string | null) => void;
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  setLaserTrail: React.Dispatch<React.SetStateAction<LaserPoint[]>>;
  setAlignmentGuides: React.Dispatch<React.SetStateAction<AlignmentGuide[]>>;
  setDocTitle: (title: string) => void;

  // Actions
  setShapes: (shapes: Shape[] | ((prev: Shape[]) => Shape[]), saveHistory?: boolean) => void;
  addShape: (shape: Shape) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  updateSelectedShapes: (updates: Partial<Shape>) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  undo: () => void;
  redo: () => void;
  selectAll: () => void;
  clearCanvas: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  zoomToFit: () => void;
  zoomToSelection: () => void;
  panCamera: (dx: number, dy: number) => void;
  reorderShapes: (action: 'front' | 'back' | 'forward' | 'backward') => void;
  alignSelected: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  flipSelected: (direction: 'horizontal' | 'vertical') => void;
  lockSelected: () => void;
  groupSelected: () => void;
  ungroupSelected: () => void;

  // Page Actions
  changePage: (pageId: string) => void;
  addPage: (name?: string) => void;
  duplicatePage: (pageId: string) => void;
  deletePage: (pageId: string) => void;
  renamePage: (pageId: string, name: string) => void;
  loadProjectData: (data: { pages: Page[]; theme?: ThemeType; gridMode?: GridMode }) => void;
}

const CanvasContext = createContext<CanvasContextType | null>(null);

const STORAGE_PREFIX = 'myboard_';
const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    if (item !== null) {
      return JSON.parse(item);
    }
  } catch (err) {
    console.warn(`Error reading ${key} from localStorage:`, err);
  }
  return defaultValue;
};

const sanitizePages = (pages: Page[]): Page[] => {
  return pages.map((page) => ({
    ...page,
    shapes: page.shapes.map((s) => {
      if (s.type === 'text' && (s.height > 1000 || s.width > 4000 || s.height <= 0 || s.width <= 0)) {
        const measured = measureTextDimensions(
          s.text || 'Text',
          s.fontSize || STROKE_SIZES[s.size]?.fontSize || 24,
          s.font || 'vazir'
        );
        return {
          ...s,
          width: measured.width,
          height: measured.height,
        };
      }
      return s;
    }),
  }));
};

export const CanvasProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pages, setPages] = useState<Page[]>(() => sanitizePages(loadFromStorage('pages', INITIAL_PAGES)));
  const [activePageId, setActivePageId] = useState<string>(() => loadFromStorage('activePageId', 'page-1'));
  const [docTitle, setDocTitle] = useState<string>(() => loadFromStorage('docTitle', 'Untitled Board'));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [camera, setCamera] = useState<Camera>(() => loadFromStorage('camera', { x: 0, y: 0, z: 1 }));
  const [theme, setTheme] = useState<ThemeType>(() => loadFromStorage('theme', 'dark'));
  const [gridMode, setGridMode] = useState<GridMode>(() => loadFromStorage('gridMode', 'dots'));
  const [snapToGrid, setSnapToGrid] = useState<boolean>(() => loadFromStorage('snapToGrid', false));
  const [currentStyle, setCurrentStyle] = useState<ShapeStyle>(() => loadFromStorage('currentStyle', DEFAULT_STYLE));
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => loadFromStorage('soundEnabled', true));
  const [showMiniMap, setShowMiniMap] = useState<boolean>(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showCommandPalette, setShowCommandPalette] = useState<boolean>(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [laserTrail, setLaserTrail] = useState<LaserPoint[]>([]);
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);

  const canvasSvgRef = useRef<SVGSVGElement | null>(null);

  // Persistence to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PREFIX + 'pages', JSON.stringify(pages));
    } catch (e) {}
  }, [pages]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PREFIX + 'activePageId', JSON.stringify(activePageId));
    } catch (e) {}
  }, [activePageId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PREFIX + 'docTitle', JSON.stringify(docTitle));
    } catch (e) {}
  }, [docTitle]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PREFIX + 'theme', JSON.stringify(theme));
    } catch (e) {}
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PREFIX + 'gridMode', JSON.stringify(gridMode));
    } catch (e) {}
  }, [gridMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PREFIX + 'snapToGrid', JSON.stringify(snapToGrid));
    } catch (e) {}
  }, [snapToGrid]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PREFIX + 'soundEnabled', JSON.stringify(soundEnabled));
    } catch (e) {}
  }, [soundEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PREFIX + 'currentStyle', JSON.stringify(currentStyle));
    } catch (e) {}
  }, [currentStyle]);

  // Debounced camera position persistence
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_PREFIX + 'camera', JSON.stringify(camera));
      } catch (e) {}
    }, 250);
    return () => clearTimeout(t);
  }, [camera]);

  // History stacks
  const [undoStack, setUndoStack] = useState<Shape[][]>([]);
  const [redoStack, setRedoStack] = useState<Shape[][]>([]);

  // Sound sync
  useEffect(() => {
    sound.enabled = soundEnabled;
  }, [soundEnabled]);

  // Current page shapes
  const currentPage = pages.find((p) => p.id === activePageId) || pages[0];
  const shapes = currentPage ? currentPage.shapes : [];

  // Center camera on initial load only if no camera was previously stored
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCamera = localStorage.getItem(STORAGE_PREFIX + 'camera');
      if (!savedCamera) {
        const cx = window.innerWidth / 2 - 500;
        const cy = window.innerHeight / 2 - 350;
        setCamera({ x: cx, y: cy, z: 1 });
      }
    }
  }, []);

  const saveToHistory = useCallback((prevShapes: Shape[]) => {
    setUndoStack((prev) => [...prev.slice(-40), prevShapes]);
    setRedoStack([]);
  }, []);

  const setShapes = useCallback(
    (newShapes: Shape[] | ((prev: Shape[]) => Shape[]), saveHistory = true) => {
      setPages((prevPages) => {
        return prevPages.map((page) => {
          if (page.id !== activePageId) return page;
          const updatedShapes =
            typeof newShapes === 'function' ? newShapes(page.shapes) : newShapes;
          if (saveHistory) {
            saveToHistory(page.shapes);
          }
          return { ...page, shapes: updatedShapes };
        });
      });
    },
    [activePageId, saveToHistory]
  );

  const addShape = useCallback(
    (shape: Shape) => {
      setShapes((prev) => [...prev, shape]);
      setSelectedIds([shape.id]);
      sound.playPop();
    },
    [setShapes]
  );

  const updateShape = useCallback(
    (id: string, updates: Partial<Shape>) => {
      setShapes((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          // Strictly protect locked shapes from any property mutation unless toggling lock
          if (s.isLocked && updates.isLocked === undefined) return s;
          return { ...s, ...updates };
        })
      );
    },
    [setShapes]
  );

  const updateSelectedShapes = useCallback(
    (updates: Partial<Shape>) => {
      if (selectedIds.length === 0) return;
      setShapes((prev) =>
        prev.map((s) => (selectedIds.includes(s.id) && !s.isLocked ? { ...s, ...updates } : s))
      );
      sound.playClick();
    },
    [selectedIds, setShapes]
  );

  const deleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    setShapes((prev) => prev.filter((s) => !selectedIds.includes(s.id) || s.isLocked));
    setSelectedIds((prev) => prev.filter((id) => shapes.find((s) => s.id === id)?.isLocked));
    sound.playDelete();
  }, [selectedIds, shapes, setShapes]);

  const duplicateSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const selected = shapes.filter((s) => selectedIds.includes(s.id) && !s.isLocked);
    if (selected.length === 0) return;
    const newShapes = selected.map((s) => ({
      ...s,
      id: `shape-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      x: s.x + 24,
      y: s.y + 24,
    }));
    setShapes((prev) => [...prev, ...newShapes]);
    setSelectedIds(newShapes.map((s) => s.id));
    sound.playPop();
  }, [selectedIds, shapes, setShapes]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, shapes]);
    setShapes(previous, false);
    sound.playClick();
  }, [undoStack, shapes, setShapes]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, shapes]);
    setShapes(next, false);
    sound.playClick();
  }, [redoStack, shapes, setShapes]);

  const selectAll = useCallback(() => {
    setSelectedIds(shapes.map((s) => s.id));
  }, [shapes]);

  const clearCanvas = useCallback(() => {
    if (shapes.length === 0) return;
    setShapes([]);
    setSelectedIds([]);
    sound.playDelete();
  }, [shapes.length, setShapes]);

  const zoomIn = useCallback(() => {
    setCamera((prev) => {
      const newZ = Math.min(5, Number((prev.z * 1.2).toFixed(2)));
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      return {
        x: cx - (cx - prev.x) * (newZ / prev.z),
        y: cy - (cy - prev.y) * (newZ / prev.z),
        z: newZ,
      };
    });
  }, []);

  const zoomOut = useCallback(() => {
    setCamera((prev) => {
      const newZ = Math.max(0.1, Number((prev.z / 1.2).toFixed(2)));
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      return {
        x: cx - (cx - prev.x) * (newZ / prev.z),
        y: cy - (cy - prev.y) * (newZ / prev.z),
        z: newZ,
      };
    });
  }, []);

  const resetZoom = useCallback(() => {
    setCamera((prev) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      return {
        x: cx - (cx - prev.x) / prev.z,
        y: cy - (cy - prev.y) / prev.z,
        z: 1,
      };
    });
  }, []);

  const zoomToFit = useCallback(() => {
    if (shapes.length === 0) return;
    const bounds = getCombinedBounds(shapes);
    if (!bounds) return;

    const pad = 80;
    const vw = window.innerWidth - pad * 2;
    const vh = window.innerHeight - pad * 2;
    const scale = Math.min(Math.max(vw / bounds.width, 0.1), Math.max(vh / bounds.height, 0.1), 2);

    const x = window.innerWidth / 2 - bounds.centerX * scale;
    const y = window.innerHeight / 2 - bounds.centerY * scale;

    setCamera({ x, y, z: scale });
  }, [shapes]);

  const zoomToSelection = useCallback(() => {
    const selected = shapes.filter((s) => selectedIds.includes(s.id));
    if (selected.length === 0) return;
    const bounds = getCombinedBounds(selected);
    if (!bounds) return;

    const pad = 120;
    const vw = window.innerWidth - pad * 2;
    const vh = window.innerHeight - pad * 2;
    const scale = Math.min(Math.max(vw / bounds.width, 0.2), Math.max(vh / bounds.height, 0.2), 2);

    const x = window.innerWidth / 2 - bounds.centerX * scale;
    const y = window.innerHeight / 2 - bounds.centerY * scale;

    setCamera({ x, y, z: scale });
  }, [selectedIds, shapes]);

  const panCamera = useCallback((dx: number, dy: number) => {
    setCamera((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const reorderShapes = useCallback(
    (action: 'front' | 'back' | 'forward' | 'backward') => {
      if (selectedIds.length === 0) return;
      setShapes((prev) => {
        const selected = prev.filter((s) => selectedIds.includes(s.id) && !s.isLocked);
        if (selected.length === 0) return prev;
        const unselected = prev.filter((s) => !selectedIds.includes(s.id) || s.isLocked);

        if (action === 'front') {
          return [...unselected, ...selected];
        }
        if (action === 'back') {
          return [...selected, ...unselected];
        }
        if (action === 'forward') {
          const list = [...prev];
          for (let i = list.length - 2; i >= 0; i--) {
            if (selectedIds.includes(list[i].id) && !list[i].isLocked && (!selectedIds.includes(list[i + 1].id) || list[i + 1].isLocked)) {
              const temp = list[i];
              list[i] = list[i + 1];
              list[i + 1] = temp;
            }
          }
          return list;
        }
        if (action === 'backward') {
          const list = [...prev];
          for (let i = 1; i < list.length; i++) {
            if (selectedIds.includes(list[i].id) && !list[i].isLocked && (!selectedIds.includes(list[i - 1].id) || list[i - 1].isLocked)) {
              const temp = list[i];
              list[i] = list[i - 1];
              list[i - 1] = temp;
            }
          }
          return list;
        }
        return prev;
      });
      sound.playClick();
    },
    [selectedIds, setShapes]
  );

  const alignSelected = useCallback(
    (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
      const selected = shapes.filter((s) => selectedIds.includes(s.id));
      if (selected.length < 2) return;
      const bounds = getCombinedBounds(selected);
      if (!bounds) return;

      setShapes((prev) =>
        prev.map((s) => {
          if (!selectedIds.includes(s.id) || s.isLocked) return s;
          let newX = s.x;
          let newY = s.y;

          if (alignment === 'left') newX = bounds.minX;
          if (alignment === 'center') newX = bounds.centerX - s.width / 2;
          if (alignment === 'right') newX = bounds.maxX - s.width;
          if (alignment === 'top') newY = bounds.minY;
          if (alignment === 'middle') newY = bounds.centerY - s.height / 2;
          if (alignment === 'bottom') newY = bounds.maxY - s.height;

          return { ...s, x: newX, y: newY };
        })
      );
      sound.playClick();
    },
    [shapes, selectedIds, setShapes]
  );

  const flipSelected = useCallback(
    (direction: 'horizontal' | 'vertical') => {
      const selected = shapes.filter((s) => selectedIds.includes(s.id) && !s.isLocked);
      if (selected.length === 0) return;
      const bounds = getCombinedBounds(selected);
      if (!bounds) return;

      setShapes((prev) =>
        prev.map((s) => {
          if (!selectedIds.includes(s.id) || s.isLocked) return s;
          if (direction === 'horizontal') {
            const distFromLeft = s.x - bounds.minX;
            const newX = bounds.maxX - distFromLeft - s.width;
            return { ...s, x: newX, flipX: !s.flipX };
          } else {
            const distFromTop = s.y - bounds.minY;
            const newY = bounds.maxY - distFromTop - s.height;
            return { ...s, y: newY, flipY: !s.flipY };
          }
        })
      );
      sound.playClick();
    },
    [shapes, selectedIds, setShapes]
  );

  const lockSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    setShapes((prev) =>
      prev.map((s) => (selectedIds.includes(s.id) ? { ...s, isLocked: !s.isLocked } : s))
    );
    sound.playClick();
  }, [selectedIds, setShapes]);

  const groupSelected = useCallback(() => {
    if (selectedIds.length < 2) return;
    const newGroupId = `group-${Date.now()}`;
    setShapes((prev) =>
      prev.map((s) => (selectedIds.includes(s.id) ? { ...s, groupId: newGroupId } : s))
    );
    sound.playPop();
  }, [selectedIds, setShapes]);

  const ungroupSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    setShapes((prev) =>
      prev.map((s) => (selectedIds.includes(s.id) ? { ...s, groupId: undefined } : s))
    );
    sound.playClick();
  }, [selectedIds, setShapes]);

  // Page management
  const changePage = useCallback((pageId: string) => {
    setActivePageId(pageId);
    setSelectedIds([]);
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  const addPage = useCallback((name?: string) => {
    const newId = `page-${Date.now()}`;
    const newPage: Page = {
      id: newId,
      name: name || `Page ${pages.length + 1}`,
      shapes: [],
    };
    setPages((prev) => [...prev, newPage]);
    setActivePageId(newId);
    setSelectedIds([]);
  }, [pages.length]);

  const duplicatePage = useCallback((pageId: string) => {
    const target = pages.find((p) => p.id === pageId);
    if (!target) return;
    const newId = `page-${Date.now()}`;
    const duplicated: Page = {
      id: newId,
      name: `${target.name} (Copy)`,
      shapes: JSON.parse(JSON.stringify(target.shapes)),
    };
    setPages((prev) => [...prev, duplicated]);
    setActivePageId(newId);
  }, [pages]);

  const deletePage = useCallback((pageId: string) => {
    if (pages.length <= 1) return;
    setPages((prev) => {
      const filtered = prev.filter((p) => p.id !== pageId);
      if (activePageId === pageId) {
        setActivePageId(filtered[0].id);
      }
      return filtered;
    });
  }, [pages.length, activePageId]);

  const renamePage = useCallback((pageId: string, name: string) => {
    setPages((prev) =>
      prev.map((p) => (p.id === pageId ? { ...p, name: name.trim() || 'Untitled' } : p))
    );
  }, []);

  const loadProjectData = useCallback((data: { pages: Page[]; theme?: ThemeType; gridMode?: GridMode; title?: string }) => {
    if (data.pages && Array.isArray(data.pages) && data.pages.length > 0) {
      setPages(data.pages);
      setActivePageId(data.pages[0].id);
      setSelectedIds([]);
      setUndoStack([]);
      setRedoStack([]);
      if (data.theme) setTheme(data.theme);
      if (data.gridMode) setGridMode(data.gridMode);
      if (data.title) setDocTitle(data.title);
    }
  }, []);

  return (
    <CanvasContext.Provider
      value={{
        pages,
        activePageId,
        shapes,
        selectedIds,
        activeTool,
        camera,
        theme,
        gridMode,
        snapToGrid,
        currentStyle,
        soundEnabled,
        showMiniMap,
        showShortcutsModal,
        showExportModal,
        showCommandPalette,
        editingTextId,
        laserTrail,
        alignmentGuides,
        canUndo: undoStack.length > 0,
        canRedo: redoStack.length > 0,
        canvasSvgRef,
        docTitle,

        setActiveTool,
        setCamera,
        setTheme,
        setGridMode,
        setSnapToGrid,
        setCurrentStyle,
        setSoundEnabled,
        setShowMiniMap,
        setShowShortcutsModal,
        setShowExportModal,
        setShowCommandPalette,
        setEditingTextId,
        setSelectedIds,
        setLaserTrail,
        setAlignmentGuides,
        setDocTitle,

        setShapes,
        addShape,
        updateShape,
        updateSelectedShapes,
        deleteSelected,
        duplicateSelected,
        undo,
        redo,
        selectAll,
        clearCanvas,
        zoomIn,
        zoomOut,
        resetZoom,
        zoomToFit,
        zoomToSelection,
        panCamera,
        reorderShapes,
        alignSelected,
        flipSelected,
        lockSelected,
        groupSelected,
        ungroupSelected,

        changePage,
        addPage,
        duplicatePage,
        deletePage,
        renamePage,
        loadProjectData,
      }}
    >
      {children}
    </CanvasContext.Provider>
  );
};

export const useCanvas = () => {
  const context = useContext(CanvasContext);
  if (!context) throw new Error('useCanvas must be used within CanvasProvider');
  return context;
};

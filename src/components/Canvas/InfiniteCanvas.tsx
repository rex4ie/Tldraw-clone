import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useCanvas } from '../../context/CanvasContext';
import { Point, Shape, BoundingBox, StrokeSize } from '../../types/canvas';
import { screenToCanvas, getShapeBounds, getCombinedBounds, doBoundsIntersect, snapValue } from '../../utils/math';
import { ShapeRenderer } from './ShapeRenderer';
import { SelectionBox } from './SelectionBox';
import { AlignmentGuides } from './AlignmentGuides';
import { LaserTrail } from './LaserTrail';
import { STICKY_COLORS, STROKE_SIZES } from '../../utils/constants';
import { measureTextDimensions } from '../../utils/textMeasure';

interface MarqueeBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export const InfiniteCanvas: React.FC = () => {
  const {
    shapes,
    selectedIds,
    activeTool,
    camera,
    theme,
    gridMode,
    snapToGrid,
    currentStyle,
    setCurrentStyle,
    editingTextId,
    laserTrail,
    alignmentGuides,
    canvasSvgRef,
    setActiveTool,
    setCamera,
    setSelectedIds,
    setShapes,
    addShape,
    updateShape,
    setEditingTextId,
    setLaserTrail,
    setAlignmentGuides,
    panCamera,
  } = useCanvas();

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Interaction State
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isDraggingShape, setIsDraggingShape] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [isBending, setIsBending] = useState(false);
  const [activeDrawingShape, setActiveDrawingShape] = useState<Shape | null>(null);
  const [marquee, setMarquee] = useState<MarqueeBox | null>(null);

  // References to keep drag state without triggering unnecessary re-renders
  const dragStartPointRef = useRef<Point>({ x: 0, y: 0 });
  const initialShapeStatesRef = useRef<Map<string, Shape>>(new Map());
  const initialBoundsRef = useRef<BoundingBox | null>(null);
  const isCtrlPressedRef = useRef(false);
  const lastPointerCanvasPtRef = useRef<Point | null>(null);
  const lastShiftKeyRef = useRef(false);

  const SIZES: StrokeSize[] = ['s', 'm', 'l', 'xl'];
  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const shapesRef = useRef(shapes);
  shapesRef.current = shapes;
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;
  const editingTextIdRef = useRef(editingTextId);
  editingTextIdRef.current = editingTextId;
  const altWheelAccumulatorRef = useRef(0);
  const wheelHistoryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const pushHistoryAfterWheel = () => {
    if (wheelHistoryTimeoutRef.current) {
      clearTimeout(wheelHistoryTimeoutRef.current);
    }
    wheelHistoryTimeoutRef.current = setTimeout(() => {
      setShapes((s) => s, true);
    }, 300);
  };

  // Listen for Ctrl / Cmd key press while transforming to dynamically toggle Wrap Text
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Control' || e.key === 'Meta') && isResizing && lastPointerCanvasPtRef.current) {
        isCtrlPressedRef.current = true;
        handleResizeMove(lastPointerCanvasPtRef.current, lastShiftKeyRef.current, true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if ((e.key === 'Control' || e.key === 'Meta') && isResizing && lastPointerCanvasPtRef.current) {
        isCtrlPressedRef.current = false;
        handleResizeMove(lastPointerCanvasPtRef.current, lastShiftKeyRef.current, false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isResizing]);

  // Key listeners for spacebar pan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !editingTextId && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [editingTextId]);

  // Non-passive native wheel listener for zoom, object resizing, thickness adjustment, and horizontal/vertical scrolling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();

      const activeEl = document.activeElement;
      if (editingTextIdRef.current && (activeEl?.tagName === 'TEXTAREA' || activeEl?.tagName === 'INPUT')) {
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;
      const isAlt = e.altKey;
      const isShift = e.shiftKey;
      const currentCamera = cameraRef.current;
      const currentShapes = shapesRef.current;
      const mouseCanvasPt = screenToCanvas({ x: e.clientX, y: e.clientY }, currentCamera);

      // Find if an object is hovered under the cursor (topmost shape first)
      const hoveredShape = [...currentShapes].reverse().find((s) => {
        const bounds = getShapeBounds(s);
        return (
          mouseCanvasPt.x >= bounds.minX &&
          mouseCanvasPt.x <= bounds.maxX &&
          mouseCanvasPt.y >= bounds.minY &&
          mouseCanvasPt.y <= bounds.maxY
        );
      });

      // 1. HOVERED OBJECT + ALT + SCROLL -> CHANGE THICKNESS
      // "If they do it holding alt, it changes the thickness for the objects that support that (text,shapes...)"
      if (isAlt && hoveredShape && !hoveredShape.isLocked) {
        altWheelAccumulatorRef.current += e.deltaY;
        if (Math.abs(altWheelAccumulatorRef.current) >= 20) {
          const isIncreasing = altWheelAccumulatorRef.current < 0; // scroll up = increase thickness
          altWheelAccumulatorRef.current = 0;

          const isSelected = selectedIdsRef.current.includes(hoveredShape.id);
          const targetIds = isSelected ? selectedIdsRef.current : [hoveredShape.id];

          setShapes((prev) =>
            prev.map((s) => {
              if (!targetIds.includes(s.id) || s.isLocked) return s;

              const currentIndex = SIZES.indexOf(s.size);
              const nextIndex = isIncreasing
                ? Math.min(SIZES.length - 1, (currentIndex === -1 ? 1 : currentIndex) + 1)
                : Math.max(0, (currentIndex === -1 ? 1 : currentIndex) - 1);
              const newSize = SIZES[nextIndex];

              if (s.type === 'text') {
                const currentFont = s.fontSize || STROKE_SIZES[s.size]?.fontSize || 24;
                const newFont = isIncreasing ? Math.min(144, currentFont + 4) : Math.max(10, currentFont - 4);
                let newW = s.width;
                let newH = s.height;
                let newX = s.x;

                if (s.autoWidth) {
                  const measured = measureTextDimensions(s.text || 'Text', newFont, s.font);
                  newW = measured.width;
                  newH = measured.height;
                  const anchorX = s.anchorX ?? (s.textAlign === 'center' ? s.x + s.width / 2 : s.textAlign === 'right' ? s.x + s.width : s.x);
                  if (s.textAlign === 'center') newX = anchorX - newW / 2;
                  else if (s.textAlign === 'right') newX = anchorX - newW;
                  else newX = anchorX;
                }

                return {
                  ...s,
                  size: newSize,
                  fontSize: newFont,
                  width: newW,
                  height: newH,
                  x: newX,
                };
              }

              return {
                ...s,
                size: newSize,
              };
            }),
            false
          );
          pushHistoryAfterWheel();
        }
        return;
      }

      // 2. HOVERED OBJECT + CTRL + SCROLL -> RESIZE OBJECT (GETS SMALLER OR BIGGER)
      // "if the user hovers an object, holds ctrl, and scrolls, the object get's smaller or bigger."
      if (isCtrl && hoveredShape && !hoveredShape.isLocked) {
        const factor = e.deltaY < 0 ? 1.06 : 0.94; // scroll up = bigger, scroll down = smaller
        const isSelected = selectedIdsRef.current.includes(hoveredShape.id);
        const targetIds = isSelected ? selectedIdsRef.current : [hoveredShape.id];
        const targetShapes = currentShapes.filter((s) => targetIds.includes(s.id));
        const combinedBounds = getCombinedBounds(targetShapes) || getShapeBounds(hoveredShape);
        const centerPt: Point = { x: combinedBounds.centerX, y: combinedBounds.centerY };

        setShapes((prev) =>
          prev.map((s) => {
            if (!targetIds.includes(s.id) || s.isLocked) return s;

            const newX = centerPt.x + (s.x - centerPt.x) * factor;
            const newY = centerPt.y + (s.y - centerPt.y) * factor;
            const newW = Math.max(10, s.width * factor);
            const newH = Math.max(10, s.height * factor);

            let newPoints = s.points;
            if (s.points && s.points.length > 0) {
              newPoints = s.points.map((p) => ({
                ...p,
                x: p.x * factor,
                y: p.y * factor,
              }));
            }

            let newFontSize = s.fontSize;
            let newAnchorX = s.anchorX;
            let newAnchorY = s.anchorY;

            if (s.type === 'text') {
              const baseFont = s.fontSize || STROKE_SIZES[s.size]?.fontSize || 24;
              newFontSize = Math.max(8, Math.round(baseFont * factor));
              if (s.anchorX !== undefined) {
                newAnchorX = centerPt.x + (s.anchorX - centerPt.x) * factor;
              }
              if (s.anchorY !== undefined) {
                newAnchorY = centerPt.y + (s.anchorY - centerPt.y) * factor;
              }
            }

            return {
              ...s,
              x: newX,
              y: newY,
              width: newW,
              height: newH,
              fontSize: newFontSize,
              points: newPoints,
              anchorX: newAnchorX,
              anchorY: newAnchorY,
            };
          }),
          false
        );
        pushHistoryAfterWheel();
        return;
      }

      // 3. CTRL + SCROLL OVER EMPTY CANVAS -> CANVAS ZOOM
      if (isCtrl) {
        const zoomDelta = -e.deltaY * 0.006;
        const factor = Math.exp(zoomDelta);
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        setCamera((prev) => {
          const newZ = Math.min(5, Math.max(0.1, Number((prev.z * factor).toFixed(3))));
          return {
            x: mouseX - (mouseX - prev.x) * (newZ / prev.z),
            y: mouseY - (mouseY - prev.y) * (newZ / prev.z),
            z: newZ,
          };
        });
        return;
      }

      // 4. SHIFT + SCROLL -> HORIZONTAL CANVAS SCROLL
      // "if the user scrolls using shift (on any place on the canvas, the app scrolls horizontally"
      if (isShift) {
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        setCamera((prev) => ({
          ...prev,
          x: prev.x - delta,
        }));
        return;
      }

      // 5. WITHOUT SHIFT -> VERTICAL CANVAS SCROLL
      // "and without shift, it scrolls vertically on the canvas"
      setCamera((prev) => ({
        ...prev,
        y: prev.y - e.deltaY,
      }));
    };

    container.addEventListener('wheel', onWheelNative, { passive: false });
    return () => container.removeEventListener('wheel', onWheelNative);
  }, [setCamera]);

  // Global paste handler for images and text
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        editingTextId
      ) {
        return;
      }

      // 1. Image paste
      const items = e.clipboardData?.items;
      if (items) {
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                const img = new Image();
                img.onload = () => {
                  const maxW = 340;
                  const scale = img.width > maxW ? maxW / img.width : 1;
                  const w = img.width * scale;
                  const h = img.height * scale;

                  const cx = (window.innerWidth / 2 - camera.x) / camera.z;
                  const cy = (window.innerHeight / 2 - camera.y) / camera.z;

                  const newImageShape: Shape = {
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
                    font: 'vazir',
                    textAlign: 'left',
                    textDirection: 'ltr',
                    opacity: 1,
                  };
                  addShape(newImageShape);
                };
                img.src = dataUrl;
              };
              reader.readAsDataURL(file);
              return;
            }
          }
        }
      }

      // 2. Text paste
      const pastedText = e.clipboardData?.getData('text');
      if (pastedText && pastedText.trim()) {
        const cx = (window.innerWidth / 2 - camera.x) / camera.z;
        const cy = (window.innerHeight / 2 - camera.y) / camera.z;

        const newTextShape: Shape = {
          id: `text-${Date.now()}`,
          type: 'text',
          x: cx - 100,
          y: cy - 30,
          width: 220,
          height: 60,
          color: currentStyle.color,
          fill: 'none',
          dash: 'draw',
          size: currentStyle.size,
          font: currentStyle.font || 'vazir',
          textAlign: currentStyle.textAlign,
          textDirection: currentStyle.textDirection || 'ltr',
          opacity: currentStyle.opacity,
          text: pastedText,
        };
        addShape(newTextShape);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [camera, currentStyle, editingTextId, addShape]);

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent) => {
    if (editingTextId) return;

    // Check if right click or middle click or space pressed -> pan
    if (e.button === 1 || e.button === 2 || isSpacePressed || activeTool === 'hand') {
      setIsPanning(true);
      dragStartPointRef.current = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    if (e.button !== 0) return;

    const canvasPt = screenToCanvas({ x: e.clientX, y: e.clientY }, camera);
    dragStartPointRef.current = canvasPt;

    // 1. LASER TOOL
    if (activeTool === 'laser') {
      setLaserTrail([{ x: canvasPt.x, y: canvasPt.y, timestamp: Date.now() }]);
      return;
    }

    // 2. ERASER TOOL
    if (activeTool === 'eraser') {
      eraseAtPoint(canvasPt);
      return;
    }

    // 3. DRAW / HIGHLIGHTER
    if (activeTool === 'draw' || activeTool === 'highlighter') {
      const newDrawing: Shape = {
        id: `draw-${Date.now()}`,
        type: activeTool,
        x: canvasPt.x,
        y: canvasPt.y,
        width: 0,
        height: 0,
        points: [{ x: 0, y: 0, pressure: e.pressure || 0.5 }],
        color: currentStyle.color,
        fill: currentStyle.fill,
        dash: currentStyle.dash,
        size: currentStyle.size,
        font: currentStyle.font,
        textAlign: currentStyle.textAlign,
        opacity: currentStyle.opacity,
      };
      setActiveDrawingShape(newDrawing);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    // 4. STICKY NOTE CREATION (Single click to place)
    if (activeTool === 'sticky') {
      const stickyWidth = 200;
      const stickyHeight = 200;
      const newShape: Shape = {
        id: `sticky-${Date.now()}`,
        type: 'sticky',
        x: canvasPt.x - stickyWidth / 2,
        y: canvasPt.y - stickyHeight / 2,
        width: stickyWidth,
        height: stickyHeight,
        color: STICKY_COLORS[0].name,
        fill: 'solid',
        dash: 'solid',
        size: currentStyle.size,
        font: currentStyle.font,
        textAlign: 'left',
        opacity: 1,
        text: 'New Note',
      };
      addShape(newShape);
      setActiveTool('select');
      setEditingTextId(newShape.id);
      return;
    }

    // 5. TEXT CREATION (Single click for infinite text object, or drag to define wrapping area)
    if (activeTool === 'text') {
      const newShape: Shape = {
        id: `text-${Date.now()}`,
        type: 'text',
        x: canvasPt.x,
        y: canvasPt.y,
        anchorX: canvasPt.x,
        anchorY: canvasPt.y,
        width: 0,
        height: 0,
        color: currentStyle.color,
        fill: 'none',
        dash: 'draw',
        size: currentStyle.size,
        font: currentStyle.font || 'vazir',
        textAlign: currentStyle.textAlign || 'left',
        textDirection: currentStyle.textDirection || 'ltr',
        opacity: currentStyle.opacity,
        text: '',
        autoScaleFont: true,
        autoWidth: true,
      };
      setActiveDrawingShape(newShape);
      return;
    }

    // 6. GEOMETRIC SHAPES / ARROW / LINE / FRAME (Drag to size)
    if (
      [
        'rectangle',
        'ellipse',
        'triangle',
        'diamond',
        'star',
        'cloud',
        'bubble',
        'arrow',
        'line',
        'frame',
      ].includes(activeTool)
    ) {
      const isArrow = activeTool === 'arrow';
      const isFrame = activeTool === 'frame';
      const newShape: Shape = {
        id: `${activeTool}-${Date.now()}`,
        type: activeTool as any,
        x: canvasPt.x,
        y: canvasPt.y,
        width: 1,
        height: 1,
        color: isFrame ? '#71717a' : currentStyle.color,
        fill: isFrame ? 'none' : currentStyle.fill,
        dash: isFrame ? 'solid' : currentStyle.dash,
        size: isFrame ? 's' : currentStyle.size,
        font: currentStyle.font,
        textAlign: isFrame ? 'left' : 'center',
        opacity: currentStyle.opacity,
        text: isFrame ? 'Frame' : '',
        startArrowhead: isArrow ? 'none' : undefined,
        endArrowhead: isArrow ? 'arrow' : undefined,
      };
      setActiveDrawingShape(newShape);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    // 7. SELECT TOOL
    if (activeTool === 'select') {
      // Find if clicked on any shape (from top to bottom)
      const clickedShape = [...shapes].reverse().find((s) => {
        const bounds = getShapeBounds(s);
        return canvasPt.x >= bounds.minX && canvasPt.x <= bounds.maxX && canvasPt.y >= bounds.minY && canvasPt.y <= bounds.maxY;
      });

      if (clickedShape) {
        if (e.shiftKey) {
          // Toggle in selection
          if (selectedIds.includes(clickedShape.id)) {
            setSelectedIds(selectedIds.filter((id) => id !== clickedShape.id));
          } else {
            setSelectedIds([...selectedIds, clickedShape.id]);
          }
        } else {
          if (!selectedIds.includes(clickedShape.id)) {
            setSelectedIds([clickedShape.id]);
          }
        }

        // Start dragging shapes only if not locked
        if (!clickedShape.isLocked) {
          setIsDraggingShape(true);
          const states = new Map<string, Shape>();
          const targetIds = selectedIds.includes(clickedShape.id) ? selectedIds : [clickedShape.id];
          for (const id of targetIds) {
            const found = shapes.find((s) => s.id === id);
            if (found && !found.isLocked) states.set(id, { ...found });
          }
          initialShapeStatesRef.current = states;
        }
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } else {
        // Clicked background -> clear selection and start marquee
        if (!e.shiftKey) {
          setSelectedIds([]);
        }
        setMarquee({
          startX: canvasPt.x,
          startY: canvasPt.y,
          currentX: canvasPt.x,
          currentY: canvasPt.y,
        });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
    }
  };

  // Erase shapes near point
  const eraseAtPoint = (pt: Point) => {
    const radius = 15;
    const toRemove: string[] = [];
    for (const shape of shapes) {
      const bounds = getShapeBounds(shape);
      if (
        pt.x >= bounds.minX - radius &&
        pt.x <= bounds.maxX + radius &&
        pt.y >= bounds.minY - radius &&
        pt.y <= bounds.maxY + radius
      ) {
        toRemove.push(shape.id);
      }
    }
    if (toRemove.length > 0) {
      setShapes((prev) => prev.filter((s) => !toRemove.includes(s.id)));
    }
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent) => {
    // Panning
    if (isPanning) {
      const dx = e.clientX - dragStartPointRef.current.x;
      const dy = e.clientY - dragStartPointRef.current.y;
      panCamera(dx, dy);
      dragStartPointRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const canvasPt = screenToCanvas({ x: e.clientX, y: e.clientY }, camera);

    // Laser pointer
    if (activeTool === 'laser' && e.buttons === 1) {
      setLaserTrail((prev) => [...prev.slice(-120), { x: canvasPt.x, y: canvasPt.y, timestamp: Date.now() }]);
      return;
    }

    // Eraser scrub
    if (activeTool === 'eraser' && e.buttons === 1) {
      eraseAtPoint(canvasPt);
      return;
    }

    // Freehand drawing in progress
    if (activeDrawingShape && (activeDrawingShape.type === 'draw' || activeDrawingShape.type === 'highlighter')) {
      const relativePt = {
        x: canvasPt.x - activeDrawingShape.x,
        y: canvasPt.y - activeDrawingShape.y,
        pressure: e.pressure || 0.5,
      };
      setActiveDrawingShape((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          points: [...(prev.points || []), relativePt],
        };
      });
      return;
    }

    // Geometric shape / line / arrow drag sizing in progress
    if (activeDrawingShape && activeDrawingShape.type !== 'draw' && activeDrawingShape.type !== 'highlighter') {
      let dx = canvasPt.x - dragStartPointRef.current.x;
      let dy = canvasPt.y - dragStartPointRef.current.y;

      // Shift key constrains aspect ratio 1:1 or 45-degree angle
      if (e.shiftKey) {
        if (activeDrawingShape.type === 'arrow' || activeDrawingShape.type === 'line') {
          // snap to 45 degree increments
          const angle = Math.atan2(dy, dx);
          const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
          const dist = Math.hypot(dx, dy);
          dx = dist * Math.cos(snappedAngle);
          dy = dist * Math.sin(snappedAngle);
        } else {
          const maxDimension = Math.max(Math.abs(dx), Math.abs(dy));
          dx = Math.sign(dx || 1) * maxDimension;
          dy = Math.sign(dy || 1) * maxDimension;
        }
      }

      if (snapToGrid) {
        dx = snapValue(dx, 20);
        dy = snapValue(dy, 20);
      }

      setActiveDrawingShape((prev) => {
        if (!prev) return null;
        if (prev.type === 'arrow' || prev.type === 'line') {
          return {
            ...prev,
            width: dx,
            height: dy,
          };
        }

        // For boxes, handle negative drag directions
        const x = dx < 0 ? dragStartPointRef.current.x + dx : dragStartPointRef.current.x;
        const y = dy < 0 ? dragStartPointRef.current.y + dy : dragStartPointRef.current.y;
        return {
          ...prev,
          x,
          y,
          width: Math.abs(dx),
          height: Math.abs(dy),
        };
      });
      return;
    }

    // Dragging selected shapes
    if (isDraggingShape && initialShapeStatesRef.current.size > 0) {
      let deltaX = canvasPt.x - dragStartPointRef.current.x;
      let deltaY = canvasPt.y - dragStartPointRef.current.y;

      if (snapToGrid) {
        deltaX = snapValue(deltaX, 20);
        deltaY = snapValue(deltaY, 20);
      }

      setShapes(
        (prev) =>
          prev.map((s) => {
            const initial = initialShapeStatesRef.current.get(s.id);
            if (!initial) return s;
            return {
              ...s,
              x: initial.x + deltaX,
              y: initial.y + deltaY,
              anchorX: initial.anchorX !== undefined ? initial.anchorX + deltaX : undefined,
              anchorY: initial.anchorY !== undefined ? initial.anchorY + deltaY : undefined,
            };
          }),
        false
      );
      return;
    }

    // Resizing selection
    if (isResizing && initialBoundsRef.current) {
      lastPointerCanvasPtRef.current = canvasPt;
      lastShiftKeyRef.current = e.shiftKey;
      isCtrlPressedRef.current = e.ctrlKey || e.metaKey;
      handleResizeMove(canvasPt, e.shiftKey, e.ctrlKey || e.metaKey);
      return;
    }

    // Rotating selection
    if (isRotating && initialBoundsRef.current) {
      const cx = initialBoundsRef.current.centerX;
      const cy = initialBoundsRef.current.centerY;
      const angle = Math.atan2(canvasPt.y - cy, canvasPt.x - cx);
      let deg = (angle * 180) / Math.PI + 90;
      if (e.shiftKey) deg = Math.round(deg / 15) * 15;

      setShapes(
        (prev) =>
          prev.map((s) => {
            if (!selectedIds.includes(s.id)) return s;
            return { ...s, rotation: deg };
          }),
        false
      );
      return;
    }

    // Bending arrow
    if (isBending && selectedIds.length === 1) {
      const arrow = shapes.find((s) => s.id === selectedIds[0]);
      if (arrow && (arrow.type === 'arrow' || arrow.type === 'line')) {
        const p1 = { x: arrow.x, y: arrow.y };
        const p2 = { x: arrow.x + arrow.width, y: arrow.y + arrow.height };
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;

        // Project pointer onto normal vector to determine bend distance
        const bend = (canvasPt.x - midX) * nx + (canvasPt.y - midY) * ny;
        updateShape(arrow.id, { bend: Math.round(bend) });
      }
      return;
    }

    // Marquee dragging
    if (marquee) {
      setMarquee((prev) => (prev ? { ...prev, currentX: canvasPt.x, currentY: canvasPt.y } : null));

      // Calculate shapes overlapping with marquee box
      const minX = Math.min(marquee.startX, canvasPt.x);
      const maxX = Math.max(marquee.startX, canvasPt.x);
      const minY = Math.min(marquee.startY, canvasPt.y);
      const maxY = Math.max(marquee.startY, canvasPt.y);
      const marqueeBounds: BoundingBox = {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
      };

      const intersectingIds = shapes
        .filter((s) => doBoundsIntersect(marqueeBounds, getShapeBounds(s)))
        .map((s) => s.id);

      setSelectedIds(intersectingIds);
    }
  };

  // Resize calculation
  const handleResizeMove = (canvasPt: Point, keepAspect: boolean, isCtrlPressed = false) => {
    const handle = isResizing;
    const initialBounds = initialBoundsRef.current;
    if (!handle || !initialBounds) return;

    let newMinX = initialBounds.minX;
    let newMinY = initialBounds.minY;
    let newMaxX = initialBounds.maxX;
    let newMaxY = initialBounds.maxY;

    if (handle.includes('w')) newMinX = canvasPt.x;
    if (handle.includes('e')) newMaxX = canvasPt.x;
    if (handle.includes('n')) newMinY = canvasPt.y;
    if (handle.includes('s')) newMaxY = canvasPt.y;

    if (snapToGrid) {
      newMinX = snapValue(newMinX, 20);
      newMinY = snapValue(newMinY, 20);
      newMaxX = snapValue(newMaxX, 20);
      newMaxY = snapValue(newMaxY, 20);
    }

    let newW = Math.max(10, newMaxX - newMinX);
    let newH = Math.max(10, newMaxY - newMinY);

    if (keepAspect) {
      const origAspect = initialBounds.width / (initialBounds.height || 1);
      if (newW / newH > origAspect) {
        newW = newH * origAspect;
      } else {
        newH = newW / origAspect;
      }
    }

    const scaleX = newW / (initialBounds.width || 1);
    const scaleY = newH / (initialBounds.height || 1);

    setShapes(
      (prev) =>
        prev.map((s) => {
          const initial = initialShapeStatesRef.current.get(s.id);
          if (!initial) return s;

          const relX = (initial.x - initialBounds.minX) * scaleX;
          const relY = (initial.y - initialBounds.minY) * scaleY;

          let newFontSize = initial.fontSize || STROKE_SIZES[initial.size]?.fontSize || 24;
          let newAutoWidth = initial.autoWidth;
          if (s.type === 'text') {
            const baseFont = initial.fontSize || STROKE_SIZES[initial.size]?.fontSize || 24;
            const shouldScaleFont = isCtrlPressed ? !initial.autoScaleFont : (initial.autoScaleFont ?? true);
            if (shouldScaleFont) {
              const scaleVal = Math.max(0.2, (scaleX + scaleY) / 2);
              newFontSize = Math.max(8, Math.round(baseFont * scaleVal));
            } else {
              newFontSize = baseFont;
              newAutoWidth = false;
            }
          }

          return {
            ...s,
            x: newMinX + relX,
            y: newMinY + relY,
            width: Math.max(10, initial.width * scaleX),
            height: Math.max(10, initial.height * scaleY),
            fontSize: newFontSize,
            autoWidth: newAutoWidth,
          };
        }),
      false
    );
  };

  // Pointer Up
  const handlePointerUp = (e: React.PointerEvent) => {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (isPanning) {
      setIsPanning(false);
      return;
    }

    // Complete drawing shape
    if (activeDrawingShape) {
      if (activeDrawingShape.type === 'text') {
        const isDraggedArea = activeDrawingShape.width >= 15 && activeDrawingShape.height >= 15;
        const textShapeToCreate: Shape = isDraggedArea
          ? {
              ...activeDrawingShape,
              autoWidth: false,
              autoScaleFont: false, // Wrap text inside defined box
              text: '',
            }
          : {
              ...activeDrawingShape,
              x: dragStartPointRef.current.x,
              y: dragStartPointRef.current.y,
              anchorX: dragStartPointRef.current.x,
              anchorY: dragStartPointRef.current.y,
              width: 0,
              height: 0,
              autoWidth: true,
              autoScaleFont: true,
              text: '',
            };

        setActiveDrawingShape(null);
        addShape(textShapeToCreate);
        setSelectedIds([textShapeToCreate.id]);
        setActiveTool('select');
        setEditingTextId(textShapeToCreate.id);
        return;
      }

      if (
        (activeDrawingShape.type === 'draw' || activeDrawingShape.type === 'highlighter') &&
        (!activeDrawingShape.points || activeDrawingShape.points.length < 2)
      ) {
        // Too small / dot click
      } else if (
        activeDrawingShape.type !== 'draw' &&
        activeDrawingShape.type !== 'highlighter' &&
        Math.hypot(activeDrawingShape.width, activeDrawingShape.height) < 8
      ) {
        // Too tiny, make default 100x100 size
        activeDrawingShape.width = 100;
        activeDrawingShape.height = 80;
      }

      addShape(activeDrawingShape);
      setActiveDrawingShape(null);

      // If finished creating geometric shape or line, switch back to select tool
      if (
        activeTool !== 'draw' &&
        activeTool !== 'highlighter' &&
        activeTool !== 'laser'
      ) {
        setActiveTool('select');
      }
      return;
    }

    if (isDraggingShape) {
      setIsDraggingShape(false);
      initialShapeStatesRef.current.clear();
      setAlignmentGuides([]);
    }

    if (isResizing) {
      setIsResizing(null);
      initialBoundsRef.current = null;
      initialShapeStatesRef.current.clear();
    }

    if (isRotating) {
      setIsRotating(false);
      initialBoundsRef.current = null;
    }

    if (isBending) {
      setIsBending(false);
    }

    if (marquee) {
      setMarquee(null);
    }
  };

  // Start resize from SelectionBox
  const handleStartResize = (handle: string, e: React.PointerEvent) => {
    e.stopPropagation();
    const selected = shapes.filter((s) => selectedIds.includes(s.id) && !s.isLocked);
    const bounds = getCombinedBounds(selected);
    if (!bounds) return;

    setIsResizing(handle);
    initialBoundsRef.current = bounds;
    dragStartPointRef.current = screenToCanvas({ x: e.clientX, y: e.clientY }, camera);
    lastPointerCanvasPtRef.current = dragStartPointRef.current;
    lastShiftKeyRef.current = e.shiftKey;
    isCtrlPressedRef.current = e.ctrlKey || e.metaKey;

    const states = new Map<string, Shape>();
    for (const s of selected) states.set(s.id, { ...s });
    initialShapeStatesRef.current = states;
  };

  // Start rotate from SelectionBox
  const handleStartRotate = (e: React.PointerEvent) => {
    e.stopPropagation();
    const selected = shapes.filter((s) => selectedIds.includes(s.id) && !s.isLocked);
    const bounds = getCombinedBounds(selected);
    if (!bounds) return;

    setIsRotating(true);
    initialBoundsRef.current = bounds;
  };

  // Start bend for curved arrows
  const handleStartBend = (e: React.PointerEvent) => {
    e.stopPropagation();
    const selected = shapes.filter((s) => selectedIds.includes(s.id) && !s.isLocked);
    if (selected.length === 0) return;
    setIsBending(true);
  };

  // Double click shape to edit text
  const handleDoubleClickShape = (shape: Shape, e: React.MouseEvent) => {
    e.stopPropagation();
    if (shape.isLocked) return;
    if (['text', 'sticky', 'rectangle', 'ellipse', 'triangle', 'diamond', 'star', 'cloud', 'bubble', 'frame'].includes(shape.type)) {
      setEditingTextId(shape.id);
    }
  };

  // Handle Drag & Drop of Images onto Canvas
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const dropCanvasPt = screenToCanvas({ x: e.clientX, y: e.clientY }, camera);

      const img = new Image();
      img.onload = () => {
        const maxW = 320;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const w = img.width * scale;
        const h = img.height * scale;

        const newImageShape: Shape = {
          id: `img-${Date.now()}`,
          type: 'image',
          x: dropCanvasPt.x - w / 2,
          y: dropCanvasPt.y - h / 2,
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
        addShape(newImageShape);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Selection bounding box
  const selectedShapes = shapes.filter((s) => selectedIds.includes(s.id));
  const selectionBounds = getCombinedBounds(selectedShapes);

  // Dynamic multi-tier zoom-adapted grid & dots computation
  const getDynamicGrid = () => {
    if (gridMode === 'none') return null;

    // Octave level calculation
    const logZ = Math.log2(camera.z);
    const k = Math.floor(logZ);
    const levelRatio = camera.z / Math.pow(2, k); // range [1.0, 2.0)
    const t = levelRatio - 1; // interpolation factor [0.0, 1.0)

    // Base screen distance between dots at 1x
    const baseStep = 28;
    const stepMajor = baseStep * levelRatio; // range [28px, 56px)
    const stepMinor = stepMajor / 2; // range [14px, 28px)

    // When zooming in, closer (minor) dots/lines fade in; when zooming out, they fade out completely
    // When zoomed out far (camera.z < 0.4), completely suppress minor tier
    const octaveFade = Math.pow(t, 1.4);
    const zoomTierSuppression = camera.z < 0.35 ? 0 : camera.z < 0.65 ? (camera.z - 0.35) / 0.3 : 1;
    const minorOpacity = Math.max(0, Math.min(0.85, octaveFade * zoomTierSuppression));

    // When user zooms out, the farther (major) dots/lines stay visible and GET BIGGER so they remain clearly visible
    const isZoomedOut = camera.z < 0.85;
    const zoomOutFactor = isZoomedOut ? Math.min(1.4, (0.85 - camera.z) * 1.6) : 0;

    const majorDotRadius = 1.35 + zoomOutFactor; // scales up from 1.35px to ~2.75px when zoomed out
    const minorDotRadius = Math.max(0.7, 1.05 - zoomOutFactor * 0.3);

    const majorLineWidth = 1.0 + zoomOutFactor * 0.8; // scales from 1.0px up to ~2.1px
    const minorLineWidth = 0.7;

    const majorOpacity = isZoomedOut ? Math.min(1, 0.7 + zoomOutFactor * 0.3) : 0.65;

    // Phase alignment with camera pan
    const majorOffsetX = ((camera.x % stepMajor) + stepMajor) % stepMajor;
    const majorOffsetY = ((camera.y % stepMajor) + stepMajor) % stepMajor;
    const minorOffsetX = ((camera.x % stepMinor) + stepMinor) % stepMinor;
    const minorOffsetY = ((camera.y % stepMinor) + stepMinor) % stepMinor;

    // Palette per theme
    let colors = {
      bg: '#18181b',
      majorDot: isZoomedOut ? '#a1a1aa' : '#71717a',
      minorDot: '#52525b',
      majorLine: isZoomedOut ? '#71717a' : '#3f3f46',
      minorLine: '#27272a',
    };

    if (theme === 'midnight') {
      colors = {
        bg: '#0f172a',
        majorDot: isZoomedOut ? '#94a3b8' : '#64748b',
        minorDot: '#475569',
        majorLine: isZoomedOut ? '#64748b' : '#334155',
        minorLine: '#1e293b',
      };
    } else if (theme === 'sepia') {
      colors = {
        bg: '#fcf9f2',
        majorDot: isZoomedOut ? '#8c7d6b' : '#a89a87',
        minorDot: '#cfc4b0',
        majorLine: isZoomedOut ? '#a89a87' : '#cfc4b0',
        minorLine: '#e8dfcf',
      };
    } else if (theme === 'light') {
      colors = {
        bg: '#f9fafb',
        majorDot: isZoomedOut ? '#6b7280' : '#9ca3af',
        minorDot: '#d1d5db',
        majorLine: isZoomedOut ? '#9ca3af' : '#d1d5db',
        minorLine: '#e5e7eb',
      };
    }

    return {
      stepMajor,
      stepMinor,
      majorOffsetX,
      majorOffsetY,
      minorOffsetX,
      minorOffsetY,
      majorDotRadius,
      minorDotRadius,
      majorLineWidth,
      minorLineWidth,
      majorOpacity,
      minorOpacity,
      colors,
    };
  };

  const dynamicGrid = getDynamicGrid();

  // Background color helper
  const getBackgroundColor = () => {
    if (dynamicGrid) return dynamicGrid.colors.bg;
    switch (theme) {
      case 'dark':
        return '#18181b';
      case 'midnight':
        return '#0f172a';
      case 'sepia':
        return '#fcf9f2';
      default:
        return '#f9fafb';
    }
  };

  // Cursor style
  let cursorClass = 'cursor-default';
  if (isPanning || isSpacePressed || activeTool === 'hand') {
    cursorClass = isPanning ? 'cursor-grabbing' : 'cursor-grab';
  } else if (activeTool === 'draw' || activeTool === 'highlighter') {
    cursorClass = 'cursor-crosshair';
  } else if (activeTool === 'eraser') {
    cursorClass = 'cursor-cell';
  } else if (activeTool === 'laser') {
    cursorClass = 'cursor-pointer';
  } else if (activeTool === 'text') {
    cursorClass = 'cursor-text';
  } else if (activeTool !== 'select') {
    cursorClass = 'cursor-crosshair';
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-screen h-screen overflow-hidden ${cursorClass}`}
      style={{
        backgroundColor: getBackgroundColor(),
        isolation: 'isolate',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <svg
        ref={canvasSvgRef}
        className="w-full h-full block select-none pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ shapeRendering: 'geometricPrecision' }}
      >
        <defs>
          {dynamicGrid && gridMode === 'dots' && (
            <>
              {/* Major Dots Pattern (farther dots: stay visible, get bigger when zooming out) */}
              <pattern
                id="dynamic-dots-major"
                x={dynamicGrid.majorOffsetX - dynamicGrid.stepMajor / 2}
                y={dynamicGrid.majorOffsetY - dynamicGrid.stepMajor / 2}
                width={dynamicGrid.stepMajor}
                height={dynamicGrid.stepMajor}
                patternUnits="userSpaceOnUse"
              >
                <circle
                  cx={dynamicGrid.stepMajor / 2}
                  cy={dynamicGrid.stepMajor / 2}
                  r={dynamicGrid.majorDotRadius}
                  fill={dynamicGrid.colors.majorDot}
                  opacity={dynamicGrid.majorOpacity}
                />
              </pattern>

              {/* Minor Dots Pattern (closer dots: disappear when zooming out, appear when zooming in) */}
              <pattern
                id="dynamic-dots-minor"
                x={dynamicGrid.minorOffsetX - dynamicGrid.stepMinor / 2}
                y={dynamicGrid.minorOffsetY - dynamicGrid.stepMinor / 2}
                width={dynamicGrid.stepMinor}
                height={dynamicGrid.stepMinor}
                patternUnits="userSpaceOnUse"
              >
                <circle
                  cx={dynamicGrid.stepMinor / 2}
                  cy={dynamicGrid.stepMinor / 2}
                  r={dynamicGrid.minorDotRadius}
                  fill={dynamicGrid.colors.minorDot}
                />
              </pattern>
            </>
          )}

          {dynamicGrid && gridMode === 'grid' && (
            <>
              {/* Major Grid Lines Pattern (farther lines: stay visible, get thicker when zooming out) */}
              <pattern
                id="dynamic-grid-major"
                x={dynamicGrid.majorOffsetX}
                y={dynamicGrid.majorOffsetY}
                width={dynamicGrid.stepMajor}
                height={dynamicGrid.stepMajor}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d={`M ${dynamicGrid.stepMajor} 0 L 0 0 0 ${dynamicGrid.stepMajor}`}
                  stroke={dynamicGrid.colors.majorLine}
                  strokeWidth={dynamicGrid.majorLineWidth}
                  fill="none"
                  opacity={dynamicGrid.majorOpacity}
                />
              </pattern>

              {/* Minor Grid Lines Pattern (closer lines: disappear when zooming out, appear when zooming in) */}
              <pattern
                id="dynamic-grid-minor"
                x={dynamicGrid.minorOffsetX}
                y={dynamicGrid.minorOffsetY}
                width={dynamicGrid.stepMinor}
                height={dynamicGrid.stepMinor}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d={`M ${dynamicGrid.stepMinor} 0 L 0 0 0 ${dynamicGrid.stepMinor}`}
                  stroke={dynamicGrid.colors.minorLine}
                  strokeWidth={dynamicGrid.minorLineWidth}
                  fill="none"
                />
              </pattern>
            </>
          )}
        </defs>

        {/* Dynamic Zoom-Responsive Background Layer */}
        {dynamicGrid && gridMode === 'dots' && (
          <g className="pointer-events-none">
            {dynamicGrid.minorOpacity > 0.01 && (
              <rect
                width="100%"
                height="100%"
                fill="url(#dynamic-dots-minor)"
                opacity={dynamicGrid.minorOpacity}
              />
            )}
            <rect
              width="100%"
              height="100%"
              fill="url(#dynamic-dots-major)"
            />
          </g>
        )}

        {dynamicGrid && gridMode === 'grid' && (
          <g className="pointer-events-none">
            {dynamicGrid.minorOpacity > 0.01 && (
              <rect
                width="100%"
                height="100%"
                fill="url(#dynamic-grid-minor)"
                opacity={dynamicGrid.minorOpacity}
              />
            )}
            <rect
              width="100%"
              height="100%"
              fill="url(#dynamic-grid-major)"
            />
          </g>
        )}

        {/* World transform container */}
        <g
          transform={`translate(${camera.x}, ${camera.y}) scale(${camera.z})`}
          style={{ willChange: 'transform' }}
        >
          {/* Shapes */}
          {shapes.map((shape) => (
            <g
              key={shape.id}
              className="pointer-events-auto"
              onDoubleClick={(e) => handleDoubleClickShape(shape, e)}
            >
              <ShapeRenderer
                shape={shape}
                theme={theme}
                isSelected={selectedIds.includes(shape.id)}
                isEditingText={editingTextId === shape.id}
                onTextChange={(newText) => updateShape(shape.id, { text: newText })}
                onFinishEditingText={(measuredSize) => {
                  setEditingTextId(null);
                  if (shape.type === 'text') {
                    if (!shape.text || shape.text.trim() === '') {
                      setShapes((prev) => prev.filter((s) => s.id !== shape.id));
                      setSelectedIds((prev) => prev.filter((id) => id !== shape.id));
                      return;
                    }
                    const size = measuredSize || measureTextDimensions(
                      shape.text,
                      shape.fontSize || STROKE_SIZES[shape.size]?.fontSize || 24,
                      shape.font || 'vazir'
                    );
                    const measuredW = size.width;
                    const measuredH = size.height;

                    let newX = shape.x;
                    if (shape.autoWidth) {
                      const anchorX =
                        shape.anchorX ??
                        (shape.textAlign === 'center'
                          ? shape.x + shape.width / 2
                          : shape.textAlign === 'right'
                          ? shape.x + shape.width
                          : shape.x);

                      if (shape.textAlign === 'center') {
                        newX = anchorX - measuredW / 2;
                      } else if (shape.textAlign === 'right') {
                        newX = anchorX - measuredW;
                      } else {
                        newX = anchorX;
                      }

                      updateShape(shape.id, {
                        x: newX,
                        anchorX,
                        width: measuredW,
                        height: measuredH,
                      });
                      return;
                    }

                    updateShape(shape.id, {
                      width: measuredW,
                      height: measuredH,
                    });
                  }
                }}
              />
            </g>
          ))}

          {/* Active drawing shape preview */}
          {activeDrawingShape && (
            <g className="pointer-events-none">
              <ShapeRenderer
                shape={activeDrawingShape}
                theme={theme}
                isSelected={false}
                isEditingText={false}
              />
            </g>
          )}

          {/* Laser trail */}
          <LaserTrail points={laserTrail} />

          {/* Alignment guide lines */}
          <AlignmentGuides guides={alignmentGuides} />

          {/* Bounding box and resize handles for selection */}
          {selectionBounds && selectedShapes.length > 0 && !activeDrawingShape && !editingTextId && (
            <SelectionBox
              bounds={selectionBounds}
              selectedShapes={selectedShapes}
              onStartResize={handleStartResize}
              onStartRotate={handleStartRotate}
              onStartBend={handleStartBend}
            />
          )}

          {/* Marquee Selection Rectangle */}
          {marquee && (
            <rect
              x={Math.min(marquee.startX, marquee.currentX)}
              y={Math.min(marquee.startY, marquee.currentY)}
              width={Math.abs(marquee.currentX - marquee.startX)}
              height={Math.abs(marquee.currentY - marquee.startY)}
              fill="rgba(59, 130, 246, 0.12)"
              stroke="#3b82f6"
              strokeWidth={1}
              strokeDasharray="3 3"
              className="pointer-events-none"
            />
          )}
        </g>
      </svg>

      {/* Subtle guidance when page is empty */}
      {shapes.length === 0 && !activeDrawingShape && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <div
            className={`flex flex-col items-center gap-2 px-6 py-4 rounded-2xl border backdrop-blur-xs text-center transition-all ${
              theme === 'dark' || theme === 'midnight'
                ? 'bg-zinc-900/40 border-zinc-800/60 text-zinc-400'
                : 'bg-white/40 border-slate-200/60 text-slate-500'
            }`}
          >
            <span className="text-sm font-semibold tracking-wide">Empty Canvas</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-300 font-mono text-[10px]">D</kbd> to draw,{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-300 font-mono text-[10px]">T</kbd> for text,{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-300 font-mono text-[10px]">N</kbd> for note, or select a tool below
            </span>
            <span className="text-[11px] text-zinc-500/80 dark:text-zinc-500">
              Ctrl + Scroll to zoom · Space + Drag to pan
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

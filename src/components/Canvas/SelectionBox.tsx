import React from 'react';
import { BoundingBox, Shape } from '../../types/canvas';
import { useCanvas } from '../../context/CanvasContext';

interface SelectionBoxProps {
  bounds: BoundingBox;
  selectedShapes: Shape[];
  onStartResize: (handle: string, e: React.PointerEvent) => void;
  onStartRotate: (e: React.PointerEvent) => void;
  onStartBend?: (e: React.PointerEvent) => void;
}

export const SelectionBox: React.FC<SelectionBoxProps> = ({
  bounds,
  selectedShapes,
  onStartResize,
  onStartRotate,
  onStartBend,
}) => {
  const { lockSelected } = useCanvas();
  const { minX, minY, width, height } = bounds;
  const isSingle = selectedShapes.length === 1;
  const singleShape = isSingle ? selectedShapes[0] : null;
  const isArrowOrLine = singleShape && (singleShape.type === 'arrow' || singleShape.type === 'line');
  const isLocked = selectedShapes.length > 0 && selectedShapes.every((s) => s.isLocked);

  // If locked, render clean locked boundary with interactive unlock badge
  if (isLocked) {
    const badgeX = minX + width - 24;
    const badgeY = minY - 28;

    return (
      <g className="selection-overlay pointer-events-auto">
        <rect
          x={minX}
          y={minY}
          width={width}
          height={height}
          fill="rgba(245, 158, 11, 0.03)"
          stroke="#f59e0b"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          className="pointer-events-none"
        />
        {/* Interactive Lock / Unlock badge on canvas */}
        <g
          transform={`translate(${badgeX}, ${badgeY})`}
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            lockSelected();
          }}
        >
          <title>Object is locked (Click to unlock)</title>
          <rect
            x={0}
            y={0}
            width={24}
            height={24}
            rx={6}
            fill="#f59e0b"
            stroke="#d97706"
            strokeWidth={1}
            className="filter drop-shadow-sm"
          />
          <path
            d="M 8 10 V 8 A 4 4 0 0 1 16 8 V 10 M 6 10 H 18 V 17 H 6 Z"
            fill="none"
            stroke="#ffffff"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>
    );
  }

  // Handle dimensions
  const handleSize = 8;
  const halfHandle = handleSize / 2;

  // Single arrow / line handles: start dot, end dot, and bend dot
  if (isArrowOrLine && singleShape) {
    const p1 = { x: singleShape.x, y: singleShape.y };
    const p2 = { x: singleShape.x + singleShape.width, y: singleShape.y + singleShape.height };
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const cp = {
      x: midX + nx * (singleShape.bend || 0),
      y: midY + ny * (singleShape.bend || 0),
    };

    return (
      <g className="selection-overlay pointer-events-auto">
        {/* Start handle dot with stable rendering */}
        <g
          onPointerDown={(e) => onStartResize('start', e)}
          className="cursor-crosshair"
        >
          <circle cx={p1.x} cy={p1.y} r={14} fill="transparent" />
          <circle
            cx={p1.x}
            cy={p1.y}
            r={5.5}
            fill="#3b82f6"
            stroke="#ffffff"
            strokeWidth={2}
          />
        </g>

        {/* End handle dot with stable rendering */}
        <g
          onPointerDown={(e) => onStartResize('end', e)}
          className="cursor-crosshair"
        >
          <circle cx={p2.x} cy={p2.y} r={14} fill="transparent" />
          <circle
            cx={p2.x}
            cy={p2.y}
            r={5.5}
            fill="#3b82f6"
            stroke="#ffffff"
            strokeWidth={2}
          />
        </g>

        {/* Bend control dot with stable rendering */}
        {onStartBend && (
          <g
            onPointerDown={onStartBend}
            className="cursor-grab active:cursor-grabbing"
          >
            <circle cx={cp.x} cy={cp.y} r={16} fill="transparent" />
            <circle
              cx={cp.x}
              cy={cp.y}
              r={6.5}
              fill="#f59e0b"
              stroke="#ffffff"
              strokeWidth={2}
            />
          </g>
        )}
      </g>
    );
  }

  const handles = [
    { id: 'nw', x: minX, y: minY, cursor: 'nwse-resize' },
    { id: 'n', x: minX + width / 2, y: minY, cursor: 'ns-resize' },
    { id: 'ne', x: minX + width, y: minY, cursor: 'nesw-resize' },
    { id: 'e', x: minX + width, y: minY + height / 2, cursor: 'ew-resize' },
    { id: 'se', x: minX + width, y: minY + height, cursor: 'nwse-resize' },
    { id: 's', x: minX + width / 2, y: minY + height, cursor: 'ns-resize' },
    { id: 'sw', x: minX, y: minY + height, cursor: 'nesw-resize' },
    { id: 'w', x: minX, y: minY + height / 2, cursor: 'ew-resize' },
  ];

  const rotateHandleY = minY - 24;

  return (
    <g className="selection-overlay pointer-events-auto">
      {/* Selection border */}
      <rect
        x={minX}
        y={minY}
        width={width}
        height={height}
        fill="rgba(59, 130, 246, 0.04)"
        stroke="#3b82f6"
        strokeWidth={1.5}
        className="pointer-events-none"
      />

      {/* Rotation stalk line */}
      <line
        x1={minX + width / 2}
        y1={minY}
        x2={minX + width / 2}
        y2={rotateHandleY}
        stroke="#3b82f6"
        strokeWidth={1.2}
        strokeDasharray="2 2"
        className="pointer-events-none"
      />

      {/* Rotation handle dot with generous hit area */}
      <g
        onPointerDown={onStartRotate}
        className="cursor-grab active:cursor-grabbing"
      >
        <circle cx={minX + width / 2} cy={rotateHandleY} r={14} fill="transparent" />
        <circle
          cx={minX + width / 2}
          cy={rotateHandleY}
          r={5.5}
          fill="#ffffff"
          stroke="#3b82f6"
          strokeWidth={2}
        />
      </g>

      {/* 8 Bounding resize handles - solid, clean, stable, zero glitch */}
      {handles.map((h) => (
        <g
          key={h.id}
          onPointerDown={(e) => onStartResize(h.id, e)}
          style={{ cursor: h.cursor }}
        >
          {/* Invisible hit target around each handle for effortless grab */}
          <rect
            x={h.x - halfHandle - 4}
            y={h.y - halfHandle - 4}
            width={handleSize + 8}
            height={handleSize + 8}
            fill="transparent"
          />
          {/* Visible handle */}
          <rect
            x={h.x - halfHandle}
            y={h.y - halfHandle}
            width={handleSize}
            height={handleSize}
            fill="#ffffff"
            stroke="#3b82f6"
            strokeWidth={1.5}
            rx={1.5}
          />
        </g>
      ))}
    </g>
  );
};

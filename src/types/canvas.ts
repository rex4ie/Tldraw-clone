export type ToolType =
  | 'select'
  | 'hand'
  | 'draw'
  | 'highlighter'
  | 'eraser'
  | 'arrow'
  | 'line'
  | 'rectangle'
  | 'ellipse'
  | 'triangle'
  | 'diamond'
  | 'star'
  | 'cloud'
  | 'bubble'
  | 'sticky'
  | 'text'
  | 'frame'
  | 'laser';

export type ShapeType =
  | 'draw'
  | 'highlighter'
  | 'arrow'
  | 'line'
  | 'rectangle'
  | 'ellipse'
  | 'triangle'
  | 'diamond'
  | 'star'
  | 'cloud'
  | 'bubble'
  | 'sticky'
  | 'text'
  | 'frame'
  | 'image';

export type ThemeType = 'light' | 'dark' | 'midnight' | 'sepia';
export type GridMode = 'dots' | 'grid' | 'none';

export type StrokeSize = 's' | 'm' | 'l' | 'xl';
export type DashStyle = 'draw' | 'solid' | 'dashed' | 'dotted';
export type FillStyle = 'none' | 'semi' | 'solid';
export type FontFamily = 'vazir' | 'draw' | 'sans' | 'serif' | 'mono';
export type TextAlign = 'left' | 'center' | 'right';
export type TextDirection = 'ltr' | 'rtl';
export type ArrowheadType = 'none' | 'arrow' | 'triangle' | 'dot' | 'bar';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface ShapeStyle {
  color: string;
  fillColor?: string;
  fill: FillStyle;
  dash: DashStyle;
  size: StrokeSize;
  font: FontFamily;
  textAlign: TextAlign;
  textDirection?: TextDirection;
  opacity: number;
}

export interface Shape extends ShapeStyle {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number; // radians or degrees, default 0
  points?: Point[]; // for draw, highlighter, line, arrow
  bend?: number; // for curved arrow control
  text?: string;
  fontSize?: number; // explicitly scaled font size if transformed
  autoScaleFont?: boolean; // if true, dragging handles scales font size; if false, wraps text box
  autoWidth?: boolean; // if true, text goes indefinitely without wrapping until blurred or resized
  anchorX?: number; // anchor point for alignment (e.g. click point for centered text)
  anchorY?: number; // anchor point Y
  flipX?: boolean; // flipped horizontally
  flipY?: boolean; // flipped vertically
  isLocked?: boolean;
  groupId?: string;
  frameId?: string; // id of parent frame if placed inside
  imageUrl?: string;
  aspectRatio?: number;
  startArrowhead?: ArrowheadType;
  endArrowhead?: ArrowheadType;
}

export interface Camera {
  x: number;
  y: number;
  z: number; // zoom factor (0.1 to 5.0)
}

export interface Page {
  id: string;
  name: string;
  shapes: Shape[];
}

export interface LaserPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface AlignmentGuide {
  type: 'horizontal' | 'vertical';
  position: number;
  start: number;
  end: number;
}

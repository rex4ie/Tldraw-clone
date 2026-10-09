import { BoundingBox, Point, Shape } from '../types/canvas';
import { STROKE_SIZES } from './constants';
import { measureTextDimensions } from './textMeasure';

export function screenToCanvas(
  screenPoint: { x: number; y: number },
  camera: { x: number; y: number; z: number }
): Point {
  return {
    x: (screenPoint.x - camera.x) / camera.z,
    y: (screenPoint.y - camera.y) / camera.z,
  };
}

export function canvasToScreen(
  canvasPoint: { x: number; y: number },
  camera: { x: number; y: number; z: number }
): { x: number; y: number } {
  return {
    x: canvasPoint.x * camera.z + camera.x,
    y: canvasPoint.y * camera.z + camera.y,
  };
}

export function getShapeBounds(shape: Shape): BoundingBox {
  if (shape.type === 'draw' || shape.type === 'highlighter') {
    if (!shape.points || shape.points.length === 0) {
      return {
        minX: shape.x,
        minY: shape.y,
        maxX: shape.x + shape.width,
        maxY: shape.y + shape.height,
        width: shape.width,
        height: shape.height,
        centerX: shape.x + shape.width / 2,
        centerY: shape.y + shape.height / 2,
      };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const pt of shape.points) {
      const px = shape.x + pt.x;
      const py = shape.y + pt.y;
      if (px < minX) minX = px;
      if (py < minY) minY = py;
      if (px > maxX) maxX = px;
      if (py > maxY) maxY = py;
    }
    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);
    return {
      minX,
      minY,
      maxX,
      maxY,
      width,
      height,
      centerX: minX + width / 2,
      centerY: minY + height / 2,
    };
  }

  if (shape.type === 'arrow' || shape.type === 'line') {
    const p1 = { x: shape.x, y: shape.y };
    const p2 = { x: shape.x + shape.width, y: shape.y + shape.height };
    let minX = Math.min(p1.x, p2.x);
    let maxX = Math.max(p1.x, p2.x);
    let minY = Math.min(p1.y, p2.y);
    let maxY = Math.max(p1.y, p2.y);

    if (shape.bend) {
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const cpX = midX + nx * shape.bend;
      const cpY = midY + ny * shape.bend;
      minX = Math.min(minX, cpX);
      maxX = Math.max(maxX, cpX);
      minY = Math.min(minY, cpY);
      maxY = Math.max(maxY, cpY);
    }

    const pad = 12;
    return {
      minX: minX - pad,
      minY: minY - pad,
      maxX: maxX + pad,
      maxY: maxY + pad,
      width: maxX - minX + pad * 2,
      height: maxY - minY + pad * 2,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
    };
  }

  if (shape.type === 'text') {
    const fontSize = shape.fontSize || STROKE_SIZES[shape.size]?.fontSize || 24;
    let width = Math.abs(shape.width);
    let height = Math.abs(shape.height);

    // If autoWidth or if dimensions are unset / corrupted (e.g. from previous runs with 20000px):
    if (shape.autoWidth || height > 1500 || width > 5000 || height <= 0 || width <= 0) {
      const measured = measureTextDimensions(shape.text || 'Text', fontSize, shape.font || 'vazir');
      width = measured.width;
      height = measured.height;
    }

    const minX = shape.x;
    const minY = shape.y;
    const maxX = minX + width;
    const maxY = minY + height;

    return {
      minX,
      minY,
      maxX,
      maxY,
      width,
      height,
      centerX: minX + width / 2,
      centerY: minY + height / 2,
    };
  }

  const width = Math.abs(shape.width);
  const height = Math.abs(shape.height);
  const minX = Math.min(shape.x, shape.x + shape.width);
  const minY = Math.min(shape.y, shape.y + shape.height);
  const maxX = minX + width;
  const maxY = minY + height;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
  };
}

export function getCombinedBounds(shapes: Shape[]): BoundingBox | null {
  if (shapes.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const s of shapes) {
    const b = getShapeBounds(s);
    if (b.minX < minX) minX = b.minX;
    if (b.minY < minY) minY = b.minY;
    if (b.maxX > maxX) maxX = b.maxX;
    if (b.maxY > maxY) maxY = b.maxY;
  }

  const width = maxX - minX;
  const height = maxY - minY;
  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
  };
}

export function isPointInBounds(point: Point, bounds: BoundingBox, margin = 0): boolean {
  return (
    point.x >= bounds.minX - margin &&
    point.x <= bounds.maxX + margin &&
    point.y >= bounds.minY - margin &&
    point.y <= bounds.maxY + margin
  );
}

export function doBoundsIntersect(a: BoundingBox, b: BoundingBox): boolean {
  return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);
}

export function snapValue(value: number, step = 20): number {
  return Math.round(value / step) * step;
}

// Generates an SVG path for a fluffy cloud shape
export function getCloudPath(w: number, h: number): string {
  // A clean, organic multi-arc cloud path inside (0, 0, w, h)
  const pad = 4;
  const width = Math.max(10, w - pad * 2);
  const height = Math.max(10, h - pad * 2);

  const p0 = { x: pad + width * 0.18, y: pad + height * 0.82 };
  const p1 = { x: pad + width * 0.1, y: pad + height * 0.5 };
  const p2 = { x: pad + width * 0.28, y: pad + height * 0.22 };
  const p3 = { x: pad + width * 0.52, y: pad + height * 0.15 };
  const p4 = { x: pad + width * 0.78, y: pad + height * 0.24 };
  const p5 = { x: pad + width * 0.92, y: pad + height * 0.55 };
  const p6 = { x: pad + width * 0.82, y: pad + height * 0.85 };
  const p7 = { x: pad + width * 0.5, y: pad + height * 0.88 };

  return `
    M ${p0.x} ${p0.y}
    C ${p0.x - width * 0.15} ${p0.y}, ${p1.x - width * 0.1} ${p1.y + height * 0.15}, ${p1.x} ${p1.y}
    C ${p1.x} ${p1.y - height * 0.2}, ${p2.x - width * 0.1} ${p2.y - height * 0.1}, ${p2.x} ${p2.y}
    C ${p2.x + width * 0.08} ${p2.y - height * 0.2}, ${p3.x - width * 0.08} ${p3.y - height * 0.2}, ${p3.x} ${p3.y}
    C ${p3.x + width * 0.15} ${p3.y - height * 0.15}, ${p4.x - width * 0.08} ${p4.y - height * 0.15}, ${p4.x} ${p4.y}
    C ${p4.x + width * 0.15} ${p4.y}, ${p5.x + width * 0.12} ${p5.y - height * 0.15}, ${p5.x} ${p5.y}
    C ${p5.x + width * 0.1} ${p5.y + height * 0.2}, ${p6.x + width * 0.1} ${p6.y + height * 0.1}, ${p6.x} ${p6.y}
    C ${p6.x - width * 0.1} ${p6.y + height * 0.1}, ${p7.x + width * 0.15} ${p7.y + height * 0.05}, ${p7.x} ${p7.y}
    C ${p7.x - width * 0.15} ${p7.y + height * 0.05}, ${p0.x + width * 0.1} ${p0.y + height * 0.1}, ${p0.x} ${p0.y}
    Z
  `;
}

// Generates an SVG path for a 5-point star
export function getStarPath(w: number, h: number): string {
  const cx = w / 2;
  const cy = h / 2;
  const outerR = Math.min(w, h) / 2;
  const innerR = outerR * 0.45;
  const points: string[] = [];

  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  points.push('Z');
  return points.join(' ');
}

// Generates an SVG path for a speech bubble with tail
export function getBubblePath(w: number, h: number): string {
  const r = Math.min(16, w * 0.1, h * 0.1);
  const tailH = Math.min(22, h * 0.25);
  const boxH = h - tailH;
  const tailStartX = w * 0.25;
  const tailTipX = w * 0.15;
  const tailEndX = w * 0.45;

  return `
    M ${r} 0
    H ${w - r}
    A ${r} ${r} 0 0 1 ${w} ${r}
    V ${boxH - r}
    A ${r} ${r} 0 0 1 ${w - r} ${boxH}
    H ${tailEndX}
    L ${tailTipX} ${h}
    L ${tailStartX} ${boxH}
    H ${r}
    A ${r} ${r} 0 0 1 0 ${boxH - r}
    V ${r}
    A ${r} ${r} 0 0 1 ${r} 0
    Z
  `;
}

// Distance from point to line segment
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

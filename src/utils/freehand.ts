import { getStroke } from 'perfect-freehand';
import { Point, StrokeSize } from '../types/canvas';

const STROKE_OPTIONS: Record<StrokeSize, { size: number; thinning: number; smoothing: number; streamline: number }> = {
  s: { size: 3, thinning: 0.4, smoothing: 0.5, streamline: 0.5 },
  m: { size: 6, thinning: 0.5, smoothing: 0.6, streamline: 0.6 },
  l: { size: 12, thinning: 0.6, smoothing: 0.65, streamline: 0.65 },
  xl: { size: 20, thinning: 0.65, smoothing: 0.7, streamline: 0.7 },
};

export function getSvgPathFromStroke(stroke: number[][]): string {
  if (!stroke.length) return '';

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...stroke[0], 'Q']
  );

  d.push('Z');
  return d.join(' ');
}

export function renderFreehandStroke(
  points: Point[],
  size: StrokeSize = 'm',
  isHighlighter = false
): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0];
    const r = isHighlighter ? 12 : 3;
    return `M ${p.x - r} ${p.y} A ${r} ${r} 0 1 0 ${p.x + r} ${p.y} A ${r} ${r} 0 1 0 ${p.x - r} ${p.y} Z`;
  }

  const baseOpt = STROKE_OPTIONS[size] || STROKE_OPTIONS.m;
  const options = isHighlighter
    ? {
        size: baseOpt.size * 3.5,
        thinning: 0,
        smoothing: 0.8,
        streamline: 0.7,
        simulatePressure: false,
        start: { taper: 0, cap: true },
        end: { taper: 0, cap: true },
      }
    : {
        size: baseOpt.size,
        thinning: baseOpt.thinning,
        smoothing: baseOpt.smoothing,
        streamline: baseOpt.streamline,
        simulatePressure: true,
        start: { taper: 4, cap: true },
        end: { taper: 4, cap: true },
      };

  const formattedPoints = points.map((p) => [p.x, p.y, p.pressure ?? 0.5]);
  const stroke = getStroke(formattedPoints, options);
  return getSvgPathFromStroke(stroke);
}

import { Shape, ThemeType } from '../types/canvas';
import { getCombinedBounds, getCloudPath, getStarPath, getBubblePath } from './math';
import { STROKE_SIZES, STICKY_COLORS } from './constants';
import { renderFreehandStroke } from './freehand';

export function exportToJson(data: unknown, filename = 'my-board.json') {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function getThemeBgColor(theme: ThemeType, transparent = false): string {
  if (transparent) return 'transparent';
  switch (theme) {
    case 'dark':
      return '#18181b';
    case 'midnight':
      return '#0f172a';
    case 'sepia':
      return '#fcf9f2';
    case 'light':
    default:
      return '#f9fafb';
  }
}

function resolveStrokeColor(color: string, theme: ThemeType): string {
  const isDark = theme === 'dark' || theme === 'midnight';
  if (color === '#1e1e1e' && isDark) return '#f4f4f5';
  if (color === '#ffffff' && !isDark) return '#1e1e1e';
  return color;
}

function getFontFamilyString(font: string): string {
  switch (font) {
    case 'vazir':
      return "'Vazirmatn', -apple-system, BlinkMacSystemFont, sans-serif";
    case 'draw':
      return "'Shantell Sans', 'Caveat', cursive, sans-serif";
    case 'serif':
      return "'Source Serif 4', Georgia, serif";
    case 'mono':
      return "'JetBrains Mono', monospace";
    case 'sans':
    default:
      return "'Vazirmatn', 'Inter', system-ui, sans-serif";
  }
}

/**
 * Direct Canvas 2D PNG Exporter
 * Eliminates foreignObject taint issues, renders smoothly at 1x, 2x, 3x scale.
 */
export async function exportCanvasToPng(
  shapes: Shape[],
  theme: ThemeType,
  options: { scale?: number; transparent?: boolean; filename?: string } = {}
): Promise<Blob | null> {
  const scale = options.scale || 2;
  const transparent = options.transparent || false;
  const filename = options.filename || 'my-board-export.png';

  if (!shapes || shapes.length === 0) {
    alert('Canvas is empty. Add shapes before exporting.');
    return null;
  }

  const bounds = getCombinedBounds(shapes);
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
    return null;
  }

  const padding = 40;
  const exportX = bounds.minX - padding;
  const exportY = bounds.minY - padding;
  const exportW = Math.max(10, bounds.width + padding * 2);
  const exportH = Math.max(10, bounds.height + padding * 2);

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(exportW * scale);
  canvas.height = Math.round(exportH * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.scale(scale, scale);
  ctx.translate(-exportX, -exportY);

  // Background
  if (!transparent) {
    ctx.fillStyle = getThemeBgColor(theme, false);
    ctx.fillRect(exportX, exportY, exportW, exportH);
  }

  // Draw shapes in layer order
  for (const shape of shapes) {
    ctx.save();
    ctx.globalAlpha = shape.opacity ?? 1;

    const strokeConfig = STROKE_SIZES[shape.size] || STROKE_SIZES.m;
    const strokeWidth = strokeConfig.strokeWidth;
    const fontSize = shape.fontSize || strokeConfig.fontSize;
    const strokeColor = resolveStrokeColor(shape.color, theme);
    const fontStr = `${fontSize}px ${getFontFamilyString(shape.font)}`;

    // Dash
    if (shape.dash === 'dashed') {
      ctx.setLineDash([strokeWidth * 3, strokeWidth * 2]);
    } else if (shape.dash === 'dotted') {
      ctx.setLineDash([strokeWidth, strokeWidth * 2]);
    } else {
      ctx.setLineDash([]);
    }

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. FREEHAND DRAW & HIGHLIGHTER
    if (shape.type === 'draw' || shape.type === 'highlighter') {
      const isHighlighter = shape.type === 'highlighter';
      if (isHighlighter) ctx.globalAlpha = 0.35;
      const pathStr = renderFreehandStroke(shape.points || [], shape.size, isHighlighter);
      if (pathStr) {
        ctx.fillStyle = strokeColor;
        ctx.translate(shape.x, shape.y);
        const p2d = new Path2D(pathStr);
        ctx.fill(p2d);
      }
      ctx.restore();
      continue;
    }

    // Transform for rotated / translated shapes
    ctx.translate(shape.x + shape.width / 2, shape.y + shape.height / 2);
    if (shape.rotation) {
      ctx.rotate((shape.rotation * Math.PI) / 180);
    }
    if (shape.flipX || shape.flipY) {
      ctx.scale(shape.flipX ? -1 : 1, shape.flipY ? -1 : 1);
    }
    ctx.translate(-shape.width / 2, -shape.height / 2);

    // Fill style
    let fillOpacity = 0;
    if (shape.fill === 'solid') fillOpacity = 1;
    else if (shape.fill === 'semi') fillOpacity = 0.25;

    // 2. ARROW & LINE
    if (shape.type === 'arrow' || shape.type === 'line') {
      const p1 = { x: 0, y: 0 };
      const p2 = { x: shape.width, y: shape.height };
      const isCurved = Boolean(shape.bend && shape.bend !== 0);

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const cp = {
        x: midX + nx * (shape.bend || 0),
        y: midY + ny * (shape.bend || 0),
      };

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      if (isCurved) {
        ctx.quadraticCurveTo(cp.x, cp.y, p2.x, p2.y);
      } else {
        ctx.lineTo(p2.x, p2.y);
      }
      ctx.stroke();

      // Arrowheads
      const arrowHeadSize = Math.max(14, strokeWidth * 3.5);
      const endAngle = isCurved ? Math.atan2(p2.y - cp.y, p2.x - cp.x) : Math.atan2(dy, dx);
      if (shape.type === 'arrow' || shape.endArrowhead === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(
          p2.x - arrowHeadSize * Math.cos(endAngle - Math.PI / 6),
          p2.y - arrowHeadSize * Math.sin(endAngle - Math.PI / 6)
        );
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(
          p2.x - arrowHeadSize * Math.cos(endAngle + Math.PI / 6),
          p2.y - arrowHeadSize * Math.sin(endAngle + Math.PI / 6)
        );
        ctx.stroke();
      }

      ctx.restore();
      continue;
    }

    // 3. STICKY NOTE
    if (shape.type === 'sticky') {
      const stickyPreset = STICKY_COLORS.find((c) => c.name === shape.color) || {
        bg: shape.color.startsWith('#') ? shape.color : '#fef08a',
        text: '#1e293b',
        border: 'rgba(0,0,0,0.15)',
      };

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.beginPath();
      ctx.roundRect(3, 4, shape.width, shape.height, 6);
      ctx.fill();

      // Body
      ctx.fillStyle = stickyPreset.bg;
      ctx.strokeStyle = stickyPreset.border;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(0, 0, shape.width, shape.height, 6);
      ctx.fill();
      ctx.stroke();

      // Text inside sticky note
      if (shape.text) {
        ctx.fillStyle = stickyPreset.text;
        ctx.font = fontStr;
        ctx.textAlign = (shape.textAlign || 'left') as CanvasTextAlign;
        ctx.textBaseline = 'top';
        ctx.direction = (shape.textDirection || 'ltr') as CanvasDirection;

        const pad = 16;
        const textW = shape.width - pad * 2;
        const lines = shape.text.split('\n');
        let currentY = pad;
        const lineHeight = fontSize * 1.35;

        for (const line of lines) {
          const textX =
            shape.textAlign === 'center'
              ? shape.width / 2
              : shape.textAlign === 'right' || shape.textDirection === 'rtl'
              ? shape.width - pad
              : pad;
          ctx.fillText(line, textX, currentY, textW);
          currentY += lineHeight;
        }
      }

      ctx.restore();
      continue;
    }

    // 4. FRAME
    if (shape.type === 'frame') {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)';
      ctx.fillStyle = theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(0, 0, shape.width, shape.height, 4);
      ctx.fill();
      ctx.stroke();

      // Frame title tab
      ctx.setLineDash([]);
      ctx.fillStyle = theme === 'dark' ? '#27272a' : '#f1f5f9';
      ctx.strokeStyle = theme === 'dark' ? '#3f3f46' : '#cbd5e1';
      ctx.beginPath();
      const tabW = Math.min(180, Math.max(80, (shape.text?.length || 5) * 11 + 24));
      ctx.roundRect(0, -26, tabW, 24, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = theme === 'dark' ? '#e4e4e7' : '#475569';
      ctx.font = `600 12px ${getFontFamilyString('sans')}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(shape.text || 'Frame', 10, -14);

      ctx.restore();
      continue;
    }

    // 5. TEXT SHAPE
    if (shape.type === 'text') {
      if (shape.text) {
        ctx.fillStyle = strokeColor;
        ctx.font = fontStr;
        ctx.textAlign = (shape.textAlign || 'left') as CanvasTextAlign;
        ctx.textBaseline = 'top';
        ctx.direction = (shape.textDirection || 'ltr') as CanvasDirection;

        let lines: string[] = [];
        if (shape.autoWidth) {
          lines = shape.text.split('\n');
        } else {
          // Word wrap inside shape.width
          const paragraphs = shape.text.split('\n');
          for (const para of paragraphs) {
            const words = para.split(' ');
            let currentLine = '';
            for (const word of words) {
              const testLine = currentLine ? `${currentLine} ${word}` : word;
              const testWidth = ctx.measureText(testLine).width;
              if (testWidth > shape.width && currentLine) {
                lines.push(currentLine);
                currentLine = word;
              } else {
                currentLine = testLine;
              }
            }
            if (currentLine) lines.push(currentLine);
          }
        }
        let currentY = 0;
        const lineHeight = fontSize * 1.35;

        for (const line of lines) {
          const textX =
            shape.textAlign === 'center'
              ? shape.width / 2
              : shape.textAlign === 'right'
              ? shape.width
              : 0;
          ctx.fillText(line, textX, currentY);
          currentY += lineHeight;
        }
      }
      ctx.restore();
      continue;
    }

    // 6. GEOMETRIC SHAPES
    const w = shape.width;
    const h = shape.height;

    ctx.fillStyle = strokeColor;
    ctx.beginPath();

    if (shape.type === 'rectangle') {
      ctx.roundRect(0, 0, w, h, shape.dash === 'draw' ? 6 : 4);
    } else if (shape.type === 'ellipse') {
      ctx.ellipse(w / 2, h / 2, Math.max(1, w / 2), Math.max(1, h / 2), 0, 0, Math.PI * 2);
    } else if (shape.type === 'triangle') {
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
    } else if (shape.type === 'diamond') {
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w, h / 2);
      ctx.lineTo(w / 2, h);
      ctx.lineTo(0, h / 2);
      ctx.closePath();
    } else if (shape.type === 'star') {
      const p = new Path2D(getStarPath(w, h));
      if (fillOpacity > 0) {
        ctx.globalAlpha = fillOpacity;
        ctx.fill(p);
        ctx.globalAlpha = shape.opacity ?? 1;
      }
      ctx.stroke(p);
    } else if (shape.type === 'cloud') {
      const p = new Path2D(getCloudPath(w, h));
      if (fillOpacity > 0) {
        ctx.globalAlpha = fillOpacity;
        ctx.fill(p);
        ctx.globalAlpha = shape.opacity ?? 1;
      }
      ctx.stroke(p);
    } else if (shape.type === 'bubble') {
      const p = new Path2D(getBubblePath(w, h));
      if (fillOpacity > 0) {
        ctx.globalAlpha = fillOpacity;
        ctx.fill(p);
        ctx.globalAlpha = shape.opacity ?? 1;
      }
      ctx.stroke(p);
    }

    if (['rectangle', 'ellipse', 'triangle', 'diamond'].includes(shape.type)) {
      if (fillOpacity > 0) {
        ctx.globalAlpha = fillOpacity;
        ctx.fill();
        ctx.globalAlpha = shape.opacity ?? 1;
      }
      ctx.stroke();
    }

    // Embedded text inside shape
    if (shape.text) {
      ctx.fillStyle = strokeColor;
      ctx.font = `${Math.min(fontSize, Math.max(12, h * 0.25))}px ${getFontFamilyString(shape.font)}`;
      ctx.textAlign = (shape.textAlign || 'center') as CanvasTextAlign;
      ctx.textBaseline = 'middle';
      ctx.direction = (shape.textDirection || 'ltr') as CanvasDirection;
      ctx.fillText(shape.text, w / 2, h / 2, w - 20);
    }

    ctx.restore();
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob && filename) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      }
      resolve(blob);
    }, 'image/png');
  });
}

/**
 * Clean Vector SVG Exporter without foreignObject
 * Generates standalone standards-compliant SVG with embedded text and paths.
 */
export function exportCanvasToSvg(
  shapes: Shape[],
  theme: ThemeType,
  options: { transparent?: boolean; filename?: string } = {}
) {
  const transparent = options.transparent || false;
  const filename = options.filename || 'my-board-export.svg';

  if (!shapes || shapes.length === 0) {
    alert('Canvas is empty. Add shapes before exporting.');
    return;
  }

  const bounds = getCombinedBounds(shapes);
  if (!bounds) return;

  const padding = 40;
  const exportX = bounds.minX - padding;
  const exportY = bounds.minY - padding;
  const exportW = Math.max(10, bounds.width + padding * 2);
  const exportH = Math.max(10, bounds.height + padding * 2);

  const svgParts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${exportX} ${exportY} ${exportW} ${exportH}" width="${exportW}" height="${exportH}">`,
    `<defs>`,
    `<style>`,
    `@import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&family=Shantell+Sans:wght@400;600&display=swap');`,
    `text { font-family: 'Vazirmatn', sans-serif; }`,
    `</style>`,
    `</defs>`,
  ];

  if (!transparent) {
    svgParts.push(
      `<rect x="${exportX}" y="${exportY}" width="${exportW}" height="${exportH}" fill="${getThemeBgColor(theme, false)}" />`
    );
  }

  for (const s of shapes) {
    const strokeConfig = STROKE_SIZES[s.size] || STROKE_SIZES.m;
    const strokeWidth = strokeConfig.strokeWidth;
    const fontSize = s.fontSize || strokeConfig.fontSize;
    const strokeColor = resolveStrokeColor(s.color, theme);
    const fontFam = getFontFamilyString(s.font);
    const dir = s.textDirection || 'ltr';

    let dashAttr = '';
    if (s.dash === 'dashed') dashAttr = `stroke-dasharray="${strokeWidth * 3} ${strokeWidth * 2}"`;
    else if (s.dash === 'dotted') dashAttr = `stroke-dasharray="${strokeWidth} ${strokeWidth * 2}"`;

    let fillAttr = 'fill="none"';
    if (s.fill === 'solid') fillAttr = `fill="${strokeColor}" fill-opacity="1"`;
    else if (s.fill === 'semi') fillAttr = `fill="${strokeColor}" fill-opacity="0.25"`;

    const cx = s.width / 2;
    const cy = s.height / 2;
    const scaleX = s.flipX ? -1 : 1;
    const scaleY = s.flipY ? -1 : 1;
    const flipSvg = s.flipX || s.flipY ? ` translate(${cx}, ${cy}) scale(${scaleX}, ${scaleY}) translate(${-cx}, ${-cy})` : '';
    const transform = `transform="translate(${s.x}, ${s.y}) rotate(${s.rotation || 0} ${cx} ${cy})${flipSvg}"`;

    if (s.type === 'draw' || s.type === 'highlighter') {
      const isHigh = s.type === 'highlighter';
      const pathData = renderFreehandStroke(s.points || [], s.size, isHigh);
      svgParts.push(
        `<g ${transform} opacity="${isHigh ? 0.35 : s.opacity ?? 1}">`,
        `<path d="${pathData}" fill="${strokeColor}" stroke="none" />`,
        `</g>`
      );
      continue;
    }

    if (s.type === 'sticky') {
      const stickyPreset = STICKY_COLORS.find((c) => c.name === s.color) || {
        bg: s.color.startsWith('#') ? s.color : '#fef08a',
        text: '#1e293b',
        border: 'rgba(0,0,0,0.15)',
      };
      svgParts.push(
        `<g ${transform} opacity="${s.opacity ?? 1}">`,
        `<rect x="0" y="0" width="${s.width}" height="${s.height}" rx="6" fill="${stickyPreset.bg}" stroke="${stickyPreset.border}" stroke-width="1.5" />`
      );
      if (s.text) {
        const lines = s.text.split('\n');
        svgParts.push(
          `<text x="16" y="24" fill="${stickyPreset.text}" font-size="${fontSize}" font-family="${fontFam}" direction="${dir}">`
        );
        lines.forEach((l, idx) => {
          svgParts.push(`<tspan x="16" dy="${idx === 0 ? 0 : fontSize * 1.35}">${escapeXml(l)}</tspan>`);
        });
        svgParts.push(`</text>`);
      }
      svgParts.push(`</g>`);
      continue;
    }

    if (s.type === 'text') {
      if (s.text) {
        let lines: string[] = [];
        if (s.autoWidth) {
          lines = s.text.split('\n');
        } else {
          // Word wrap based on approximate character width for SVG export
          const maxCharsPerLine = Math.max(10, Math.floor(s.width / (fontSize * 0.6)));
          const paragraphs = s.text.split('\n');
          for (const para of paragraphs) {
            const words = para.split(' ');
            let cur = '';
            for (const w of words) {
              if ((cur + ' ' + w).trim().length > maxCharsPerLine && cur) {
                lines.push(cur);
                cur = w;
              } else {
                cur = cur ? `${cur} ${w}` : w;
              }
            }
            if (cur) lines.push(cur);
          }
        }

        const textAnchorX = s.textAlign === 'center' ? s.width / 2 : s.textAlign === 'right' ? s.width : 0;
        svgParts.push(
          `<g ${transform} opacity="${s.opacity ?? 1}">`,
          `<text x="${textAnchorX}" y="${fontSize}" fill="${strokeColor}" font-size="${fontSize}" font-family="${fontFam}" text-anchor="${s.textAlign === 'center' ? 'middle' : s.textAlign === 'right' ? 'end' : 'start'}" direction="${dir}">`
        );
        lines.forEach((l, idx) => {
          svgParts.push(`<tspan x="${textAnchorX}" dy="${idx === 0 ? 0 : fontSize * 1.35}">${escapeXml(l)}</tspan>`);
        });
        svgParts.push(`</text>`, `</g>`);
      }
      continue;
    }

    if (s.type === 'arrow' || s.type === 'line') {
      const p1 = { x: 0, y: 0 };
      const p2 = { x: s.width, y: s.height };
      const isCurved = Boolean(s.bend && s.bend !== 0);
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const cp = { x: midX + nx * (s.bend || 0), y: midY + ny * (s.bend || 0) };
      const d = isCurved ? `M ${p1.x} ${p1.y} Q ${cp.x} ${cp.y} ${p2.x} ${p2.y}` : `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;

      svgParts.push(
        `<g transform="translate(${s.x}, ${s.y})" opacity="${s.opacity ?? 1}">`,
        `<path d="${d}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" ${dashAttr} stroke-linecap="round" stroke-linejoin="round" />`,
        `</g>`
      );
      continue;
    }

    // Geometric shapes
    svgParts.push(`<g ${transform} opacity="${s.opacity ?? 1}">`);
    if (s.type === 'rectangle') {
      svgParts.push(
        `<rect x="0" y="0" width="${s.width}" height="${s.height}" rx="6" ${fillAttr} stroke="${strokeColor}" stroke-width="${strokeWidth}" ${dashAttr} />`
      );
    } else if (s.type === 'ellipse') {
      svgParts.push(
        `<ellipse cx="${s.width / 2}" cy="${s.height / 2}" rx="${s.width / 2}" ry="${s.height / 2}" ${fillAttr} stroke="${strokeColor}" stroke-width="${strokeWidth}" ${dashAttr} />`
      );
    } else if (s.type === 'triangle') {
      svgParts.push(
        `<polygon points="${s.width / 2},0 ${s.width},${s.height} 0 antiquity,${s.height}" ${fillAttr} stroke="${strokeColor}" stroke-width="${strokeWidth}" ${dashAttr} />`
      );
    } else if (s.type === 'cloud') {
      svgParts.push(
        `<path d="${getCloudPath(s.width, s.height)}" ${fillAttr} stroke="${strokeColor}" stroke-width="${strokeWidth}" ${dashAttr} />`
      );
    } else if (s.type === 'star') {
      svgParts.push(
        `<path d="${getStarPath(s.width, s.height)}" ${fillAttr} stroke="${strokeColor}" stroke-width="${strokeWidth}" ${dashAttr} />`
      );
    }
    if (s.text) {
      svgParts.push(
        `<text x="${s.width / 2}" y="${s.height / 2}" fill="${strokeColor}" font-size="${Math.min(fontSize, s.height * 0.3)}" font-family="${fontFam}" text-anchor="middle" dominant-baseline="central" direction="${dir}">${escapeXml(s.text)}</text>`
      );
    }
    svgParts.push(`</g>`);
  }

  svgParts.push(`</svg>`);

  const svgContent = svgParts.join('\n');
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

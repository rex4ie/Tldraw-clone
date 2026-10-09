const FONT_MAP: Record<string, string> = {
  vazir: "'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  draw: "'Shantell Sans', 'Caveat', cursive, sans-serif",
  sans: "'Vazirmatn', 'Inter', system-ui, -apple-system, sans-serif",
  serif: "'Source Serif 4', Georgia, serif",
  mono: "'JetBrains Mono', monospace",
};

let measureCanvasCtx: CanvasRenderingContext2D | null = null;

export function measureTextDimensions(
  text: string,
  fontSize: number,
  font: string = 'vazir',
  lineHeightRatio: number = 1.3
): { width: number; height: number } {
  const content = text || '';
  const lines = content.split('\n');
  const lineCount = Math.max(1, lines.length);

  // Safe fallback calculation
  const fallbackHeight = Math.ceil(lineCount * fontSize * lineHeightRatio);
  const maxLineChars = Math.max(...lines.map((l) => l.length), 1);
  const fallbackWidth = Math.ceil(maxLineChars * fontSize * 0.62) + 8;

  if (typeof document === 'undefined') {
    return {
      width: Math.max(20, fallbackWidth),
      height: Math.max(Math.ceil(fontSize * lineHeightRatio), fallbackHeight),
    };
  }

  try {
    if (!measureCanvasCtx) {
      const canvas = document.createElement('canvas');
      measureCanvasCtx = canvas.getContext('2d');
    }

    if (measureCanvasCtx) {
      const fontSpec = FONT_MAP[font] || FONT_MAP.vazir;
      measureCanvasCtx.font = `${fontSize}px ${fontSpec}`;

      let maxLineWidth = 0;
      for (const line of lines) {
        const w = line.length > 0 ? measureCanvasCtx.measureText(line).width : 0;
        if (w > maxLineWidth) {
          maxLineWidth = w;
        }
      }

      // Add a slight 6px buffer for kerning and antialiasing
      const width = Math.max(20, Math.ceil(maxLineWidth) + 6);
      const height = Math.max(Math.ceil(fontSize * lineHeightRatio), Math.ceil(lineCount * fontSize * lineHeightRatio));
      return { width, height };
    }
  } catch {
    // fallback below
  }

  return {
    width: Math.max(20, fallbackWidth),
    height: Math.max(Math.ceil(fontSize * lineHeightRatio), fallbackHeight),
  };
}

export function measureWrappedTextDimensions(
  text: string,
  fontSize: number,
  boxWidth: number,
  font: string = 'vazir',
  lineHeightRatio: number = 1.3
): { width: number; height: number } {
  if (!text) {
    return {
      width: Math.max(20, boxWidth),
      height: Math.ceil(fontSize * lineHeightRatio),
    };
  }

  if (typeof document !== 'undefined') {
    try {
      if (!measureCanvasCtx) {
        const canvas = document.createElement('canvas');
        measureCanvasCtx = canvas.getContext('2d');
      }

      if (measureCanvasCtx) {
        const fontSpec = FONT_MAP[font] || FONT_MAP.vazir;
        measureCanvasCtx.font = `${fontSize}px ${fontSpec}`;

        const paragraphs = text.split('\n');
        let totalLines = 0;
        const effectiveWidth = Math.max(30, boxWidth - 8);

        for (const para of paragraphs) {
          if (!para) {
            totalLines += 1;
            continue;
          }
          const words = para.split(' ');
          let currentLineWidth = 0;
          let linesInPara = 1;

          for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const wordWidth = measureCanvasCtx.measureText(word).width;
            const spaceWidth = measureCanvasCtx.measureText(' ').width;

            if (currentLineWidth + wordWidth <= effectiveWidth) {
              currentLineWidth += wordWidth + spaceWidth;
            } else {
              linesInPara += 1;
              currentLineWidth = wordWidth + spaceWidth;
            }
          }
          totalLines += linesInPara;
        }

        return {
          width: Math.max(20, boxWidth),
          height: Math.max(Math.ceil(fontSize * lineHeightRatio), Math.ceil(totalLines * fontSize * lineHeightRatio) + 4),
        };
      }
    } catch {
      // fallback
    }
  }

  const lines = text.split('\n');
  return {
    width: Math.max(20, boxWidth),
    height: Math.max(Math.ceil(fontSize * lineHeightRatio), Math.ceil(lines.length * fontSize * lineHeightRatio)),
  };
}

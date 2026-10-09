import React from 'react';
import { Shape, ThemeType } from '../../types/canvas';
import { STROKE_SIZES, STICKY_COLORS } from '../../utils/constants';
import { renderFreehandStroke } from '../../utils/freehand';
import { getCloudPath, getStarPath, getBubblePath } from '../../utils/math';
import { measureTextDimensions, measureWrappedTextDimensions } from '../../utils/textMeasure';

interface ShapeRendererProps {
  shape: Shape;
  theme: ThemeType;
  isSelected: boolean;
  isEditingText: boolean;
  onTextChange?: (newText: string) => void;
  onFinishEditingText?: (measuredSize?: { width: number; height: number }) => void;
}

interface InlineTextEditorProps {
  value: string;
  onChange?: (val: string) => void;
  onBlur?: (measuredSize?: { width: number; height: number }) => void;
  fontClass: string;
  fontSize: number;
  font?: string;
  color: string;
  textAlign: any;
  direction: any;
  placeholder?: string;
  autoWidth?: boolean;
  boxWidth?: number;
  boxHeight?: number;
}

const InlineTextEditor: React.FC<InlineTextEditorProps> = ({
  value,
  onChange,
  onBlur,
  fontClass,
  fontSize,
  font,
  color,
  textAlign,
  direction,
  placeholder,
  autoWidth = false,
  boxWidth,
  boxHeight,
}) => {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const mirrorRef = React.useRef<HTMLPreElement | null>(null);
  const mountTimeRef = React.useRef(Date.now());

  React.useEffect(() => {
    // Explicitly focus textarea on mount and set caret at end
    const focusEl = () => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const len = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(len, len);
      }
    };
    focusEl();
    const t1 = setTimeout(focusEl, 20);
    const t2 = setTimeout(focusEl, 100);
    const t3 = setTimeout(focusEl, 250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const applyTextChangeWithCursor = (newText: string, newCursor: number) => {
    if (textareaRef.current) {
      textareaRef.current.value = newText;
      textareaRef.current.selectionStart = newCursor;
      textareaRef.current.selectionEnd = newCursor;
    }
    onChange?.(newText);
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = newCursor;
        textareaRef.current.selectionEnd = newCursor;
      }
    });
  };

  const handleTextChange = (newVal: string) => {
    // If user typed "- " or "* " at beginning of any line (IME, mobile or paste), convert to bullet "• "
    if (/(?:^|\n)(\s*)[-*]\x20/.test(newVal)) {
      const formatted = newVal.replace(/(^|\n)(\s*)[-*]\x20/g, '$1$2• ');
      const cursor = textareaRef.current?.selectionStart ?? formatted.length;
      applyTextChangeWithCursor(formatted, cursor);
      return;
    }
    onChange?.(newVal);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (e.key === 'Escape') {
      onBlur?.(getMeasuredSize());
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // 1. SPACE KEY: List trigger detection at beginning of ANY line
    // User writes -, *, 1., 1-, or any number with . or - and presses Space
    if (e.key === ' ' && start === end) {
      const textBeforeCursor = value.slice(0, start);
      const lineStart = textBeforeCursor.lastIndexOf('\n') + 1;
      const lineBefore = textBeforeCursor.slice(lineStart);

      // Bullet trigger: "-" or "*"
      const bulletMatch = lineBefore.match(/^(\s*)([-*])$/);
      if (bulletMatch) {
        e.preventDefault();
        const indent = bulletMatch[1];
        const newPrefix = indent + '• ';
        const newText = value.slice(0, lineStart) + newPrefix + value.slice(start);
        const newCursor = lineStart + newPrefix.length;
        applyTextChangeWithCursor(newText, newCursor);
        return;
      }

      // Numbered list trigger: "1.", "1-", or any "\d+[.-]"
      const numMatch = lineBefore.match(/^(\s*)(\d+)([.-])$/);
      if (numMatch) {
        e.preventDefault();
        const indent = numMatch[1];
        const num = numMatch[2];
        const sep = numMatch[3];
        const newPrefix = `${indent}${num}${sep} `;
        const newText = value.slice(0, lineStart) + newPrefix + value.slice(start);
        const newCursor = lineStart + newPrefix.length;
        applyTextChangeWithCursor(newText, newCursor);
        return;
      }
    }

    // 2. ENTER KEY: Automatic next list item or exit list when empty
    if (e.key === 'Enter' && !e.shiftKey) {
      const textBeforeCursor = value.slice(0, start);
      const lineStart = textBeforeCursor.lastIndexOf('\n') + 1;
      let lineEnd = value.indexOf('\n', start);
      if (lineEnd === -1) lineEnd = value.length;

      const fullLine = value.slice(lineStart, lineEnd);
      const lineBeforeCursor = value.slice(lineStart, start);
      const lineAfterCursor = value.slice(start, lineEnd);

      // Bullet list item
      const bulletMatch = fullLine.match(/^(\s*)(•|[-*])\s(.*)$/);
      if (bulletMatch) {
        const indent = bulletMatch[1];
        const content = bulletMatch[3];

        // If empty bullet item (user pressed Enter on empty bullet), cancel the list!
        if (!content.trim() && lineBeforeCursor.match(/^(\s*)(•|[-*])\s$/) && !lineAfterCursor.trim()) {
          e.preventDefault();
          const newText = value.slice(0, lineStart) + indent + value.slice(lineEnd);
          const newCursor = lineStart + indent.length;
          applyTextChangeWithCursor(newText, newCursor);
          return;
        }

        // Non-empty bullet: insert next bullet item
        e.preventDefault();
        const nextPrefix = `\n${indent}• `;
        const newText = value.slice(0, start) + nextPrefix + value.slice(start);
        const newCursor = start + nextPrefix.length;
        applyTextChangeWithCursor(newText, newCursor);
        return;
      }

      // Numbered list item (e.g. "1. " or "1- " or "2. ")
      const numMatch = fullLine.match(/^(\s*)(\d+)([.-])\s(.*)$/);
      if (numMatch) {
        const indent = numMatch[1];
        const currentNum = parseInt(numMatch[2], 10);
        const sep = numMatch[3];
        const content = numMatch[4];

        // If empty numbered item, cancel the list!
        if (!content.trim() && lineBeforeCursor.match(/^(\s*)(\d+)([.-])\s$/) && !lineAfterCursor.trim()) {
          e.preventDefault();
          const newText = value.slice(0, lineStart) + indent + value.slice(lineEnd);
          const newCursor = lineStart + indent.length;
          applyTextChangeWithCursor(newText, newCursor);
          return;
        }

        // Non-empty numbered item: insert next number
        e.preventDefault();
        const nextNum = currentNum + 1;
        const nextPrefix = `\n${indent}${nextNum}${sep} `;
        const newText = value.slice(0, start) + nextPrefix + value.slice(start);
        const newCursor = start + nextPrefix.length;
        applyTextChangeWithCursor(newText, newCursor);
        return;
      }
    }

    // 3. BACKSPACE KEY: If cursor is right after an empty list marker, delete the whole marker
    if (e.key === 'Backspace' && start === end) {
      const textBeforeCursor = value.slice(0, start);
      const lineStart = textBeforeCursor.lastIndexOf('\n') + 1;
      let lineEnd = value.indexOf('\n', start);
      if (lineEnd === -1) lineEnd = value.length;

      const lineBeforeCursor = value.slice(lineStart, start);
      const lineAfterCursor = value.slice(start, lineEnd);

      const emptyMarkerMatch = lineBeforeCursor.match(/^(\s*)(•|[-*]|\d+[.-])\s$/);
      if (emptyMarkerMatch && !lineAfterCursor.trim()) {
        e.preventDefault();
        const indent = emptyMarkerMatch[1];
        const newText = value.slice(0, lineStart) + indent + value.slice(start);
        const newCursor = lineStart + indent.length;
        applyTextChangeWithCursor(newText, newCursor);
        return;
      }
    }

    // 4. TAB KEY: Indent or unindent list item
    if (e.key === 'Tab') {
      e.preventDefault();
      const textBeforeCursor = value.slice(0, start);
      const lineStart = textBeforeCursor.lastIndexOf('\n') + 1;
      let lineEnd = value.indexOf('\n', start);
      if (lineEnd === -1) lineEnd = value.length;
      const fullLine = value.slice(lineStart, lineEnd);

      if (e.shiftKey) {
        if (fullLine.startsWith('  ')) {
          const newText = value.slice(0, lineStart) + fullLine.slice(2) + value.slice(lineEnd);
          const newCursor = Math.max(lineStart, start - 2);
          applyTextChangeWithCursor(newText, newCursor);
        }
      } else {
        const newText = value.slice(0, lineStart) + '  ' + fullLine + value.slice(lineEnd);
        const newCursor = start + 2;
        applyTextChangeWithCursor(newText, newCursor);
      }
    }
  };

  const getMeasuredSize = () => {
    if (autoWidth) {
      return measureTextDimensions(value, fontSize, font);
    }
    return measureWrappedTextDimensions(value, fontSize, boxWidth || 160, font);
  };

  const handleBlur = () => {
    // If blur fired within 350ms of mount (e.g. mouse release on canvas after clicking text tool), ignore and refocus!
    if (Date.now() - mountTimeRef.current < 350) {
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 20);
      return;
    }
    onBlur?.(getMeasuredSize());
  };

  if (autoWidth) {
    // UNLIMITED MODE: Unlimited horizontal expansion, no borders, no wrapping
    return (
      <div
        style={{
          display: 'inline-grid',
          gridTemplateColumns: 'min-content',
          minWidth: '2ch',
          position: 'relative',
        }}
      >
        {/* Invisible mirror measuring element that dynamically sizes the grid to exact text content without wrapping */}
        <pre
          ref={mirrorRef}
          aria-hidden="true"
          className={fontClass}
          style={{
            gridArea: '1 / 1',
            visibility: 'hidden',
            whiteSpace: 'pre',
            margin: 0,
            padding: 0,
            fontSize: `${fontSize}px`,
            lineHeight: 1.3,
            fontFamily: 'inherit',
            letterSpacing: 'normal',
            minHeight: `${Math.ceil(fontSize * 1.3)}px`,
          }}
        >
          {(value || '') + (value.endsWith('\n') ? ' ' : '')}
        </pre>

        <textarea
          autoFocus
          ref={textareaRef}
          dir={direction}
          placeholder=""
          className={`w-full h-full bg-transparent resize-none border-none outline-none ${fontClass} placeholder-slate-400 dark:placeholder-zinc-600 m-0 p-0`}
          style={{
            gridArea: '1 / 1',
            fontSize: `${fontSize}px`,
            color,
            lineHeight: 1.3,
            textAlign,
            direction,
            caretColor: color,
            whiteSpace: 'pre',
            overflow: 'hidden',
            padding: 0,
            margin: 0,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            boxShadow: 'none',
          }}
          value={value}
          onChange={(e) => handleTextChange(e.target.value)}
          onBlur={handleBlur}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
        />

        {/* Flashing typing indicator cursor (clearly signals active typing mode even when text is empty) */}
        {value === '' && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center"
            style={{
              justifyContent: textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start',
            }}
          >
            <span
              className="inline-block animate-pulse"
              style={{
                width: '2.5px',
                height: `${Math.max(20, Math.round(fontSize * 1.25))}px`,
                backgroundColor: color,
                borderRadius: '1.5px',
                boxShadow: `0 0 6px ${color}80`,
              }}
            />
          </div>
        )}
      </div>
    );
  }

  // DEFINED AREA (WRAPPING MODE): Wraps text inside the defined wrapping area
  return (
    <div
      style={{
        width: boxWidth ? `${boxWidth}px` : '100%',
        minHeight: boxHeight ? `${boxHeight}px` : '100%',
        position: 'relative',
      }}
    >
      <textarea
        autoFocus
        ref={textareaRef}
        dir={direction}
        placeholder=""
        className={`w-full h-full bg-transparent resize-none border-none outline-none ${fontClass} placeholder-slate-400 dark:placeholder-zinc-600 m-0 p-0`}
        style={{
          width: '100%',
          minHeight: boxHeight ? `${boxHeight}px` : '100%',
          fontSize: `${fontSize}px`,
          color,
          lineHeight: 1.3,
          textAlign,
          direction,
          caretColor: color,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflow: 'hidden',
          padding: 0,
          margin: 0,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          boxShadow: 'none',
        }}
        value={value}
        onChange={(e) => {
          handleTextChange(e.target.value);
          if (textareaRef.current && boxHeight) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.max(boxHeight, textareaRef.current.scrollHeight)}px`;
          }
        }}
        onBlur={handleBlur}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      />

      {/* Flashing typing indicator cursor for defined area */}
      {value === '' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-start pt-1"
          style={{
            justifyContent: textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start',
          }}
        >
          <span
            className="inline-block animate-pulse"
            style={{
              width: '2.5px',
              height: `${Math.max(20, Math.round(fontSize * 1.25))}px`,
              backgroundColor: color,
              borderRadius: '1.5px',
              boxShadow: `0 0 6px ${color}80`,
            }}
          />
        </div>
      )}
    </div>
  );
};

export const ShapeRenderer: React.FC<ShapeRendererProps> = ({
  shape,
  theme,
  isSelected,
  isEditingText,
  onTextChange,
  onFinishEditingText,
}) => {
  const strokeConfig = STROKE_SIZES[shape.size] || STROKE_SIZES.m;
  const strokeWidth = strokeConfig.strokeWidth;

  // Resolve color for dark/light themes
  const isDark = theme === 'dark' || theme === 'midnight';
  let strokeColor = shape.color;
  if (shape.color === '#1e1e1e' && isDark) {
    strokeColor = '#f4f4f5';
  } else if (shape.color === '#ffffff' && !isDark) {
    strokeColor = '#1e1e1e';
  }

  // Dash array calculation
  let strokeDasharray = 'none';
  if (shape.dash === 'dashed') {
    strokeDasharray = `${strokeWidth * 3} ${strokeWidth * 2}`;
  } else if (shape.dash === 'dotted') {
    strokeDasharray = `${strokeWidth} ${strokeWidth * 2}`;
  }

  // Fill calculation
  let fillValue = 'none';
  if (shape.fill === 'solid') {
    fillValue = strokeColor;
  } else if (shape.fill === 'semi') {
    fillValue = strokeColor;
  }
  const fillOpacity = shape.fill === 'semi' ? 0.25 : shape.fill === 'solid' ? 1 : 0;

  // Font class
  const getFontFamilyClass = () => {
    switch (shape.font) {
      case 'vazir':
        return 'font-vazir';
      case 'draw':
        return 'font-draw';
      case 'serif':
        return 'font-serif-canvas';
      case 'mono':
        return 'font-mono-canvas';
      case 'sans':
      default:
        return 'font-vazir';
    }
  };

  const actualFontSize = shape.fontSize || strokeConfig.fontSize;
  const textDir = shape.textDirection || 'ltr';

  const cx = shape.width / 2;
  const cy = shape.height / 2;
  const scaleX = shape.flipX ? -1 : 1;
  const scaleY = shape.flipY ? -1 : 1;
  const hasFlip = shape.flipX || shape.flipY;
  const flipTransform = hasFlip ? ` translate(${cx}, ${cy}) scale(${scaleX}, ${scaleY}) translate(${-cx}, ${-cy})` : '';
  const transform = `translate(${shape.x}, ${shape.y}) rotate(${shape.rotation || 0} ${cx} ${cy})${flipTransform}`;

  // 1. FREEHAND DRAW & HIGHLIGHTER
  if (shape.type === 'draw' || shape.type === 'highlighter') {
    const isHighlighter = shape.type === 'highlighter';
    const pathData = renderFreehandStroke(shape.points || [], shape.size, isHighlighter);
    return (
      <g transform={transform} opacity={isHighlighter ? 0.35 : shape.opacity}>
        <path
          d={pathData}
          fill={strokeColor}
          stroke="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </g>
    );
  }

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

    const pathData = isCurved
      ? `M ${p1.x} ${p1.y} Q ${cp.x} ${cp.y} ${p2.x} ${p2.y}`
      : `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;

    // Arrowhead calculations
    const endAngle = isCurved ? Math.atan2(p2.y - cp.y, p2.x - cp.x) : Math.atan2(dy, dx);
    const startAngle = isCurved ? Math.atan2(p1.y - cp.y, p1.x - cp.x) : Math.atan2(-dy, -dx);
    const arrowHeadSize = Math.max(14, strokeWidth * 3.5);

    return (
      <g transform={`translate(${shape.x}, ${shape.y})`} opacity={shape.opacity}>
        <path
          d={pathData}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* End Arrowhead */}
        {(shape.type === 'arrow' || shape.endArrowhead === 'arrow') && (
          <path
            d={`
              M ${p2.x - arrowHeadSize * Math.cos(endAngle - Math.PI / 6)} ${p2.y - arrowHeadSize * Math.sin(endAngle - Math.PI / 6)}
              L ${p2.x} ${p2.y}
              L ${p2.x - arrowHeadSize * Math.cos(endAngle + Math.PI / 6)} ${p2.y - arrowHeadSize * Math.sin(endAngle + Math.PI / 6)}
            `}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Start Arrowhead if specified */}
        {shape.startArrowhead === 'arrow' && (
          <path
            d={`
              M ${p1.x - arrowHeadSize * Math.cos(startAngle - Math.PI / 6)} ${p1.y - arrowHeadSize * Math.sin(startAngle - Math.PI / 6)}
              L ${p1.x} ${p1.y}
              L ${p1.x - arrowHeadSize * Math.cos(startAngle + Math.PI / 6)} ${p1.y - arrowHeadSize * Math.sin(startAngle + Math.PI / 6)}
            `}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </g>
    );
  }

  // 3. STICKY NOTE
  if (shape.type === 'sticky') {
    const stickyPreset = STICKY_COLORS.find((c) => c.name === shape.color) || {
      bg: shape.color.startsWith('#') ? shape.color : '#fef08a',
      text: '#1e293b',
      border: 'rgba(0,0,0,0.1)',
    };

    return (
      <g transform={transform} opacity={shape.opacity}>
        {/* Soft shadow */}
        <rect
          x={3}
          y={4}
          width={shape.width}
          height={shape.height}
          rx={6}
          ry={6}
          fill="rgba(0,0,0,0.08)"
          filter="blur(3px)"
        />
        {/* Main sticky body */}
        <rect
          x={0}
          y={0}
          width={shape.width}
          height={shape.height}
          rx={6}
          ry={6}
          fill={stickyPreset.bg}
          stroke={stickyPreset.border || 'rgba(0,0,0,0.15)'}
          strokeWidth={1.5}
        />
        {/* Sticky text content */}
        {!isEditingText ? (
          <foreignObject x={16} y={16} width={shape.width - 32} height={shape.height - 32}>
            <div
              dir={textDir}
              className={`w-full h-full whitespace-pre-wrap break-words overflow-hidden ${getFontFamilyClass()}`}
              style={{
                fontSize: `${actualFontSize}px`,
                color: stickyPreset.text,
                lineHeight: 1.35,
                textAlign: shape.textAlign,
                direction: textDir,
              }}
            >
              {shape.text || ''}
            </div>
          </foreignObject>
        ) : (
          <foreignObject x={16} y={16} width={shape.width - 32} height={shape.height - 32}>
            <InlineTextEditor
              value={shape.text || ''}
              onChange={onTextChange}
              onBlur={onFinishEditingText}
              fontClass={getFontFamilyClass()}
              fontSize={actualFontSize}
              color={stickyPreset.text}
              textAlign={shape.textAlign}
              direction={textDir}
              placeholder="Write note..."
            />
          </foreignObject>
        )}
      </g>
    );
  }

  // 4. FRAME
  if (shape.type === 'frame') {
    return (
      <g transform={transform} opacity={shape.opacity}>
        {/* Frame container border */}
        <rect
          x={0}
          y={0}
          width={shape.width}
          height={shape.height}
          rx={4}
          ry={4}
          fill={isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'}
          stroke={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
        {/* Frame header tag */}
        <g transform="translate(0, -26)">
          <rect
            x={0}
            y={0}
            width={Math.min(180, Math.max(80, (shape.text?.length || 5) * 11 + 24))}
            height={24}
            rx={4}
            ry={4}
            fill={isDark ? '#27272a' : '#f1f5f9'}
            stroke={isDark ? '#3f3f46' : '#cbd5e1'}
            strokeWidth={1}
          />
          <text
            x={10}
            y={16}
            fill={isDark ? '#e4e4e7' : '#475569'}
            fontSize={12}
            fontWeight={600}
            fontFamily="Inter, sans-serif"
          >
            {shape.text || 'Frame'}
          </text>
        </g>
      </g>
    );
  }

  // 5. TEXT SHAPE
  if (shape.type === 'text') {
    // If not editing, empty text, and has dimensions, this is a drag-to-size preview rectangle
    if (!shape.text && shape.width > 0 && shape.height > 0 && !isEditingText) {
      return (
        <g transform={transform} opacity={0.75}>
          <rect
            x={0}
            y={0}
            width={shape.width}
            height={shape.height}
            fill="rgba(59, 130, 246, 0.08)"
            stroke="#3b82f6"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            rx={2}
          />
        </g>
      );
    }

    return (
      <g transform={transform} opacity={shape.opacity}>
        {!isEditingText ? (
          <foreignObject
            x={0}
            y={0}
            width={Math.max(shape.width, 10)}
            height={Math.max(shape.height, 10)}
            style={{ overflow: 'visible' }}
          >
            <div
              dir={textDir}
              className={`w-full h-full ${shape.autoWidth ? 'whitespace-pre' : 'whitespace-pre-wrap break-words'} overflow-visible ${getFontFamilyClass()}`}
              style={{
                fontSize: `${actualFontSize}px`,
                color: strokeColor,
                lineHeight: 1.3,
                textAlign: shape.textAlign,
                direction: textDir,
              }}
            >
              {shape.text || (isSelected ? '' : 'Text')}
            </div>
          </foreignObject>
        ) : (
          (() => {
            const localAnchorX =
              shape.anchorX !== undefined
                ? shape.anchorX - shape.x
                : shape.textAlign === 'center'
                ? shape.width / 2
                : shape.textAlign === 'right'
                ? shape.width
                : 0;

            const foX = shape.autoWidth
              ? localAnchorX - (shape.textAlign === 'center' ? 10000 : shape.textAlign === 'right' ? 20000 : 0)
              : 0;

            return (
              <foreignObject
                x={foX}
                y={0}
                width={shape.autoWidth ? 20000 : Math.max(shape.width, 40)}
                height={shape.autoWidth ? 20000 : Math.max(shape.height, 30)}
                style={{ overflow: 'visible' }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent:
                      shape.textAlign === 'center'
                        ? 'center'
                        : shape.textAlign === 'right'
                        ? 'flex-end'
                        : 'flex-start',
                  }}
                >
                  <InlineTextEditor
                    value={shape.text || ''}
                    onChange={onTextChange}
                    onBlur={onFinishEditingText}
                    fontClass={getFontFamilyClass()}
                    fontSize={actualFontSize}
                    font={shape.font}
                    color={strokeColor}
                    textAlign={shape.textAlign}
                    direction={textDir}
                    placeholder=""
                    autoWidth={Boolean(shape.autoWidth)}
                    boxWidth={shape.width}
                    boxHeight={shape.height}
                  />
                </div>
              </foreignObject>
            );
          })()
        )}
      </g>
    );
  }

  // 6. IMAGE SHAPE
  if (shape.type === 'image') {
    return (
      <g transform={transform} opacity={shape.opacity}>
        <image
          href={shape.imageUrl}
          x={0}
          y={0}
          width={shape.width}
          height={shape.height}
          preserveAspectRatio="none"
          className="rounded-lg shadow-sm"
        />
        {isSelected && (
          <rect
            x={0}
            y={0}
            width={shape.width}
            height={shape.height}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
        )}
      </g>
    );
  }

  // 7. GEOMETRIC SHAPES (Rectangle, Ellipse, Triangle, Diamond, Star, Cloud, Bubble)
  const renderGeometry = () => {
    const w = shape.width;
    const h = shape.height;

    switch (shape.type) {
      case 'rectangle':
        return (
          <rect
            x={0}
            y={0}
            width={w}
            height={h}
            rx={shape.dash === 'draw' ? 6 : 4}
            ry={shape.dash === 'draw' ? 6 : 4}
            fill={fillValue}
            fillOpacity={fillOpacity}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeLinejoin="round"
          />
        );

      case 'ellipse':
        return (
          <ellipse
            cx={w / 2}
            cy={h / 2}
            rx={Math.max(1, w / 2)}
            ry={Math.max(1, h / 2)}
            fill={fillValue}
            fillOpacity={fillOpacity}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
          />
        );

      case 'triangle':
        return (
          <polygon
            points={`${w / 2},0 ${w},${h} 0,${h}`}
            fill={fillValue}
            fillOpacity={fillOpacity}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeLinejoin="round"
          />
        );

      case 'diamond':
        return (
          <polygon
            points={`${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`}
            fill={fillValue}
            fillOpacity={fillOpacity}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeLinejoin="round"
          />
        );

      case 'star':
        return (
          <path
            d={getStarPath(w, h)}
            fill={fillValue}
            fillOpacity={fillOpacity}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeLinejoin="round"
          />
        );

      case 'cloud':
        return (
          <path
            d={getCloudPath(w, h)}
            fill={fillValue}
            fillOpacity={fillOpacity}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeLinejoin="round"
          />
        );

      case 'bubble':
        return (
          <path
            d={getBubblePath(w, h)}
            fill={fillValue}
            fillOpacity={fillOpacity}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeLinejoin="round"
          />
        );

      default:
        return null;
    }
  };

  return (
    <g transform={transform} opacity={shape.opacity}>
      {renderGeometry()}

      {/* Embedded text inside geometric shapes */}
      {shape.text && !isEditingText && (
        <foreignObject x={10} y={10} width={Math.max(10, shape.width - 20)} height={Math.max(10, shape.height - 20)}>
          <div
            className={`w-full h-full flex items-center justify-center pointer-events-none whitespace-pre-wrap break-words ${getFontFamilyClass()}`}
            style={{
              fontSize: `${Math.min(strokeConfig.fontSize, Math.max(12, shape.height * 0.25))}px`,
              color: strokeColor,
              textAlign: shape.textAlign,
            }}
          >
            {shape.text}
          </div>
        </foreignObject>
      )}

      {/* Editing text inside geometric shape */}
      {isEditingText && (
        <foreignObject x={10} y={10} width={Math.max(10, shape.width - 20)} height={Math.max(10, shape.height - 20)}>
          <InlineTextEditor
            value={shape.text || ''}
            onChange={onTextChange}
            onBlur={onFinishEditingText}
            fontClass={getFontFamilyClass()}
            fontSize={Math.min(actualFontSize, Math.max(12, shape.height * 0.25))}
            color={strokeColor}
            textAlign={shape.textAlign}
            direction={textDir}
            placeholder="Type text..."
          />
        </foreignObject>
      )}
    </g>
  );
};

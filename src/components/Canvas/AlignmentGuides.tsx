import React from 'react';
import { AlignmentGuide } from '../../types/canvas';

interface AlignmentGuidesProps {
  guides: AlignmentGuide[];
}

export const AlignmentGuides: React.FC<AlignmentGuidesProps> = ({ guides }) => {
  if (guides.length === 0) return null;

  return (
    <g className="alignment-guides pointer-events-none">
      {guides.map((g, index) => {
        if (g.type === 'horizontal') {
          return (
            <line
              key={index}
              x1={g.start}
              y1={g.position}
              x2={g.end}
              y2={g.position}
              stroke="#ec4899"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          );
        } else {
          return (
            <line
              key={index}
              x1={g.position}
              y1={g.start}
              x2={g.position}
              y2={g.end}
              stroke="#ec4899"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          );
        }
      })}
    </g>
  );
};

import React, { useEffect, useState } from 'react';
import { LaserPoint } from '../../types/canvas';

interface LaserTrailProps {
  points: LaserPoint[];
}

export const LaserTrail: React.FC<LaserTrailProps> = ({ points }) => {
  const [, setTick] = useState(0);

  // Force re-render periodically to decay trail
  useEffect(() => {
    if (points.length === 0) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 40);
    return () => clearInterval(interval);
  }, [points.length]);

  if (points.length < 2) return null;

  const now = Date.now();
  const maxAge = 1200; // ms

  // Group into line segments with decaying opacity
  const validPoints = points.filter((p) => now - p.timestamp < maxAge);
  if (validPoints.length < 2) return null;

  return (
    <g className="laser-trail pointer-events-none">
      {validPoints.map((pt, i) => {
        if (i === 0) return null;
        const prev = validPoints[i - 1];
        const age = now - pt.timestamp;
        const life = Math.max(0, 1 - age / maxAge);
        if (life <= 0) return null;

        return (
          <g key={i}>
            {/* Outer glow */}
            <line
              x1={prev.x}
              y1={prev.y}
              x2={pt.x}
              y2={pt.y}
              stroke="#ef4444"
              strokeWidth={8 * life}
              strokeOpacity={0.4 * life}
              strokeLinecap="round"
            />
            {/* Inner hot core */}
            <line
              x1={prev.x}
              y1={prev.y}
              x2={pt.x}
              y2={pt.y}
              stroke="#ffffff"
              strokeWidth={3 * life}
              strokeOpacity={0.9 * life}
              strokeLinecap="round"
            />
          </g>
        );
      })}
    </g>
  );
};

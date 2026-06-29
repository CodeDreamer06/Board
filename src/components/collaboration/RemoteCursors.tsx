import React from 'react';
import { Viewport } from '../../types/canvas';

export interface RemoteCursor {
  x: number;
  y: number;
  name: string;
  color: string;
  lastUpdate: number;
}

interface Props {
  cursors: Map<string, RemoteCursor>;
  viewport: Viewport;
}

export const RemoteCursors: React.FC<Props> = ({ cursors, viewport }) => {
  const now = Date.now();

  return (
    <div className="absolute inset-0 pointer-events-none z-15 overflow-hidden">
      {Array.from(cursors.entries()).map(([clientId, cursor]) => {
        const age = now - cursor.lastUpdate;
        if (age > 30000) return null; // Remove after 30s

        const opacity = age > 5000 ? Math.max(0, 1 - (age - 5000) / 5000) : 1;
        const screenX = cursor.x * viewport.zoom + viewport.x;
        const screenY = cursor.y * viewport.zoom + viewport.y;

        return (
          <div
            key={clientId}
            className="absolute"
            style={{
              left: screenX,
              top: screenY,
              opacity,
              transition: 'left 150ms ease-out, top 150ms ease-out, opacity 500ms ease',
              willChange: 'left, top',
            }}
          >
            {/* Cursor Arrow SVG */}
            <svg width="16" height="20" viewBox="0 0 16 20" fill="none" className="-ml-0.5 -mt-0.5">
              <path
                d="M1 1L6 18L8.5 10.5L15 8L1 1Z"
                fill={cursor.color}
                stroke="white"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </svg>

            {/* Name Label */}
            <div
              className="ml-3 -mt-1 px-1.5 py-0.5 rounded text-[9px] font-medium text-white whitespace-nowrap shadow-lg"
              style={{ backgroundColor: cursor.color }}
            >
              {cursor.name}
            </div>
          </div>
        );
      })}
    </div>
  );
};

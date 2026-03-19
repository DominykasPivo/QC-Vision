/**
 * GridOverlay - Reusable rule-of-thirds grid overlay for camera previews
 *
 * Displays composition guide lines over camera feeds.
 */

const GRID_OPACITY = 0.3;
const GRID_LINE_COLOR = "white";
const GRID_LINE_WIDTH = 1;

export function GridOverlay() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: GRID_OPACITY }}
    >
      {/* Rule of thirds grid - vertical lines */}
      <line
        x1="33.33%"
        y1="0"
        x2="33.33%"
        y2="100%"
        stroke={GRID_LINE_COLOR}
        strokeWidth={GRID_LINE_WIDTH}
      />
      <line
        x1="66.66%"
        y1="0"
        x2="66.66%"
        y2="100%"
        stroke={GRID_LINE_COLOR}
        strokeWidth={GRID_LINE_WIDTH}
      />
      {/* Rule of thirds grid - horizontal lines */}
      <line
        x1="0"
        y1="33.33%"
        x2="100%"
        y2="33.33%"
        stroke={GRID_LINE_COLOR}
        strokeWidth={GRID_LINE_WIDTH}
      />
      <line
        x1="0"
        y1="66.66%"
        x2="100%"
        y2="66.66%"
        stroke={GRID_LINE_COLOR}
        strokeWidth={GRID_LINE_WIDTH}
      />
    </svg>
  );
}

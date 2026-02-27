import type { DrawingTool } from "@/lib/annotation-types";

/**
 * Get the default cursor based on current tool and zoom state.
 */
export function getDefaultCursor(
  currentTool: DrawingTool,
  scale: number,
  enableMove: boolean,
): string {
  if (scale > 1 && currentTool === "select" && !enableMove) {
    return "grab";
  }
  if (currentTool !== "select") {
    return "crosshair";
  }
  return "default";
}

/**
 * Get the current cursor including panning state.
 */
export function getCursor(
  isPanning: boolean,
  currentTool: DrawingTool,
  scale: number,
  enableMove: boolean,
): string {
  if (isPanning) {
    return "grabbing";
  }
  return getDefaultCursor(currentTool, scale, enableMove);
}

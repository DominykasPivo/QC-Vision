import { useState } from "react";
import type {
  AnnotationGeometry,
  DrawingTool,
  Point,
} from "@/lib/annotation-types";
import { buildGeometryFromDrawing } from "../renderShapes";

type UseDrawingParams = {
  dimensions: { width: number; height: number };
  readonly: boolean;
  currentTool: DrawingTool;
  onAnnotationCreate?: (geometry: AnnotationGeometry) => void;
};

type UseDrawingReturn = {
  isDrawing: boolean;
  drawingStart: Point | null;
  tempPoints: Point[];
  startDrawing: (pos: Point) => void;
  updateDrawing: (pos: Point) => void;
  finishDrawing: () => void;
  cancelDrawing: () => void;
};

/**
 * Hook to manage drawing state and logic for creating annotations.
 */
export function useDrawing({
  dimensions,
  readonly,
  currentTool,
  onAnnotationCreate,
}: UseDrawingParams): UseDrawingReturn {
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingStart, setDrawingStart] = useState<Point | null>(null);
  const [tempPoints, setTempPoints] = useState<Point[]>([]);

  const startDrawing = (pos: Point) => {
    if (readonly || currentTool === "select") return;

    const normalized = {
      x: pos.x / dimensions.width,
      y: pos.y / dimensions.height,
    };
    setIsDrawing(true);
    setDrawingStart(normalized);
    setTempPoints([normalized]);
  };

  const updateDrawing = (pos: Point) => {
    if (!isDrawing || readonly) return;

    const normalized = {
      x: pos.x / dimensions.width,
      y: pos.y / dimensions.height,
    };

    if (currentTool === "freehand") {
      setTempPoints((prev) => [...prev, normalized]);
    } else {
      setTempPoints([drawingStart!, normalized]);
    }
  };

  const finishDrawing = () => {
    if (!isDrawing || !drawingStart || readonly) return;

    // Need at least 2 points for most tools (except circle)
    if (tempPoints.length < 2 && currentTool !== "circle") {
      cancelDrawing();
      return;
    }

    const geometry = buildGeometryFromDrawing({
      currentTool,
      drawingStart,
      tempPoints,
    });

    if (geometry && onAnnotationCreate) {
      onAnnotationCreate(geometry);
    }

    cancelDrawing();
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setDrawingStart(null);
    setTempPoints([]);
  };

  return {
    isDrawing,
    drawingStart,
    tempPoints,
    startDrawing,
    updateDrawing,
    finishDrawing,
    cancelDrawing,
  };
}

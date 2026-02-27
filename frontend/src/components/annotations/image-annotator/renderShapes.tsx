import type { ReactNode } from "react";
import { Arrow, Circle, Line, Rect } from "react-konva";
import type Konva from "konva";
import type {
  Annotation,
  AnnotationGeometry,
  ArrowGeometry,
  CircleGeometry,
  DrawingTool,
  FreehandGeometry,
  Point,
  PolygonGeometry,
  RectGeometry,
} from "@/lib/annotation-types";

type Dimensions = {
  width: number;
  height: number;
};

type RenderAnnotationShapeOptions = {
  annotation: Annotation;
  dimensions: Dimensions;
  selectedAnnotationId?: number | null;
  readonly: boolean;
  enableMove: boolean;
  onSelect?: (annotation: Annotation | null) => void;
  onDragEnd: (
    annotation: Annotation,
    e: Konva.KonvaEventObject<DragEvent>,
  ) => void;
  getDefaultCursor: () => string;
};

function setCursorForTarget(
  e: Konva.KonvaEventObject<MouseEvent>,
  cursor: string,
): void {
  const container = e.target.getStage()?.container();
  if (container) container.style.cursor = cursor;
}

export function renderAnnotationShape({
  annotation,
  dimensions,
  selectedAnnotationId,
  readonly,
  enableMove,
  onSelect,
  onDragEnd,
  getDefaultCursor,
}: RenderAnnotationShapeOptions): ReactNode {
  const { geometry } = annotation;
  const isSelected = annotation.id === selectedAnnotationId;
  const strokeColor = isSelected ? "#3b82f6" : (annotation.color ?? "#ef4444");
  const strokeWidth = isSelected ? 3 : 2;
  const isDraggable = !readonly && enableMove;
  const hitStrokeWidth = Math.max(strokeWidth, 20);

  const handleSelect = () => onSelect?.(annotation);

  const onMouseEnter = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isDraggable) {
      setCursorForTarget(e, "move");
    }
  };

  const onMouseLeave = (e: Konva.KonvaEventObject<MouseEvent>) => {
    setCursorForTarget(e, getDefaultCursor());
  };

  switch (geometry.type) {
    case "circle": {
      const g = geometry as CircleGeometry;
      return (
        <Circle
          key={annotation.id}
          x={g.center.x * dimensions.width}
          y={g.center.y * dimensions.height}
          radius={g.radius * dimensions.width}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          hitStrokeWidth={hitStrokeWidth}
          draggable={isDraggable}
          onClick={handleSelect}
          onTap={handleSelect}
          onDragEnd={(e) => onDragEnd(annotation, e)}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        />
      );
    }
    case "rect": {
      const g = geometry as RectGeometry;
      return (
        <Rect
          key={annotation.id}
          x={g.x * dimensions.width}
          y={g.y * dimensions.height}
          width={g.width * dimensions.width}
          height={g.height * dimensions.height}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          hitStrokeWidth={hitStrokeWidth}
          draggable={isDraggable}
          onClick={handleSelect}
          onTap={handleSelect}
          onDragEnd={(e) => onDragEnd(annotation, e)}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        />
      );
    }
    case "arrow": {
      const g = geometry as ArrowGeometry;
      return (
        <Arrow
          key={annotation.id}
          points={[
            g.from.x * dimensions.width,
            g.from.y * dimensions.height,
            g.to.x * dimensions.width,
            g.to.y * dimensions.height,
          ]}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          pointerLength={10}
          pointerWidth={10}
          hitStrokeWidth={hitStrokeWidth}
          draggable={isDraggable}
          onClick={handleSelect}
          onTap={handleSelect}
          onDragEnd={(e) => onDragEnd(annotation, e)}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        />
      );
    }
    case "freehand":
    case "polygon": {
      const g = geometry as FreehandGeometry | PolygonGeometry;
      const points = g.points.flatMap((p) => [
        p.x * dimensions.width,
        p.y * dimensions.height,
      ]);
      return (
        <Line
          key={annotation.id}
          points={points}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          hitStrokeWidth={hitStrokeWidth}
          closed={geometry.type === "polygon"}
          draggable={isDraggable}
          onClick={handleSelect}
          onTap={handleSelect}
          onDragEnd={(e) => onDragEnd(annotation, e)}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        />
      );
    }
    default:
      return null;
  }
}

type RenderTempShapeOptions = {
  isDrawing: boolean;
  drawingStart: Point | null;
  tempPoints: Point[];
  currentTool: DrawingTool;
  dimensions: Dimensions;
};

export function renderTempShape({
  isDrawing,
  drawingStart,
  tempPoints,
  currentTool,
  dimensions,
}: RenderTempShapeOptions): ReactNode {
  if (!isDrawing || tempPoints.length < 1 || !drawingStart) return null;

  const endPoint = tempPoints[tempPoints.length - 1];
  const strokeColor = "#3b82f6";
  const strokeWidth = 2;

  switch (currentTool) {
    case "circle": {
      const dx = endPoint.x - drawingStart.x;
      const dy = endPoint.y - drawingStart.y;
      const radius = Math.sqrt(dx * dx + dy * dy);
      return (
        <Circle
          x={drawingStart.x * dimensions.width}
          y={drawingStart.y * dimensions.height}
          radius={radius * dimensions.width}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          dash={[5, 5]}
        />
      );
    }
    case "rect": {
      const x = Math.min(drawingStart.x, endPoint.x);
      const y = Math.min(drawingStart.y, endPoint.y);
      const width = Math.abs(endPoint.x - drawingStart.x);
      const height = Math.abs(endPoint.y - drawingStart.y);
      return (
        <Rect
          x={x * dimensions.width}
          y={y * dimensions.height}
          width={width * dimensions.width}
          height={height * dimensions.height}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          dash={[5, 5]}
        />
      );
    }
    case "arrow": {
      return (
        <Arrow
          points={[
            drawingStart.x * dimensions.width,
            drawingStart.y * dimensions.height,
            endPoint.x * dimensions.width,
            endPoint.y * dimensions.height,
          ]}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          dash={[5, 5]}
          pointerLength={10}
          pointerWidth={10}
        />
      );
    }
    case "freehand":
    case "polygon": {
      const points = tempPoints.flatMap((p) => [
        p.x * dimensions.width,
        p.y * dimensions.height,
      ]);
      return (
        <Line
          points={points}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          dash={[5, 5]}
        />
      );
    }
    default:
      return null;
  }
}

type BuildGeometryFromDrawingOptions = {
  currentTool: DrawingTool;
  drawingStart: Point;
  tempPoints: Point[];
};

export function buildGeometryFromDrawing({
  currentTool,
  drawingStart,
  tempPoints,
}: BuildGeometryFromDrawingOptions): AnnotationGeometry | null {
  const endPoint = tempPoints[tempPoints.length - 1];
  if (!endPoint) return null;

  switch (currentTool) {
    case "circle": {
      const dx = endPoint.x - drawingStart.x;
      const dy = endPoint.y - drawingStart.y;
      const radius = Math.sqrt(dx * dx + dy * dy);
      return {
        type: "circle",
        center: drawingStart,
        radius,
      } as CircleGeometry;
    }
    case "rect": {
      const x = Math.min(drawingStart.x, endPoint.x);
      const y = Math.min(drawingStart.y, endPoint.y);
      const width = Math.abs(endPoint.x - drawingStart.x);
      const height = Math.abs(endPoint.y - drawingStart.y);
      return {
        type: "rect",
        x,
        y,
        width,
        height,
      } as RectGeometry;
    }
    case "arrow": {
      return {
        type: "arrow",
        from: drawingStart,
        to: endPoint,
      } as ArrowGeometry;
    }
    case "freehand": {
      if (tempPoints.length <= 2) return null;
      return {
        type: "freehand",
        points: tempPoints,
      } as FreehandGeometry;
    }
    case "polygon": {
      if (tempPoints.length <= 2) return null;
      return {
        type: "polygon",
        points: tempPoints,
      } as PolygonGeometry;
    }
    default:
      return null;
  }
}

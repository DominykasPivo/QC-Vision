import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Circle, Rect, Line, Arrow } from 'react-konva';
import type Konva from 'konva';
import type {
  Annotation,
  AnnotationGeometry,
  DrawingTool,
  Point,
  CircleGeometry,
  RectGeometry,
  PolygonGeometry,
  ArrowGeometry,
  FreehandGeometry,
  pointToPixel,
  pointToNormalized,
} from '@/lib/annotation-types';

type ImageAnnotatorProps = {
  imageUrl: string;
  annotations: Annotation[];
  currentTool: DrawingTool;
  onAnnotationCreate?: (geometry: AnnotationGeometry) => void;
  onAnnotationSelect?: (annotation: Annotation | null) => void;
  selectedAnnotationId?: number | null;
  readonly?: boolean;
};

export function ImageAnnotator({
  imageUrl,
  annotations,
  currentTool,
  onAnnotationCreate,
  onAnnotationSelect,
  selectedAnnotationId,
  readonly = false,
}: ImageAnnotatorProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingStart, setDrawingStart] = useState<Point | null>(null);
  const [tempPoints, setTempPoints] = useState<Point[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load image
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
      // Calculate dimensions to fit container
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const aspectRatio = img.height / img.width;
        const width = Math.min(containerWidth, 1200);
        const height = width * aspectRatio;
        setDimensions({ width, height });
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const handleStart = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (readonly || currentTool === 'select') return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    const normalized = {
      x: pos.x / dimensions.width,
      y: pos.y / dimensions.height,
    };

    setIsDrawing(true);
    setDrawingStart(normalized);
    setTempPoints([normalized]);
  };

  const handleMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isDrawing || readonly) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    const normalized = {
      x: pos.x / dimensions.width,
      y: pos.y / dimensions.height,
    };

    if (currentTool === 'freehand') {
      setTempPoints([...tempPoints, normalized]);
    } else {
      setTempPoints([drawingStart!, normalized]);
    }
  };

  const handleEnd = () => {
    if (!isDrawing || !drawingStart || readonly) return;

    if (tempPoints.length < 2 && currentTool !== 'circle') {
      setIsDrawing(false);
      setDrawingStart(null);
      setTempPoints([]);
      return;
    }

    const endPoint = tempPoints[tempPoints.length - 1];
    let geometry: AnnotationGeometry | null = null;

    switch (currentTool) {
      case 'circle': {
        const dx = endPoint.x - drawingStart.x;
        const dy = endPoint.y - drawingStart.y;
        const radius = Math.sqrt(dx * dx + dy * dy);
        geometry = {
          type: 'circle',
          center: drawingStart,
          radius,
        } as CircleGeometry;
        break;
      }
      case 'rect': {
        const x = Math.min(drawingStart.x, endPoint.x);
        const y = Math.min(drawingStart.y, endPoint.y);
        const width = Math.abs(endPoint.x - drawingStart.x);
        const height = Math.abs(endPoint.y - drawingStart.y);
        geometry = {
          type: 'rect',
          x,
          y,
          width,
          height,
        } as RectGeometry;
        break;
      }
      case 'arrow': {
        geometry = {
          type: 'arrow',
          from: drawingStart,
          to: endPoint,
        } as ArrowGeometry;
        break;
      }
      case 'freehand': {
        if (tempPoints.length > 2) {
          geometry = {
            type: 'freehand',
            points: tempPoints,
          } as FreehandGeometry;
        }
        break;
      }
      case 'polygon': {
        // For now, treat polygon like freehand - could enhance with click-to-add-point
        if (tempPoints.length > 2) {
          geometry = {
            type: 'polygon',
            points: tempPoints,
          } as PolygonGeometry;
        }
        break;
      }
    }

    if (geometry && onAnnotationCreate) {
      onAnnotationCreate(geometry);
    }

    setIsDrawing(false);
    setDrawingStart(null);
    setTempPoints([]);
  };

  const renderAnnotation = (annotation: Annotation) => {
    const { geometry } = annotation;
    const isSelected = annotation.id === selectedAnnotationId;
    const strokeColor = isSelected ? '#3b82f6' : '#ef4444';
    const strokeWidth = isSelected ? 3 : 2;

    switch (geometry.type) {
      case 'circle': {
        const g = geometry as CircleGeometry;
        return (
          <Circle
            key={annotation.id}
            x={g.center.x * dimensions.width}
            y={g.center.y * dimensions.height}
            radius={g.radius * dimensions.width}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            onClick={() => onAnnotationSelect?.(annotation)}
          />
        );
      }
      case 'rect': {
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
            onClick={() => onAnnotationSelect?.(annotation)}
          />
        );
      }
      case 'arrow': {
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
            onClick={() => onAnnotationSelect?.(annotation)}
          />
        );
      }
      case 'freehand':
      case 'polygon': {
        const g = geometry as FreehandGeometry | PolygonGeometry;
        const points = g.points.flatMap(p => [
          p.x * dimensions.width,
          p.y * dimensions.height,
        ]);
        return (
          <Line
            key={annotation.id}
            points={points}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            closed={geometry.type === 'polygon'}
            onClick={() => onAnnotationSelect?.(annotation)}
          />
        );
      }
      default:
        return null;
    }
  };

  const renderTempShape = () => {
    if (!isDrawing || tempPoints.length < 1 || !drawingStart) return null;

    const endPoint = tempPoints[tempPoints.length - 1];
    const strokeColor = '#3b82f6';
    const strokeWidth = 2;

    switch (currentTool) {
      case 'circle': {
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
      case 'rect': {
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
      case 'arrow': {
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
      case 'freehand':
      case 'polygon': {
        const points = tempPoints.flatMap(p => [
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
    }
    return null;
  };

  return (
    <div ref={containerRef} className="w-full">
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        className="border border-gray-300 rounded-lg cursor-crosshair"
      >
        <Layer>
          {image && <KonvaImage image={image} width={dimensions.width} height={dimensions.height} />}
          {annotations.map(renderAnnotation)}
          {renderTempShape()}
        </Layer>
      </Stage>
    </div>
  );
}

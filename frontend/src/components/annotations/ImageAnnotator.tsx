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
} from '@/lib/annotation-types';

type ImageAnnotatorProps = {
  imageUrl: string;
  annotations: Annotation[];
  currentTool: DrawingTool;
  onAnnotationCreate?: (geometry: AnnotationGeometry) => void;
  onAnnotationSelect?: (annotation: Annotation | null) => void;
  onAnnotationUpdate?: (annotationId: number, geometry: AnnotationGeometry) => void;
  onAnnotationDelete?: (annotationId: number) => void;
  selectedAnnotationId?: number | null;
  readonly?: boolean;
  enableMove?: boolean;
};

export function ImageAnnotator({
  imageUrl,
  annotations,
  currentTool,
  onAnnotationCreate,
  onAnnotationSelect,
  onAnnotationUpdate,
  onAnnotationDelete,
  selectedAnnotationId,
  readonly = false,
  enableMove = false,
}: ImageAnnotatorProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingStart, setDrawingStart] = useState<Point | null>(null);
  const [tempPoints, setTempPoints] = useState<Point[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

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

  // Keyboard handler for deleting annotations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAnnotationId && onAnnotationDelete) {
        e.preventDefault();
        onAnnotationDelete(selectedAnnotationId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAnnotationId, onAnnotationDelete]);

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

  const handleAnnotationDragEnd = (annotation: Annotation, e: Konva.KonvaEventObject<DragEvent>) => {
    if (readonly || !onAnnotationUpdate) return;

    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Get the drag delta before resetting
    const dragDeltaX = node.x() / dimensions.width;
    const dragDeltaY = node.y() / dimensions.height;

    // Reset scale and position after drag
    node.scaleX(1);
    node.scaleY(1);
    node.x(0);
    node.y(0);

    const { geometry } = annotation;
    let updatedGeometry: AnnotationGeometry | null = null;

    switch (geometry.type) {
      case 'circle': {
        const g = geometry as CircleGeometry;
        updatedGeometry = {
          ...g,
          center: {
            x: g.center.x + dragDeltaX,
            y: g.center.y + dragDeltaY,
          },
          radius: g.radius * scaleX,
        };
        break;
      }
      case 'rect': {
        const g = geometry as RectGeometry;
        updatedGeometry = {
          ...g,
          x: g.x + dragDeltaX,
          y: g.y + dragDeltaY,
          width: g.width * scaleX,
          height: g.height * scaleY,
        };
        break;
      }
      case 'arrow': {
        const g = geometry as ArrowGeometry;
        updatedGeometry = {
          ...g,
          from: {
            x: g.from.x + dragDeltaX,
            y: g.from.y + dragDeltaY,
          },
          to: {
            x: g.to.x + dragDeltaX,
            y: g.to.y + dragDeltaY,
          },
        };
        break;
      }
      case 'freehand':
      case 'polygon': {
        const g = geometry as FreehandGeometry | PolygonGeometry;
        updatedGeometry = {
          ...g,
          points: g.points.map(p => ({
            x: p.x + dragDeltaX,
            y: p.y + dragDeltaY,
          })),
        };
        break;
      }
    }

    if (updatedGeometry) {
      onAnnotationUpdate(annotation.id, updatedGeometry);
    }
  };

  const renderAnnotation = (annotation: Annotation) => {
    const { geometry } = annotation;
    const isSelected = annotation.id === selectedAnnotationId;
    const strokeColor = isSelected ? '#3b82f6' : (annotation.color ?? '#ef4444');
    const strokeWidth = isSelected ? 3 : 2;
    const isDraggable = !readonly && enableMove;

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
            draggable={isDraggable}
            onClick={() => onAnnotationSelect?.(annotation)}
            onDragEnd={(e) => handleAnnotationDragEnd(annotation, e)}
            onMouseEnter={(e) => {
              if (isDraggable) {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'move';
              }
            }}
            onMouseLeave={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = currentTool === 'select' ? 'default' : 'crosshair';
            }}
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
            draggable={isDraggable}
            onClick={() => onAnnotationSelect?.(annotation)}
            onDragEnd={(e) => handleAnnotationDragEnd(annotation, e)}
            onMouseEnter={(e) => {
              if (isDraggable) {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'move';
              }
            }}
            onMouseLeave={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = currentTool === 'select' ? 'default' : 'crosshair';
            }}
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
            draggable={isDraggable}
            onClick={() => onAnnotationSelect?.(annotation)}
            onDragEnd={(e) => handleAnnotationDragEnd(annotation, e)}
            onMouseEnter={(e) => {
              if (isDraggable) {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'move';
              }
            }}
            onMouseLeave={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = currentTool === 'select' ? 'default' : 'crosshair';
            }}
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
            draggable={isDraggable}
            onClick={() => onAnnotationSelect?.(annotation)}
            onDragEnd={(e) => handleAnnotationDragEnd(annotation, e)}
            onMouseEnter={(e) => {
              if (isDraggable) {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'move';
              }
            }}
            onMouseLeave={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = currentTool === 'select' ? 'default' : 'crosshair';
            }}
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
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        className="border border-gray-300 rounded-lg"
        style={{ 
          cursor: currentTool === 'select' ? 'default' : 'crosshair',
        }}
      >
        <Layer>
          {image && <KonvaImage image={image} width={dimensions.width} height={dimensions.height} />}
          {annotations.map(renderAnnotation)}
          {renderTempShape()}
        </Layer>
      </Stage>
      {selectedAnnotationId && !readonly && (
        <div className="mt-2 flex items-center gap-2">
          {enableMove ? (
            <div className="text-sm text-green-700 font-medium">
              ✓ Selected - Drag to reposition
            </div>
          ) : (
            <div className="text-sm text-gray-700 font-medium">
              Selected annotation - {annotations.find(a => a.id === selectedAnnotationId)?.geometry.type || 'Unknown'}
            </div>
          )}
          {onAnnotationDelete && (
            <button
              onClick={() => onAnnotationDelete(selectedAnnotationId)}
              className="px-3 py-1 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors"
              style={{ minWidth: '70px' }}
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

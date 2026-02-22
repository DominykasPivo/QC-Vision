import { useCallback, useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Circle, Rect, Line, Arrow } from 'react-konva';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
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

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const ZOOM_BY = 1.15;

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

  // Zoom & pan state
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Pinch-to-zoom tracking
  const isPinchingRef = useRef(false);
  const lastPinchDistRef = useRef(0);
  const lastPinchCenterRef = useRef({ x: 0, y: 0 });

  // Constrain pan so image stays within viewport
  const constrainPosition = useCallback(
    (pos: { x: number; y: number }, s: number) => {
      if (s <= 1) return { x: 0, y: 0 };
      return {
        x: Math.min(0, Math.max(dimensions.width * (1 - s), pos.x)),
        y: Math.min(0, Math.max(dimensions.height * (1 - s), pos.y)),
      };
    },
    [dimensions],
  );

  // Get pointer position in content space (accounts for zoom/pan)
  const getContentPointerPosition = (stage: Konva.Stage): Point | null => {
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    return {
      x: (pos.x - stage.x()) / stage.scaleX(),
      y: (pos.y - stage.y()) / stage.scaleY(),
    };
  };

  // Load image & reset zoom
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const aspectRatio = img.height / img.width;
        const width = Math.min(containerWidth, 1200);
        const height = width * aspectRatio;
        setDimensions({ width, height });
      }
      setScale(1);
      setStagePos({ x: 0, y: 0 });
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

  // --- Zoom ---
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const oldScale = stage.scaleX();
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale =
      direction > 0
        ? Math.min(MAX_SCALE, oldScale * ZOOM_BY)
        : Math.max(MIN_SCALE, oldScale / ZOOM_BY);

    const newPos = constrainPosition(
      {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      },
      newScale,
    );
    setScale(newScale);
    setStagePos(newPos);
  };

  const zoomTo = useCallback(
    (newScale: number) => {
      const stage = stageRef.current;
      if (!stage) return;
      const center = { x: dimensions.width / 2, y: dimensions.height / 2 };
      const oldScale = stage.scaleX();
      const mousePointTo = {
        x: (center.x - stage.x()) / oldScale,
        y: (center.y - stage.y()) / oldScale,
      };
      const newPos = constrainPosition(
        {
          x: center.x - mousePointTo.x * newScale,
          y: center.y - mousePointTo.y * newScale,
        },
        newScale,
      );
      setScale(newScale);
      setStagePos(newPos);
    },
    [dimensions, constrainPosition],
  );

  const handleZoomIn = () => zoomTo(Math.min(MAX_SCALE, scale * ZOOM_BY));
  const handleZoomOut = () => zoomTo(Math.max(MIN_SCALE, scale / ZOOM_BY));
  const handleZoomReset = () => {
    setScale(1);
    setStagePos({ x: 0, y: 0 });
  };

  // --- Stage interaction (pan + draw) ---
  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Pan when zoomed + select mode + click on background
    if (scale > 1 && currentTool === 'select' && !enableMove) {
      const stage = e.target.getStage();
      const clickedOnBackground = e.target === stage || e.target.getClassName() === 'Image';
      if (clickedOnBackground && stage) {
        const pos = stage.getPointerPosition();
        if (pos) {
          setIsPanning(true);
          panStartRef.current = { x: pos.x - stage.x(), y: pos.y - stage.y() };
        }
        return;
      }
    }

    // Drawing
    if (readonly || currentTool === 'select') return;

    const stage = e.target.getStage();
    if (!stage) return;
    const pos = getContentPointerPosition(stage);
    if (!pos) return;

    const normalized = {
      x: pos.x / dimensions.width,
      y: pos.y / dimensions.height,
    };
    setIsDrawing(true);
    setDrawingStart(normalized);
    setTempPoints([normalized]);
  };

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Panning
    if (isPanning) {
      const stage = stageRef.current;
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;
      const newPos = constrainPosition(
        { x: pos.x - panStartRef.current.x, y: pos.y - panStartRef.current.y },
        scale,
      );
      stage.x(newPos.x);
      stage.y(newPos.y);
      stage.batchDraw();
      return;
    }

    // Drawing
    if (!isDrawing || readonly) return;

    const stage = e.target.getStage();
    if (!stage) return;
    const pos = getContentPointerPosition(stage);
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

  const handleStageMouseUp = () => {
    // End pan
    if (isPanning) {
      setIsPanning(false);
      const stage = stageRef.current;
      if (stage) {
        setStagePos({ x: stage.x(), y: stage.y() });
      }
      return;
    }

    // End drawing
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

  // --- Touch handlers (pinch-to-zoom + single-touch fallback) ---
  const handleTouchStart = (e: Konva.KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;
    if (touches.length >= 2) {
      e.evt.preventDefault();
      isPinchingRef.current = true;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      lastPinchDistRef.current = Math.sqrt(dx * dx + dy * dy);

      const stage = stageRef.current;
      if (stage) {
        const rect = stage.container().getBoundingClientRect();
        lastPinchCenterRef.current = {
          x: (touches[0].clientX + touches[1].clientX) / 2 - rect.left,
          y: (touches[0].clientY + touches[1].clientY) / 2 - rect.top,
        };
      }
      return;
    }
    // Single touch — forward to normal handler
    handleStageMouseDown(e as unknown as Konva.KonvaEventObject<MouseEvent | TouchEvent>);
  };

  const handleTouchMove = (e: Konva.KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;
    if (touches.length >= 2 && isPinchingRef.current) {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      const newDist = Math.sqrt(dx * dx + dy * dy);

      const rect = stage.container().getBoundingClientRect();
      const center = {
        x: (touches[0].clientX + touches[1].clientX) / 2 - rect.left,
        y: (touches[0].clientY + touches[1].clientY) / 2 - rect.top,
      };

      const scaleFactor = newDist / lastPinchDistRef.current;
      const oldScale = stage.scaleX();
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, oldScale * scaleFactor));

      const mousePointTo = {
        x: (center.x - stage.x()) / oldScale,
        y: (center.y - stage.y()) / oldScale,
      };
      const newPos = constrainPosition(
        {
          x: center.x - mousePointTo.x * newScale,
          y: center.y - mousePointTo.y * newScale,
        },
        newScale,
      );

      // Update Konva node directly for smooth performance
      stage.scaleX(newScale);
      stage.scaleY(newScale);
      stage.x(newPos.x);
      stage.y(newPos.y);
      stage.batchDraw();

      lastPinchDistRef.current = newDist;
      lastPinchCenterRef.current = center;
      return;
    }
    // Single touch — forward to normal handler
    handleStageMouseMove(e as unknown as Konva.KonvaEventObject<MouseEvent | TouchEvent>);
  };

  const handleTouchEnd = (e: Konva.KonvaEventObject<TouchEvent>) => {
    if (isPinchingRef.current) {
      if (e.evt.touches.length < 2) {
        isPinchingRef.current = false;
        const stage = stageRef.current;
        if (stage) {
          setScale(stage.scaleX());
          setStagePos({ x: stage.x(), y: stage.y() });
        }
      }
      return;
    }
    // Single touch — forward to normal handler
    handleStageMouseUp();
  };

  // Annotation drag - uses node.position() (local coords) for zoom compatibility
  const handleAnnotationDragEnd = (annotation: Annotation, e: Konva.KonvaEventObject<DragEvent>) => {
    if (readonly || !onAnnotationUpdate) return;

    const node = e.target;
    const { geometry } = annotation;
    let updatedGeometry: AnnotationGeometry | null = null;

    const nodeX = node.x();
    const nodeY = node.y();

    switch (geometry.type) {
      case 'circle': {
        const g = geometry as CircleGeometry;
        updatedGeometry = {
          ...g,
          center: {
            x: nodeX / dimensions.width,
            y: nodeY / dimensions.height,
          },
        };
        break;
      }
      case 'rect': {
        const g = geometry as RectGeometry;
        updatedGeometry = {
          ...g,
          x: nodeX / dimensions.width,
          y: nodeY / dimensions.height,
        };
        break;
      }
      case 'arrow': {
        const g = geometry as ArrowGeometry;
        const dragDeltaX = nodeX / dimensions.width;
        const dragDeltaY = nodeY / dimensions.height;
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
        node.position({ x: 0, y: 0 });
        break;
      }
      case 'freehand':
      case 'polygon': {
        const g = geometry as FreehandGeometry | PolygonGeometry;
        const dragDeltaX = nodeX / dimensions.width;
        const dragDeltaY = nodeY / dimensions.height;
        updatedGeometry = {
          ...g,
          points: g.points.map(p => ({
            x: p.x + dragDeltaX,
            y: p.y + dragDeltaY,
          })),
        };
        node.position({ x: 0, y: 0 });
        break;
      }
    }

    if (updatedGeometry) {
      onAnnotationUpdate(annotation.id, updatedGeometry);
    }
  };

  const getDefaultCursor = () => {
    if (scale > 1 && currentTool === 'select' && !enableMove) return 'grab';
    if (currentTool !== 'select') return 'crosshair';
    return 'default';
  };

  const renderAnnotation = (annotation: Annotation) => {
    const { geometry } = annotation;
    const isSelected = annotation.id === selectedAnnotationId;
    const strokeColor = isSelected ? '#3b82f6' : (annotation.color ?? '#ef4444');
    const strokeWidth = isSelected ? 3 : 2;
    const isDraggable = !readonly && enableMove;

    // Larger hit area for touch devices
    const hitStrokeWidth = Math.max(strokeWidth, 20);

    const handleSelect = () => onAnnotationSelect?.(annotation);

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
            hitStrokeWidth={hitStrokeWidth}
            draggable={isDraggable}
            onClick={handleSelect}
            onTap={handleSelect}
            onDragEnd={(e) => handleAnnotationDragEnd(annotation, e)}
            onMouseEnter={(e) => {
              if (isDraggable) {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'move';
              }
            }}
            onMouseLeave={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = getDefaultCursor();
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
            hitStrokeWidth={hitStrokeWidth}
            draggable={isDraggable}
            onClick={handleSelect}
            onTap={handleSelect}
            onDragEnd={(e) => handleAnnotationDragEnd(annotation, e)}
            onMouseEnter={(e) => {
              if (isDraggable) {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'move';
              }
            }}
            onMouseLeave={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = getDefaultCursor();
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
            hitStrokeWidth={hitStrokeWidth}
            draggable={isDraggable}
            onClick={handleSelect}
            onTap={handleSelect}
            onDragEnd={(e) => handleAnnotationDragEnd(annotation, e)}
            onMouseEnter={(e) => {
              if (isDraggable) {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'move';
              }
            }}
            onMouseLeave={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = getDefaultCursor();
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
            hitStrokeWidth={hitStrokeWidth}
            closed={geometry.type === 'polygon'}
            draggable={isDraggable}
            onClick={handleSelect}
            onTap={handleSelect}
            onDragEnd={(e) => handleAnnotationDragEnd(annotation, e)}
            onMouseEnter={(e) => {
              if (isDraggable) {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'move';
              }
            }}
            onMouseLeave={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = getDefaultCursor();
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

  const getCursor = () => {
    if (isPanning) return 'grabbing';
    return getDefaultCursor();
  };

  return (
    <div ref={containerRef} className="w-full relative">
      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-0.5 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-1 py-0.5 shadow-sm">
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={scale <= MIN_SCALE}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Zoom out"
        >
          <ZoomOut size={16} />
        </button>
        <span className="text-xs font-medium min-w-[40px] text-center select-none tabular-nums">
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          onClick={handleZoomIn}
          disabled={scale >= MAX_SCALE}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Zoom in"
        >
          <ZoomIn size={16} />
        </button>
        <div className="w-px h-4 bg-gray-300 mx-0.5" />
        <button
          type="button"
          onClick={handleZoomReset}
          disabled={scale === 1}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Reset zoom"
        >
          <Maximize2 size={16} />
        </button>
      </div>

      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        scaleX={scale}
        scaleY={scale}
        x={stagePos.x}
        y={stagePos.y}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="border border-gray-300 rounded-lg"
        style={{ cursor: getCursor() }}
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

import { useCallback, useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage } from "react-konva";
import type Konva from "konva";
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
} from "@/lib/annotation-types";
import { MIN_SCALE, MAX_SCALE, ZOOM_BY } from "./image-annotator/constants";
import { ZoomControls } from "./image-annotator/ZoomControls";
import { SelectedAnnotationBar } from "./image-annotator/SelectedAnnotationBar";
import {
  buildGeometryFromDrawing,
  renderAnnotationShape,
  renderTempShape,
} from "./image-annotator/renderShapes";

type ImageAnnotatorProps = {
  imageUrl: string;
  annotations: Annotation[];
  currentTool: DrawingTool;
  onAnnotationCreate?: (geometry: AnnotationGeometry) => void;
  onAnnotationSelect?: (annotation: Annotation | null) => void;
  onAnnotationUpdate?: (
    annotationId: number,
    geometry: AnnotationGeometry,
  ) => void;
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
    img.crossOrigin = "anonymous";
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
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedAnnotationId &&
        onAnnotationDelete
      ) {
        e.preventDefault();
        onAnnotationDelete(selectedAnnotationId);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
  const handleStageMouseDown = (
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    // Pan when zoomed + select mode + click on background
    if (scale > 1 && currentTool === "select" && !enableMove) {
      const stage = e.target.getStage();
      const clickedOnBackground =
        e.target === stage || e.target.getClassName() === "Image";
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
    if (readonly || currentTool === "select") return;

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

  const handleStageMouseMove = (
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
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

    if (currentTool === "freehand") {
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

    if (tempPoints.length < 2 && currentTool !== "circle") {
      setIsDrawing(false);
      setDrawingStart(null);
      setTempPoints([]);
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
    handleStageMouseDown(
      e as unknown as Konva.KonvaEventObject<MouseEvent | TouchEvent>,
    );
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
      const newScale = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, oldScale * scaleFactor),
      );

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
    handleStageMouseMove(
      e as unknown as Konva.KonvaEventObject<MouseEvent | TouchEvent>,
    );
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
  const handleAnnotationDragEnd = (
    annotation: Annotation,
    e: Konva.KonvaEventObject<DragEvent>,
  ) => {
    if (readonly || !onAnnotationUpdate) return;

    const node = e.target;
    const { geometry } = annotation;
    let updatedGeometry: AnnotationGeometry | null = null;

    const nodeX = node.x();
    const nodeY = node.y();

    switch (geometry.type) {
      case "circle": {
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
      case "rect": {
        const g = geometry as RectGeometry;
        updatedGeometry = {
          ...g,
          x: nodeX / dimensions.width,
          y: nodeY / dimensions.height,
        };
        break;
      }
      case "arrow": {
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
      case "freehand":
      case "polygon": {
        const g = geometry as FreehandGeometry | PolygonGeometry;
        const dragDeltaX = nodeX / dimensions.width;
        const dragDeltaY = nodeY / dimensions.height;
        updatedGeometry = {
          ...g,
          points: g.points.map((p) => ({
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
    if (scale > 1 && currentTool === "select" && !enableMove) return "grab";
    if (currentTool !== "select") return "crosshair";
    return "default";
  };

  const getCursor = () => {
    if (isPanning) return "grabbing";
    return getDefaultCursor();
  };

  return (
    <div ref={containerRef} className="w-full relative">
      <ZoomControls
        scale={scale}
        minScale={MIN_SCALE}
        maxScale={MAX_SCALE}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
      />

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
          {image && (
            <KonvaImage
              image={image}
              width={dimensions.width}
              height={dimensions.height}
            />
          )}
          {annotations.map((annotation) =>
            renderAnnotationShape({
              annotation,
              dimensions,
              selectedAnnotationId,
              readonly,
              enableMove,
              onSelect: onAnnotationSelect,
              onDragEnd: handleAnnotationDragEnd,
              getDefaultCursor,
            }),
          )}
          {renderTempShape({
            isDrawing,
            drawingStart,
            tempPoints,
            currentTool,
            dimensions,
          })}
        </Layer>
      </Stage>
      <SelectedAnnotationBar
        selectedAnnotationId={selectedAnnotationId}
        readonly={readonly}
        enableMove={enableMove}
        annotations={annotations}
        onDelete={onAnnotationDelete}
      />
    </div>
  );
}

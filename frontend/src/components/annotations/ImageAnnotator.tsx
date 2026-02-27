import { useRef } from "react";
import { Stage, Layer, Image as KonvaImage } from "react-konva";
import type Konva from "konva";
import type {
  Annotation,
  AnnotationGeometry,
  DrawingTool,
  Point,
} from "@/lib/annotation-types";
import { ZoomControls } from "./image-annotator/ZoomControls";
import { SelectedAnnotationBar } from "./image-annotator/SelectedAnnotationBar";
import {
  renderAnnotationShape,
  renderTempShape,
} from "./image-annotator/renderShapes";
import { useImageLoader } from "./image-annotator/hooks/useImageLoader";
import { useZoomPan } from "./image-annotator/hooks/useZoomPan";
import { usePinchZoom } from "./image-annotator/hooks/usePinchZoom";
import { useDrawing } from "./image-annotator/hooks/useDrawing";
import { useKeyboardShortcuts } from "./image-annotator/hooks/useKeyboardShortcuts";
import { handleAnnotationDrag } from "./image-annotator/annotationDrag";
import { getCursor, getDefaultCursor } from "./image-annotator/cursorUtils";
import { MIN_SCALE, MAX_SCALE } from "./image-annotator/constants";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  // Image loading
  const { image, dimensions } = useImageLoader({
    imageUrl,
    containerRef,
    onLoad: () => {
      // Reset zoom when new image loads
      setScale(1);
      setStagePos({ x: 0, y: 0 });
    },
  });

  // Zoom & pan
  const {
    scale,
    stagePos,
    isPanning,
    setScale,
    setStagePos,
    constrainPosition,
    handleWheel,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    startPanning,
    updatePanning,
    endPanning,
  } = useZoomPan({ dimensions });

  // Pinch-to-zoom
  const { isPinchingRef, handlePinchStart, handlePinchMove, handlePinchEnd } =
    usePinchZoom({
      constrainPosition,
      setScale,
      setStagePos,
    });

  // Drawing
  const {
    isDrawing,
    drawingStart,
    tempPoints,
    startDrawing,
    updateDrawing,
    finishDrawing,
  } = useDrawing({
    dimensions,
    readonly,
    currentTool,
    onAnnotationCreate,
  });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    selectedAnnotationId,
    onAnnotationDelete,
  });

  // Get pointer position in content space (accounts for zoom/pan)
  const getContentPointerPosition = (stage: Konva.Stage): Point | null => {
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    return {
      x: (pos.x - stage.x()) / stage.scaleX(),
      y: (pos.y - stage.y()) / stage.scaleY(),
    };
  };

  // --- Stage interaction handlers ---
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
          startPanning(stage, pos);
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

    startDrawing(pos);
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
      updatePanning(stage, pos);
      return;
    }

    // Drawing
    if (!isDrawing || readonly) return;

    const stage = e.target.getStage();
    if (!stage) return;
    const pos = getContentPointerPosition(stage);
    if (!pos) return;

    updateDrawing(pos);
  };

  const handleStageMouseUp = () => {
    // End pan
    if (isPanning) {
      const stage = stageRef.current;
      if (stage) {
        endPanning(stage);
      }
      return;
    }

    // End drawing
    finishDrawing();
  };

  // --- Touch handlers (pinch-to-zoom + single-touch fallback) ---
  const handleTouchStart = (e: Konva.KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;
    if (touches.length >= 2) {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (stage) {
        handlePinchStart(stage, touches);
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
      if (stage) {
        handlePinchMove(stage, touches);
      }
      return;
    }
    // Single touch — forward to normal handler
    handleStageMouseMove(
      e as unknown as Konva.KonvaEventObject<MouseEvent | TouchEvent>,
    );
  };

  const handleTouchEnd = (e: Konva.KonvaEventObject<TouchEvent>) => {
    if (isPinchingRef.current) {
      const stage = stageRef.current;
      if (stage) {
        handlePinchEnd(stage, e.evt.touches);
      }
      return;
    }
    // Single touch — forward to normal handler
    handleStageMouseUp();
  };

  // Annotation drag handler
  const handleAnnotationDragEnd = (
    annotation: Annotation,
    e: Konva.KonvaEventObject<DragEvent>,
  ) => {
    if (readonly || !onAnnotationUpdate) return;

    const node = e.target;
    const updatedGeometry = handleAnnotationDrag(annotation, node, dimensions);

    if (updatedGeometry) {
      onAnnotationUpdate(annotation.id, updatedGeometry);
    }
  };

  return (
    <div ref={containerRef} className="w-full relative">
      <ZoomControls
        scale={scale}
        minScale={MIN_SCALE}
        maxScale={MAX_SCALE}
        onZoomIn={() => handleZoomIn(stageRef)}
        onZoomOut={() => handleZoomOut(stageRef)}
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
        style={{
          cursor: getCursor(isPanning, currentTool, scale, enableMove),
        }}
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
              getDefaultCursor: () =>
                getDefaultCursor(currentTool, scale, enableMove),
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

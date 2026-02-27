import { useCallback, useRef, useState } from "react";
import type Konva from "konva";
import { MIN_SCALE, MAX_SCALE, ZOOM_BY } from "../constants";

type UseZoomPanParams = {
  dimensions: { width: number; height: number };
};

type UseZoomPanReturn = {
  scale: number;
  stagePos: { x: number; y: number };
  isPanning: boolean;
  setScale: (scale: number) => void;
  setStagePos: (pos: { x: number; y: number }) => void;
  setIsPanning: (isPanning: boolean) => void;
  panStartRef: React.MutableRefObject<{ x: number; y: number }>;
  constrainPosition: (
    pos: { x: number; y: number },
    s: number,
  ) => { x: number; y: number };
  handleWheel: (e: Konva.KonvaEventObject<WheelEvent>) => void;
  zoomTo: (newScale: number, stageRef: React.RefObject<Konva.Stage>) => void;
  handleZoomIn: (stageRef: React.RefObject<Konva.Stage>) => void;
  handleZoomOut: (stageRef: React.RefObject<Konva.Stage>) => void;
  handleZoomReset: () => void;
  startPanning: (stage: Konva.Stage, pos: { x: number; y: number }) => void;
  updatePanning: (stage: Konva.Stage, pos: { x: number; y: number }) => void;
  endPanning: (stage: Konva.Stage) => void;
};

/**
 * Hook to manage zoom and pan state for the image annotator.
 */
export function useZoomPan({
  dimensions,
}: UseZoomPanParams): UseZoomPanReturn {
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

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

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = e.target.getStage();
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
    },
    [constrainPosition],
  );

  const zoomTo = useCallback(
    (newScale: number, stageRef: React.RefObject<Konva.Stage>) => {
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

  const handleZoomIn = useCallback(
    (stageRef: React.RefObject<Konva.Stage>) => {
      zoomTo(Math.min(MAX_SCALE, scale * ZOOM_BY), stageRef);
    },
    [scale, zoomTo],
  );

  const handleZoomOut = useCallback(
    (stageRef: React.RefObject<Konva.Stage>) => {
      zoomTo(Math.max(MIN_SCALE, scale / ZOOM_BY), stageRef);
    },
    [scale, zoomTo],
  );

  const handleZoomReset = useCallback(() => {
    setScale(1);
    setStagePos({ x: 0, y: 0 });
  }, []);

  const startPanning = useCallback(
    (stage: Konva.Stage, pos: { x: number; y: number }) => {
      setIsPanning(true);
      panStartRef.current = { x: pos.x - stage.x(), y: pos.y - stage.y() };
    },
    [],
  );

  const updatePanning = useCallback(
    (stage: Konva.Stage, pos: { x: number; y: number }) => {
      const newPos = constrainPosition(
        { x: pos.x - panStartRef.current.x, y: pos.y - panStartRef.current.y },
        scale,
      );
      stage.x(newPos.x);
      stage.y(newPos.y);
      stage.batchDraw();
    },
    [scale, constrainPosition],
  );

  const endPanning = useCallback((stage: Konva.Stage) => {
    setIsPanning(false);
    setStagePos({ x: stage.x(), y: stage.y() });
  }, []);

  return {
    scale,
    stagePos,
    isPanning,
    setScale,
    setStagePos,
    setIsPanning,
    panStartRef,
    constrainPosition,
    handleWheel,
    zoomTo,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    startPanning,
    updatePanning,
    endPanning,
  };
}

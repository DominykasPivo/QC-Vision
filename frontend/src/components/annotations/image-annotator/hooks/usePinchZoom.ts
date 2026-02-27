import { useRef } from "react";
import type Konva from "konva";
import { MIN_SCALE, MAX_SCALE } from "../constants";

type UsePinchZoomParams = {
  constrainPosition: (
    pos: { x: number; y: number },
    s: number,
  ) => { x: number; y: number };
  setScale: (scale: number) => void;
  setStagePos: (pos: { x: number; y: number }) => void;
};

type UsePinchZoomReturn = {
  isPinchingRef: React.MutableRefObject<boolean>;
  handlePinchStart: (stage: Konva.Stage, touches: TouchList) => void;
  handlePinchMove: (stage: Konva.Stage, touches: TouchList) => void;
  handlePinchEnd: (stage: Konva.Stage, touches: TouchList) => void;
};

/**
 * Hook to manage pinch-to-zoom functionality for touch devices.
 */
export function usePinchZoom({
  constrainPosition,
  setScale,
  setStagePos,
}: UsePinchZoomParams): UsePinchZoomReturn {
  const isPinchingRef = useRef(false);
  const lastPinchDistRef = useRef(0);
  const lastPinchCenterRef = useRef({ x: 0, y: 0 });

  const handlePinchStart = (stage: Konva.Stage, touches: TouchList) => {
    if (touches.length < 2) return;

    isPinchingRef.current = true;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    lastPinchDistRef.current = Math.sqrt(dx * dx + dy * dy);

    const rect = stage.container().getBoundingClientRect();
    lastPinchCenterRef.current = {
      x: (touches[0].clientX + touches[1].clientX) / 2 - rect.left,
      y: (touches[0].clientY + touches[1].clientY) / 2 - rect.top,
    };
  };

  const handlePinchMove = (stage: Konva.Stage, touches: TouchList) => {
    if (touches.length < 2 || !isPinchingRef.current) return;

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
  };

  const handlePinchEnd = (stage: Konva.Stage, touches: TouchList) => {
    if (!isPinchingRef.current) return;

    if (touches.length < 2) {
      isPinchingRef.current = false;
      setScale(stage.scaleX());
      setStagePos({ x: stage.x(), y: stage.y() });
    }
  };

  return {
    isPinchingRef,
    handlePinchStart,
    handlePinchMove,
    handlePinchEnd,
  };
}

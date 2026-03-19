import { useState, useEffect, useRef } from "react";
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Rect,
  Transformer,
} from "react-konva";
import type Konva from "konva";
import { X, Check } from "lucide-react";
import type { CropArea } from "@/lib/utils/image-crop";

interface CropModalProps {
  show: boolean;
  imageUrl: string;
  onClose: () => void;
  onApply: (cropArea: CropArea) => void;
}

export function CropModal({
  show,
  imageUrl,
  onClose,
  onApply,
}: CropModalProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({
    width: 800,
    height: 600,
  });
  const [scale, setScale] = useState(1);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const rectRef = useRef<Konva.Rect>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load image
  useEffect(() => {
    if (!show || !imageUrl) return;

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);

      // Calculate initial size to fit container
      const containerWidth = containerRef.current?.clientWidth || 800;
      const containerHeight = containerRef.current?.clientHeight || 600;

      const imageAspect = img.width / img.height;
      const containerAspect = containerWidth / containerHeight;

      let displayWidth: number;
      let displayHeight: number;

      if (imageAspect > containerAspect) {
        displayWidth = containerWidth * 0.9;
        displayHeight = displayWidth / imageAspect;
      } else {
        displayHeight = containerHeight * 0.9;
        displayWidth = displayHeight * imageAspect;
      }

      setImageSize({ width: displayWidth, height: displayHeight });
      setScale(displayWidth / img.width);

      // Initialize crop to center 80% of image
      const cropSize = Math.min(displayWidth, displayHeight) * 0.8;
      setCropRect({
        x: (displayWidth - cropSize) / 2,
        y: (displayHeight - cropSize) / 2,
        width: cropSize,
        height: cropSize,
      });
    };
    img.src = imageUrl;
  }, [show, imageUrl]);

  // Attach transformer to rectangle
  useEffect(() => {
    if (rectRef.current && trRef.current) {
      trRef.current.nodes([rectRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [cropRect]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleApply = () => {
    if (!image) return;

    // Convert display coordinates back to original image coordinates
    const originalCropArea: CropArea = {
      x: Math.round(cropRect.x / scale),
      y: Math.round(cropRect.y / scale),
      width: Math.round(cropRect.width / scale),
      height: Math.round(cropRect.height / scale),
    };

    // Ensure crop area is within bounds
    const validCrop: CropArea = {
      x: Math.max(0, Math.min(originalCropArea.x, image.width - 10)),
      y: Math.max(0, Math.min(originalCropArea.y, image.height - 10)),
      width: Math.max(
        10,
        Math.min(originalCropArea.width, image.width - originalCropArea.x),
      ),
      height: Math.max(
        10,
        Math.min(originalCropArea.height, image.height - originalCropArea.y),
      ),
    };

    onApply(validCrop);
  };

  const handleTransformEnd = () => {
    const node = rectRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale and apply to width/height
    node.scaleX(1);
    node.scaleY(1);

    const imageX = (containerSize.width * 0.9 - imageSize.width) / 2;
    const imageY = (containerSize.height * 0.8 - imageSize.height) / 2;

    setCropRect({
      x: node.x() - imageX,
      y: node.y() - imageY,
      width: Math.max(20, node.width() * scaleX),
      height: Math.max(20, node.height() * scaleY),
    });
  };

  const handleDragEnd = () => {
    const node = rectRef.current;
    if (!node) return;

    const imageX = (containerSize.width * 0.9 - imageSize.width) / 2;
    const imageY = (containerSize.height * 0.8 - imageSize.height) / 2;

    setCropRect({
      x: node.x() - imageX,
      y: node.y() - imageY,
      width: node.width(),
      height: node.height(),
    });
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div
        className="relative flex h-[90vh] w-[90vw] max-w-6xl flex-col rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        ref={containerRef}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4">
          <h3 className="text-lg font-semibold text-gray-900">Crop Image</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Crop Area */}
        <div className="flex-1 overflow-hidden bg-gray-900 p-2 sm:p-6">
          {image && (
            <div className="flex h-full items-center justify-center">
              <Stage
                width={containerSize.width * 0.9}
                height={containerSize.height * 0.8}
              >
                <Layer>
                  {/* Main Image */}
                  <KonvaImage
                    image={image}
                    width={imageSize.width}
                    height={imageSize.height}
                    x={(containerSize.width * 0.9 - imageSize.width) / 2}
                    y={(containerSize.height * 0.8 - imageSize.height) / 2}
                  />

                  {/* Semi-transparent overlay (outside crop area) */}
                  <Rect
                    x={(containerSize.width * 0.9 - imageSize.width) / 2}
                    y={(containerSize.height * 0.8 - imageSize.height) / 2}
                    width={imageSize.width}
                    height={imageSize.height}
                    fill="rgba(0, 0, 0, 0.5)"
                    listening={false}
                  />

                  {/* Crop Rectangle (cuts out from overlay) */}
                  <Rect
                    ref={rectRef}
                    x={
                      cropRect.x +
                      (containerSize.width * 0.9 - imageSize.width) / 2
                    }
                    y={
                      cropRect.y +
                      (containerSize.height * 0.8 - imageSize.height) / 2
                    }
                    width={cropRect.width}
                    height={cropRect.height}
                    fill="rgba(255, 255, 255, 0.1)"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    draggable
                    onDragEnd={handleDragEnd}
                    onTransformEnd={handleTransformEnd}
                    globalCompositeOperation="destination-out"
                    dragBoundFunc={(pos) => {
                      const imageX =
                        (containerSize.width * 0.9 - imageSize.width) / 2;
                      const imageY =
                        (containerSize.height * 0.8 - imageSize.height) / 2;
                      return {
                        x: Math.max(
                          imageX,
                          Math.min(
                            pos.x,
                            imageX + imageSize.width - cropRect.width,
                          ),
                        ),
                        y: Math.max(
                          imageY,
                          Math.min(
                            pos.y,
                            imageY + imageSize.height - cropRect.height,
                          ),
                        ),
                      };
                    }}
                  />

                  {/* Crop Border (visible border) */}
                  <Rect
                    x={
                      cropRect.x +
                      (containerSize.width * 0.9 - imageSize.width) / 2
                    }
                    y={
                      cropRect.y +
                      (containerSize.height * 0.8 - imageSize.height) / 2
                    }
                    width={cropRect.width}
                    height={cropRect.height}
                    stroke="#3b82f6"
                    strokeWidth={3}
                    listening={false}
                  />

                  {/* Transformer for resize */}
                  <Transformer
                    ref={trRef}
                    borderStroke="#3b82f6"
                    borderStrokeWidth={2}
                    anchorStroke="#3b82f6"
                    anchorFill="#ffffff"
                    anchorSize={16}
                    anchorCornerRadius={8}
                    boundBoxFunc={(oldBox, newBox) => {
                      // Limit resize
                      if (newBox.width < 20 || newBox.height < 20) {
                        return oldBox;
                      }
                      // Keep within image bounds
                      const imageX =
                        (containerSize.width * 0.9 - imageSize.width) / 2;
                      const imageY =
                        (containerSize.height * 0.8 - imageSize.height) / 2;
                      const maxWidth = imageX + imageSize.width - newBox.x;
                      const maxHeight = imageY + imageSize.height - newBox.y;
                      return {
                        ...newBox,
                        width: Math.min(newBox.width, maxWidth),
                        height: Math.min(newBox.height, maxHeight),
                      };
                    }}
                  />
                </Layer>
              </Stage>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-center text-sm text-gray-600 sm:text-left">
            Drag to move • Resize handles to adjust crop area
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto"
            >
              <Check className="h-4 w-4" />
              Apply Crop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

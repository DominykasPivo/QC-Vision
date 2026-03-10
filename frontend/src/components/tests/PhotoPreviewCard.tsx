import { RotateCw } from "lucide-react";

interface PhotoPreviewCardProps {
  imageUrl?: string;
  alt: string;
  onRemove: () => void;
  removeAriaLabel: string;
  removeDisabled?: boolean;
  cardClassName: string;
  imageWrapClassName: string;
  footerClassName: string;
  removeButtonClassName: string;
  loadingText?: string;
  rotation?: number;
  onRotate?: () => void;
  showRotateButton?: boolean;
}

export function PhotoPreviewCard({
  imageUrl,
  alt,
  onRemove,
  removeAriaLabel,
  removeDisabled = false,
  cardClassName,
  imageWrapClassName,
  footerClassName,
  removeButtonClassName,
  loadingText = "Loading...",
  rotation = 0,
  onRotate,
  showRotateButton = false,
}: PhotoPreviewCardProps) {
  return (
    <div className={cardClassName}>
      <div className={`${imageWrapClassName} relative`}>
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={alt}
              className="h-full w-full object-cover transition-transform duration-200"
              style={{
                transform: rotation ? `rotate(${rotation}deg)` : undefined,
              }}
            />
            {showRotateButton && onRotate && (
              <button
                type="button"
                className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-slate-700 shadow-md backdrop-blur-sm transition-all hover:bg-white hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                onClick={onRotate}
                aria-label="Rotate photo 90 degrees"
                title="Rotate"
              >
                <RotateCw className="h-4 w-4" />
              </button>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-gray-500">
            {loadingText}
          </div>
        )}
      </div>
      <div className={footerClassName}>
        <button
          type="button"
          className={removeButtonClassName}
          onClick={onRemove}
          aria-label={removeAriaLabel}
          disabled={removeDisabled}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

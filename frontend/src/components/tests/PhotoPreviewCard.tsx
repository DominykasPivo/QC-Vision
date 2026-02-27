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
}: PhotoPreviewCardProps) {
  return (
    <div className={cardClassName}>
      <div className={imageWrapClassName}>
        {imageUrl ? (
          <img src={imageUrl} alt={alt} className="h-full w-full object-cover" />
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

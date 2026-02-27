import { Button } from "@/components/ui/button";

interface BasePhotoSourceModalProps {
  show: boolean;
  onClose: () => void;
  onCameraClick: () => void;
  onGalleryClick: () => void;
  overlayClassName: string;
  panelClassName: string;
  titleClassName: string;
  descriptionClassName: string;
  actionsClassName: string;
  primaryButtonClassName: string;
  secondaryButtonClassName: string;
  cancelButtonClassName: string;
  headingTag: "h3" | "h4";
  title: string;
  description: string;
  cameraLabel: string;
  galleryLabel: string;
  cancelLabel?: string;
}

export function BasePhotoSourceModal({
  show,
  onClose,
  onCameraClick,
  onGalleryClick,
  overlayClassName,
  panelClassName,
  titleClassName,
  descriptionClassName,
  actionsClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  cancelButtonClassName,
  headingTag,
  title,
  description,
  cameraLabel,
  galleryLabel,
  cancelLabel = "Cancel",
}: BasePhotoSourceModalProps) {
  if (!show) {
    return null;
  }

  const Heading = headingTag;

  return (
    <div className={overlayClassName} onClick={onClose}>
      <div className={panelClassName} onClick={(e) => e.stopPropagation()}>
        <Heading className={titleClassName}>{title}</Heading>
        <p className={descriptionClassName}>{description}</p>
        <div className={actionsClassName}>
          <Button
            type="button"
            className={primaryButtonClassName}
            onClick={onCameraClick}
          >
            {cameraLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={secondaryButtonClassName}
            onClick={onGalleryClick}
          >
            {galleryLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={cancelButtonClassName}
            onClick={onClose}
          >
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

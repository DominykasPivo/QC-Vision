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

type SharedPhotoSourceModalProps = Pick<
  BasePhotoSourceModalProps,
  | "panelClassName"
  | "titleClassName"
  | "descriptionClassName"
  | "actionsClassName"
  | "primaryButtonClassName"
  | "secondaryButtonClassName"
  | "cancelButtonClassName"
  | "title"
  | "description"
  | "cameraLabel"
  | "galleryLabel"
>;

export const SHARED_PHOTO_SOURCE_MODAL_PROPS = {
  panelClassName:
    "w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.3)]",
  titleClassName: "text-xl font-bold text-slate-900",
  descriptionClassName: "mt-1 text-sm text-slate-500",
  actionsClassName: "mt-4 flex flex-col gap-2.5",
  primaryButtonClassName:
    "h-11 rounded-xl bg-[#2563eb] font-semibold text-white hover:bg-[#1d4ed8]",
  secondaryButtonClassName:
    "h-11 rounded-xl border-slate-300 font-semibold text-slate-700 hover:bg-slate-100",
  cancelButtonClassName:
    "h-11 rounded-xl border-slate-300 font-semibold text-slate-600 hover:bg-slate-100",
  title: "Add Photos",
  description: "Choose how to add photos:",
  cameraLabel: "Take Photo",
  galleryLabel: "Choose from Gallery",
} satisfies SharedPhotoSourceModalProps;

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

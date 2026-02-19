import logging
from datetime import datetime, timezone
from io import BytesIO
from typing import BinaryIO, List, Optional, Tuple
from uuid import uuid4

from PIL import Image
from sqlalchemy import case, distinct, func, literal
from sqlalchemy.orm import Session

from app.modules.defects.models import Defect, DefectAnnotation
from app.modules.tests.models import Tests

from .models import Photo
from .storage import PhotoStorage

logger = logging.getLogger("backend_photos_service")


class PhotoService:
    """
    Service layer for photo operations.

    Handles photo upload, validation, processing, and storage management.
    Validates file size, format, and integrity before storing in MinIO.
    """

    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
    THUMBNAIL_SIZE = (300, 300)

    def __init__(self):
        self.storage = PhotoStorage()

    async def validate_photo(self, file, filename) -> tuple:
        """Validate photo file (size, format, integrity)."""
        try:
            # 1. Check file size BEFORE opening
            file.seek(0, 2)  # Seek to end
            file_size = file.tell()
            file.seek(0)  # Reset

            if file_size > self.MAX_FILE_SIZE:
                raise ValueError(
                    f"File too large: {file_size} bytes (max {self.MAX_FILE_SIZE})"
                )

            if file_size == 0:
                raise ValueError("File is empty")

            try:
                img = Image.open(file)
            except Exception as e:
                raise ValueError(f"Invalid image file: {str(e)}")
            try:
                img.verify()
            except Exception as e:
                raise ValueError(f"Corrupted image file: {str(e)}")

            # Reset file pointer and reopen (verify() closes the image)
            file.seek(0)
            img = Image.open(file)

            if img.format not in PhotoService.ALLOWED_FORMATS:
                raise ValueError(
                    f"Unsupported format: {img.format}. Allowed: {', '.join(PhotoService.ALLOWED_FORMATS)}"
                )

            width, height = img.size

            if width < 10 or height < 10:
                raise ValueError(f"Image too small: {width}x{height} (minimum 10x10)")
            max_dimension = 10000
            if width > max_dimension or height > max_dimension:
                raise logging.error(
                    f"Image too large: {width}x{height} (maximum {max_dimension}x{max_dimension})"
                )

            logger.info(
                f"Validated photo: {filename} ({img.format}, {width}x{height}, {file_size} bytes)"
            )

            return img

        except ValueError:
            # Re-raise validation errors
            raise
        except Exception as e:
            logger.error(f"Photo validation failed: {str(e)}")
            raise ValueError(f"Validation error: {str(e)}")

    async def process_image(
        self, image: Image.Image, max_dimension: int = 2000
    ) -> Image.Image:
        """Process image: resize if too large, convert to RGB."""
        width, height = image.size

        # Resize if too large
        if width > max_dimension or height > max_dimension:
            ratio = min(max_dimension / width, max_dimension / height)
            new_size = (int(width * ratio), int(height * ratio))
            image = image.resize(new_size, Image.Resampling.LANCZOS)

        # Convert to RGB for JPEG compatibility
        if image.mode in ("RGBA", "LA", "P"):
            background = Image.new("RGB", image.size, (255, 255, 255))
            if image.mode == "P":
                image = image.convert("RGBA")
            if "A" in image.mode:
                background.paste(image, mask=image.split()[-1])
            else:
                background.paste(image)
            image = background

        return image

    def image_to_bytes(
        self, image: Image.Image, format: str = "JPEG", quality: int = 85
    ) -> bytes:
        """Convert PIL Image to bytes."""
        buffer = BytesIO()
        image.save(buffer, format=format, quality=quality)
        buffer.seek(0)
        return buffer.read()

    async def upload_photo(
        self, db: Session, file: BinaryIO, filename: str, test_id: int
    ):
        """
        Upload and process a photo for a quality test.

        Validates the photo, processes it (resize, format conversion),
        uploads to MinIO storage, and saves metadata to database.
        """
        img = await self.validate_photo(file, filename)

        processed = await self.process_image(img)

        photo_id = str(uuid4())
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d")
        photo_path = f"photos/{timestamp}/{photo_id}.jpg"

        photo_bytes = self.image_to_bytes(processed, quality=85)

        await self.storage.upload_photo(photo_bytes, photo_path, "image/jpeg")

        photo = Photo(
            test_id=test_id,
            file_path=photo_path,
            time_stamp=datetime.now(timezone.utc),
            analysis_results=None,
        )
        db.add(photo)
        db.commit()
        db.refresh(photo)

        return photo

    def get_gallery_photos(
        self,
        db: Session,
        page: int = 1,
        page_size: int = 20,
        severity: Optional[str] = None,
        category_id: Optional[int] = None,
        test_type: Optional[str] = None,
        test_status: Optional[str] = None,
        has_defects: Optional[bool] = None,
    ) -> Tuple[List[dict], int]:
        """Get photos with aggregated defect data for the gallery view."""
        severity_order = case(
            (Defect.severity == "critical", 4),
            (Defect.severity == "high", 3),
            (Defect.severity == "medium", 2),
            (Defect.severity == "low", 1),
            else_=0,
        )

        highest_severity_expr = case(
            (func.max(severity_order) == 4, literal("critical")),
            (func.max(severity_order) == 3, literal("high")),
            (func.max(severity_order) == 2, literal("medium")),
            (func.max(severity_order) == 1, literal("low")),
            else_=None,
        )

        query = (
            db.query(
                Photo.id,
                Photo.test_id,
                Photo.file_path,
                Photo.time_stamp,
                Tests.test_type.label("test_type"),
                Tests.status.label("test_status"),
                func.count(distinct(Defect.id)).label("defect_count"),
                highest_severity_expr.label("highest_severity"),
                func.array_agg(distinct(DefectAnnotation.category_id)).label(
                    "category_ids"
                ),
            )
            .join(Tests, Photo.test_id == Tests.id)
            .outerjoin(Defect, Defect.photo_id == Photo.id)
            .outerjoin(DefectAnnotation, DefectAnnotation.defect_id == Defect.id)
        )

        if test_type:
            query = query.filter(Tests.test_type == test_type)
        if test_status:
            query = query.filter(Tests.status == test_status)

        query = query.group_by(
            Photo.id,
            Photo.test_id,
            Photo.file_path,
            Photo.time_stamp,
            Tests.test_type,
            Tests.status,
        )

        if severity:
            sev_map = {"low": 1, "medium": 2, "high": 3, "critical": 4}
            sev_val = sev_map.get(severity, 0)
            query = query.having(func.max(severity_order) == sev_val)
        if has_defects is True:
            query = query.having(func.count(distinct(Defect.id)) > 0)
        elif has_defects is False:
            query = query.having(func.count(distinct(Defect.id)) == 0)
        if category_id is not None:
            query = query.having(
                func.bool_or(DefectAnnotation.category_id == category_id)
            )

        count_subquery = query.subquery()
        total = db.query(func.count()).select_from(count_subquery).scalar() or 0

        offset = (page - 1) * page_size
        results = (
            query.order_by(Photo.time_stamp.desc()).offset(offset).limit(page_size).all()
        )

        items = []
        for row in results:
            cat_ids = row.category_ids or []
            cat_ids = [c for c in cat_ids if c is not None]
            items.append(
                {
                    "id": row.id,
                    "test_id": row.test_id,
                    "file_path": row.file_path,
                    "time_stamp": row.time_stamp,
                    "test_type": row.test_type,
                    "test_status": row.test_status,
                    "defect_count": row.defect_count,
                    "highest_severity": row.highest_severity,
                    "category_ids": cat_ids,
                }
            )

        return items, total


photo_service = PhotoService()

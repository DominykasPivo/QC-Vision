import logging
from typing import BinaryIO
from uuid import uuid4
from datetime import datetime, timezone


from sqlalchemy.orm import Session
from .models import Photo
from PIL import Image
from .storage import PhotoStorage

logger = logging.getLogger("backend_photos_service")


class PhotoService:
    """
    Service layer for photo operations.
    
    Handles photo upload, validation, processing, and storage management.
    Validates file size, format, and integrity before storing in MinIO.
    """
    
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    ALLOWED_FORMATS = {'JPEG', 'PNG', 'WEBP'}
    THUMBNAIL_SIZE = (300, 300)
    
    def __init__(self):
        self.storage = PhotoStorage()
    
    async def validate_photo(self, file, filename) -> tuple:
        """
        Validate photo file (size, format, integrity).
        
        Args:
            file: File object to validate
            filename: Original filename
            
        Returns:
            tuple: (image, format, width, height, file_size)
            
        Raises:
            ValueError: If validation fails
        """
        try:
            # 1. Check file size BEFORE opening
            file.seek(0, 2)  # Seek to end
            file_size = file.tell()
            file.seek(0)  # Reset
            
            if file_size > self.MAX_FILE_SIZE:
                raise ValueError(f"File too large: {file_size} bytes (max {self.MAX_FILE_SIZE})")
            
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
        
            # 5. Check format
            if img.format not in PhotoService.ALLOWED_FORMATS:
                raise ValueError(f"Unsupported format: {img.format}. Allowed: {', '.join(PhotoService.ALLOWED_FORMATS)}")
            
            # 6. Get dimensions
            width, height = img.size
        
            if width < 10 or height < 10:
                raise ValueError(f"Image too small: {width}x{height} (minimum 10x10)")
            max_dimension = 10000
            if width > max_dimension or height > max_dimension:
                raise logging.error(f"Image too large: {width}x{height} (maximum {max_dimension}x{max_dimension})")
            
            logger.info(f"Validated photo: {filename} ({img.format}, {width}x{height}, {file_size} bytes)")
            
            return img, img.format, width, height, file_size
        
        except ValueError:
            # Re-raise validation errors
            raise
        except Exception as e:
            logger.error(f"Photo validation failed: {str(e)}")
            raise ValueError(f"Validation error: {str(e)}")
        
    async def process_image(self, image: Image.Image, max_dimension: int = 2000) -> Image.Image:
        """
        Process image: resize if too large, convert to RGB.
        
        Args:
            image: PIL Image to process
            max_dimension: Maximum width/height (default 2000px)
            
        Returns:
            Processed PIL Image in RGB format
        """
        width, height = image.size
        
        # Resize if too large
        if width > max_dimension or height > max_dimension:
            ratio = min(max_dimension / width, max_dimension / height)
            new_size = (int(width * ratio), int(height * ratio))
            image = image.resize(new_size, Image.Resampling.LANCZOS)
        
        # Convert to RGB for JPEG compatibility
        if image.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            if 'A' in image.mode:
                background.paste(image, mask=image.split()[-1])
            else:
                background.paste(image)
            image = background
        
        return image
    
    def image_to_bytes(self, image: Image.Image, format: str = 'JPEG', quality: int = 85) -> bytes:
        """
        Convert PIL Image to bytes.
        
        Args:
            image: PIL Image to convert
            format: Output format (JPEG, PNG, WEBP)
            quality: JPEG quality (1-100)
            
        Returns:
            Image data as bytes
        """
        from io import BytesIO
        buffer = BytesIO()
        image.save(buffer, format=format, quality=quality)
        buffer.seek(0)
        return buffer.read()

    async def upload_photo(self, db: Session, file: BinaryIO, filename: str, test_id: int):
        """
        Upload and process a photo for a quality test.
        
        Validates the photo, processes it (resize, format conversion),
        uploads to MinIO storage, and saves metadata to database.
        
        Args:
            db: Database session
            file: File object to upload
            filename: Original filename
            test_id: Test ID to associate with photo
            
        Returns:
            Photo: Database photo record
            
        Raises:
            ValueError: If validation fails
        """
        # 1. Validate
        img, img_format, width, height, file_size = await self.validate_photo(file, filename)
        
        # 2. Process
        processed = await self.process_image(img)
        #thumbnail = await self.process_image(processed)
        
        # 3. Generate paths
        photo_id = str(uuid4())
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d")
        photo_path = f"photos/{timestamp}/{photo_id}.jpg"
        #thumb_path = f"thumbnails/{timestamp}/{photo_id}_thumb.jpg"
        
        # 4. Convert to bytes
        photo_bytes = self.image_to_bytes(processed, quality=85)
        
        # 5. Upload to MinIO
        await self.storage.upload_photo(photo_bytes, photo_path, "image/jpeg")  # can store as thumbnails later for performance
        
        # 6. Save to database
        photo = Photo(
            test_id=test_id,
            file_path=photo_path,
            time_stamp=datetime.now(timezone.utc),
            analysis_results=None
        )
        db.add(photo)
        db.commit()
        db.refresh(photo)
        
        return photo

photo_service = PhotoService()
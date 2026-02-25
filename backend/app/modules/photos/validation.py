"""
Photo validation utilities
Extracted validation logic from PhotoService
"""

import logging
from PIL import Image
from typing import Tuple

logger = logging.getLogger("backend_photos_validation")


# Validation constants
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
MIN_DIMENSION = 10
MAX_DIMENSION = 10000


def validate_file_size(file) -> int:
    """
    Validate file size and return the size in bytes.
    
    Raises:
        ValueError: If file is empty or too large
    """
    file.seek(0, 2)  # Seek to end
    file_size = file.tell()
    file.seek(0)  # Reset

    if file_size == 0:
        raise ValueError("File is empty")

    if file_size > MAX_FILE_SIZE:
        raise ValueError(
            f"File too large: {file_size} bytes (max {MAX_FILE_SIZE})"
        )

    return file_size


def open_and_verify_image(file) -> Image.Image:
    """
    Open and verify image file integrity.
    
    Raises:
        ValueError: If file is not a valid image or is corrupted
    """
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

    return img


def validate_image_format(img: Image.Image) -> None:
    """
    Validate image format is supported.
    
    Raises:
        ValueError: If image format is not in ALLOWED_FORMATS
    """
    if img.format not in ALLOWED_FORMATS:
        raise ValueError(
            f"Unsupported format: {img.format}. "
            f"Allowed: {', '.join(ALLOWED_FORMATS)}"
        )


def validate_image_dimensions(img: Image.Image) -> Tuple[int, int]:
    """
    Validate image dimensions are within acceptable range.
    
    Returns:
        Tuple of (width, height)
        
    Raises:
        ValueError: If image is too small or too large
    """
    width, height = img.size

    if width < MIN_DIMENSION or height < MIN_DIMENSION:
        raise ValueError(
            f"Image too small: {width}x{height} "
            f"(minimum {MIN_DIMENSION}x{MIN_DIMENSION})"
        )

    if width > MAX_DIMENSION or height > MAX_DIMENSION:
        raise ValueError(
            f"Image too large: {width}x{height} "
            f"(maximum {MAX_DIMENSION}x{MAX_DIMENSION})"
        )

    return width, height


def validate_photo_file(file, filename: str) -> Image.Image:
    """
    Complete photo validation pipeline.
    
    Validates file size, opens and verifies the image,
    checks format and dimensions.
    
    Returns:
        PIL Image object if validation passes
        
    Raises:
        ValueError: If any validation check fails
    """
    try:
        # Validate file size
        file_size = validate_file_size(file)

        # Open and verify image
        img = open_and_verify_image(file)

        # Validate format
        validate_image_format(img)

        # Validate dimensions
        width, height = validate_image_dimensions(img)

        logger.info(
            f"Validated photo: {filename} "
            f"({img.format}, {width}x{height}, {file_size} bytes)"
        )

        return img

    except ValueError:
        # Re-raise validation errors
        raise
    except Exception as e:
        logger.error(f"Photo validation failed: {str(e)}")
        raise ValueError(f"Validation error: {str(e)}")

"""
Image processing utilities
Extracted processing logic from PhotoService
"""

from io import BytesIO

from PIL import Image, ImageOps


def resize_if_needed(image: Image.Image, max_dimension: int = 2000) -> Image.Image:
    """
    Resize image if either dimension exceeds max_dimension.

    Maintains aspect ratio when resizing.
    """
    width, height = image.size

    if width <= max_dimension and height <= max_dimension:
        return image

    # Calculate resize ratio
    ratio = min(max_dimension / width, max_dimension / height)
    new_size = (int(width * ratio), int(height * ratio))

    return image.resize(new_size, Image.Resampling.LANCZOS)


def convert_to_rgb(image: Image.Image) -> Image.Image:
    """
    Convert image to RGB mode for JPEG compatibility.

    Handles RGBA, LA, and P modes with proper alpha channel handling.
    """
    if image.mode not in ("RGBA", "LA", "P"):
        return image

    background = Image.new("RGB", image.size, (255, 255, 255))
    if image.mode == "P":
        image = image.convert("RGBA")

    if "A" in image.mode:
        background.paste(image, mask=image.split()[-1])
    else:
        background.paste(image)

    return background


def correct_orientation(image: Image.Image) -> Image.Image:
    """
    Correct image orientation based on EXIF data.

    Applies rotation/mirroring from EXIF orientation tag and removes the tag.
    This ensures images captured by mobile devices display in the correct orientation.
    """
    try:
        # exif_transpose handles all EXIF orientation cases and removes the tag
        corrected = ImageOps.exif_transpose(image)
        return corrected if corrected is not None else image
    except Exception:
        # If EXIF processing fails, return original image
        return image


def process_image(image: Image.Image, max_dimension: int = 2000) -> Image.Image:
    """
    Process image: correct orientation, resize if too large, convert to RGB.
    Complete image processing pipeline combining orientation correction,
    resize and format conversion.
    """
    image = correct_orientation(image)
    image = resize_if_needed(image, max_dimension)
    image = convert_to_rgb(image)

    return image


def image_to_bytes(
    image: Image.Image, format: str = "JPEG", quality: int = 85
) -> bytes:
    """
    Convert PIL Image to bytes.

    Args:
        image: PIL Image object
        format: Output format (default: JPEG)
        quality: JPEG quality 1-100 (default: 85)

    Returns:
        Image data as bytes
    """
    buffer = BytesIO()
    image.save(buffer, format=format, quality=quality)
    buffer.seek(0)
    return buffer.read()

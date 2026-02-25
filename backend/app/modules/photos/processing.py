"""
Image processing utilities
Extracted processing logic from PhotoService
"""

from io import BytesIO
from PIL import Image


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

    # Create white background
    background = Image.new("RGB", image.size, (255, 255, 255))

    # Convert palette mode to RGBA first
    if image.mode == "P":
        image = image.convert("RGBA")

    # Paste with alpha mask if present
    if "A" in image.mode:
        background.paste(image, mask=image.split()[-1])
    else:
        background.paste(image)

    return background


def process_image(image: Image.Image, max_dimension: int = 2000) -> Image.Image:
    """
    Process image: resize if too large, convert to RGB.
    Complete image processing pipeline combining resize and format conversion.
    """
    # Resize if needed
    image = resize_if_needed(image, max_dimension)

    # Convert to RGB for JPEG compatibility
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

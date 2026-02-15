"""
Unit tests for PhotoService – image validation rules and processing logic.

No database or MinIO interaction: every test works entirely with in-memory
PIL images / BytesIO buffers.  A fresh ``PhotoService()`` is provided by the
``svc`` fixture (its internal PhotoStorage instance is harmless because the
``minio`` package is stubbed in conftest).
"""

from io import BytesIO

import pytest
from PIL import Image

from app.modules.photos.service import PhotoService

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_image(
    width: int = 100, height: int = 100, mode: str = "RGB", fmt: str = "JPEG"
) -> BytesIO:
    """Create a valid in-memory image and return the buffer seeked to 0."""
    img = Image.new(mode, (width, height))
    if fmt == "JPEG" and mode != "RGB":
        img = img.convert("RGB")
    buf = BytesIO()
    img.save(buf, format=fmt)
    buf.seek(0)
    return buf


@pytest.fixture()
def svc():
    return PhotoService()


# ---------------------------------------------------------------------------
# validate_photo  –  acceptance & rejection rules
# ---------------------------------------------------------------------------


class TestValidatePhoto:
    async def test_valid_images_pass(self, svc):
        # JPEG
        buf = _make_image(200, 150, fmt="JPEG")
        img = await svc.validate_photo(buf, "sample.jpg")
        assert img.format == "JPEG"
        assert img.size == (200, 150)

        # PNG with alpha
        buf = _make_image(80, 80, mode="RGBA", fmt="PNG")
        img = await svc.validate_photo(buf, "alpha.png")
        assert img.format == "PNG"

    async def test_invalid_images_rejected(self, svc):
        # Empty file
        with pytest.raises(ValueError, match="[Ee]mpty"):
            await svc.validate_photo(BytesIO(b""), "empty.jpg")

        # File too large
        big = BytesIO(b"\x00" * (10 * 1024 * 1024 + 1))
        with pytest.raises(ValueError, match="[Tt]oo large"):
            await svc.validate_photo(big, "big.jpg")

        # Image too small
        buf = _make_image(3, 3, fmt="JPEG")
        with pytest.raises(ValueError, match="[Tt]oo small"):
            await svc.validate_photo(buf, "tiny.jpg")

        # Unsupported format
        img = Image.new("RGB", (100, 100))
        buf = BytesIO()
        img.save(buf, format="BMP")
        buf.seek(0)
        with pytest.raises(ValueError, match="[Uu]nsupported format"):
            await svc.validate_photo(buf, "test.bmp")

        # Corrupted data
        with pytest.raises(ValueError, match="[Ii]nvalid"):
            await svc.validate_photo(BytesIO(b"definitely not an image"), "bad.jpg")


# ---------------------------------------------------------------------------
# process_image  –  resize & colour-mode conversion
# ---------------------------------------------------------------------------


class TestProcessImage:
    async def test_oversized_image_is_downscaled(self, svc):
        img = Image.new("RGB", (4000, 2000))
        result = await svc.process_image(img, max_dimension=2000)
        assert max(result.size) <= 2000
        assert result.size[0] == 2 * result.size[1]  # Aspect ratio preserved

    async def test_image_within_limit_is_untouched(self, svc):
        img = Image.new("RGB", (400, 300))
        result = await svc.process_image(img, max_dimension=2000)
        assert result.size == (400, 300)

    async def test_color_mode_conversions(self, svc):
        # RGBA → RGB
        img = Image.new("RGBA", (50, 50), (255, 0, 0, 128))
        result = await svc.process_image(img)
        assert result.mode == "RGB"

        # Palette → RGB
        img = Image.new("P", (60, 60))
        result = await svc.process_image(img)
        assert result.mode == "RGB"


# ---------------------------------------------------------------------------
# image_to_bytes  –  serialisation sanity checks
# ---------------------------------------------------------------------------


class TestImageToBytes:
    def test_format_encoding(self, svc):
        # JPEG starts with SOI marker
        data = svc.image_to_bytes(Image.new("RGB", (10, 10)), format="JPEG")
        assert data[:2] == b"\xff\xd8"

        # PNG starts with PNG signature
        data = svc.image_to_bytes(Image.new("RGB", (10, 10)), format="PNG")
        assert data[:4] == b"\x89PNG"

    def test_quality_affects_size(self, svc):
        img = Image.new("RGB", (200, 200), (100, 150, 200))
        high = svc.image_to_bytes(img, format="JPEG", quality=95)
        low = svc.image_to_bytes(img, format="JPEG", quality=10)
        assert len(low) < len(high)

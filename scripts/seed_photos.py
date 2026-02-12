"""
Seed script to upload placeholder photos for gallery pagination testing.
 
Generates simple colored JPEG images and uploads them to existing tests
via the /api/v1/photos/upload endpoint.
 
Requirements:
    pip install requests Pillow
 
Usage:
    python scripts/seed_photos.py                          # 3 photos per test, localhost:8000
    python scripts/seed_photos.py --per-test 5             # 5 photos per test
    python scripts/seed_photos.py --url http://backend:8000
"""
 
import argparse
import io
import random
 
import requests
from PIL import Image, ImageDraw, ImageFont
 
 
COLORS = [
    "#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6",
    "#1abc9c", "#e67e22", "#34495e", "#d35400", "#27ae60",
    "#2980b9", "#8e44ad", "#c0392b", "#16a085", "#f1c40f",
]
 
 
def make_placeholder_image(label: str, width: int = 400, height: int = 300) -> bytes:
    """Generate a simple colored JPEG with a text label."""
    color = random.choice(COLORS)
    img = Image.new("RGB", (width, height), color)
    draw = ImageDraw.Draw(img)
 
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
    except (OSError, IOError):
        font = ImageFont.load_default()
 
    bbox = draw.textbbox((0, 0), label, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (width - text_w) // 2
    y = (height - text_h) // 2
    draw.text((x, y), label, fill="white", font=font)
 
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    buf.seek(0)
    return buf.getvalue()
 
 
def get_test_ids(base_url: str) -> list[int]:
    """Fetch all existing test IDs."""
    response = requests.get(f"{base_url}/api/v1/tests/")
    response.raise_for_status()
    payload = response.json()

    # Handle multiple possible response shapes
    if isinstance(payload, list):
        tests = payload
    elif isinstance(payload, dict):
        tests = payload.get("items") or payload.get("tests") or []
    else:
        print(f"  Unexpected response type: {type(payload)}")
        print(f"  Response preview: {str(payload)[:200]}")
        return []

    return [t["id"] for t in tests]
 
 
def upload_photo(base_url: str, test_id: int, photo_index: int) -> dict:
    """Upload a single placeholder photo for a test."""
    label = f"Test {test_id}\nPhoto {photo_index}"
    image_bytes = make_placeholder_image(label)
 
    files = {"file": (f"test{test_id}_photo{photo_index}.jpg", image_bytes, "image/jpeg")}
    params = {"test_id": test_id}
 
    response = requests.post(f"{base_url}/api/v1/photos/upload", files=files, params=params)
    response.raise_for_status()
    return response.json()
 
 
def main():
    parser = argparse.ArgumentParser(description="Seed photos for gallery pagination testing")
    parser.add_argument("--per-test", type=int, default=3, help="Photos per test (default: 3)")
    parser.add_argument("--url", type=str, default="http://localhost:8000", help="Backend base URL")
    args = parser.parse_args()
 
    print(f"Fetching tests from {args.url} ...")
    test_ids = get_test_ids(args.url)
 
    if not test_ids:
        print("No tests found. Run seed_tests.py first.")
        return
 
    total = len(test_ids) * args.per_test
    print(f"Found {len(test_ids)} tests. Uploading {args.per_test} photos each ({total} total) ...\n")
 
    uploaded = 0
    failed = 0
    for test_id in test_ids:
        for i in range(1, args.per_test + 1):
            try:
                result = upload_photo(args.url, test_id, i)
                photo_id = result.get("id", "?")
                uploaded += 1
                print(f"  [{uploaded + failed}/{total}] Test #{test_id} -> Photo #{photo_id}")
            except Exception as e:
                failed += 1
                print(f"  [{uploaded + failed}/{total}] Test #{test_id} photo {i} FAILED: {e}")
 
    print(f"\nDone. Uploaded: {uploaded}, Failed: {failed}")
 
 
if __name__ == "__main__":
    main()
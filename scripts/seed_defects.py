"""
Seed script to create defects with annotations on existing photos.

Generates realistic defect data with random severity, categories,
descriptions, and geometric annotations for gallery testing.

Requirements:
    pip install requests

Usage:
    python scripts/seed_defects.py                              # defaults
    python scripts/seed_defects.py --defect-chance 0.8          # 80% of photos get defects
    python scripts/seed_defects.py --max-defects 5              # up to 5 defects per photo
    python scripts/seed_defects.py --url http://backend:8000
"""

import argparse
import random

import requests

SEVERITIES = ["low", "medium", "high", "critical"]
SEVERITY_WEIGHTS = [40, 30, 20, 10]

DESCRIPTIONS = [
    "Visible scratch on surface",
    "Color mismatch in upper region",
    "Thread loose near seam",
    "Ink smudge on print area",
    "Fabric tear along edge",
    "Misaligned embroidery pattern",
    "Discoloration spot detected",
    "Minor dent on material",
    "Stitching irregularity",
    "Surface contamination",
]

ANNOTATION_COLORS = [
    "#e74c3c",
    "#3498db",
    "#2ecc71",
    "#f39c12",
    "#9b59b6",
    "#e67e22",
    "#c0392b",
]


def random_rect() -> dict:
    x = round(random.uniform(0.05, 0.6), 3)
    y = round(random.uniform(0.05, 0.6), 3)
    w = round(random.uniform(0.1, min(0.35, 1.0 - x)), 3)
    h = round(random.uniform(0.1, min(0.35, 1.0 - y)), 3)
    return {"type": "rect", "x": x, "y": y, "width": w, "height": h}


def random_circle() -> dict:
    cx = round(random.uniform(0.2, 0.8), 3)
    cy = round(random.uniform(0.2, 0.8), 3)
    max_r = min(cx, cy, 1.0 - cx, 1.0 - cy, 0.15)
    r = round(random.uniform(0.05, max(0.05, max_r)), 3)
    return {"type": "circle", "center": {"x": cx, "y": cy}, "radius": r}


def random_polygon() -> dict:
    num_points = random.randint(3, 5)
    base_x = round(random.uniform(0.1, 0.6), 3)
    base_y = round(random.uniform(0.1, 0.6), 3)
    points = []
    for _ in range(num_points):
        px = round(base_x + random.uniform(0.0, 0.3), 3)
        py = round(base_y + random.uniform(0.0, 0.3), 3)
        points.append({"x": min(px, 0.95), "y": min(py, 0.95)})
    return {"type": "polygon", "points": points}


def random_geometry() -> dict:
    return random.choice([random_rect, random_circle, random_polygon])()


def get_categories(base_url: str) -> list[dict]:
    response = requests.get(f"{base_url}/api/v1/defects/categories")
    response.raise_for_status()
    return response.json()


def get_all_photo_ids(base_url: str) -> list[int]:
    response = requests.get(f"{base_url}/api/v1/tests/")
    response.raise_for_status()
    payload = response.json()

    if isinstance(payload, list):
        tests = payload
    elif isinstance(payload, dict):
        tests = payload.get("items") or payload.get("tests") or []
    else:
        print(f"  Unexpected response type: {type(payload)}")
        return []

    test_ids = [t["id"] for t in tests]

    photo_ids = []
    for test_id in test_ids:
        resp = requests.get(f"{base_url}/api/v1/photos/test/{test_id}")
        if resp.ok:
            photos = resp.json()
            photo_ids.extend(p["id"] for p in photos)

    return photo_ids


def create_defect(base_url: str, photo_id: int, category_ids: list[int]) -> dict:
    severity = random.choices(SEVERITIES, weights=SEVERITY_WEIGHTS, k=1)[0]
    category_id = random.choice(category_ids)
    description = random.choice(DESCRIPTIONS)

    num_annotations = random.randint(1, 2)
    annotations = []
    for _ in range(num_annotations):
        ann_category = random.choice(category_ids)
        annotations.append(
            {
                "category_id": ann_category,
                "geometry": random_geometry(),
                "color": random.choice(ANNOTATION_COLORS),
            }
        )

    payload = {
        "category_id": category_id,
        "description": description,
        "severity": severity,
        "annotations": annotations,
    }

    response = requests.post(
        f"{base_url}/api/v1/defects/photo/{photo_id}",
        json=payload,
    )
    response.raise_for_status()
    return response.json()


def main():
    parser = argparse.ArgumentParser(
        description="Seed defects with annotations on existing photos"
    )
    parser.add_argument(
        "--url",
        type=str,
        default="http://localhost:8000",
        help="Backend base URL (default: http://localhost:8000)",
    )
    parser.add_argument(
        "--defect-chance",
        type=float,
        default=0.6,
        help="Probability a photo gets defects (default: 0.6)",
    )
    parser.add_argument(
        "--max-defects",
        type=int,
        default=3,
        help="Max defects per photo (default: 3)",
    )
    args = parser.parse_args()

    print(f"Fetching categories from {args.url} ...")
    categories = get_categories(args.url)
    if not categories:
        print("No defect categories found. Check database seeding.")
        return
    category_ids = [c["id"] for c in categories]
    print(f"  Found {len(categories)} categories: {', '.join(c['name'] for c in categories)}")

    print(f"Fetching photos from {args.url} ...")
    photo_ids = get_all_photo_ids(args.url)
    if not photo_ids:
        print("No photos found. Run seed_tests.py and seed_photos.py first.")
        return

    photos_with_defects = [
        pid for pid in photo_ids if random.random() < args.defect_chance
    ]
    total_defects = 0
    for _ in photos_with_defects:
        total_defects += random.randint(1, args.max_defects)

    # Re-seed so counts match (we'll re-roll during creation)
    random.seed()

    print(
        f"Found {len(photo_ids)} photos. "
        f"Adding defects to ~{len(photos_with_defects)} photos "
        f"({args.defect_chance:.0%} chance) ...\n"
    )

    created = 0
    failed = 0
    counter = 0
    for photo_id in photo_ids:
        if random.random() >= args.defect_chance:
            continue

        num_defects = random.randint(1, args.max_defects)
        for _ in range(num_defects):
            counter += 1
            try:
                result = create_defect(args.url, photo_id, category_ids)
                defect_id = result.get("id", "?")
                severity = result.get("severity", "?")
                ann_count = len(result.get("annotations", []))
                created += 1
                print(
                    f"  [{counter}] Photo #{photo_id} -> "
                    f"Defect #{defect_id} ({severity}, {ann_count} annotations)"
                )
            except Exception as e:
                failed += 1
                print(f"  [{counter}] Photo #{photo_id} FAILED: {e}")

    print(f"\nDone. Created: {created}, Failed: {failed}")


if __name__ == "__main__":
    main()

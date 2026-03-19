"""
Seed script to create test records for pagination testing.

Usage:
    python scripts/seed_tests.py              # creates 55 tests against localhost:8000
    python scripts/seed_tests.py --count 100  # creates 100 tests
    python scripts/seed_tests.py --url http://backend:8000  # custom base URL
"""

import argparse
import random
import requests
from datetime import datetime, timedelta, timezone

STATUSES = ["pending", "open", "in_progress", "finalized"]
TEST_TYPES = ["incoming", "in_process", "final", "other"]
REQUESTERS = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace"]
ASSIGNEES = ["Inspector_A", "Inspector_B", "Inspector_C", "Inspector_D", None]
PRODUCT_NAMES = [
    "Red Cotton T-Shirt",
    "Blue Polo Shirt",
    "Black Denim Jacket",
    "White Linen Trousers",
    "Navy Wool Sweater",
    "Green Silk Blouse",
    "Grey Hoodie",
    "Beige Chino Pants",
    "Pink Floral Dress",
    "Brown Leather Belt",
    "Yellow Rain Jacket",
    "Striped Oxford Shirt",
    "Charcoal Suit Blazer",
    "Khaki Cargo Shorts",
    "Purple Cashmere Scarf",
]


def fetch_color_ids(base_url: str) -> list[int]:
    response = requests.get(f"{base_url}/api/v1/tests/colors")
    response.raise_for_status()
    return [c["id"] for c in response.json()]


def create_test(base_url: str, index: int, color_ids: list[int]) -> dict:
    jira_id = f"GY-{random.randint(100, 99999)}"
    product_name = random.choice(PRODUCT_NAMES)
    test_type = random.choice(TEST_TYPES)
    requester = random.choice(REQUESTERS)
    assigned_to = random.choice(ASSIGNEES)
    status = random.choice(STATUSES)

    # Random deadline between -7 days ago and +30 days from now (or None)
    deadline = None
    if random.random() > 0.3:
        delta = random.randint(-7, 30)
        deadline = (datetime.now(timezone.utc) + timedelta(days=delta)).strftime("%Y-%m-%dT%H:%M:%SZ")

    # 0–3 random colors; ~20% chance of none
    selected_colors = random.sample(color_ids, k=random.randint(0, min(3, len(color_ids)))) if random.random() > 0.2 else []

    # Use a list of tuples so duplicate keys (colorIds) are sent correctly
    form_data = [
        ("jiraId", jira_id),
        ("productName", product_name),
        ("testType", test_type),
        ("requester", requester),
        ("status", status),
    ]
    if assigned_to:
        form_data.append(("assignedTo", assigned_to))
    if deadline:
        form_data.append(("deadlineAt", deadline))
    for color_id in selected_colors:
        form_data.append(("colorIds", str(color_id)))

    response = requests.post(f"{base_url}/api/v1/tests/", data=form_data)
    response.raise_for_status()
    return response.json()


def main():
    parser = argparse.ArgumentParser(description="Seed test records for pagination testing")
    parser.add_argument("--count", type=int, default=55, help="Number of tests to create (default: 55)")
    parser.add_argument("--url", type=str, default="http://localhost:8000", help="Backend base URL")
    args = parser.parse_args()

    print(f"Fetching available colors from {args.url} ...")
    try:
        color_ids = fetch_color_ids(args.url)
        print(f"  Found {len(color_ids)} colors\n")
    except Exception as e:
        print(f"  WARNING: Could not fetch colors ({e}), seeding without colors\n")
        color_ids = []

    print(f"Creating {args.count} tests against {args.url} ...")

    created = 0
    failed = 0
    for i in range(1, args.count + 1):
        try:
            result = create_test(args.url, i, color_ids)
            test_id = result.get("test", {}).get("id", "?")
            created += 1
            print(f"  [{i}/{args.count}] Created test #{test_id}")
        except Exception as e:
            failed += 1
            print(f"  [{i}/{args.count}] FAILED: {e}")

    print(f"\nDone. Created: {created}, Failed: {failed}")


if __name__ == "__main__":
    main()

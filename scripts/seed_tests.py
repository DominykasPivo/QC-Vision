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
 
 
def create_test(base_url: str, index: int) -> dict:
    product_id = random.randint(1, 200)
    test_type = random.choice(TEST_TYPES)
    requester = random.choice(REQUESTERS)
    assigned_to = random.choice(ASSIGNEES)
    status = random.choice(STATUSES)
 
    # Random deadline between -7 days ago and +30 days from now (or None)
    deadline = None
    if random.random() > 0.3:
        delta = random.randint(-7, 30)
        deadline = (datetime.now(timezone.utc) + timedelta(days=delta)).strftime("%Y-%m-%dT%H:%M:%SZ")
 
    form_data = {
        "productId": str(product_id),
        "testType": test_type,
        "requester": requester,
        "status": status,
    }
    if assigned_to:
        form_data["assignedTo"] = assigned_to
    if deadline:
        form_data["deadlineAt"] = deadline
 
    response = requests.post(f"{base_url}/api/v1/tests/", data=form_data)
    response.raise_for_status()
    return response.json()
 
 
def main():
    parser = argparse.ArgumentParser(description="Seed test records for pagination testing")
    parser.add_argument("--count", type=int, default=55, help="Number of tests to create (default: 55)")
    parser.add_argument("--url", type=str, default="http://localhost:8000", help="Backend base URL")
    args = parser.parse_args()
 
    print(f"Creating {args.count} tests against {args.url} ...")
 
    created = 0
    failed = 0
    for i in range(1, args.count + 1):
        try:
            result = create_test(args.url, i)
            test_id = result.get("test", {}).get("id", "?")
            created += 1
            print(f"  [{i}/{args.count}] Created test #{test_id}")
        except Exception as e:
            failed += 1
            print(f"  [{i}/{args.count}] FAILED: {e}")
 
    print(f"\nDone. Created: {created}, Failed: {failed}")
 
 
if __name__ == "__main__":
    main()
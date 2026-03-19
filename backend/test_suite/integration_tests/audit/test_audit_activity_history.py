from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.modules.audit.models import AuditLog


def _dt(minutes_ago: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(minutes=minutes_ago)


def _insert_log(
    db_session,
    *,
    action: str,
    entity_type: str,
    entity_id: int,
    test_id: int | None = None,
    attribute: str | None = None,
    old_value=None,
    new_value=None,
    username: str = "system",
    meta: dict | None = None,
    created_at: datetime | None = None,
) -> AuditLog:
    log = AuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        test_id=test_id,
        attribute=attribute,
        old_value=old_value,
        new_value=new_value,
        username=username,
        meta=meta or {},
    )
    if created_at is not None:
        log.created_at = created_at

    db_session.add(log)
    db_session.commit()
    db_session.refresh(log)
    return log


def test_returns_only_logs_for_given_test_id(client, db_session):
    # Test 1 logs
    _insert_log(
        db_session,
        action="CREATE",
        entity_type="Test",
        entity_id=1,
        test_id=1,
        created_at=_dt(10),
    )
    _insert_log(
        db_session,
        action="UPLOAD",
        entity_type="Photo",
        entity_id=101,
        test_id=1,
        attribute="filename",
        new_value="p1.jpg",
        created_at=_dt(9),
    )

    # Test 2 logs (must not appear)
    _insert_log(
        db_session,
        action="CREATE",
        entity_type="Test",
        entity_id=2,
        test_id=2,
        created_at=_dt(8),
    )
    _insert_log(
        db_session,
        action="UPLOAD",
        entity_type="Photo",
        entity_id=202,
        test_id=2,
        attribute="filename",
        new_value="p2.jpg",
        created_at=_dt(7),
    )

    r = client.get(
        "/api/v1/audit/tests/1/activity?user_actions_only=true&limit=200&offset=0"
    )
    assert r.status_code == 200

    data = r.json()
    items = data["items"]
    assert data["total"] == 2
    assert len(items) == 2

    for x in items:
        is_direct = (x["entity_type"] == "Test") and (x["entity_id"] == 1)
        is_related = x.get("test_id") == 1
        assert is_direct or is_related

    assert all(((x.get("test_id") != 2 and x["entity_id"] != 2)) for x in items)


def test_excludes_system_get_logs_correctly(client, db_session):
    keep = _insert_log(
        db_session,
        action="CREATE",
        entity_type="Test",
        entity_id=1,
        test_id=1,
        meta={"user_visible": True},
        created_at=_dt(10),
    )

    # GET/READ noise (excluded by service rules)
    _insert_log(
        db_session,
        action="READ",
        entity_type="Test",
        entity_id=1,
        test_id=1,
        meta={"user_visible": True},
        created_at=_dt(9),
    )

    # Hidden system log (excluded because user_visible=False)
    _insert_log(
        db_session,
        action="UPDATE",
        entity_type="Test",
        entity_id=1,
        test_id=1,
        meta={"user_visible": False},
        created_at=_dt(8),
    )

    r = client.get(
        "/api/v1/audit/tests/1/activity?user_actions_only=true&limit=200&offset=0"
    )
    assert r.status_code == 200

    items = r.json()["items"]
    assert len(items) == 1
    assert items[0]["id"] == keep.id
    assert items[0]["action"] == "CREATE"


def test_returns_correct_order_newest_first(client, db_session):
    older = _insert_log(
        db_session,
        action="CREATE",
        entity_type="Test",
        entity_id=1,
        test_id=1,
        created_at=_dt(30),
    )
    middle = _insert_log(
        db_session,
        action="UPDATE",
        entity_type="Test",
        entity_id=1,
        test_id=1,
        attribute="status",
        old_value="pending",
        new_value="open",
        created_at=_dt(20),
    )
    newest = _insert_log(
        db_session,
        action="STATUS_CHANGE",
        entity_type="Test",
        entity_id=1,
        test_id=1,
        attribute="status",
        old_value="open",
        new_value="closed",
        created_at=_dt(10),
    )

    r = client.get(
        "/api/v1/audit/tests/1/activity?user_actions_only=true&limit=200&offset=0"
    )
    assert r.status_code == 200

    items = r.json()["items"]
    assert [x["id"] for x in items] == [newest.id, middle.id, older.id]


def test_pagination_if_implemented(client, db_session):
    ids = []
    for i in range(5):
        log = _insert_log(
            db_session,
            action="UPDATE",
            entity_type="Test",
            entity_id=1,
            test_id=1,
            attribute="description",
            old_value=f"old-{i}",
            new_value=f"new-{i}",
            created_at=_dt(100 - i),
        )
        ids.append(log.id)

    newest_first = list(reversed(ids))

    r1 = client.get(
        "/api/v1/audit/tests/1/activity?user_actions_only=true&limit=2&offset=0"
    )
    assert r1.status_code == 200
    d1 = r1.json()
    assert d1["total"] == 5
    assert [x["id"] for x in d1["items"]] == newest_first[0:2]

    r2 = client.get(
        "/api/v1/audit/tests/1/activity?user_actions_only=true&limit=2&offset=2"
    )
    assert r2.status_code == 200
    d2 = r2.json()
    assert d2["total"] == 5
    assert [x["id"] for x in d2["items"]] == newest_first[2:4]

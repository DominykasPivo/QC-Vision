from sqlalchemy.orm import Session

from .models import Color, Tests
from .schemas import TestCreate


class TestFactory:
    @staticmethod
    def build(db: Session, test_data: TestCreate) -> Tests:
        """
        Construct a Tests instance with its colors resolved.
        Does not add or commit — persistence is the caller's responsibility.
        """
        colors = (
            db.query(Color).filter(Color.id.in_(test_data.color_ids)).all()
            if test_data.color_ids
            else []
        )

        return Tests(
            jira_id=test_data.jira_id,
            product_name=test_data.product_name,
            test_type=test_data.test_type,
            requester=test_data.requester,
            assigned_to=test_data.assigned_to,
            description=test_data.description,
            status=test_data.status,
            deadline_at=test_data.deadline_at,
            colors=colors,
        )

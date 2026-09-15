from typing import Any
from sqlalchemy.orm import Session
from app.models import AuditLog


def record_audit(db: Session, user_id: int | None, action: str, entity_type: str, entity_id: int | str, before: dict[str, Any] | None = None, after: dict[str, Any] | None = None, ip_address: str | None = None) -> AuditLog:
    row = AuditLog(user_id=user_id, action=action, entity_type=entity_type, entity_id=str(entity_id), before_data=before, after_data=after, ip_address=ip_address)
    db.add(row)
    return row

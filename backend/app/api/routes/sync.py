from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_roles
from app.models import SyncRecord, UserRole
from app.schemas import SyncRequest, SyncResponse

router = APIRouter(tags=["Offline sync"])


@router.post("/sync", response_model=SyncResponse, description="Synchronize an offline record with optimistic concurrency; newer server data is never overwritten silently.")
def sync(payload: SyncRequest, db: Session = Depends(get_db), _=Depends(require_roles(UserRole.FIELD_WORKER, UserRole.ADMIN))):
    row = db.scalar(select(SyncRecord).where(SyncRecord.record_id == payload.record_id, SyncRecord.record_type == payload.record_type))
    if row and payload.server_version != row.server_version:
        return {"status": "CONFLICT", "server_version": row.server_version, "local_version": payload.server_version}
    if not row:
        row = SyncRecord(record_id=payload.record_id, record_type=payload.record_type, server_version=1, payload=payload.payload); db.add(row)
    else:
        row.server_version += 1; row.payload = payload.payload
    db.commit(); return {"status": "SYNCED", "server_version": row.server_version, "local_version": payload.server_version}

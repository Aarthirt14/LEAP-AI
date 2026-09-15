from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_roles
from app.models import HumanReview, ReviewStatus, User, UserRole
from app.repositories.audit import record_audit
from app.schemas import PaginatedReviews, ReviewAction, ReviewOut
from app.utils.errors import AppError

router = APIRouter(prefix="/reviews", tags=["Human review"], dependencies=[Depends(require_roles(UserRole.FACILITATOR, UserRole.ADMIN))])


def get_review(db: Session, review_id: int) -> HumanReview:
    row = db.get(HumanReview, review_id)
    if not row: raise AppError("REVIEW_NOT_FOUND", "Human review not found.", 404)
    return row


@router.get("", response_model=PaginatedReviews, description="List review cases with pagination and optional status filtering.")
def list_reviews(status: ReviewStatus | None = None, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    stmt = select(HumanReview)
    count_stmt = select(func.count(HumanReview.id))
    if status: stmt = stmt.where(HumanReview.status == status); count_stmt = count_stmt.where(HumanReview.status == status)
    total = db.scalar(count_stmt) or 0; items = db.scalars(stmt.order_by(HumanReview.created_at).offset((page-1)*page_size).limit(page_size)).all(); return {"items": items, "page": page, "page_size": page_size, "total": total}


@router.get("/{review_id}", response_model=ReviewOut, description="Get one human-review case.")
def read_review(review_id: int, db: Session = Depends(get_db)): return get_review(db, review_id)


def apply_action(review_id: int, payload: ReviewAction, target: ReviewStatus, action: str, db: Session, user: User) -> HumanReview:
    row = get_review(db, review_id); before = {"status": row.status.value, "resolution": row.resolution}; row.status = target; row.review_notes = payload.notes; row.resolution = payload.resolution; row.reviewed_at = datetime.now(timezone.utc); row.assigned_to = user.id; record_audit(db, user.id, action, "HumanReview", row.id, before=before, after={"status": target.value, "resolution": payload.resolution}); db.commit(); db.refresh(row); return row


@router.post("/{review_id}/approve", response_model=ReviewOut)
def approve(review_id: int, payload: ReviewAction, db: Session = Depends(get_db), user: User = Depends(require_roles(UserRole.FACILITATOR, UserRole.ADMIN))): return apply_action(review_id, payload, ReviewStatus.APPROVED, "REVIEW_APPROVE", db, user)

@router.post("/{review_id}/edit", response_model=ReviewOut)
def edit(review_id: int, payload: ReviewAction, db: Session = Depends(get_db), user: User = Depends(require_roles(UserRole.FACILITATOR, UserRole.ADMIN))): return apply_action(review_id, payload, ReviewStatus.EDITED, "REVIEW_EDIT", db, user)

@router.post("/{review_id}/reject", response_model=ReviewOut)
def reject(review_id: int, payload: ReviewAction, db: Session = Depends(get_db), user: User = Depends(require_roles(UserRole.FACILITATOR, UserRole.ADMIN))): return apply_action(review_id, payload, ReviewStatus.REJECTED, "REVIEW_REJECT", db, user)

@router.post("/{review_id}/resolve", response_model=ReviewOut)
def resolve(review_id: int, payload: ReviewAction, db: Session = Depends(get_db), user: User = Depends(require_roles(UserRole.FACILITATOR, UserRole.ADMIN))): return apply_action(review_id, payload, ReviewStatus.RESOLVED, "REVIEW_RESOLVE", db, user)

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_roles
from app.models import Beneficiary, HumanReview, InterviewSession, InterviewStatus, OutcomeFollowup, User, UserRole
from app.schemas import BeneficiaryCreate, BeneficiaryOut, BeneficiaryPatch

router = APIRouter(prefix="/field-worker", tags=["Field worker"], dependencies=[Depends(require_roles(UserRole.FIELD_WORKER, UserRole.ADMIN))])


@router.get("/tasks", description="Return the field worker's actionable workload counts.")
def tasks(db: Session = Depends(get_db)):
    return {"interviews_due": db.scalar(select(func.count(Beneficiary.id)).where(Beneficiary.consent_given.is_(True), ~select(InterviewSession.id).where(InterviewSession.beneficiary_id == Beneficiary.id, InterviewSession.status == InterviewStatus.COMPLETED).exists())) or 0, "followups_due": db.scalar(select(func.count(OutcomeFollowup.id)).where(OutcomeFollowup.followup_day == 90, OutcomeFollowup.verification_status == "USER_REPORTED")) or 0, "human_review_cases": db.scalar(select(func.count(HumanReview.id)).where(HumanReview.status == "OPEN")) or 0, "offline_sync_items": 0, "rpl_verification_cases": db.scalar(select(func.count(Beneficiary.id)).where(Beneficiary.digital_literacy == "RPL_REVIEW")) or 0}


@router.get("/beneficiaries", description="Return the field worker's presentation-safe beneficiary worklist.")
def beneficiaries(page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=100), db: Session = Depends(get_db)):
    rows = db.scalars(select(Beneficiary).order_by(Beneficiary.id).offset((page - 1) * page_size).limit(page_size)).all()
    return [{"id": row.id, "name": row.name, "district": row.district, "preferred_language": row.preferred_language, "consent_given": row.consent_given} for row in rows]


@router.get("/followups", description="Return paginated follow-ups due for field verification.")
def followups(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    rows = db.scalars(select(OutcomeFollowup).where(OutcomeFollowup.verification_status == "USER_REPORTED").offset((page-1)*page_size).limit(page_size)).all(); return {"items": [{"id": r.id, "beneficiary_id": r.beneficiary_id, "pathway_id": r.pathway_id, "followup_day": r.followup_day, "verification_status": r.verification_status} for r in rows], "page": page, "page_size": page_size}


@router.get("/reviews", description="Return open human-review tasks without exposing more data than needed.")
def reviews(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    rows = db.scalars(select(HumanReview).where(HumanReview.status == "OPEN").offset((page-1)*page_size).limit(page_size)).all(); return [{"id": r.id, "beneficiary_id": r.beneficiary_id, "reason_code": r.reason_code, "status": r.status} for r in rows]


@router.post("/beneficiaries", response_model=BeneficiaryOut, status_code=201, description="Create a beneficiary during assisted enrollment.")
def create(payload: BeneficiaryCreate, db: Session = Depends(get_db), user: User = Depends(require_roles(UserRole.FIELD_WORKER, UserRole.ADMIN))):
    row = Beneficiary(**payload.model_dump(), created_by=user.id); db.add(row); db.commit(); db.refresh(row); return row


@router.patch("/beneficiaries/{beneficiary_id}", response_model=BeneficiaryOut, description="Update non-sensitive beneficiary fields during field work.")
def patch(beneficiary_id: int, payload: BeneficiaryPatch, db: Session = Depends(get_db), _=Depends(require_roles(UserRole.FIELD_WORKER, UserRole.ADMIN))):
    row = db.get(Beneficiary, beneficiary_id)
    if not row: from app.utils.errors import AppError; raise AppError("BENEFICIARY_NOT_FOUND", "Beneficiary not found.", 404)
    allowed = {"name", "age", "district", "preferred_language", "digital_literacy"}
    for key, value in payload.model_dump(exclude_unset=True).items():
        if key in allowed: setattr(row, key, value)
    row.version += 1; db.commit(); db.refresh(row); return row

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import assert_beneficiary_access, get_current_user
from app.models import LivelihoodPathway, OutcomeFollowup, Provenance, User, UserRole
from app.repositories.audit import record_audit
from app.schemas import OutcomeCreate, OutcomeOut
from app.utils.errors import AppError
from app.services.review_gate import review_state

router = APIRouter(tags=["Outcome follow-up"])


@router.post("/outcomes", response_model=OutcomeOut, status_code=status.HTTP_201_CREATED, description="Record a 30, 90, or 180-day outcome with provenance.")
def create_outcome(payload: OutcomeCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    # System verification cannot be asserted through this human-facing API.
    status = Provenance.USER_REPORTED
    if user.role in {UserRole.FIELD_WORKER, UserRole.FACILITATOR, UserRole.ADMIN} and payload.verification_status == Provenance.FIELD_VERIFIED:
        status = Provenance.FIELD_VERIFIED
    payload = payload.model_copy(update={"verification_status": status})
    assert_beneficiary_access(db, user, payload.beneficiary_id, True); pathway = db.get(LivelihoodPathway, payload.pathway_id)
    if not pathway or pathway.beneficiary_id != payload.beneficiary_id: raise AppError("PATHWAY_MISMATCH", "Pathway does not belong to this beneficiary.", 422)
    if user.role == UserRole.BENEFICIARY and review_state(db, pathway)[1]:
        raise AppError("REVIEW_PENDING", "This pathway needs human review before progression.", 409)
    exists = db.scalar(select(OutcomeFollowup).where(OutcomeFollowup.beneficiary_id == payload.beneficiary_id, OutcomeFollowup.pathway_id == payload.pathway_id, OutcomeFollowup.followup_day == payload.followup_day))
    if exists: raise AppError("FOLLOWUP_EXISTS", "This follow-up day is already recorded.", 409)
    row = OutcomeFollowup(**payload.model_dump(), reported_by=user.id); db.add(row); db.flush(); record_audit(db, user.id, "CREATE", "OutcomeFollowup", row.id, after=payload.model_dump(mode="json")); db.commit(); db.refresh(row); return row


@router.get("/beneficiaries/{beneficiary_id}/outcomes", response_model=list[OutcomeOut], description="List authorized beneficiary outcomes.")
def beneficiary_outcomes(beneficiary_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    assert_beneficiary_access(db, user, beneficiary_id); return db.scalars(select(OutcomeFollowup).where(OutcomeFollowup.beneficiary_id == beneficiary_id).order_by(OutcomeFollowup.followup_day)).all()


@router.get("/pathways/{pathway_id}/outcomes", response_model=list[OutcomeOut], description="List outcomes for an authorized pathway.")
def pathway_outcomes(pathway_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pathway = db.get(LivelihoodPathway, pathway_id)
    if not pathway: raise AppError("PATHWAY_NOT_FOUND", "Livelihood pathway not found.", 404)
    assert_beneficiary_access(db, user, pathway.beneficiary_id); return db.scalars(select(OutcomeFollowup).where(OutcomeFollowup.pathway_id == pathway_id).order_by(OutcomeFollowup.followup_day)).all()

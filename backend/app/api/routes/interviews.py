from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app.database import get_db
from app.dependencies import assert_beneficiary_access, get_current_user
from app.models import Beneficiary, InterviewAnswer, InterviewSession, InterviewStatus, User
from app.repositories.audit import record_audit
from app.schemas import InterviewAnswerCreate, InterviewAnswerOut, InterviewAnswerPatch, InterviewCreate, InterviewOut
from app.services.profile_service import apply_interview_facts
from app.utils.errors import AppError

router = APIRouter(prefix="/interviews", tags=["Voice interviews"])


def get_session(db: Session, session_id: int) -> InterviewSession:
    row = db.execute(select(InterviewSession).where(InterviewSession.id == session_id).options(selectinload(InterviewSession.answers))).scalar_one_or_none()
    if not row: raise AppError("INTERVIEW_NOT_FOUND", "Interview session not found.", 404)
    return row


@router.post("", response_model=InterviewOut, status_code=status.HTTP_201_CREATED, description="Start a text/transcript interview after consent. Raw audio is not stored.")
def start_interview(payload: InterviewCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    beneficiary = assert_beneficiary_access(db, user, payload.beneficiary_id, True)
    if not beneficiary.consent_given: raise AppError("CONSENT_REQUIRED", "Consent is required before interview evidence can be stored.", 422)
    row = InterviewSession(beneficiary_id=payload.beneficiary_id, language=payload.language, created_by=user.id); db.add(row); db.commit(); db.refresh(row); return row


@router.get("/{session_id}", response_model=InterviewOut, description="Get an authorized interview and its preserved transcript evidence.")
def read_interview(session_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = get_session(db, session_id); assert_beneficiary_access(db, user, row.beneficiary_id); return row


@router.post("/{session_id}/answers", response_model=InterviewAnswerOut, status_code=201, description="Store the original transcript separately from corrected text.")
def add_answer(session_id: int, payload: InterviewAnswerCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    session = get_session(db, session_id); beneficiary = assert_beneficiary_access(db, user, session.beneficiary_id, True)
    if not beneficiary.consent_given: raise AppError("CONSENT_REQUIRED", "Consent was withdrawn; interview evidence cannot be stored.", 422)
    if session.status != InterviewStatus.IN_PROGRESS: raise AppError("INTERVIEW_CLOSED", "Answers cannot be added to a closed interview.", 409)
    row = InterviewAnswer(session_id=session_id, **payload.model_dump()); db.add(row); db.commit(); db.refresh(row); return row


@router.patch("/{session_id}/answers/{answer_id}", response_model=InterviewAnswerOut, description="Correct interpreted text while preserving the original transcript.")
def patch_answer(session_id: int, answer_id: int, payload: InterviewAnswerPatch, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    session = get_session(db, session_id); assert_beneficiary_access(db, user, session.beneficiary_id, True)
    row = db.get(InterviewAnswer, answer_id)
    if not row or row.session_id != session_id: raise AppError("ANSWER_NOT_FOUND", "Interview answer not found.", 404)
    row.corrected_text = payload.corrected_text
    if payload.extraction_confidence is not None: row.extraction_confidence = payload.extraction_confidence
    db.commit(); db.refresh(row); return row


@router.post("/{session_id}/complete", response_model=InterviewOut, description="Complete the interview, create traceable extracted facts, and update profile completeness.")
def complete_interview(session_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    session = get_session(db, session_id); assert_beneficiary_access(db, user, session.beneficiary_id, True)
    if not session.answers: raise AppError("INTERVIEW_EMPTY", "At least one answer is required.", 422)
    session.status = InterviewStatus.COMPLETED; session.completed_at = datetime.now(timezone.utc); profile = apply_interview_facts(db, session); record_audit(db, user.id, "COMPLETE", "InterviewSession", session.id, after={"profile_completion_percentage": profile.profile_completion_percentage}); db.commit(); return get_session(db, session_id)

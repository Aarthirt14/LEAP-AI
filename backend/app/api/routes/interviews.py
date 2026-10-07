from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from app.services.interview_preview import preview
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
    data = payload.model_dump(); data["extraction_confidence"] = None; data["speech_confidence"] = None
    row = InterviewAnswer(session_id=session_id, **data); db.add(row); db.commit(); db.refresh(row); return row


@router.patch("/{session_id}/answers/{answer_id}", response_model=InterviewAnswerOut, description="Correct interpreted text while preserving the original transcript.")
def patch_answer(session_id: int, answer_id: int, payload: InterviewAnswerPatch, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    session = get_session(db, session_id); assert_beneficiary_access(db, user, session.beneficiary_id, True)
    row = db.get(InterviewAnswer, answer_id)
    if not row or row.session_id != session_id: raise AppError("ANSWER_NOT_FOUND", "Interview answer not found.", 404)
    if session.status != InterviewStatus.IN_PROGRESS: raise AppError("INTERVIEW_CLOSED", "Completed evidence cannot be edited here.", 409)
    beneficiary = assert_beneficiary_access(db, user, session.beneficiary_id, True)
    if not beneficiary.consent_given: raise AppError("CONSENT_REQUIRED", "Consent is required.", 422)
    row.corrected_text = payload.corrected_text
    row.extraction_confidence = None
    db.commit(); db.refresh(row); return row


class ConfirmPreview(BaseModel):
    confirmed: bool = False
    preview_token: str = ""


@router.get("/{session_id}/preview", description="Preview normalized values without changing the livelihood profile.")
def interview_preview(session_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    session = get_session(db, session_id)
    assert_beneficiary_access(db, user, session.beneficiary_id)
    return preview(session)


@router.post("/{session_id}/complete", response_model=InterviewOut)
def complete_interview(session_id: int, payload: ConfirmPreview = ConfirmPreview(), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    session = get_session(db, session_id)
    beneficiary = assert_beneficiary_access(db, user, session.beneficiary_id, True)
    if not beneficiary.consent_given: raise AppError("CONSENT_REQUIRED", "Consent is required before finalization.", 422)
    if not session.answers: raise AppError("INTERVIEW_EMPTY", "At least one answer is required.", 422)
    current = preview(session)
    if not payload.confirmed or payload.preview_token != current["preview_token"]:
        raise AppError("CONFIRMATION_REQUIRED", "Review the current extracted values and explicitly confirm them first.", 409)
    if session.status == InterviewStatus.COMPLETED: return session  # Safe retry after a lost response.
    if session.status != InterviewStatus.IN_PROGRESS: raise AppError("INTERVIEW_CLOSED", "This interview is closed.", 409)
    session.status = InterviewStatus.COMPLETED
    session.completed_at = datetime.now(timezone.utc)
    profile = apply_interview_facts(db, session)
    record_audit(db, user.id, "CONFIRM_INTERVIEW", "InterviewSession", session.id, after={"preview_token": current["preview_token"], "profile_completion_percentage": profile.profile_completion_percentage, "evidence_verification": "SELF_REPORTED"})
    db.commit()
    return get_session(db, session_id)


class AssistanceConsent(BaseModel):
    consent: bool = False


@router.get("/assistance/config")
def assistance_config(user: User = Depends(get_current_user)):
    from app.services.ai_interview import available
    return {"enabled": available()}


@router.post("/{session_id}/answers/{answer_id}/suggestion")
def suggest_answer(session_id: int, answer_id: int, payload: AssistanceConsent, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    from app.services.ai_interview import suggest
    session = get_session(db, session_id)
    beneficiary = assert_beneficiary_access(db, user, session.beneficiary_id, True)
    if not beneficiary.consent_given or not payload.consent:
        raise AppError("CONSENT_REQUIRED", "Permission to send this answer for AI language assistance is required.", 422)
    if session.status != InterviewStatus.IN_PROGRESS:
        raise AppError("INTERVIEW_CLOSED", "This interview is closed.", 409)
    answer = next((a for a in session.answers if a.id == answer_id), None)
    if not answer:
        raise AppError("ANSWER_NOT_FOUND", "Interview answer not found.", 404)
    text = answer.corrected_text if answer.corrected_text is not None else answer.transcript
    result = suggest(user_id=user.id, key=answer.question_key, text=text, language=session.language)
    return {**result, "source_text": text}

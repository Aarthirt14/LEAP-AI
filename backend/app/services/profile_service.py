import re
from datetime import time
from decimal import Decimal
from sqlalchemy.orm import Session
from app.models import ExtractedProfileFact, InterviewSession, LivelihoodProfile

PROFILE_FIELDS = [
    "education_level", "current_occupation", "family_occupation",
    "employment_preference", "aspiration_text", "mobility_km",
    "relocation_willingness", "available_hours_start", "available_hours_end",
    "capital_available", "physical_constraints", "family_responsibilities",
]


def completion_percentage(data: dict) -> float:
    present = sum(1 for field in PROFILE_FIELDS if data.get(field) not in (None, ""))
    return round(present / len(PROFILE_FIELDS) * 100, 2)


def upsert_profile(db: Session, beneficiary_id: int, data: dict) -> LivelihoodProfile:
    profile = db.query(LivelihoodProfile).filter_by(beneficiary_id=beneficiary_id).one_or_none()
    if not profile:
        profile = LivelihoodProfile(beneficiary_id=beneficiary_id)
        db.add(profile)
    for key, value in data.items():
        if hasattr(profile, key):
            setattr(profile, key, value)
    profile.profile_completion_percentage = completion_percentage({field: getattr(profile, field, None) for field in PROFILE_FIELDS})
    db.flush()
    return profile


def apply_interview_facts(db: Session, session: InterviewSession) -> LivelihoodProfile:
    supported = set(PROFILE_FIELDS)
    profile_data: dict = {}
    for answer in session.answers:
        value = answer.corrected_text if answer.corrected_text is not None else answer.transcript
        if answer.question_key in supported:
            from app.services.interview_preview import parse_value
            parsed, warning = parse_value(answer.question_key, value)
            if parsed is None:
                profile_data[answer.question_key] = None
                continue
            if answer.question_key in {"available_hours_start", "available_hours_end"}:
                parsed = time.fromisoformat(parsed)
            profile_data[answer.question_key] = parsed
            db.add(ExtractedProfileFact(beneficiary_id=session.beneficiary_id, source_answer_id=answer.id, field_name=answer.question_key, field_value=value, confidence=0.0, verified=False))
    return upsert_profile(db, session.beneficiary_id, profile_data)

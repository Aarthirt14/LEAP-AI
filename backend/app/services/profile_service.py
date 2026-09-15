import re
from datetime import time
from decimal import Decimal
from sqlalchemy.orm import Session
from app.models import ExtractedProfileFact, InterviewSession, LivelihoodProfile

PROFILE_FIELDS = ["education_level", "current_occupation", "family_occupation", "employment_preference", "aspiration_text", "mobility_km", "relocation_willingness", "available_hours_start", "available_hours_end", "capital_available"]


def completion_percentage(data: dict) -> float:
    present = sum(1 for field in PROFILE_FIELDS if data.get(field) not in (None, ""))
    return round(present / len(PROFILE_FIELDS) * 100, 2)


def upsert_profile(db: Session, beneficiary_id: int, data: dict) -> LivelihoodProfile:
    profile = db.query(LivelihoodProfile).filter_by(beneficiary_id=beneficiary_id).one_or_none()
    if not profile:
        profile = LivelihoodProfile(beneficiary_id=beneficiary_id)
        db.add(profile)
    for key, value in data.items():
        if hasattr(profile, key) and value is not None:
            setattr(profile, key, value)
    profile.profile_completion_percentage = completion_percentage({field: getattr(profile, field, None) for field in PROFILE_FIELDS})
    db.flush()
    return profile


def apply_interview_facts(db: Session, session: InterviewSession) -> LivelihoodProfile:
    supported = set(PROFILE_FIELDS)
    profile_data: dict = {}
    for answer in session.answers:
        value = answer.corrected_text or answer.transcript
        if answer.question_key in supported:
            parsed = value
            if answer.question_key in {"mobility_km", "capital_available"}:
                match = re.search(r"[\d,.]+", value)
                if not match:
                    continue
                number = match.group().replace(",", "")
                parsed = float(number) if answer.question_key == "mobility_km" else Decimal(number)
            elif answer.question_key == "relocation_willingness":
                parsed = value.strip().lower() in {"yes", "true", "willing", "ஆம்"}
            elif answer.question_key in {"available_hours_start", "available_hours_end"}:
                match = re.search(r"(\d{1,2})(?::(\d{2}))?", value)
                if not match:
                    continue
                parsed = time(int(match.group(1)) % 24, int(match.group(2) or 0))
            profile_data[answer.question_key] = parsed
            db.add(ExtractedProfileFact(beneficiary_id=session.beneficiary_id, source_answer_id=answer.id, field_name=answer.question_key, field_value=value, confidence=answer.extraction_confidence or 0.5, verified=(answer.extraction_confidence or 0) >= 0.8))
    return upsert_profile(db, session.beneficiary_id, profile_data)

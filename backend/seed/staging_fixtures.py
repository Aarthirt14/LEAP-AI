"""Explicit CLI bootstrap for one disposable service; never imported by the API."""
import os
from datetime import date
from sqlalchemy import select
from app.models import User, UserRole, Qualification, QualificationCompetency, TrainingOpportunity, SourceType, ValidityStatus, VerificationStatus
from app.security.jwt import hash_password, verify_password

SERVICE_ID = "srv-daudbng93c1s73dq4b20"
DATABASE_URL = "sqlite:///./leap_ui_v2_staging.db"
ACCOUNTS = {
    "STAGING_WORKER_PASSWORD": ("worker.staging@example.com", UserRole.FIELD_WORKER),
    "STAGING_FACILITATOR_PASSWORD": ("facilitator.staging@example.com", UserRole.FACILITATOR),
    "STAGING_OFFICER_PASSWORD": ("officer.staging@example.com", UserRole.DISTRICT_OFFICER),
}


def validate_target(env):
    expected = {"LEAP_STAGING_FIXTURES": "enabled", "RENDER_SERVICE_ID": SERVICE_ID,
                "RENDER_GIT_BRANCH": "redesign/leap-ui-v2", "DATABASE_URL": DATABASE_URL}
    if any(env.get(key) != value for key, value in expected.items()):
        raise RuntimeError("Staging bootstrap refused: target does not match the disposable service.")
    values = [env.get(key, "") for key in ACCOUNTS]
    if any(len(v) < 32 or len(set(v)) < 12 for v in values) or len(set(values)) != 3:
        raise RuntimeError("Staging bootstrap requires three distinct strong passwords (32+ characters).")


def populate(db, env):
    validate_target(env)
    # Never change an existing account's password, activation state, or privileges.
    for key, (email, role) in ACCOUNTS.items():
        user = db.scalar(select(User).where(User.email == email))
        if user and (user.role != role or not user.is_active or not verify_password(env[key], user.hashed_password)):
            raise RuntimeError("Staging bootstrap refused: an existing test account differs.")
    for key, (email, role) in ACCOUNTS.items():
        if not db.scalar(select(User).where(User.email == email)):
            db.add(User(email=email, role=role, hashed_password=hash_password(env[key])))
    fixtures = [
        ("STAGING-TAILOR", "Tailoring enterprise", "Tailoring", "Tailoring", False),
        ("STAGING-GARMENT", "Garment repair", "Tailoring", "Garment repair", False),
        ("STAGING-SOLAR", "Solar technician", "Electrical Solar", "Electrical safety", False),
        ("STAGING-EXPIRED", "Expired qualification", "Tailoring", "Tailoring", True),
    ]
    for code, title, sector, competency, expired in fixtures:
        existing = db.scalar(select(Qualification).where(Qualification.qualification_code == code))
        if existing:
            if existing.source_type != SourceType.SYNTHETIC or not existing.qualification_name.startswith("TEST ONLY — "):
                raise RuntimeError("Staging bootstrap refused: catalogue identifier collision.")
            continue
        q = Qualification(qualification_code=code, qualification_name="TEST ONLY — " + title,
            occupational_role=title, sector=sector, minimum_education="8th Standard",
            minimum_experience_years=0, duration_hours=160, qualification_type="Synthetic staging fixture",
            valid_from=date(2020, 1, 1), valid_until=date(2021 if expired else 2028, 12, 31),
            validity_status=ValidityStatus.VALID, source_type=SourceType.SYNTHETIC)
        db.add(q); db.flush()
        db.add(QualificationCompetency(qualification_id=q.id, competency_name=competency, weight=1))
        db.add(TrainingOpportunity(qualification_id=q.id, provider_name="TEST ONLY — synthetic provider",
            provider_type="TEST FIXTURE", district="Madurai", state="Tamil Nadu", location_name="Synthetic location",
            distance_km=5, seats_available=18, source_type=SourceType.SYNTHETIC,
            verification_status=VerificationStatus.SYNTHETIC))
    db.flush()


def main():
    validate_target(os.environ)  # Fail before opening a database connection.
    from app.config import get_settings
    if get_settings().database_url != DATABASE_URL:
        raise RuntimeError("Staging bootstrap refused: resolved database differs.")
    from app.database import SessionLocal
    with SessionLocal() as db:
        try:
            populate(db, os.environ)
            db.commit()
        except Exception:
            db.rollback()
            raise
    print("Staging fixtures ready: three staff accounts and four synthetic qualifications. No credentials logged.")


if __name__ == "__main__":
    main()

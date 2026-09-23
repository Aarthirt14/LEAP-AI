from datetime import date
import argparse

from sqlalchemy import delete, select

from app.config import get_settings
from app.database import SessionLocal
from app.models import (
    Beneficiary, BeneficiarySkill, EmploymentStatus, HumanReview, LivelihoodProfile,
    LivelihoodPathway, OutcomeFollowup, PathwayStatus, Qualification,
    QualificationCompetency, Skill, SourceType, TrainingOpportunity, User, UserRole,
    ValidityStatus, VerificationStatus, Provenance,
)
from app.security.jwt import hash_password
from app.services.pathway_service import generate_pathways

DEMO_PASSWORD = "LeapDemo@2026"
DEMO_EMAILS = {
    UserRole.BENEFICIARY: "beneficiary.demo@demo.leapai.dev",
    UserRole.FIELD_WORKER: "fieldworker.demo@demo.leapai.dev",
    UserRole.FACILITATOR: "facilitator.demo@demo.leapai.dev",
    UserRole.DISTRICT_OFFICER: "officer.demo@demo.leapai.dev",
    UserRole.ADMIN: "admin.demo@demo.leapai.dev",
}


def _get_or_create_user(db, role: UserRole) -> User:
    email = DEMO_EMAILS[role]
    user = db.scalar(select(User).where(User.email == email))
    if not user:
        user = User(email=email, hashed_password=hash_password(DEMO_PASSWORD), role=role)
        db.add(user); db.flush()
    else:
        user.role = role; user.is_active = True
    return user


def _get_or_create_skill(db, name: str, sector: str) -> Skill:
    normalized = name.lower()
    skill = db.scalar(select(Skill).where(Skill.normalized_name == normalized))
    if not skill:
        skill = Skill(name=name, normalized_name=normalized, sector=sector, description="Synthetic demo reference skill")
        db.add(skill); db.flush()
    return skill


def _reset_demo_data(db) -> None:
    demo_users = db.scalars(select(User).where(User.email.in_(list(DEMO_EMAILS.values())))).all()
    demo_user_ids = [user.id for user in demo_users]
    beneficiary_ids = list(db.scalars(select(Beneficiary.id).where(Beneficiary.user_id.in_(demo_user_ids))).all()) if demo_user_ids else []
    beneficiary_ids.extend(db.scalars(select(Beneficiary.id).where(Beneficiary.name.like("Demo %"))).all())
    beneficiary_ids = list(set(beneficiary_ids))
    pathway_ids = list(db.scalars(select(LivelihoodPathway.id).where(LivelihoodPathway.beneficiary_id.in_(beneficiary_ids))).all()) if beneficiary_ids else []
    if pathway_ids:
        db.execute(delete(OutcomeFollowup).where(OutcomeFollowup.pathway_id.in_(pathway_ids)))
        db.execute(delete(HumanReview).where(HumanReview.pathway_id.in_(pathway_ids)))
    if beneficiary_ids:
        db.execute(delete(BeneficiarySkill).where(BeneficiarySkill.beneficiary_id.in_(beneficiary_ids)))
        db.execute(delete(LivelihoodProfile).where(LivelihoodProfile.beneficiary_id.in_(beneficiary_ids)))
        db.execute(delete(LivelihoodPathway).where(LivelihoodPathway.beneficiary_id.in_(beneficiary_ids)))
        db.execute(delete(Beneficiary).where(Beneficiary.id.in_(beneficiary_ids)))
    demo_qualification_ids = list(db.scalars(select(Qualification.id).where(Qualification.qualification_code.like("DEMO-%"))).all())
    if demo_qualification_ids:
        db.execute(delete(TrainingOpportunity).where(TrainingOpportunity.qualification_id.in_(demo_qualification_ids)))
        db.execute(delete(QualificationCompetency).where(QualificationCompetency.qualification_id.in_(demo_qualification_ids)))
        db.execute(delete(Qualification).where(Qualification.id.in_(demo_qualification_ids)))
    if demo_users:
        db.execute(delete(User).where(User.id.in_(demo_user_ids)))
    db.commit()


def _create_reference_data(db) -> list[Qualification]:
    qualifications = [
        ("DEMO-TAILOR-01", "Home Tailoring Enterprise", "Tailoring", "Tailoring", 2, "10th Standard", 160),
        ("DEMO-TAILOR-02", "Garment Operator", "Tailoring", "Garment production", 1, "8th Standard", 240),
        ("DEMO-TAILOR-03", "Advanced Tailoring / Apparel Qualification", "Tailoring", "Advanced apparel", 4, "10th Standard", 360),
        ("DEMO-SOLAR-01", "Solar Installation Technician", "Electrical / Solar", "Solar installation", 2, "10th Standard", 300),
    ]
    competency_map = {
        "DEMO-TAILOR-01": [("garment measurement", .3), ("basic stitching", .3), ("garment repair", .25), ("finishing", .15)],
        "DEMO-TAILOR-02": [("garment measurement", .25), ("basic stitching", .35), ("garment repair", .15), ("finishing", .25)],
        "DEMO-TAILOR-03": [("garment measurement", .2), ("basic stitching", .2), ("garment repair", .25), ("finishing", .35)],
        "DEMO-SOLAR-01": [("electrical safety", .5), ("solar wiring", .5)],
    }
    created = []
    for code, name, sector, role, experience, education, hours in qualifications:
        row = Qualification(qualification_code=code, qualification_name=name, sector=sector, occupational_role=role, nsqf_level="3", minimum_education=education, minimum_experience_years=experience, duration_hours=hours, qualification_type="Synthetic Demo", valid_from=date(2026, 1, 1), valid_until=date(2028, 12, 31), validity_status=ValidityStatus.VALID, source_type=SourceType.SYNTHETIC)
        db.add(row); db.flush()
        db.add_all([QualificationCompetency(qualification_id=row.id, competency_name=competency, weight=weight) for competency, weight in competency_map[code]])
        distance = 5.0 if code == "DEMO-TAILOR-01" else 12.0 if code == "DEMO-TAILOR-02" else 22.0 if code == "DEMO-TAILOR-03" else 9.0
        db.add(TrainingOpportunity(qualification_id=row.id, provider_name="Madurai Livelihood Training Centre", provider_type="DEMO", district="Madurai", state="Tamil Nadu", location_name="Madurai", distance_km=distance, seats_available=18, verification_status=VerificationStatus.SYNTHETIC, source_type=SourceType.SYNTHETIC))
        created.append(row)
    db.flush()
    return created


def _create_beneficiary(db, user: User, field_worker: User, name: str, age: int, occupation: str | None, aspiration: str, pending: bool = False, followup_due: bool = False) -> Beneficiary:
    beneficiary = Beneficiary(user_id=user.id if name == "Meena" else None, name=name, age=age, gender="Female" if name != "Ravi" else "Male", district="Madurai", state="Tamil Nadu", preferred_language="Tamil", digital_literacy="LOW", consent_given=True, created_by=field_worker.id)
    db.add(beneficiary); db.flush()
    if not pending:
        db.add(LivelihoodProfile(beneficiary_id=beneficiary.id, education_level="10th Standard", current_occupation=occupation, family_occupation="Agriculture", employment_preference="SELF_EMPLOYMENT", aspiration_text=aspiration, mobility_km=8, capital_available=5000, family_responsibilities="Available mainly during daytime after household responsibilities", physical_constraints="None reported", profile_completion_percentage=100))
    return beneficiary


def seed_demo_data(reset: bool = False) -> None:
    settings = get_settings()
    if not settings.demo_mode:
        print("Demo seed skipped: set DEMO_MODE=true in the backend environment first.")
        return
    db = SessionLocal()
    try:
        if reset:
            _reset_demo_data(db)
        users = {role: _get_or_create_user(db, role) for role in UserRole}
        skills = {name: _get_or_create_skill(db, name, "Tailoring") for name in ["Tailoring", "Measurement", "Garment Repair"]}
        qualifications = _create_reference_data(db) if not db.scalar(select(Qualification).where(Qualification.qualification_code == "DEMO-TAILOR-01")) else db.scalars(select(Qualification).where(Qualification.qualification_code.like("DEMO-%"))).all()
        meena = db.scalar(select(Beneficiary).where(Beneficiary.user_id == users[UserRole.BENEFICIARY].id))
        if not meena:
            meena = _create_beneficiary(db, users[UserRole.BENEFICIARY], users[UserRole.FIELD_WORKER], "Meena", 34, "Tailoring", "Increase income through tailoring and explore advanced garment work")
            for name, years in [("Tailoring", 6), ("Measurement", 5), ("Garment Repair", 4)]:
                db.add(BeneficiarySkill(beneficiary_id=meena.id, skill_id=skills[name].id, experience_years=years, proficiency_level="INTERMEDIATE", source=SourceType.SELF_REPORTED, formal_certificate=False, verified=False))
        pending = db.scalar(select(Beneficiary).where(Beneficiary.name == "Demo Pending")) or _create_beneficiary(db, users[UserRole.FIELD_WORKER], users[UserRole.FIELD_WORKER], "Demo Pending", 27, None, "Find flexible work", pending=True)
        followup = db.scalar(select(Beneficiary).where(Beneficiary.name == "Demo Follow-up")) or _create_beneficiary(db, users[UserRole.FIELD_WORKER], users[UserRole.FIELD_WORKER], "Demo Follow-up", 41, "Tailoring", "Grow a home enterprise")
        db.flush()
        meena_pathways = list(db.scalars(select(LivelihoodPathway).where(LivelihoodPathway.beneficiary_id == meena.id)).all())
        if not meena_pathways:
            meena_pathways = generate_pathways(db, meena.id)
        followup_pathways = list(db.scalars(select(LivelihoodPathway).where(LivelihoodPathway.beneficiary_id == followup.id)).all())
        if not followup_pathways:
            followup_pathways = generate_pathways(db, followup.id)
        db.flush()
        if followup_pathways and not db.scalar(select(OutcomeFollowup).where(OutcomeFollowup.beneficiary_id == followup.id, OutcomeFollowup.followup_day == 90)):
            db.add(OutcomeFollowup(beneficiary_id=followup.id, pathway_id=followup_pathways[0].id, followup_day=90, training_started=True, training_completed=True, employment_status=EmploymentStatus.TRAINING, verification_status=Provenance.USER_REPORTED, reported_by=users[UserRole.FIELD_WORKER].id))
        red_pathway = next((pathway for pathway in meena_pathways if pathway.confidence_level.value == "RED"), None)
        if not red_pathway and meena_pathways:
            red_pathway = meena_pathways[-1]
            red_pathway.confidence_level = "RED"
        if red_pathway and not db.scalar(select(HumanReview).where(HumanReview.pathway_id == red_pathway.id, HumanReview.status == "OPEN")):
            db.add(HumanReview(beneficiary_id=meena.id, pathway_id=red_pathway.id, reason_code="LOW_CONFIDENCE", reason_description="Demo review case: inspect training distance and missing advanced competencies."))
        db.commit()
        print("Demo data seeded. Accounts use DEMO_MODE only and the shared password is LeapDemo@2026.")
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed deterministic LEAP AI demo data.")
    parser.add_argument("--reset", action="store_true", help="Delete and recreate only demo records.")
    args = parser.parse_args()
    seed_demo_data(reset=args.reset)


if __name__ == "__main__":
    main()

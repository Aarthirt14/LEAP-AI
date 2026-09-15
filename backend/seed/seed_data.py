from datetime import date, datetime, timezone
from app.database import SessionLocal
from app.models import (
    Beneficiary, BeneficiarySkill, EmploymentStatus, LivelihoodPathway,
    LivelihoodProfile, OutcomeFollowup, PathwayStatus, PathwayType, Provenance,
    Qualification, QualificationCompetency, Skill, SourceType, TrainingOpportunity,
    User, UserRole, ValidityStatus, VerificationStatus,
)
from app.security.jwt import hash_password

SECTORS = ["Electrical / Solar", "Tailoring", "Healthcare", "Food Processing", "Retail"]
ROLES = ["Solar Technician", "Home Tailoring Enterprise", "Healthcare Assistant", "Food Processing Operator", "Retail Associate"]


def seed() -> None:
    db = SessionLocal()
    if db.query(User).count():
        print("Seed skipped: database already contains users")
        return
    users = {
        role: User(email=f"{role.value.lower()}@leap.demo", hashed_password=hash_password("DemoPassword123!"), role=role)
        for role in UserRole
    }
    db.add_all(users.values()); db.flush()
    skills = [Skill(name=name, normalized_name=name.lower(), sector=sector, description="Synthetic demonstration skill") for name, sector in [("Tailoring", "Tailoring"), ("Electrical wiring", "Electrical / Solar"), ("Patient support", "Healthcare")]]
    db.add_all(skills); db.flush()
    qualifications = []
    for i in range(100):
        sector = SECTORS[i % len(SECTORS)]; title = ROLES[i % len(ROLES)] if i < 5 else f"{sector} Role {i+1}"
        validity = ValidityStatus.EXPIRED if i in {96, 97} else ValidityStatus.INVALID if i == 98 else ValidityStatus.UNKNOWN if i == 99 else ValidityStatus.VALID
        q = Qualification(qualification_code=f"SYN-Q-{i+1:03}", qualification_name=f"Synthetic Qualification {i+1}", sector=sector, occupational_role=title, nsqf_level=str(3 + i % 3), minimum_education="8th Standard" if i % 2 else "10th Standard", minimum_experience_years=2 if i % 5 == 0 else 0, duration_hours=200 + (i % 6) * 80, qualification_type="Synthetic Demo", valid_from=date(2026, 1, 1), valid_until=date(2028, 12, 31), validity_status=validity, source_type=SourceType.SYNTHETIC, source_url=None, last_verified_at=None)
        db.add(q); db.flush(); db.add_all([QualificationCompetency(qualification_id=q.id, competency_name=f"{sector.split()[0]} foundation", weight=0.6), QualificationCompetency(qualification_id=q.id, competency_name="Workplace safety", weight=0.4)]); qualifications.append(q)
    db.flush()
    for i, q in enumerate(qualifications[:40]):
        db.add(TrainingOpportunity(qualification_id=q.id, provider_name=f"Synthetic Training Centre {i+1}", provider_type="DEMO", district="Madurai", state="Tamil Nadu", location_name=f"Demo location {i+1}", distance_km=float(5 + i % 16), seats_available=15 + i % 20, verification_status=VerificationStatus.SYNTHETIC, source_type=SourceType.SYNTHETIC))
    personas = [
        ("Kavitha", "10th Standard", "Tailoring", 4, "Tailoring", "Solar / Electrical", 7, 8000, False),
        ("Ravi", "8th Standard", "Electrical wiring", 6, "Electrical work", "Electrical wage employment", 15, 3000, False),
        ("Meena", "12th Standard", None, 0, None, "Healthcare", 5, 2000, False),
    ]
    beneficiaries = []
    for i in range(30):
        base = personas[i] if i < 3 else (f"Demo Beneficiary {i+1}", "10th Standard", "Tailoring" if i % 2 else "Electrical wiring", 1 + i % 7, "Informal work", SECTORS[i % 5], 5 + i % 12, 2000 + i * 500, False)
        user_id = users[UserRole.BENEFICIARY].id if i == 0 else None
        b = Beneficiary(user_id=user_id, name=base[0], age=22 + i % 25, gender="Female" if i % 2 == 0 else "Male", district="Madurai", state="Tamil Nadu", preferred_language="Tamil", digital_literacy="LOW", consent_given=True, created_by=users[UserRole.FIELD_WORKER].id)
        db.add(b); db.flush(); db.add(LivelihoodProfile(beneficiary_id=b.id, education_level=base[1], current_occupation=base[2], family_occupation=base[4], employment_preference="EMPLOYMENT", aspiration_text=base[5], mobility_km=base[6], relocation_willingness=base[8], capital_available=base[7], family_responsibilities="Available 10 AM–3 PM" if base[0] == "Meena" else None, profile_completion_percentage=90))
        if base[2]:
            skill = next((s for s in skills if s.name == base[2]), skills[0]); db.add(BeneficiarySkill(beneficiary_id=b.id, skill_id=skill.id, experience_years=base[3], proficiency_level="INTERMEDIATE", source=SourceType.FIELD_WORKER, formal_certificate=False, verified=i < 3))
        beneficiaries.append(b)
    db.flush()
    positive = [EmploymentStatus.EMPLOYED, EmploymentStatus.SELF_EMPLOYED]
    for i, beneficiary in enumerate(beneficiaries):
        q = qualifications[i % 5]
        p = LivelihoodPathway(beneficiary_id=beneficiary.id, qualification_id=q.id, pathway_type=PathwayType.ASPIRATIONAL if i % 2 else PathwayType.FASTEST, title=q.occupational_role, description="Synthetic seeded pathway", skill_fit_score=.7, aspiration_fit_score=.8, opportunity_score=.7, eligibility_score=1, mobility_score=.8, training_access_score=.7, training_burden_score=.7, outcome_evidence_score=.6, overall_score=72+i%15, confidence_level="AMBER", recommended_route="BRIDGE_TRAINING", status=PathwayStatus.SELECTED)
        db.add(p); db.flush()
        for day in (30, 90, 180):
            employed = i % 4 != 0
            db.add(OutcomeFollowup(beneficiary_id=beneficiary.id, pathway_id=p.id, followup_day=day, training_started=True, training_completed=day >= 90, certified=day >= 90 and i % 3 != 0, employment_status=positive[i % 2] if employed and day >= 90 else EmploymentStatus.TRAINING, livelihood_related_to_pathway=employed if day >= 90 else None, income_band="₹10,000–₹15,000" if employed and day >= 90 else None, still_active=employed if day == 180 else None, verification_status=Provenance.UNVERIFIED, reported_by=users[UserRole.FIELD_WORKER].id))
    db.commit(); db.close(); print("Seeded 100 qualifications, 40 opportunities, 30 beneficiaries and 90 outcome records. All domain data is SYNTHETIC/UNVERIFIED.")


if __name__ == "__main__": seed()

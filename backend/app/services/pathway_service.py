from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload
from app.engines.pathway_engine import rank_pathways
from app.models import Beneficiary, BeneficiarySkill, ConfidenceLevel, HumanReview, LivelihoodPathway, PathwayStatus, PathwayType, Qualification, RecommendationEvidence, SourceType, TrainingOpportunity, VerificationStatus
from app.services.outcome_evidence_service import qualification_evidence_scores


def _profile_dict(beneficiary: Beneficiary) -> dict:
    profile = beneficiary.profile
    skills = beneficiary.skills
    return {
        "education_level": profile.education_level if profile else None,
        "family_occupation": profile.family_occupation if profile else None,
        "aspiration_text": profile.aspiration_text if profile else None,
        "mobility_km": profile.mobility_km if profile else None,
        "capital_available": float(profile.capital_available or 0) if profile else 0,
        "family_responsibilities": profile.family_responsibilities if profile else None,
        "profile_completion_percentage": profile.profile_completion_percentage if profile else 0,
        "experience_years": max((s.experience_years for s in skills), default=0),
        "education_verified": False,
        "evidence_count": len(skills),
        "extraction_confidences": [],
    }


def generate_pathways(db: Session, beneficiary_id: int) -> list[LivelihoodPathway]:
    beneficiary = db.execute(select(Beneficiary).where(Beneficiary.id == beneficiary_id).options(selectinload(Beneficiary.profile), selectinload(Beneficiary.skills).selectinload(BeneficiarySkill.skill))).scalar_one()
    qualifications = db.execute(select(Qualification).options(selectinload(Qualification.competencies))).scalars().all()
    trainings = db.execute(select(TrainingOpportunity).where(TrainingOpportunity.district == beneficiary.district)).scalars().all()
    training_map = {t.qualification_id: {"distance_km": t.distance_km, "seats_available": t.seats_available, "verification_status": t.verification_status.value} for t in trainings}
    q_data = [{"id": q.id, "title": q.occupational_role, "sector": q.sector, "validity_status": q.validity_status.value, "minimum_education": q.minimum_education, "minimum_experience_years": q.minimum_experience_years, "duration_hours": q.duration_hours, "competencies": [{"name": c.competency_name, "weight": c.weight} for c in q.competencies]} for q in qualifications]
    skill_data = [{"name": s.skill.name, "experience_years": s.experience_years, "verified": s.verified} for s in beneficiary.skills]
    ranked = rank_pathways(_profile_dict(beneficiary), skill_data, q_data, training_map, qualification_evidence_scores(db), gender=beneficiary.gender)
    db.execute(delete(LivelihoodPathway).where(LivelihoodPathway.beneficiary_id == beneficiary_id, LivelihoodPathway.status == PathwayStatus.PROPOSED))
    created: list[LivelihoodPathway] = []
    for result in ranked:
        parts = result["score_parts"]
        pathway = LivelihoodPathway(beneficiary_id=beneficiary_id, qualification_id=result["qualification_id"], pathway_type=PathwayType(result["pathway_type"]), title=result["title"], description=f"Deterministic pathway for {result['sector']} based on profile evidence and constraints.", skill_fit_score=parts["skill_fit"], aspiration_fit_score=parts["aspiration_fit"], opportunity_score=parts["opportunity"], eligibility_score=parts["eligibility"], mobility_score=parts["mobility"], training_access_score=parts["opportunity"], training_burden_score=parts["training_burden"], outcome_evidence_score=parts["outcome_evidence"], overall_score=result["score"], confidence_level=ConfidenceLevel(result["confidence"]), recommended_route=result["rpl"]["recommended_route"])
        db.add(pathway); db.flush()
        db.add(RecommendationEvidence(pathway_id=pathway.id, evidence_type="ASPIRATION", label="Aspiration fit", value=str(parts["aspiration_fit"]), source_type=SourceType.SELF_REPORTED, source_reference="livelihood_profile.aspiration_text", verification_status=VerificationStatus.UNVERIFIED))
        if pathway.confidence_level == ConfidenceLevel.RED:
            db.add(HumanReview(beneficiary_id=beneficiary_id, pathway_id=pathway.id, reason_code="LOW_CONFIDENCE", reason_description=", ".join(result["confidence_reasons"])))
        created.append(pathway)
    db.flush()
    return created

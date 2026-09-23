from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload
from app.engines.pathway_engine import rank_pathways
from app.engines.skill_ontology import occupation_match
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


def _add_evidence(db: Session, pathway_id: int, evidence_type: str, label: str, value: str, source_ref: str, source_type: SourceType, verification: VerificationStatus) -> None:
    db.add(RecommendationEvidence(
        pathway_id=pathway_id, evidence_type=evidence_type, label=label, value=value,
        source_type=source_type, source_reference=source_ref, verification_status=verification,
    ))


def _pathway_description(title: str, sector: str | None, aspiration_fit: float, skill_fit: float) -> str:
    text = f"{title} {sector or ''}".lower()
    if "tailor" in text or "apparel" in text:
        if aspiration_fit >= 0.75 and skill_fit >= 0.6:
            return "This pathway builds on your existing tailoring experience and matches your goal of working as a tailor."
        return "This pathway uses your tailoring background but may require additional production-focused training."
    if "solar" in text:
        return "This pathway matches your interest in technical work but requires new technical training."
    if aspiration_fit >= 0.75:
        return f"This pathway matches your stated goal and the evidence currently available in your profile."
    if skill_fit >= 0.6:
        return "This pathway builds on skills and experience already present in your profile."
    return "This pathway is a possible option based on your current profile and local opportunity data."


def generate_pathways(db: Session, beneficiary_id: int) -> list[LivelihoodPathway]:
    beneficiary = db.execute(select(Beneficiary).where(Beneficiary.id == beneficiary_id).options(selectinload(Beneficiary.profile), selectinload(Beneficiary.skills).selectinload(BeneficiarySkill.skill))).scalar_one()
    qualifications = db.execute(select(Qualification).options(selectinload(Qualification.competencies))).scalars().all()
    trainings = db.execute(select(TrainingOpportunity).where(TrainingOpportunity.district == beneficiary.district)).scalars().all()
    training_map = {t.qualification_id: {"distance_km": t.distance_km, "seats_available": t.seats_available, "verification_status": t.verification_status.value, "provider_name": t.provider_name} for t in trainings}
    q_data = [{"id": q.id, "title": q.occupational_role, "sector": q.sector, "validity_status": q.validity_status.value, "minimum_education": q.minimum_education, "minimum_experience_years": q.minimum_experience_years, "duration_hours": q.duration_hours, "competencies": [{"name": c.competency_name, "weight": c.weight} for c in q.competencies]} for q in qualifications]
    skill_data = [{"name": s.skill.name, "experience_years": s.experience_years, "verified": s.verified} for s in beneficiary.skills]
    ranked = rank_pathways(_profile_dict(beneficiary), skill_data, q_data, training_map, qualification_evidence_scores(db), gender=beneficiary.gender)
    db.execute(delete(LivelihoodPathway).where(LivelihoodPathway.beneficiary_id == beneficiary_id, LivelihoodPathway.status == PathwayStatus.PROPOSED))
    created: list[LivelihoodPathway] = []
    profile = beneficiary.profile
    for result in ranked:
        parts = result["score_parts"]
        training = training_map.get(result["qualification_id"])
        pathway = LivelihoodPathway(
            beneficiary_id=beneficiary_id, qualification_id=result["qualification_id"],
            pathway_type=PathwayType(result["pathway_type"]), title=result["title"],
            description=_pathway_description(result["title"], result.get("sector"), parts["aspiration_fit"], parts["skill_fit"]),
            skill_fit_score=parts["skill_fit"], aspiration_fit_score=parts["aspiration_fit"],
            opportunity_score=parts["opportunity"], eligibility_score=parts["eligibility"],
            mobility_score=parts["mobility"], training_access_score=parts["opportunity"],
            training_burden_score=parts["training_burden"], outcome_evidence_score=parts["outcome_evidence"],
            overall_score=result["score"], confidence_level=ConfidenceLevel(result["confidence"]),
            recommended_route=result["rpl"]["recommended_route"],
        )
        db.add(pathway); db.flush()

        # --- Traceable evidence: 8 categories strictly grounded in backend data ---
        # 1. ASPIRATION
        if profile and profile.aspiration_text:
            aspiration_strength = parts["aspiration_fit"]
            aspiration_label = "Strong match" if aspiration_strength >= 0.75 else "Possible match" if aspiration_strength > 0 else "Not yet matched"
            _add_evidence(db, pathway.id, "ASPIRATION", "Career aspiration fit",
                f"{aspiration_label} — You said: '{profile.aspiration_text}'.",
                "livelihood_profile.aspiration_text", SourceType.SELF_REPORTED, VerificationStatus.UNVERIFIED)

        # 2. SKILL
        skills_summary = []
        for bs in beneficiary.skills:
            status_text = "Verified" if bs.verified else "Self-reported"
            skills_summary.append(f"{bs.skill.name} ({bs.experience_years}y, {status_text})")
        if skills_summary:
            years = max((float(skill.experience_years) for skill in beneficiary.skills), default=0)
            years_text = f"{years:g} years" if years.is_integer() else f"{years:g} years"
            skill_label = "Strong match" if parts["skill_fit"] >= 0.75 else "Partial match" if parts["skill_fit"] > 0 else "Not yet matched"
            _add_evidence(db, pathway.id, "SKILL", "Matched skills and experience",
                f"{skill_label} — You reported {years_text} of {beneficiary.skills[0].skill.name.lower()} experience. " + ", ".join(skills_summary[:5]),
                "beneficiary_skills", SourceType.FIELD_WORKER if any(s.verified for s in beneficiary.skills) else SourceType.SELF_REPORTED,
                VerificationStatus.VERIFIED if any(s.verified for s in beneficiary.skills) else VerificationStatus.UNVERIFIED)

        # 3. ELIGIBILITY
        q_obj = next((q for q in qualifications if q.id == result["qualification_id"]), None)
        min_edu = q_obj.minimum_education if q_obj else None
        ben_edu = profile.education_level if profile else "Not specified"
        _add_evidence(db, pathway.id, "ELIGIBILITY", "Educational qualification eligibility",
            f"Eligible — You completed {ben_edu}; this pathway requires {min_edu}." if min_edu else f"Eligible — Your education is {ben_edu}.",
            "livelihood_profile.education_level", SourceType.SELF_REPORTED, VerificationStatus.UNVERIFIED)

        # 4. OPPORTUNITY
        if training and training.get("distance_km") is not None and training.get("seats_available") is not None:
            provider = training.get("provider_name", "Local training centre")
            seats = training.get("seats_available", 0)
            dist = training.get("distance_km")
            dist_str = f" | {dist:.1f} km away" if dist is not None else ""
            _add_evidence(db, pathway.id, "OPPORTUNITY", f"Local training centre: {provider}",
                f"{seats} seats available{dist_str}",
                "training_opportunities", SourceType.SYNTHETIC, VerificationStatus.SYNTHETIC)
        else:
            _add_evidence(db, pathway.id, "OPPORTUNITY", "Training availability",
                "Qualification available; local training availability is not yet verified.",
                "training_opportunities", SourceType.SYNTHETIC, VerificationStatus.UNVERIFIED)

        # 5. MOBILITY
        pref_km = profile.mobility_km if profile else None
        t_dist = training.get("distance_km") if training else None
        if pref_km is not None:
            if t_dist is None:
                fits = "Unable to confirm travel fit"
                t_str = "Training location not yet verified"
            else:
                fits = "Fits within range" if t_dist <= pref_km else f"Exceeds range by {t_dist - pref_km:.1f} km"
                t_str = f"{t_dist:.1f} km"
            _add_evidence(db, pathway.id, "MOBILITY", "Travel distance compatibility",
                f"Your range: {pref_km} km | Centre distance: {t_str} ({fits})",
                "livelihood_profile.mobility_km", SourceType.SELF_REPORTED, VerificationStatus.UNVERIFIED)

        # 6. RPL (Recognition of Prior Learning)
        rpl_info = result.get("rpl", {})
        matched_comp = rpl_info.get("matched_competencies", [])
        missing_comp = rpl_info.get("missing_competencies", [])
        overlap_score = rpl_info.get("overlap_score", 0.0)
        route_name = rpl_info.get("recommended_route", "FULL_TRAINING")
        route_explanations = {
            "RPL": "Your existing experience strongly matches this qualification. An RPL assessment may allow formal recognition.",
            "RPL_OR_BRIDGE": "Your experience matches several competencies, but some skills still need training.",
            "BRIDGE_TRAINING": "Your experience provides a starting point, but additional bridge training is needed.",
            "FULL_TRAINING": "We could not verify enough matching competencies for RPL yet.",
        }
        rpl_details = [route_explanations.get(route_name, "This route is based on the evidence currently available."), f"Matched competency overlap: {int(overlap_score * 100)}%"]
        if matched_comp:
            rpl_details.append(f"Matched: {', '.join(matched_comp[:3])}")
        if missing_comp:
            rpl_details.append(f"To learn: {', '.join(missing_comp[:3])}")
        _add_evidence(db, pathway.id, "RPL", "Prior learning and competency assessment",
            " | ".join(rpl_details),
            "rpl_engine", SourceType.SELF_REPORTED, VerificationStatus.UNVERIFIED)

        # 7. CONSTRAINT
        constraints_list = result.get("constraints", [])
        if constraints_list:
            for constraint in constraints_list:
                ctype = constraint.get("constraint_type", "GENERAL")
                pen = constraint.get("penalty", 0.0)
                eff = constraint.get("effect", "Adjusted score based on practical limits.")
                _add_evidence(db, pathway.id, "CONSTRAINT", f"Constraint: {ctype.replace('_', ' ').title()}",
                    f"{eff} (Penalty: -{pen:.2f})",
                    "constraint_engine", SourceType.SELF_REPORTED, VerificationStatus.UNVERIFIED)
        else:
            _add_evidence(db, pathway.id, "CONSTRAINT", "Practical constraints check",
                "No mobility, capital, or schedule constraints violated",
                "constraint_engine", SourceType.SELF_REPORTED, VerificationStatus.UNVERIFIED)

        # 8. OUTCOME EVIDENCE (Recorded ONLY if historical outcome score was present in evidence_scores)
        outcome_scores = qualification_evidence_scores(db)
        raw_outcome_score = outcome_scores.get(result["qualification_id"])
        if raw_outcome_score is not None:
            _add_evidence(db, pathway.id, "OUTCOME_EVIDENCE", "Historical outcome evidence",
                f"Historical employment score: {raw_outcome_score:.2f} based on verified 90-day post-training records",
                "outcome_evidence_service", SourceType.FIELD_WORKER, VerificationStatus.VERIFIED)

        if pathway.confidence_level == ConfidenceLevel.RED:
            db.add(HumanReview(beneficiary_id=beneficiary_id, pathway_id=pathway.id, reason_code="LOW_CONFIDENCE", reason_description=", ".join(result["confidence_reasons"])))
        created.append(pathway)
    db.flush()
    return created


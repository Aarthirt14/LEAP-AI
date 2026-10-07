from app.config import get_settings
from app.engines.eligibility_engine import evaluate_eligibility
from datetime import date
from app.engines.qualification_validity import qualification_is_current
from app.engines.skill_ontology import canonical_occupations
from app.engines.aspiration_guard import protect_aspiration
from app.engines.confidence_engine import calculate_confidence
from app.engines.constraint_engine import evaluate_constraints
from app.engines.rpl_engine import evaluate_rpl
from app.engines.skill_ontology import occupation_match


def rank_pathways(profile: dict, skills: list[dict], qualifications: list[dict], training_by_qualification: dict[int, dict], outcome_scores: dict[int, float | None], *, gender: str | None = None, caste: str | None = None) -> list[dict]:
    settings = get_settings()
    valid = [q for q in qualifications if qualification_is_current(q)]
    guarded = {g.title: g for g in protect_aspiration(candidates=valid, skills=skills, family_occupation=profile.get("family_occupation"), aspiration=profile.get("aspiration_text"), education=profile.get("education_level"), constraints=profile, gender=gender, caste=caste)}
    ranked: list[dict] = []
    for q in valid:
        metadata = q.get("source_metadata") or {}
        official = q.get("source_type") == "NQR"
        eligibility_result = evaluate_eligibility(profile, metadata.get("eligibility_rules")) if official or metadata.get("eligibility_rules") is not None else None
        if eligibility_result and eligibility_result["status"] == "NOT_ELIGIBLE":
            continue
        if official:
            try:
                age = (date.today() - date.fromisoformat(metadata["source_checked_on"])).days
                if not 0 <= age <= 30:
                    continue
            except (ValueError, KeyError, TypeError):
                continue
        raw_training = training_by_qualification.get(q["id"])
        training = raw_training if raw_training and raw_training.get("verification_status") == "VERIFIED" and raw_training.get("source_type") != "SYNTHETIC" else None
        constraints = evaluate_constraints(profile, {**q, "minimum_education": None, "experience_mandatory": False} if eligibility_result else q, training)
        if constraints["decision"] == "REJECT":
            continue
        competencies = q.get("competencies", [])
        rpl = evaluate_rpl(skills, competencies, float(q.get("minimum_experience_years", 0)))
        guard = guarded[q["title"]]
        skill_fit = max(rpl.overlap_score, guard.skill_evidence_score)
        aspiration_fit = max(guard.aspiration_score, occupation_match(profile.get("aspiration_text"), q["title"], q.get("sector", "")))
        training_known = bool(training)
        location_known = bool(training and training.get("distance_km") is not None)
        seats_known = bool(training and training.get("seats_available") is not None)
        opportunity = 0.85 if training and seats_known and (training.get("seats_available") or 0) > 0 and location_known else 0.5
        eligibility = 0.5 if eligibility_result and eligibility_result["status"] == "NEEDS_VERIFICATION" else 1.0
        mobility_reason = next((r for r in constraints["reasons"] if r["constraint_type"] == "MOBILITY"), None)
        mobility = 0.5 if profile.get("mobility_km") is not None and not location_known else max(0.0, 1.0 - (mobility_reason["penalty"] if mobility_reason else 0))
        training_burden = max(0.1, 1.0 - min(float(q.get("duration_hours") or 0) / 1200, 0.9))
        outcome = outcome_scores.get(q["id"])
        score_parts = {"skill_fit": skill_fit, "aspiration_fit": aspiration_fit, "opportunity": opportunity, "eligibility": eligibility, "mobility": mobility, "training_burden": training_burden, "outcome_evidence": outcome if outcome is not None else 0.5}
        score = sum(score_parts[k] * settings.scoring_weights[k] for k in settings.scoring_weights)
        score = max(0, score - constraints["total_penalty"])
        confidence = calculate_confidence(profile_completion=float(profile.get("profile_completion_percentage", 0)), extraction_confidences=profile.get("extraction_confidences", []), education_verified=bool(profile.get("education_verified", False)), qualification_validity=q.get("validity_status", "UNKNOWN"), training_verification=training.get("verification_status") if training else None, evidence_count=int(profile.get("evidence_count", 0)), training_location_known=location_known if raw_training else None, training_seats_known=seats_known if raw_training else None)
        if eligibility_result and eligibility_result["status"] == "NEEDS_VERIFICATION":
            confidence["reasons"].append("ELIGIBILITY_FACTS_NEED_VERIFICATION")
            confidence["level"] = "RED"
        if official and not competencies:
            confidence["reasons"].append("COMPETENCY_MAPPING_NEEDS_REVIEW")
            confidence["level"] = "RED"
        unsupported = any(text and any(ord(ch) > 127 and ch.isalpha() for ch in text) and not canonical_occupations(text) for text in [profile.get("current_occupation"), profile.get("aspiration_text"), *(s.get("name") for s in skills)])
        if unsupported:
            confidence["reasons"].append("LANGUAGE_MAPPING_NEEDS_CONFIRMATION")
            confidence["level"] = "RED"
        if not q.get("valid_from") or not q.get("valid_until"):
            confidence["reasons"].append("QUALIFICATION_DATES_NEED_CONFIRMATION")
            if confidence["level"] == "GREEN": confidence["level"] = "AMBER"
        if outcome is None and confidence["level"] == "GREEN":
            confidence["level"] = "AMBER"
        ranked.append({"eligibility_assessment": eligibility_result, "qualification_id": q["id"], "title": q["title"], "sector": q.get("sector"), "pathway_type": guard.pathway_type, "score": round(score * 100, 2), "confidence": confidence["level"], "confidence_reasons": confidence["reasons"], "rpl": rpl.as_dict(), "constraints": constraints["reasons"], "score_parts": score_parts, "training_available": training_known, "training_location_known": location_known, "training_seats_known": seats_known})
    ranked.sort(key=lambda item: (-item["score"], item["title"]))
    selected: list[dict] = []
    for kind in ("FASTEST", "ASPIRATIONAL", "ALTERNATIVE"):
        match = next((item for item in ranked if item["pathway_type"] == kind and item not in selected), None)
        if match:
            selected.append(match)
    for item in ranked:
        if len(selected) >= 3:
            break
        if item not in selected:
            selected.append(item)
    return selected[:3]

from app.config import get_settings
from app.engines.aspiration_guard import protect_aspiration
from app.engines.confidence_engine import calculate_confidence
from app.engines.constraint_engine import evaluate_constraints
from app.engines.rpl_engine import evaluate_rpl
from app.engines.skill_ontology import occupation_match


def rank_pathways(profile: dict, skills: list[dict], qualifications: list[dict], training_by_qualification: dict[int, dict], outcome_scores: dict[int, float | None], *, gender: str | None = None, caste: str | None = None) -> list[dict]:
    settings = get_settings()
    valid = [q for q in qualifications if q.get("validity_status") not in {"EXPIRED", "INVALID"}]
    guarded = {g.title: g for g in protect_aspiration(candidates=valid, skills=skills, family_occupation=profile.get("family_occupation"), aspiration=profile.get("aspiration_text"), education=profile.get("education_level"), constraints=profile, gender=gender, caste=caste)}
    ranked: list[dict] = []
    for q in valid:
        constraints = evaluate_constraints(profile, q, training_by_qualification.get(q["id"]))
        if constraints["decision"] == "REJECT":
            continue
        competencies = q.get("competencies", [])
        rpl = evaluate_rpl(skills, competencies, float(q.get("minimum_experience_years", 0)))
        guard = guarded[q["title"]]
        skill_fit = max(rpl.overlap_score, guard.skill_evidence_score)
        aspiration_fit = max(guard.aspiration_score, occupation_match(profile.get("aspiration_text"), q["title"], q.get("sector", "")))
        training = training_by_qualification.get(q["id"])
        training_known = bool(training)
        location_known = bool(training and training.get("distance_km") is not None)
        seats_known = bool(training and training.get("seats_available") is not None)
        opportunity = 0.85 if training and seats_known and (training.get("seats_available") or 0) > 0 and location_known else 0.5
        eligibility = 1.0
        mobility_reason = next((r for r in constraints["reasons"] if r["constraint_type"] == "MOBILITY"), None)
        mobility = 0.5 if profile.get("mobility_km") is not None and not location_known else max(0.0, 1.0 - (mobility_reason["penalty"] if mobility_reason else 0))
        training_burden = max(0.1, 1.0 - min(float(q.get("duration_hours") or 0) / 1200, 0.9))
        outcome = outcome_scores.get(q["id"])
        score_parts = {"skill_fit": skill_fit, "aspiration_fit": aspiration_fit, "opportunity": opportunity, "eligibility": eligibility, "mobility": mobility, "training_burden": training_burden, "outcome_evidence": outcome if outcome is not None else 0.5}
        score = sum(score_parts[k] * settings.scoring_weights[k] for k in settings.scoring_weights)
        score = max(0, score - constraints["total_penalty"])
        confidence = calculate_confidence(profile_completion=float(profile.get("profile_completion_percentage", 0)), extraction_confidences=profile.get("extraction_confidences", []), education_verified=bool(profile.get("education_verified", False)), qualification_validity=q.get("validity_status", "UNKNOWN"), training_verification=training.get("verification_status") if training else None, evidence_count=int(profile.get("evidence_count", 0)), training_location_known=location_known if training_known else None, training_seats_known=seats_known if training_known else None)
        if outcome is None and confidence["level"] == "GREEN":
            confidence["level"] = "AMBER"
        ranked.append({"qualification_id": q["id"], "title": q["title"], "sector": q.get("sector"), "pathway_type": guard.pathway_type, "score": round(score * 100, 2), "confidence": confidence["level"], "confidence_reasons": confidence["reasons"], "rpl": rpl.as_dict(), "constraints": constraints["reasons"], "score_parts": score_parts, "training_available": training_known, "training_location_known": location_known, "training_seats_known": seats_known})
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

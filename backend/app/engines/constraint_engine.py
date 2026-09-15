EDUCATION_RANK = {"none": 0, "5th": 1, "8th": 2, "10th": 3, "12th": 4, "diploma": 5, "graduate": 6}


def education_rank(value: str | None) -> int:
    if not value:
        return -1
    text = value.lower()
    return next((rank for key, rank in EDUCATION_RANK.items() if key in text), -1)


def evaluate_constraints(profile: dict, qualification: dict, training: dict | None = None) -> dict:
    reasons: list[dict] = []
    validity = qualification.get("validity_status", "UNKNOWN")
    if validity in {"EXPIRED", "INVALID"}:
        reasons.append({"constraint_type": "QUALIFICATION_VALIDITY", "severity": "HIGH", "effect": "REJECT", "penalty": 1.0, "detail": {"status": validity}})
        return {"decision": "REJECT", "total_penalty": 1.0, "reasons": reasons}
    minimum = qualification.get("minimum_education")
    if minimum and education_rank(profile.get("education_level")) < education_rank(minimum):
        reasons.append({"constraint_type": "EDUCATION", "severity": "HIGH", "effect": "REJECT", "penalty": 1.0, "detail": {"required": minimum, "actual": profile.get("education_level")}})
        return {"decision": "REJECT", "total_penalty": 1.0, "reasons": reasons}
    required_experience = float(qualification.get("minimum_experience_years", 0))
    if qualification.get("experience_mandatory") and float(profile.get("experience_years", 0)) < required_experience:
        reasons.append({"constraint_type": "EXPERIENCE", "severity": "HIGH", "effect": "HUMAN_REVIEW", "penalty": 0.35, "detail": {"required_years": required_experience}})
    mobility = profile.get("mobility_km")
    distance = (training or {}).get("distance_km")
    if mobility is not None and distance is not None and distance > mobility:
        gap_ratio = (distance - mobility) / max(distance, 1)
        penalty = round(min(0.25, 0.08 + 0.22 * gap_ratio), 3)
        reasons.append({"constraint_type": "MOBILITY", "severity": "MEDIUM", "effect": "SCORE_PENALTY", "penalty": penalty, "detail": {"preferred_km": mobility, "required_km": distance}})
    required_capital = float(qualification.get("required_capital", 0) or 0)
    capital = float(profile.get("capital_available", 0) or 0)
    if required_capital > capital:
        ratio = (required_capital - capital) / max(required_capital, 1)
        reasons.append({"constraint_type": "CAPITAL", "severity": "MEDIUM", "effect": "SCORE_PENALTY", "penalty": round(min(0.2, 0.05 + ratio * 0.15), 3), "detail": {"available": capital, "required": required_capital}})
    duration = qualification.get("duration_hours") or 0
    if duration > 600 and profile.get("family_responsibilities"):
        reasons.append({"constraint_type": "TRAINING_DURATION", "severity": "LOW", "effect": "SCORE_PENALTY", "penalty": 0.08, "detail": {"duration_hours": duration}})
    total = round(min(0.75, sum(r["penalty"] for r in reasons)), 3)
    decision = "HUMAN_REVIEW" if any(r["effect"] == "HUMAN_REVIEW" for r in reasons) else "ALLOW"
    return {"decision": decision, "total_penalty": total, "reasons": reasons}

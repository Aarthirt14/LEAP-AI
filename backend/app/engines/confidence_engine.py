def calculate_confidence(*, profile_completion: float, extraction_confidences: list[float], education_verified: bool, qualification_validity: str, training_verification: str | None, contradictory_answers: bool = False, critical_constraints_unclear: bool = False, evidence_count: int = 0, training_location_known: bool | None = None, training_seats_known: bool | None = None) -> dict:
    reasons: list[str] = []
    if contradictory_answers:
        reasons.append("CONTRADICTORY_ANSWERS")
    if critical_constraints_unclear:
        reasons.append("CRITICAL_CONSTRAINT_UNCLEAR")
    if profile_completion < 60:
        reasons.append("PROFILE_INCOMPLETE")
    if not education_verified:
        reasons.append("EDUCATION_UNVERIFIED")
    if qualification_validity == "UNKNOWN":
        reasons.append("QUALIFICATION_VALIDITY_UNKNOWN")
    if training_verification in {None, "UNVERIFIED", "SYNTHETIC"}:
        reasons.append("TRAINING_UNVERIFIED")
    if training_location_known is False:
        reasons.append("TRAINING_LOCATION_UNVERIFIED")
    if training_seats_known is False:
        reasons.append("TRAINING_CAPACITY_UNVERIFIED")
    if extraction_confidences and min(extraction_confidences) < 0.5:
        reasons.append("LOW_EXTRACTION_CONFIDENCE")
    if evidence_count < 2:
        reasons.append("INSUFFICIENT_EVIDENCE")
    critical = {"CONTRADICTORY_ANSWERS", "CRITICAL_CONSTRAINT_UNCLEAR"}
    if critical.intersection(reasons) or len(reasons) >= 5:
        level = "RED"
    elif reasons:
        level = "AMBER"
    else:
        level = "GREEN"
    return {"level": level, "reasons": reasons, "requires_human_review": level == "RED"}

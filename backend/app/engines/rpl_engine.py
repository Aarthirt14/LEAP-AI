from dataclasses import dataclass, asdict


@dataclass(frozen=True)
class RPLResult:
    rpl_candidate: bool
    overlap_score: float
    matched_competencies: list[str]
    missing_competencies: list[str]
    recommended_route: str
    confidence: str

    def as_dict(self) -> dict:
        return asdict(self)


def evaluate_rpl(skills: list[dict], competencies: list[dict], minimum_experience_years: float = 0) -> RPLResult:
    skill_map = {s["name"].strip().lower(): s for s in skills}
    total_weight = sum(float(c.get("weight", 1)) for c in competencies) or 1
    matched, missing, matched_weight = [], [], 0.0
    for competency in competencies:
        name = competency["name"].strip().lower()
        hit = next((s for key, s in skill_map.items() if name in key or key in name), None)
        if hit:
            matched.append(competency["name"])
            matched_weight += float(competency.get("weight", 1))
        else:
            missing.append(competency["name"])
    overlap = round(matched_weight / total_weight, 3)
    max_experience = max((float(s.get("experience_years", 0)) for s in skills), default=0)
    experience_met = max_experience >= minimum_experience_years
    if overlap >= 0.75 and experience_met:
        route, candidate = "RPL", True
    elif overlap >= 0.40:
        route, candidate = "RPL_OR_BRIDGE", True
    elif overlap > 0:
        route, candidate = "BRIDGE_TRAINING", False
    elif competencies:
        route, candidate = "FULL_TRAINING", False
    else:
        route, candidate = "NOT_APPLICABLE", False
    verified_hits = sum(1 for s in skills if s.get("verified"))
    confidence = "GREEN" if candidate and verified_hits else "AMBER" if candidate else "AMBER"
    return RPLResult(candidate, overlap, matched, missing, route, confidence)

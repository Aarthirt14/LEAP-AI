from dataclasses import dataclass
from app.engines.skill_ontology import occupation_match


@dataclass(frozen=True)
class GuardedCandidate:
    title: str
    pathway_type: str
    aspiration_score: float
    skill_evidence_score: float


def _match(text: str | None, target: str) -> float:
    return occupation_match(text, target)


def protect_aspiration(*, candidates: list[dict], skills: list[dict], family_occupation: str | None, aspiration: str | None, education: str | None, constraints: dict | None = None, gender: str | None = None, caste: str | None = None) -> list[GuardedCandidate]:
    del gender, caste, education, constraints  # prohibited or handled by other engines
    results: list[GuardedCandidate] = []
    skill_text = " ".join(s["name"] for s in skills)
    for candidate in candidates:
        target = f"{candidate.get('title','')} {candidate.get('sector','')}"
        aspiration_score = _match(aspiration, target)
        evidence_score = max(_match(skill_text, target), _match(family_occupation, target))
        strong_aspiration = aspiration_score >= 0.75
        strong_skill = evidence_score >= 0.75
        if strong_aspiration and strong_skill:
            kind = "FASTEST"
        elif strong_aspiration:
            kind = "ASPIRATIONAL"
        elif strong_skill or evidence_score > 0:
            kind = "FASTEST"
        else:
            kind = "ALTERNATIVE"
        results.append(GuardedCandidate(candidate["title"], kind, round(aspiration_score, 3), round(evidence_score, 3)))
    aspirational = [r for r in results if r.pathway_type == "ASPIRATIONAL"]
    existing = [r for r in results if r.pathway_type == "FASTEST"]
    alternatives = [r for r in results if r.pathway_type == "ALTERNATIVE"]
    return sorted(aspirational, key=lambda r: r.aspiration_score, reverse=True) + sorted(existing, key=lambda r: r.skill_evidence_score, reverse=True) + alternatives

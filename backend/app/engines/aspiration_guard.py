from dataclasses import dataclass


@dataclass(frozen=True)
class GuardedCandidate:
    title: str
    pathway_type: str
    aspiration_score: float
    skill_evidence_score: float


def _match(text: str | None, target: str) -> float:
    if not text:
        return 0.0
    words = set(text.lower().replace("/", " ").split())
    target_words = set(target.lower().replace("/", " ").split())
    return len(words & target_words) / max(1, len(target_words))


def protect_aspiration(*, candidates: list[dict], skills: list[dict], family_occupation: str | None, aspiration: str | None, education: str | None, constraints: dict | None = None, gender: str | None = None, caste: str | None = None) -> list[GuardedCandidate]:
    del gender, caste, education, constraints  # prohibited or handled by other engines
    results: list[GuardedCandidate] = []
    skill_text = " ".join(s["name"] for s in skills)
    for candidate in candidates:
        target = f"{candidate.get('title','')} {candidate.get('sector','')}"
        aspiration_score = _match(aspiration, target)
        evidence_score = max(_match(skill_text, target), _match(family_occupation, target))
        if aspiration_score > 0:
            kind = "ASPIRATIONAL"
        elif evidence_score > 0:
            kind = "FASTEST"
        else:
            kind = "ALTERNATIVE"
        results.append(GuardedCandidate(candidate["title"], kind, round(aspiration_score, 3), round(evidence_score, 3)))
    aspirational = [r for r in results if r.pathway_type == "ASPIRATIONAL"]
    existing = [r for r in results if r.pathway_type == "FASTEST"]
    alternatives = [r for r in results if r.pathway_type == "ALTERNATIVE"]
    return sorted(aspirational, key=lambda r: r.aspiration_score, reverse=True) + sorted(existing, key=lambda r: r.skill_evidence_score, reverse=True) + alternatives

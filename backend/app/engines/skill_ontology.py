from __future__ import annotations

import re
from collections.abc import Iterable


# Aliases are intentionally explicit: this is an auditable ontology, not fuzzy inference.
OCCUPATION_ALIASES: dict[str, tuple[str, ...]] = {
    "TAILORING": ("tailor", "tailoring", "garment tailoring", "dress making", "dressmaking", "sewing", "stitching", "seamstress", "apparel"),
    "GARMENT_REPAIR": ("garment repair", "clothing repair", "repair clothes", "alterations"),
    "GARMENT_PRODUCTION": ("garment production", "garment worker", "garment operator", "apparel production", "clothing production"),
    "SOLAR_INSTALLATION": ("solar technician", "solar installation", "solar installer", "solar work", "solar"),
    "ELECTRICAL": ("electrical work", "electrician", "electrical technician", "electrical wiring", "electric wiring"),
    "HEALTHCARE": ("healthcare", "health care", "patient support", "health assistant"),
}

SKILL_COMPETENCIES: dict[str, dict[str, float]] = {
    "TAILORING": {
        "basic stitching": 1.0,
        "garment measurement": 0.8,
        "garment repair": 0.7,
        "finishing": 0.7,
        "sewing machine operation": 0.8,
    },
    "GARMENT_PRODUCTION": {
        "garment measurement": 0.8,
        "basic stitching": 0.8,
        "finishing": 0.8,
        "sewing machine operation": 0.8,
    },
    "ELECTRICAL": {"electrical": 1.0, "electrical safety": 1.0, "electrical wiring": 1.0, "basic electrical work": 0.8},
    "SOLAR_INSTALLATION": {"electrical safety": 0.7, "solar wiring": 0.8, "solar installation": 1.0},
}


def normalize_text(value: str | None) -> str:
    if not value:
        return ""
    text = re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()
    # Small deterministic suffix normalization covers common occupation forms.
    tokens = []
    for token in text.split():
        if len(token) > 5 and token.endswith("ies"):
            token = token[:-3] + "y"
        elif len(token) > 5 and token.endswith("ing"):
            token = token[:-3]
        elif len(token) > 5 and token.endswith("ed"):
            token = token[:-2]
        tokens.append(token)
    return " ".join(tokens)


def canonical_occupations(value: str | None) -> set[str]:
    normalized = normalize_text(value)
    if not normalized:
        return set()
    matches: set[str] = set()
    for canonical, aliases in OCCUPATION_ALIASES.items():
        for alias in aliases:
            alias_normalized = normalize_text(alias)
            if alias_normalized and (alias_normalized in normalized or normalized in alias_normalized):
                matches.add(canonical)
                break
    return matches


def occupation_match(query: str | None, *targets: str | None) -> float:
    query_occupations = canonical_occupations(query)
    target_occupations = set().union(*(canonical_occupations(target) for target in targets))
    if query_occupations and target_occupations:
        return 1.0 if query_occupations & target_occupations else 0.0
    query_words = set(normalize_text(query).split())
    target_words = set(normalize_text(" ".join(target or "" for target in targets)).split())
    return round(len(query_words & target_words) / max(1, min(len(query_words), len(target_words))), 3)


def competency_aliases(value: str | None) -> set[str]:
    normalized = normalize_text(value)
    if not normalized:
        return set()
    aliases = {normalized}
    for canonical, values in OCCUPATION_ALIASES.items():
        if canonical in canonical_occupations(value):
            aliases.update(normalize_text(alias) for alias in values)
    return aliases


def skill_evidence(skill_name: str | None, competency_name: str | None) -> float:
    skill_canonicals = canonical_occupations(skill_name)
    competency = normalize_text(competency_name)
    if not skill_canonicals or not competency:
        return 1.0 if competency in competency_aliases(skill_name) else 0.0
    scores = [max((score for name, score in SKILL_COMPETENCIES.get(canonical, {}).items() if normalize_text(name) == competency), default=0.0) for canonical in skill_canonicals]
    return max(scores, default=0.0)


def best_skill_evidence(skills: Iterable[dict], competency_name: str) -> tuple[float, dict | None]:
    best_score = 0.0
    best_skill: dict | None = None
    competency = normalize_text(competency_name)
    for skill in skills:
        direct = 1.0 if normalize_text(skill.get("name")) == competency else 0.0
        mapped = skill_evidence(skill.get("name"), competency_name)
        score = max(direct, mapped)
        if score > best_score:
            best_score = score
            best_skill = skill
    return best_score, best_skill

from sqlalchemy.orm import Session
from app.models import InterventionSimulation, InterventionType, LivelihoodPathway


def simulate_pathway(db: Session, pathway: LivelihoodPathway, interventions: list[dict]) -> dict:
    before = pathway.overall_score
    after = before
    changed: list[str] = []
    explanations: list[str] = []
    for item in interventions:
        kind = item["type"]
        if isinstance(kind, InterventionType):
            kind = kind.value
        if kind == InterventionType.NEARBY_TRAINING.value and item.get("distance_km") is not None:
            after += max(0, (1 - pathway.mobility_score) * 10)
            changed += ["mobility_score", "training_access_score"]
            explanations.append("Nearby training reduces the mobility barrier.")
        elif kind == InterventionType.BRIDGE_TRAINING.value and item.get("enabled", True):
            after += max(4, (1 - pathway.skill_fit_score) * 10)
            changed.append("skill_fit_score")
            explanations.append("Bridge training addresses missing foundation skills.")
        elif kind == InterventionType.MOBILITY_SUPPORT.value:
            after += 5
            changed.append("mobility_score")
            explanations.append("Mobility support improves access feasibility.")
        elif kind == InterventionType.ENTERPRISE_CAPITAL.value:
            after += 5
            changed.append("capital_constraint")
            explanations.append("Capital support reduces the enterprise-start barrier.")
        elif kind == InterventionType.FLEXIBLE_HOURS.value:
            after += 4
            changed.append("training_burden_score")
            explanations.append("Flexible hours reduce training burden.")
        elif kind == InterventionType.COUNSELLING.value:
            after += 2
            changed.append("preference_clarity")
            explanations.append("Counselling can clarify conflicting preferences.")
    after = round(min(100.0, after), 2)
    first = interventions[0]
    row = InterventionSimulation(beneficiary_id=pathway.beneficiary_id, pathway_id=pathway.id, intervention_type=first["type"], original_value={"overall_score": before}, simulated_value={"interventions": [{k: (v.value if hasattr(v, "value") else v) for k, v in item.items()} for item in interventions]}, score_before=before, score_after=after, explanation=" ".join(explanations))
    db.add(row)
    db.flush()
    return {"id": row.id, "before": before, "after": after, "changed_factors": sorted(set(changed)), "explanation": row.explanation}

from collections import defaultdict
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.config import get_settings
from app.models import Beneficiary, EmploymentStatus, LivelihoodPathway, OutcomeFollowup, Qualification

POSITIVE = {EmploymentStatus.EMPLOYED, EmploymentStatus.SELF_EMPLOYED}


def calculate_metrics(rows: list) -> dict:
    completed_ids = {r.beneficiary_id for r in rows if r.training_completed}
    positive_90 = {r.beneficiary_id for r in rows if r.followup_day == 90 and r.employment_status in POSITIVE}
    active_180 = {r.beneficiary_id for r in rows if r.followup_day == 180 and r.still_active and r.employment_status in POSITIVE}
    dropout = {r.beneficiary_id for r in rows if r.employment_status == EmploymentStatus.DROPPED_OUT}
    conversion = len(active_180) / len(completed_ids) if completed_ids else 0.0
    return {"completed_count": len(completed_ids), "positive_90_day_count": len(positive_90), "active_180_day_count": len(active_180), "dropout_count": len(dropout), "sustainable_livelihood_conversion_rate": round(conversion, 4), "metric_is_official": False}


def qualification_evidence_scores(db: Session) -> dict[int, float | None]:
    minimum = get_settings().minimum_outcome_samples
    rows = db.execute(select(OutcomeFollowup, LivelihoodPathway.qualification_id).join(LivelihoodPathway, LivelihoodPathway.id == OutcomeFollowup.pathway_id)).all()
    grouped: dict[int, list] = defaultdict(list)
    for outcome, qualification_id in rows:
        if qualification_id:
            grouped[qualification_id].append(outcome)
    scores: dict[int, float | None] = {}
    for qualification_id, outcomes in grouped.items():
        sample_ids = {o.beneficiary_id for o in outcomes}
        if len(sample_ids) < minimum:
            scores[qualification_id] = None
            continue
        metrics = calculate_metrics(outcomes)
        rate90 = metrics["positive_90_day_count"] / len(sample_ids)
        rate180 = metrics["active_180_day_count"] / len(sample_ids)
        scores[qualification_id] = round((rate90 + rate180) / 2, 4)
    return scores


def aggregate_outcomes(db: Session, district: str | None = None, sector: str | None = None) -> list[dict]:
    stmt = select(Qualification.sector, OutcomeFollowup).join(LivelihoodPathway, LivelihoodPathway.qualification_id == Qualification.id).join(OutcomeFollowup, OutcomeFollowup.pathway_id == LivelihoodPathway.id).join(Beneficiary, Beneficiary.id == OutcomeFollowup.beneficiary_id)
    if district:
        stmt = stmt.where(Beneficiary.district == district)
    if sector:
        stmt = stmt.where(Qualification.sector == sector)
    rows = db.execute(stmt).all()
    grouped: dict[str, list] = defaultdict(list)
    for sector_name, outcome in rows:
        grouped[sector_name].append(outcome)
    return [{"sector": name, **calculate_metrics(items)} for name, items in sorted(grouped.items())]

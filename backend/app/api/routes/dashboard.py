from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_roles
from app.models import Beneficiary, BeneficiarySkill, EmploymentStatus, LivelihoodPathway, OutcomeFollowup, Qualification, TrainingOpportunity, UserRole
from app.services.mismatch_service import build_radar
from app.services.outcome_evidence_service import aggregate_outcomes

router = APIRouter(prefix="/dashboard", tags=["District dashboard"], dependencies=[Depends(require_roles(UserRole.DISTRICT_OFFICER, UserRole.ADMIN))])


def positive_statuses(): return [EmploymentStatus.EMPLOYED, EmploymentStatus.SELF_EMPLOYED]


@router.get("/summary", description="Aggregate district KPIs only; no beneficiary names or sensitive profile details are returned.")
def summary(district: str | None = None, sector: str | None = None, age_group: str | None = None, employment_type: str | None = None, followup_period: int | None = None, db: Session = Depends(get_db)):
    beneficiary_stmt = select(func.count(Beneficiary.id));
    if district: beneficiary_stmt = beneficiary_stmt.where(Beneficiary.district == district)
    profiled = db.scalar(beneficiary_stmt) or 0
    positive_90 = db.scalar(select(func.count(func.distinct(OutcomeFollowup.beneficiary_id))).where(OutcomeFollowup.followup_day == 90, OutcomeFollowup.employment_status.in_(positive_statuses()))) or 0
    active_180 = db.scalar(select(func.count(func.distinct(OutcomeFollowup.beneficiary_id))).where(OutcomeFollowup.followup_day == 180, OutcomeFollowup.still_active.is_(True))) or 0
    return {"filters": {"district": district, "sector": sector, "age_group": age_group, "employment_type": employment_type, "followup_period": followup_period}, "beneficiaries_profiled": profiled, "potential_rpl_candidates": db.scalar(select(func.count(func.distinct(BeneficiarySkill.beneficiary_id))).where(BeneficiarySkill.experience_years >= 3)) or 0, "positive_90_day_count": positive_90, "active_180_day_count": active_180}


@router.get("/funnel", description="Return aggregate livelihood conversion funnel counts.")
def funnel(district: str | None = None, db: Session = Depends(get_db)):
    return {"profiled": db.scalar(select(func.count(Beneficiary.id))) or 0, "recommended": db.scalar(select(func.count(func.distinct(LivelihoodPathway.beneficiary_id)))) or 0, "enrolled": db.scalar(select(func.count(func.distinct(OutcomeFollowup.beneficiary_id))).where(OutcomeFollowup.training_started.is_(True))) or 0, "completed": db.scalar(select(func.count(func.distinct(OutcomeFollowup.beneficiary_id))).where(OutcomeFollowup.training_completed.is_(True))) or 0, "certified": db.scalar(select(func.count(func.distinct(OutcomeFollowup.beneficiary_id))).where(OutcomeFollowup.certified.is_(True))) or 0, "livelihood_90": db.scalar(select(func.count(func.distinct(OutcomeFollowup.beneficiary_id))).where(OutcomeFollowup.followup_day == 90, OutcomeFollowup.employment_status.in_(positive_statuses()))) or 0, "active_180": db.scalar(select(func.count(func.distinct(OutcomeFollowup.beneficiary_id))).where(OutcomeFollowup.followup_day == 180, OutcomeFollowup.still_active.is_(True))) or 0}


@router.get("/aspirations", description="Return aggregate aspiration demand by qualification sector.")
def aspirations(district: str | None = None, db: Session = Depends(get_db)):
    rows = db.execute(select(Qualification.sector, func.count(LivelihoodPathway.id)).join(LivelihoodPathway, LivelihoodPathway.qualification_id == Qualification.id).group_by(Qualification.sector).order_by(func.count(LivelihoodPathway.id).desc())).all(); return [{"sector": sector, "count": count} for sector, count in rows]


@router.get("/rpl", description="Return aggregate potential-RPL distribution. This is not official RPL approval.")
def rpl(district: str | None = None, db: Session = Depends(get_db)):
    potential = db.scalar(select(func.count(func.distinct(BeneficiarySkill.beneficiary_id))).where(BeneficiarySkill.experience_years >= 3)) or 0; total = db.scalar(select(func.count(Beneficiary.id))) or 0; return {"potential_rpl_candidates": potential, "total_beneficiaries": total, "label": "Potential RPL Candidate"}


@router.get("/mismatch", description="Compare demand, capacity and verified outcomes using configurable thresholds.")
def mismatch(district: str | None = None, sector: str | None = None, db: Session = Depends(get_db)):
    sectors = db.scalars(select(Qualification.sector).distinct()).all(); rows = []
    for name in sectors:
        if sector and name != sector: continue
        demand = db.scalar(select(func.count(LivelihoodPathway.id)).join(Qualification).where(Qualification.sector == name)) or 0
        capacity = db.scalar(select(func.coalesce(func.sum(TrainingOpportunity.seats_available), 0)).join(Qualification).where(Qualification.sector == name)) or 0
        outcomes = aggregate_outcomes(db, district, name); rate = (outcomes[0]["positive_90_day_count"] / max(outcomes[0]["completed_count"], 1)) if outcomes else 0
        rows.append({"sector": name, "viable_beneficiary_demand": demand, "training_capacity": int(capacity), "outcome_90_day_rate": round(rate, 4), "retention_180_day_rate": outcomes[0]["sustainable_livelihood_conversion_rate"] if outcomes else 0})
    return build_radar(rows)


@router.get("/outcomes", description="Return aggregate outcome evidence and the non-official sustainable conversion metric.")
def outcomes(district: str | None = None, sector: str | None = None, db: Session = Depends(get_db)): return aggregate_outcomes(db, district, sector)

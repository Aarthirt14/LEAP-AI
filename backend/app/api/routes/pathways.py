from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app.database import get_db
from app.dependencies import assert_beneficiary_access, get_current_user
from app.models import LivelihoodPathway, User
from app.schemas import PathwayOut, SimulationOut, SimulationRequest
from app.services.intervention_service import simulate_pathway
from app.services.pathway_service import generate_pathways
from app.utils.errors import AppError
from app.services.review_gate import annotate_review

router = APIRouter(tags=["Recommendations and simulation"])


def pathway_or_404(db: Session, pathway_id: int) -> LivelihoodPathway:
    row = db.execute(select(LivelihoodPathway).where(LivelihoodPathway.id == pathway_id).options(selectinload(LivelihoodPathway.evidence))).scalar_one_or_none()
    if not row: raise AppError("PATHWAY_NOT_FOUND", "Livelihood pathway not found.", 404)
    return row


@router.post("/beneficiaries/{beneficiary_id}/generate-pathways", response_model=list[PathwayOut], description="Generate up to three pathways using deterministic rules, constraints, configurable weights, and outcome evidence—not an LLM.")
def generate(beneficiary_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    assert_beneficiary_access(db, user, beneficiary_id, True); rows = generate_pathways(db, beneficiary_id); db.commit(); return [annotate_review(db, row) for row in rows]


@router.get("/beneficiaries/{beneficiary_id}/pathways", response_model=list[PathwayOut], description="List the authorized beneficiary's ranked pathways and evidence.")
def list_for_beneficiary(beneficiary_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    assert_beneficiary_access(db, user, beneficiary_id); return [annotate_review(db, row) for row in db.execute(select(LivelihoodPathway).where(LivelihoodPathway.beneficiary_id == beneficiary_id).options(selectinload(LivelihoodPathway.evidence)).order_by(LivelihoodPathway.overall_score.desc())).scalars().all()]


@router.get("/pathways/{pathway_id}", response_model=PathwayOut, description="Get one pathway with transparent evidence.")
def get_pathway(pathway_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = pathway_or_404(db, pathway_id); assert_beneficiary_access(db, user, row.beneficiary_id); return annotate_review(db, row)


@router.post("/pathways/{pathway_id}/simulate", response_model=SimulationOut, description="Run a non-causal what-if feasibility simulation without mutating beneficiary profile data.")
def simulate(pathway_id: int, payload: SimulationRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = pathway_or_404(db, pathway_id); assert_beneficiary_access(db, user, row.beneficiary_id); result = simulate_pathway(db, row, [item.model_dump() for item in payload.interventions]); db.commit(); return result


@router.get("/pathways/{pathway_id}/simulations", description="List saved what-if feasibility simulations.")
def simulations(pathway_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    from app.models import InterventionSimulation
    row = pathway_or_404(db, pathway_id); assert_beneficiary_access(db, user, row.beneficiary_id)
    rows = db.scalars(select(InterventionSimulation).where(InterventionSimulation.pathway_id == pathway_id).order_by(InterventionSimulation.created_at.desc())).all()
    return [{"id": item.id, "type": item.intervention_type, "before": item.score_before, "after": item.score_after, "explanation": item.explanation, "created_at": item.created_at} for item in rows]

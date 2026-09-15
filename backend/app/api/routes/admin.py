from fastapi import APIRouter, Depends
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_roles
from app.models import HumanReview, OutcomeFollowup, Qualification, ReviewStatus, TrainingOpportunity, UserRole, ValidityStatus

router = APIRouter(prefix="/admin", tags=["Administration"], dependencies=[Depends(require_roles(UserRole.ADMIN))])


@router.get("/diagnostics", description="Return database and dataset health diagnostics for administrators.")
def diagnostics(db: Session = Depends(get_db)):
    try: db.execute(text("SELECT 1")); database = "OK"
    except Exception: database = "ERROR"
    return {"database_connection": database, "qualification_count": db.scalar(select(func.count(Qualification.id))) or 0, "valid_qualification_count": db.scalar(select(func.count(Qualification.id)).where(Qualification.validity_status == ValidityStatus.VALID)) or 0, "expired_count": db.scalar(select(func.count(Qualification.id)).where(Qualification.validity_status == ValidityStatus.EXPIRED)) or 0, "training_opportunities": db.scalar(select(func.count(TrainingOpportunity.id))) or 0, "outcome_records": db.scalar(select(func.count(OutcomeFollowup.id))) or 0, "open_human_reviews": db.scalar(select(func.count(HumanReview.id)).where(HumanReview.status == ReviewStatus.OPEN)) or 0}

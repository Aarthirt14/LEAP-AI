from sqlalchemy import select
from app.models import ConfidenceLevel, HumanReview, ReviewStatus


def review_state(db, pathway):
    review = db.scalar(select(HumanReview).where(HumanReview.pathway_id == pathway.id).order_by(HumanReview.id.desc()))
    state = review.status.value if review else None
    return state, pathway.confidence_level == ConfidenceLevel.RED and state != ReviewStatus.APPROVED.value


def annotate_review(db, pathway):
    pathway.review_status, pathway.pending_human_review = review_state(db, pathway)
    return pathway

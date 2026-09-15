from app.engines.aspiration_guard import protect_aspiration
from app.engines.confidence_engine import calculate_confidence
from app.engines.constraint_engine import evaluate_constraints
from app.engines.pathway_engine import rank_pathways
from app.engines.rpl_engine import evaluate_rpl
from app.services.intervention_service import simulate_pathway
from app.services.mismatch_service import mismatch_signal
from app.services.outcome_evidence_service import calculate_metrics
from app.models import EmploymentStatus


def qualification(status="VALID", title="Solar Technician", qid=1):
    return {"id": qid, "title": title, "sector": "Electrical Solar", "validity_status": status, "minimum_education": "10th Standard", "minimum_experience_years": 0, "duration_hours": 300, "competencies": [{"name": "electrical", "weight": .6}, {"name": "safety", "weight": .4}]}


def profile():
    return {"education_level": "10th Standard", "family_occupation": "Tailoring", "aspiration_text": "Solar electrical work", "mobility_km": 7, "capital_available": 8000, "profile_completion_percentage": 90, "education_verified": True, "evidence_count": 3, "experience_years": 4, "extraction_confidences": [.9]}


def test_expired_and_invalid_qualifications_excluded():
    rows = rank_pathways(profile(), [], [qualification("EXPIRED", qid=1), qualification("INVALID", qid=2)], {}, {})
    assert rows == []


def test_unknown_validity_lowers_confidence():
    rows = rank_pathways(profile(), [], [qualification("UNKNOWN")], {1: {"distance_km": 5, "seats_available": 10, "verification_status": "VERIFIED"}}, {1: .8})
    assert rows[0]["confidence"] == "AMBER"


def test_experienced_electrician_is_potential_rpl():
    result = evaluate_rpl([{"name": "electrical wiring", "experience_years": 6, "verified": True}, {"name": "safety", "experience_years": 6, "verified": True}], [{"name": "electrical", "weight": .6}, {"name": "safety", "weight": .4}], 2)
    assert result.rpl_candidate and result.recommended_route == "RPL"


def test_beginner_not_incorrectly_rpl():
    result = evaluate_rpl([{"name": "painting", "experience_years": 0}], [{"name": "electrical"}], 2)
    assert not result.rpl_candidate


def test_family_occupation_does_not_suppress_aspiration():
    rows = protect_aspiration(candidates=[{"title": "Tailoring", "sector": "Tailoring"}, {"title": "Solar Technician", "sector": "Solar"}], skills=[{"name": "Tailoring"}], family_occupation="Tailoring", aspiration="Solar Technician", education="10th")
    assert any(r.title == "Solar Technician" and r.pathway_type == "ASPIRATIONAL" for r in rows)


def test_gender_change_does_not_change_ranking():
    q = [qualification()]; training = {1: {"distance_km": 5, "seats_available": 10, "verification_status": "VERIFIED"}}
    female = rank_pathways(profile(), [], q, training, {1: .7}, gender="Female")
    male = rank_pathways(profile(), [], q, training, {1: .7}, gender="Male")
    assert female == male


def test_education_hard_constraint_rejects():
    result = evaluate_constraints({"education_level": "8th Standard"}, {"minimum_education": "12th Standard", "validity_status": "VALID"})
    assert result["decision"] == "REJECT"


def test_mobility_and_capital_penalties():
    result = evaluate_constraints({"education_level": "10th Standard", "mobility_km": 7, "capital_available": 1000}, {"minimum_education": "8th Standard", "validity_status": "VALID", "required_capital": 10000}, {"distance_km": 18})
    types = {r["constraint_type"] for r in result["reasons"]}
    assert {"MOBILITY", "CAPITAL"} <= types and result["total_penalty"] > 0


def test_pathway_is_deterministic_and_aspirational():
    q = [qualification()]; training = {1: {"distance_km": 5, "seats_available": 10, "verification_status": "VERIFIED"}}
    first = rank_pathways(profile(), [], q, training, {1: .7}); second = rank_pathways(profile(), [], q, training, {1: .7})
    assert first == second and first[0]["pathway_type"] == "ASPIRATIONAL"


def test_confidence_missing_and_conflicting():
    missing = calculate_confidence(profile_completion=50, extraction_confidences=[], education_verified=False, qualification_validity="VALID", training_verification="VERIFIED", evidence_count=0)
    conflicting = calculate_confidence(profile_completion=100, extraction_confidences=[.9], education_verified=True, qualification_validity="VALID", training_verification="VERIFIED", contradictory_answers=True, evidence_count=3)
    assert missing["level"] in {"AMBER", "RED"} and conflicting["level"] == "RED" and conflicting["requires_human_review"]


def test_mismatch_rules_explainable():
    assert mismatch_signal(620, 180, .71) == "HIGH_DEMAND_LOW_CAPACITY"
    assert mismatch_signal(180, 500, .26) == "HIGH_CAPACITY_LOW_OUTCOME"


class Outcome:
    def __init__(self, beneficiary_id, day, completed, status, active=None): self.beneficiary_id=beneficiary_id; self.followup_day=day; self.training_completed=completed; self.employment_status=status; self.still_active=active


def test_outcome_aggregation_and_zero_division():
    rows = [Outcome(1,90,True,EmploymentStatus.EMPLOYED), Outcome(1,180,True,EmploymentStatus.EMPLOYED,True), Outcome(2,90,True,EmploymentStatus.SEARCHING), Outcome(2,180,True,EmploymentStatus.INACTIVE,False)]
    result = calculate_metrics(rows); assert result["positive_90_day_count"] == 1 and result["sustainable_livelihood_conversion_rate"] == .5
    assert calculate_metrics([])["sustainable_livelihood_conversion_rate"] == 0

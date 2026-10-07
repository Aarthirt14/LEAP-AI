import pytest
from app.main import app
from app.models import Beneficiary, BeneficiarySkill, Qualification, QualificationCompetency, SourceType, TrainingOpportunity, UserRole, ValidityStatus, VerificationStatus
from app.services.profile_service import PROFILE_FIELDS, completion_percentage
from tests.conftest import auth, make_user


def test_cors_allowed_origins_parsing():
    from app.main import app
    # Verify app middleware configuration includes parsed origin list without comma-concatenated string
    cors_middlewares = [m for m in app.user_middleware if m.cls.__name__ == "CORSMiddleware"]
    assert len(cors_middlewares) > 0
    origins = cors_middlewares[0].kwargs.get("allow_origins", [])
    for origin in origins:
        assert "," not in origin
        assert origin.startswith("http://") or origin.startswith("https://")


def test_profile_completion_percentage_counts_new_fields(db):
    user = make_user(db, UserRole.BENEFICIARY, "completion_test@example.com")
    b = Beneficiary(name="Test", age=25, gender="Female", district="Madurai", state="TN", user_id=user.id, created_by=user.id, consent_given=True)
    db.add(b); db.flush()

    assert "physical_constraints" in PROFILE_FIELDS
    assert "family_responsibilities" in PROFILE_FIELDS

    profile_dict = {
        "physical_constraints": "No heavy lifting",
        "family_responsibilities": "Caring for elderly mother"
    }

    completion = completion_percentage(profile_dict)
    # Since 2 fields are set out of total PROFILE_FIELDS, completion should be > 0
    assert completion > 0
    assert completion == round((2 / len(PROFILE_FIELDS)) * 100, 2)


def test_simulation_is_read_only_and_does_not_mutate_profile(client, db):
    user = make_user(db, UserRole.BENEFICIARY, "sim_readonly@example.com")
    headers = auth(user)
    b_resp = client.post("/api/beneficiaries", headers=headers, json={"name":"Sim User","age":30,"district":"Madurai","state":"Tamil Nadu","consent_given":True})
    b_id = b_resp.json()["id"]

    client.patch(f"/api/beneficiaries/{b_id}/profile", headers=headers, json={"education_level": "10th Standard"})
    client.post(f"/api/beneficiaries/{b_id}/skills", headers=headers, json={"name":"Tailoring","sector":"Tailoring","experience_years":4,"source":"FIELD_WORKER","verified":True})

    q = Qualification(qualification_code="Q-TAILOR-SIM", qualification_name="Home Tailoring Enterprise", sector="Tailoring", occupational_role="Home Tailoring Enterprise", nsqf_level="4", minimum_education="8th Standard", minimum_experience_years=0, duration_hours=300, qualification_type="SYNTHETIC DEMO", validity_status=ValidityStatus.VALID, source_type=SourceType.SYNTHETIC)
    db.add(q); db.flush()
    db.add(QualificationCompetency(qualification_id=q.id, competency_name="Tailoring", weight=1))
    db.add(TrainingOpportunity(qualification_id=q.id, provider_name="Demo Provider", provider_type="DEMO", district="Madurai", state="Tamil Nadu", location_name="Synthetic centre", distance_km=5, seats_available=20, verification_status=VerificationStatus.SYNTHETIC, source_type=SourceType.SYNTHETIC))
    db.commit()

    # Generate pathways
    gen_resp = client.post(f"/api/beneficiaries/{b_id}/generate-pathways", headers=headers)
    assert gen_resp.status_code == 200, gen_resp.text
    pathways = gen_resp.json()
    assert len(pathways) > 0
    pathway_id = pathways[0]["id"]

    before_profile = client.get(f"/api/beneficiaries/{b_id}/profile", headers=headers).json()

    # Simulate
    sim_resp = client.post(f"/api/pathways/{pathway_id}/simulate", headers=headers, json={"interventions":[{"type":"NEARBY_TRAINING","distance_km":2}]})
    assert sim_resp.status_code == 200

    after_profile = client.get(f"/api/beneficiaries/{b_id}/profile", headers=headers).json()
    assert before_profile == after_profile


def test_generated_pathway_evidence_contains_only_traced_records(client, db):
    user = make_user(db, UserRole.BENEFICIARY, "evidence_traced@example.com")
    headers = auth(user)
    b_resp = client.post("/api/beneficiaries", headers=headers, json={"name":"Ev User","age":22,"district":"Madurai","state":"Tamil Nadu","consent_given":True})
    b_id = b_resp.json()["id"]

    # Set profile with specific aspiration but no physical_constraints
    prof_resp = client.patch(f"/api/beneficiaries/{b_id}/profile", headers=headers, json={"aspiration_text":"Tailoring entrepreneurship", "education_level": "10th Standard"})
    assert prof_resp.status_code == 200

    q = Qualification(qualification_code="Q-TAILOR-TEST", qualification_name="Tailor Role", sector="Tailoring", occupational_role="Tailor Role", nsqf_level="3", minimum_education="8th Standard", minimum_experience_years=0, duration_hours=120, qualification_type="DEMO", validity_status=ValidityStatus.VALID, source_type=SourceType.SYNTHETIC)
    db.add(q); db.flush()
    db.add(QualificationCompetency(qualification_id=q.id, competency_name="Stitching", weight=1))
    db.commit()

    gen_resp = client.post(f"/api/beneficiaries/{b_id}/generate-pathways", headers=headers)
    assert gen_resp.status_code == 200
    pathways = gen_resp.json()
    assert len(pathways) > 0

    pathway = pathways[0]
    evidence = pathway.get("evidence", [])
    # Verify all evidence items have non-empty value and source_reference
    for item in evidence:
        assert item["value"] is not None and item["value"] != ""
        assert item["source_reference"] is not None and item["source_reference"] != ""
        # Check that ASPIRATION evidence contains actual text
        if item["evidence_type"] == "ASPIRATION":
            assert "Tailoring entrepreneurship" in item["value"]


def test_all_eight_evidence_categories_generated_when_data_present(client, db):
    from app.models import LivelihoodPathway, OutcomeFollowup, EmploymentStatus, Provenance
    user = make_user(db, UserRole.BENEFICIARY, "eight_ev_user@example.com")
    headers = auth(user)
    b_resp = client.post("/api/beneficiaries", headers=headers, json={"name":"Eight Ev User","age":24,"district":"Madurai","state":"Tamil Nadu","consent_given":True})
    b_id = b_resp.json()["id"]

    client.patch(f"/api/beneficiaries/{b_id}/profile", headers=headers, json={
        "aspiration_text": "Needlework specialist",
        "education_level": "10th Standard",
        "preferred_work_location": "Madurai",
        "mobility_km": 15,
        "physical_constraints": "Cannot carry heavy weight"
    })
    sk_resp = client.post(f"/api/beneficiaries/{b_id}/skills", headers=headers, json={
        "name": "Stitching",
        "sector": "Tailoring",
        "experience_years": 3,
        "source": "SELF_REPORTED",
        "verified": True
    })
    assert sk_resp.status_code in (200, 201), sk_resp.text

    q = Qualification(qualification_code="Q-EIGHT-CAT", qualification_name="Garment Stitcher", sector="Tailoring", occupational_role="Garment Stitcher", nsqf_level="3", minimum_education="8th Standard", minimum_experience_years=0, duration_hours=200, qualification_type="DEMO", validity_status=ValidityStatus.VALID, source_type=SourceType.SYNTHETIC)
    db.add(q); db.flush()
    db.add(QualificationCompetency(qualification_id=q.id, competency_name="Stitching", weight=1))
    db.add(TrainingOpportunity(qualification_id=q.id, provider_name="Madurai Craft Centre", provider_type="NGO", district="Madurai", state="Tamil Nadu", location_name="Central Ward", distance_km=8, seats_available=15, verification_status=VerificationStatus.SYNTHETIC, source_type=SourceType.SYNTHETIC))
    
    # Create a reference pathway and >= 5 outcome followups for sample-gating threshold
    from app.models import PathwayType, ConfidenceLevel
    pw = LivelihoodPathway(
        beneficiary_id=b_id,
        qualification_id=q.id,
        pathway_type=PathwayType.FASTEST,
        title="Garment Stitcher",
        description="Test pathway",
        skill_fit_score=1.0,
        aspiration_fit_score=1.0,
        opportunity_score=1.0,
        eligibility_score=1.0,
        mobility_score=1.0,
        training_access_score=1.0,
        training_burden_score=1.0,
        overall_score=0.8,
        confidence_level=ConfidenceLevel.GREEN,
        recommended_route="FULL_TRAINING"
    )
    db.add(pw); db.flush()
    for i in range(20):
        sample_user = make_user(db, UserRole.BENEFICIARY, f"sample_ev_{i}@example.com")
        sample_b = Beneficiary(name=f"Sample B {i}", age=20+i, district="Madurai", state="Tamil Nadu", user_id=sample_user.id, created_by=sample_user.id, consent_given=True)
        db.add(sample_b); db.flush()
        sample_pw = LivelihoodPathway(beneficiary_id=sample_b.id, qualification_id=q.id, pathway_type=PathwayType.FASTEST, title="Garment Stitcher", description="Sub pathway", skill_fit_score=1.0, aspiration_fit_score=1.0, opportunity_score=1.0, eligibility_score=1.0, mobility_score=1.0, training_access_score=1.0, training_burden_score=1.0, overall_score=0.8, confidence_level=ConfidenceLevel.GREEN, recommended_route="FULL_TRAINING")
        db.add(sample_pw); db.flush()
        db.add(OutcomeFollowup(
            beneficiary_id=sample_b.id,
            pathway_id=sample_pw.id,
            followup_day=90,
            training_completed=True,
            employment_status=EmploymentStatus.EMPLOYED,
            still_active=True,
            verification_status=Provenance.FIELD_VERIFIED,
            reported_by=sample_user.id
        ))
        db.add(OutcomeFollowup(
            beneficiary_id=sample_b.id,
            pathway_id=sample_pw.id,
            followup_day=180,
            training_completed=True,
            employment_status=EmploymentStatus.EMPLOYED,
            still_active=True,
            verification_status=Provenance.FIELD_VERIFIED,
            reported_by=sample_user.id
        ))
    db.commit()

    gen_resp = client.post(f"/api/beneficiaries/{b_id}/generate-pathways", headers=headers)
    assert gen_resp.status_code == 200
    pathways = gen_resp.json()
    assert len(pathways) > 0

    pathway = pathways[0]
    evidence_types = {e["evidence_type"] for e in pathway.get("evidence", [])}
    expected_categories = {"SKILL", "ASPIRATION", "ELIGIBILITY", "OPPORTUNITY", "MOBILITY", "RPL", "CONSTRAINT", "OUTCOME_EVIDENCE"}
    assert expected_categories.issubset(evidence_types), f"Missing categories: {expected_categories - evidence_types}"



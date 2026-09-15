from app.models import Qualification, QualificationCompetency, SourceType, TrainingOpportunity, UserRole, ValidityStatus, VerificationStatus
from tests.conftest import auth, make_user


def test_complete_kavitha_decision_journey(client, db):
    registration = client.post("/api/auth/register", json={"email":"kavitha@example.com","password":"DemoPassword123!","role":"BENEFICIARY"})
    assert registration.status_code == 201
    headers = {"Authorization": f"Bearer {registration.json()['access_token']}"}
    user_id = client.get("/api/auth/me", headers=headers).json()["id"]
    created = client.post("/api/beneficiaries", headers=headers, json={"name":"Kavitha","age":28,"gender":"Female","district":"Madurai","state":"Tamil Nadu","preferred_language":"Tamil","digital_literacy":"LOW","consent_given":True,"user_id":user_id})
    assert created.status_code == 201; beneficiary_id = created.json()["id"]
    interview = client.post("/api/interviews", headers=headers, json={"beneficiary_id":beneficiary_id,"language":"Tamil"}).json(); session_id = interview["id"]
    answers = [
        ("education_level", "10th Standard"), ("family_occupation", "Tailoring"),
        ("aspiration_text", "Solar electrical work"), ("mobility_km", "7 km"),
        ("capital_available", "₹8,000"), ("relocation_willingness", "No"),
    ]
    for key, value in answers:
        response = client.post(f"/api/interviews/{session_id}/answers", headers=headers, json={"question_key":key,"question_text":key.replace('_',' '),"transcript":value,"corrected_text":value,"language":"Tamil","speech_confidence":.9,"extraction_confidence":.9})
        assert response.status_code == 201
    completed = client.post(f"/api/interviews/{session_id}/complete", headers=headers); assert completed.status_code == 200
    skill = client.post(f"/api/beneficiaries/{beneficiary_id}/skills", headers=headers, json={"name":"Tailoring","sector":"Tailoring","experience_years":4,"source":"FIELD_WORKER","verified":True}); assert skill.status_code == 201
    qualifications = []
    for code, title, sector, minimum in [("Q-SOLAR","Solar Technician","Electrical Solar","10th Standard"),("Q-TAILOR","Home Tailoring Enterprise","Tailoring","8th Standard"),("Q-GARMENT","Garment Operator","Apparel","8th Standard")]:
        q = Qualification(qualification_code=code, qualification_name=title, sector=sector, occupational_role=title, nsqf_level="4", minimum_education=minimum, minimum_experience_years=0, duration_hours=300, qualification_type="SYNTHETIC DEMO", validity_status=ValidityStatus.VALID, source_type=SourceType.SYNTHETIC)
        db.add(q); db.flush(); db.add(QualificationCompetency(qualification_id=q.id, competency_name="Tailoring" if "Tailor" in title or "Garment" in title else "Electrical", weight=1)); qualifications.append(q)
    db.flush()
    for i, q in enumerate(qualifications): db.add(TrainingOpportunity(qualification_id=q.id, provider_name=f"Demo Provider {i}", provider_type="DEMO", district="Madurai", state="Tamil Nadu", location_name="Synthetic centre", distance_km=18 if "Solar" in q.occupational_role else 5, seats_available=20, verification_status=VerificationStatus.SYNTHETIC, source_type=SourceType.SYNTHETIC))
    db.commit()
    generated = client.post(f"/api/beneficiaries/{beneficiary_id}/generate-pathways", headers=headers)
    assert generated.status_code == 200, generated.text
    pathways = generated.json(); assert len(pathways) == 3 and {p["type"] for p in pathways} >= {"FASTEST", "ASPIRATIONAL"}
    solar = next(p for p in pathways if p["title"] == "Solar Technician")
    before_profile = client.get(f"/api/beneficiaries/{beneficiary_id}/profile", headers=headers).json()
    simulation = client.post(f"/api/pathways/{solar['id']}/simulate", headers=headers, json={"interventions":[{"type":"NEARBY_TRAINING","distance_km":5},{"type":"BRIDGE_TRAINING","enabled":True}]})
    assert simulation.status_code == 200 and simulation.json()["after"] > simulation.json()["before"]
    after_profile = client.get(f"/api/beneficiaries/{beneficiary_id}/profile", headers=headers).json(); assert before_profile == after_profile
    outcome = client.post("/api/outcomes", headers=headers, json={"beneficiary_id":beneficiary_id,"pathway_id":solar["id"],"followup_day":90,"training_started":True,"training_completed":True,"certified":True,"employment_status":"EMPLOYED","livelihood_related_to_pathway":True,"income_band":"₹10,000–₹15,000","verification_status":"USER_REPORTED"})
    assert outcome.status_code == 201
    officer = make_user(db, UserRole.DISTRICT_OFFICER, "district@example.com")
    dashboard = client.get("/api/dashboard/summary?district=Madurai", headers=auth(officer)); assert dashboard.status_code == 200 and dashboard.json()["positive_90_day_count"] == 1 and "name" not in dashboard.text.lower()


def test_insufficient_outcome_sample_does_not_fabricate_score(db):
    from app.services.outcome_evidence_service import qualification_evidence_scores
    assert qualification_evidence_scores(db) == {}

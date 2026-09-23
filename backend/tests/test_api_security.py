from app.models import Beneficiary, UserRole
from tests.conftest import auth, make_user


def test_beneficiary_cannot_view_another_beneficiary(client, db):
    first = make_user(db, UserRole.BENEFICIARY, "first@example.com"); second = make_user(db, UserRole.BENEFICIARY, "second@example.com")
    mine = Beneficiary(user_id=first.id, name="First", district="Madurai", state="Tamil Nadu", preferred_language="Tamil", consent_given=True, created_by=first.id)
    other = Beneficiary(user_id=second.id, name="Second", district="Madurai", state="Tamil Nadu", preferred_language="Tamil", consent_given=True, created_by=second.id)
    db.add_all([mine, other]); db.commit()
    response = client.get(f"/api/beneficiaries/{other.id}", headers=auth(first)); assert response.status_code == 403


def test_field_worker_cannot_access_admin(client, db):
    worker = make_user(db, UserRole.FIELD_WORKER, "worker@example.com")
    assert client.get("/api/admin/diagnostics", headers=auth(worker)).status_code == 403


def test_officer_gets_aggregate_only(client, db):
    officer = make_user(db, UserRole.DISTRICT_OFFICER, "officer@example.com")
    worker = make_user(db, UserRole.FIELD_WORKER, "worker2@example.com")
    person = Beneficiary(name="Sensitive Name", district="Madurai", state="Tamil Nadu", preferred_language="Tamil", consent_given=True, created_by=worker.id); db.add(person); db.commit()
    detail = client.get(f"/api/beneficiaries/{person.id}", headers=auth(officer)); summary = client.get("/api/dashboard/summary?district=Madurai", headers=auth(officer))
    assert detail.status_code == 403 and summary.status_code == 200 and "Sensitive Name" not in summary.text


def test_public_registration_cannot_create_admin(client):
    response = client.post("/api/auth/register", json={"email":"hacker@example.com","password":"LongPassword123!","role":"ADMIN"})
    assert response.status_code == 403


def test_demo_config_is_disabled_by_default(client):
    response = client.get("/api/auth/demo-config")
    assert response.status_code == 200
    assert response.json() == {"enabled": False, "roles": {}}


def test_facilitator_and_admin_route_boundaries(client, db):
    facilitator = make_user(db, UserRole.FACILITATOR, "facilitator-test@example.com")
    admin = make_user(db, UserRole.ADMIN, "admin-test@example.com")
    assert client.get("/api/reviews", headers=auth(facilitator)).status_code == 200
    assert client.get("/api/admin/diagnostics", headers=auth(admin)).status_code == 200
    assert client.get("/api/admin/diagnostics", headers=auth(facilitator)).status_code == 403


def test_consent_required_before_interview(client, db):
    user = make_user(db, UserRole.BENEFICIARY, "consent@example.com"); person = Beneficiary(user_id=user.id, name="No Consent", district="Madurai", state="Tamil Nadu", preferred_language="Tamil", consent_given=False, created_by=user.id); db.add(person); db.commit()
    response = client.post("/api/interviews", json={"beneficiary_id":person.id,"language":"Tamil"}, headers=auth(user)); assert response.status_code == 422


def test_health_swagger_and_openapi(client):
    assert client.get("/health").status_code == 200
    assert client.get("/docs").status_code == 200
    schema = client.get("/openapi.json")
    assert schema.status_code == 200 and "/api/beneficiaries/{beneficiary_id}/generate-pathways" in schema.json()["paths"]

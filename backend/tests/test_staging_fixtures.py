import secrets
import pytest
from sqlalchemy import select, func
from app.models import User, UserRole, Qualification, TrainingOpportunity, SourceType, VerificationStatus
from app.security.jwt import hash_password
from seed.staging_fixtures import ACCOUNTS, SERVICE_ID, DATABASE_URL, populate, validate_target


def config():
    return {"LEAP_STAGING_FIXTURES":"enabled", "RENDER_SERVICE_ID":SERVICE_ID,
            "RENDER_GIT_BRANCH":"redesign/leap-ui-v2", "DATABASE_URL":DATABASE_URL,
            **{key: secrets.token_urlsafe(32) for key in ACCOUNTS}}


@pytest.mark.parametrize("key,value", [("RENDER_SERVICE_ID","production"), ("RENDER_GIT_BRANCH","main"),
    ("DATABASE_URL","postgresql://production"), ("LEAP_STAGING_FIXTURES","")])
def test_rejects_wrong_target(key,value):
    env=config(); env[key]=value
    with pytest.raises(RuntimeError,match="target"): validate_target(env)


def test_rejects_shared_credentials_without_echoing_them():
    env=config(); secret=secrets.token_urlsafe(32)
    env.update({key:secret for key in ACCOUNTS})
    with pytest.raises(RuntimeError) as error: validate_target(env)
    assert secret not in str(error.value)


def test_idempotent_and_synthetic_only(db):
    env=config(); populate(db,env); db.commit(); populate(db,env); db.commit()
    assert db.scalar(select(func.count(User.id))) == 3
    assert db.scalar(select(func.count(Qualification.id))) == 4
    assert all(q.source_type==SourceType.SYNTHETIC and q.qualification_name.startswith("TEST ONLY") for q in db.scalars(select(Qualification)))
    assert all(t.verification_status==VerificationStatus.SYNTHETIC for t in db.scalars(select(TrainingOpportunity)))
    assert not db.scalar(select(User).where(User.role==UserRole.ADMIN))


def test_never_promotes_existing_account(db):
    env=config(); email,_=next(iter(ACCOUNTS.values()))
    db.add(User(email=email,role=UserRole.BENEFICIARY,hashed_password=hash_password(secrets.token_urlsafe(32)))); db.commit()
    with pytest.raises(RuntimeError,match="existing test account"): populate(db,env)
    assert db.scalar(select(User).where(User.email==email)).role==UserRole.BENEFICIARY
    assert db.scalar(select(func.count(Qualification.id)))==0


def test_staging_staff_journey_keeps_uncertain_pathways_gated(client, db):
    """Exercise the deployed fixture accounts through real login and role routes."""
    env = config()
    populate(db, env)
    db.commit()
    headers = {}
    for key, (email, role) in ACCOUNTS.items():
        login = client.post('/api/auth/login', json={'email': email, 'password': env[key]})
        assert login.status_code == 200
        headers[role] = {'Authorization': f"Bearer {login.json()['access_token']}"}
        assert client.get('/api/auth/me', headers=headers[role]).json()['role'] == role.value
    worker = headers[UserRole.FIELD_WORKER]
    facilitator = headers[UserRole.FACILITATOR]
    officer = headers[UserRole.DISTRICT_OFFICER]
    assert client.get('/api/reviews', headers=worker).status_code == 403
    assert client.get('/api/reviews', headers=officer).status_code == 403

    registration = client.post('/api/auth/register', json={
        'email': 'assisted-person@example.com', 'password': secrets.token_urlsafe(32),
    })
    assert registration.status_code == 201
    beneficiary = {'Authorization': f"Bearer {registration.json()['access_token']}"}
    user_id = client.get('/api/auth/me', headers=beneficiary).json()['id']

    created = client.post('/api/beneficiaries', headers=worker, json={
        'name': 'Disposable staff workflow test', 'district': 'Madurai',
        'state': 'Tamil Nadu', 'consent_given': True, 'user_id': user_id,
    })
    assert created.status_code == 201
    beneficiary_id = created.json()['id']
    profile = client.patch(f'/api/beneficiaries/{beneficiary_id}/profile', headers=worker,
        json={'education_level': '10th Standard', 'current_occupation': 'தெரியாத தொழில்',
              'mobility_km': 5})
    assert profile.status_code == 200
    generated = client.post(f'/api/beneficiaries/{beneficiary_id}/generate-pathways', headers=worker)
    assert generated.status_code == 200
    pathways = generated.json()
    assert len(pathways) == 3
    assert all(p['title'] != 'Expired qualification' for p in pathways)
    for pathway in pathways:
        assert pathway['confidence'] == 'RED' and pathway['pending_human_review']
        availability = next(e for e in pathway['evidence'] if e['evidence_type'] == 'OPPORTUNITY')
        assert availability['source_type'] == 'SYNTHETIC'
        assert availability['verification_status'] == 'UNVERIFIED'
        assert 'not yet verified' in availability['value']

    pathway_id = pathways[0]['id']
    reviews = client.get('/api/reviews?status=OPEN&page_size=100', headers=facilitator)
    assert reviews.status_code == 200
    review = next(r for r in reviews.json()['items'] if r['pathway_id'] == pathway_id)
    outcome = {'beneficiary_id': beneficiary_id, 'pathway_id': pathway_id, 'followup_day': 30}
    for action in ('edit', 'resolve', 'reject'):
        response = client.post(f"/api/reviews/{review['id']}/{action}", headers=facilitator,
            json={'notes': 'Fixture evidence still requires confirmation'})
        assert response.status_code == 200
        assert client.get(f'/api/pathways/{pathway_id}', headers=worker).json()['pending_human_review']
        blocked = client.post('/api/outcomes', headers=beneficiary, json=outcome)
        assert blocked.status_code == 409
    approved = client.post(f"/api/reviews/{review['id']}/approve", headers=facilitator,
        json={'notes': 'Synthetic workflow test only; not a real livelihood decision'})
    assert approved.status_code == 200
    assert not client.get(f'/api/pathways/{pathway_id}', headers=worker).json()['pending_human_review']
    recorded = client.post('/api/outcomes', headers=beneficiary, json=outcome)
    assert recorded.status_code == 201
    assert client.get(f"/api/pathways/{pathways[1]['id']}", headers=worker).json()['pending_human_review']
    assert client.get('/api/dashboard/summary', headers=officer).status_code == 200

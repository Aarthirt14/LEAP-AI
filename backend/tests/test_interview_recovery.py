from app.models import UserRole
from tests.conftest import auth, make_user
from tests.test_credibility import person


def test_start_retry_resume_and_answer_retry(client, db):
    beneficiary, headers = person(db)
    payload = {'beneficiary_id': beneficiary.id, 'language': 'Tamil', 'resume_existing': True}
    first = client.post('/api/interviews', headers=headers, json=payload).json()
    assert client.post('/api/interviews', headers=headers, json=payload).json()['id'] == first['id']
    url = f'/api/interviews/{first["id"]}/answers'
    answer = {'question_key': 'mobility_km', 'question_text': 'Distance', 'transcript': '7 km', 'language': 'Tamil'}
    saved = client.post(url, headers=headers, json=answer).json()
    assert client.post(url, headers=headers, json=answer).json()['id'] == saved['id']
    restored = client.get(f'/api/interviews/active/{beneficiary.id}', headers=headers).json()
    assert len(restored['answers']) == 1
    assert restored['answers'][0]['transcript'] == '7 km'
    assert client.post(url, headers=headers, json={**answer, 'transcript': '8 km'}).status_code == 409
    current = client.get(f'/api/interviews/{first["id"]}/preview', headers=headers).json()
    assert client.post(f'/api/interviews/{first["id"]}/complete', headers=headers, json={'confirmed': True, 'preview_token': current['preview_token']}).status_code == 200
    assert client.get(f'/api/interviews/active/{beneficiary.id}', headers=headers).json() is None
    assert client.post('/api/interviews', headers=headers, json=payload).json()['id'] != first['id']


def test_recovery_requires_ownership_and_consent(client, db):
    beneficiary, headers = person(db)
    other = make_user(db, UserRole.BENEFICIARY, 'other-recovery@example.com')
    url = f'/api/interviews/active/{beneficiary.id}'
    assert client.get(url).status_code == 401
    assert client.get(url, headers=auth(other)).status_code == 403
    beneficiary.consent_given = False
    db.commit()
    assert client.get(url, headers=headers).status_code == 422

import pytest
from app.models import UserRole
from app.engines.pathway_engine import rank_pathways
from app.services.pathway_service import _profile_dict
from tests.conftest import auth, make_user
from tests.test_credibility import person
from tests.test_alternative_eligibility import document


def test_save_retrieve_scoping_and_preservation(client, db):
    beneficiary, headers = person(db)
    url = f'/api/beneficiaries/{beneficiary.id}/profile'
    facts = {'NQR:11689': {'previous_nsqf_level': None, 'relevant_experience_years': 3, 'certificates': []}}
    saved = client.patch(url, headers=headers, json={'education_level': '10th', 'eligibility_facts': facts})
    assert saved.status_code == 200
    response_facts = {'NQR:11689': {**facts['NQR:11689'], 'can_read_write': None}}
    assert saved.json()['eligibility_facts'] == response_facts
    client.patch(url, headers=headers, json={'aspiration_text': 'solar'})
    assert client.get(url, headers=headers).json()['eligibility_facts'] == response_facts
    db.expire_all()
    assert _profile_dict(beneficiary)['eligibility_facts'] == facts
    qualifications = [{'id': i, 'qualification_code': f"NQR:{record['registry_id']}",
        'title': record['title'], 'sector': record['sector'], 'source_type': 'NQR',
        'source_metadata': record, 'valid_until': record['valid_until'],
        'validity_status': 'VALID', 'competencies': []} for i, record in enumerate(document()['records'])]
    ranked = rank_pathways(_profile_dict(beneficiary), [], qualifications, {}, {})
    assessments = {r['qualification_id']: r['eligibility_assessment']['status'] for r in ranked}
    assert assessments[0] == 'ELIGIBLE_ON_REPORTED_FACTS'
    assert assessments[1] == 'NEEDS_VERIFICATION'


def test_unknown_zero_and_clear_are_distinct(client, db):
    beneficiary, headers = person(db)
    url = f'/api/beneficiaries/{beneficiary.id}/profile'
    facts = {'NQR:11689': {'can_read_write': False, 'previous_nsqf_level': 0, 'relevant_experience_years': 0, 'certificates': []},
             'NQR:13239': {'can_read_write': None, 'previous_nsqf_level': None, 'relevant_experience_years': None, 'certificates': None}}
    assert client.patch(url, headers=headers, json={'eligibility_facts': facts}).json()['eligibility_facts'] == facts
    assert client.patch(url, headers=headers, json={'eligibility_facts': None}).json()['eligibility_facts'] is None


def test_ownership_consent_and_no_self_verification(client, db):
    beneficiary, headers = person(db)
    url = f'/api/beneficiaries/{beneficiary.id}/profile'
    other = make_user(db, UserRole.BENEFICIARY, 'other-eligibility@example.com')
    payload = {'eligibility_facts': {'NQR:11689': {'relevant_experience_years': 3}}}
    assert client.patch(url, json=payload).status_code == 401
    assert client.patch(url, headers=auth(other), json=payload).status_code == 403
    assert client.patch(url, headers=headers, json={'eligibility_facts': {'NQR:11689': {'verified': True}}}).status_code == 422
    beneficiary.consent_given = False
    db.commit()
    assert client.patch(url, headers=headers, json=payload).status_code == 422


@pytest.mark.parametrize('facts', [
    {'other': {}}, {'NQR:11689': {'previous_nsqf_level': 9}},
    {'NQR:11689': {'previous_nsqf_level': 3.2}},
    {'NQR:11689': {'relevant_experience_years': -1}},
    {'NQR:11689': {'certificates': ['invented']}},
])
def test_invalid_facts_rejected(client, db, facts):
    beneficiary, headers = person(db)
    assert client.patch(f'/api/beneficiaries/{beneficiary.id}/profile', headers=headers, json={'eligibility_facts': facts}).status_code == 422

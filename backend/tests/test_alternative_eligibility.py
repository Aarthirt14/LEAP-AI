from copy import deepcopy
from datetime import date, timedelta
import json
from pathlib import Path
from sqlalchemy import select
import pytest
from app.engines.eligibility_engine import evaluate_eligibility
from app.engines.pathway_engine import rank_pathways
from app.models import Qualification, TrainingOpportunity, LivelihoodProfile
from app.services.pathway_service import generate_pathways
from seed.load_nqr_database import import_catalogue
from tests.test_credibility import person


def document():
    path = Path(__file__).resolve().parents[2] / 'data/nqr-reference.json'
    data = json.loads(path.read_text())
    for row in data['records']:
        row['source_checked_on'] = str(date.today())
    return data


def rules():
    return document()['records'][1]['eligibility_rules']


def test_alternative_or_and_unknown_facts():
    assert evaluate_eligibility({'education_level': '12th Standard'}, rules())['status'] == 'ELIGIBLE_ON_REPORTED_FACTS'
    assert evaluate_eligibility({'education_level': '10th'}, rules())['status'] == 'NEEDS_VERIFICATION'
    assert evaluate_eligibility({'education_level': '10th', 'certificates': ['NTC_2_YEAR']}, rules())['status'] == 'ELIGIBLE_ON_REPORTED_FACTS'
    assert evaluate_eligibility({'education_level': '10th', 'certificates': ['NTC']}, rules())['status'] == 'NEEDS_VERIFICATION'
    assert evaluate_eligibility({'education_level': '11th', 'relevant_experience_years': 1.5}, rules())['status'] == 'ELIGIBLE_ON_REPORTED_FACTS'
    assert evaluate_eligibility({'education_level': '10th', 'experience_years': 20}, rules())['status'] == 'NEEDS_VERIFICATION'
    assert evaluate_eligibility({'education_level': '5th', 'previous_nsqf_level': 0, 'relevant_experience_years': 0, 'certificates': []}, rules())['status'] == 'NOT_ELIGIBLE'


@pytest.mark.parametrize('routes', [[], None, [{'id': 'x', 'summary': 'broken', 'all': []}], [{'id':'x','summary':'broken','all':[{'field':'made_up','operator':'gte','value':1}]}]])
def test_malformed_rules_never_grant_eligibility(routes):
    assert evaluate_eligibility({'education_level':'12th'}, routes)['status'] == 'NEEDS_VERIFICATION'


def test_import_dry_run_idempotency_and_actual_recommendations(db):
    data = document()
    assert import_catalogue(db, data)['created'] == 3
    assert db.scalar(select(Qualification)) is None
    assert import_catalogue(db, data, apply=True)['created'] == 3
    db.commit()
    assert import_catalogue(db, data, apply=True)['unchanged'] == 3
    assert db.scalar(select(TrainingOpportunity)) is None
    beneficiary, _ = person(db)
    db.add(LivelihoodProfile(beneficiary_id=beneficiary.id, education_level='12th Standard', aspiration_text='solar', profile_completion_percentage=80))
    db.commit()
    pathways = generate_pathways(db, beneficiary.id)
    assert pathways
    assert any(e.label == 'Alternative entry-route assessment' and 'Appears to meet' in e.value for p in pathways for e in p.evidence)
    assert all(p.confidence_level.value == 'RED' for p in pathways)
    assert all(p.eligibility_score == 1 for p in pathways)
    assert all(p.opportunity_score == .5 for p in pathways)
    for row in db.scalars(select(Qualification)):
        assert row.valid_from is None
        assert row.source_metadata['sha256']


def test_unknown_is_reviewed_and_stale_reference_excluded():
    record = document()['records'][1]
    q = {'id':1,'title':record['title'],'sector':record['sector'],'source_type':'NQR','source_metadata':record,'valid_until':record['valid_until'],'validity_status':'VALID','competencies':[]}
    results = rank_pathways({'education_level':'10th'}, [], [q], {}, {})
    assert len(results) == 1
    assert results[0]['score_parts']['eligibility'] == .5
    assert results[0]['confidence'] == 'RED'
    q['source_metadata'] = {**record, 'source_checked_on': str(date.today()-timedelta(days=31))}
    assert rank_pathways({'education_level':'12th'}, [], [q], {}, {}) == []


def test_invalid_later_record_causes_no_partial_import(db):
    data = document()
    data['records'][1]['eligibility_rules'] = []
    with pytest.raises(ValueError):
        import_catalogue(db, data, apply=True)
    assert db.scalar(select(Qualification)) is None

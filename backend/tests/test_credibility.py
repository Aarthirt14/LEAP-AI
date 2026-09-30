from datetime import date, timedelta
import pytest
from app.config import Settings
from app.models import Beneficiary, ExtractedProfileFact, UserRole
from app.engines.qualification_validity import qualification_is_current
from app.engines.pathway_engine import rank_pathways
from app.engines.skill_ontology import normalize_text, occupation_match
from tests.conftest import auth, make_user


def person(db):
    user=make_user(db,UserRole.BENEFICIARY,'confirm@example.com')
    row=Beneficiary(user_id=user.id,name='Test Person',district='Test',state='',consent_given=True,created_by=user.id)
    db.add(row);db.commit()
    return row,auth(user)


def test_preview_confirmation_corrections_and_safe_retry(client,db):
    b,h=person(db)
    sid=client.post('/api/interviews',headers=h,json={'beneficiary_id':b.id,'language':'Tamil'}).json()['id']
    url=f'/api/interviews/{sid}'
    a=client.post(url+'/answers',headers=h,json={'question_key':'mobility_km','question_text':'Distance','transcript':'௭ km','extraction_confidence':1,'speech_confidence':.9}).json()
    assert a['extraction_confidence'] is None and a['speech_confidence'] is None
    first=client.get(url+'/preview',headers=h).json()
    assert first['answers'][0]['value']==7
    assert client.get(f'/api/beneficiaries/{b.id}/profile',headers=h).status_code==404
    assert client.post(url+'/complete',headers=h).status_code==409
    client.patch(url+f'/answers/{a["id"]}',headers=h,json={'corrected_text':'8 km','extraction_confidence':1})
    assert client.post(url+'/complete',headers=h,json={'confirmed':True,'preview_token':first['preview_token']}).status_code==409
    preview=client.get(url+'/preview',headers=h).json()
    assert preview['answers'][0]['transcript']=='௭ km'
    for _ in range(2):assert client.post(url+'/complete',headers=h,json={'confirmed':True,'preview_token':preview['preview_token']}).status_code==200
    assert client.get(f'/api/beneficiaries/{b.id}/profile',headers=h).json()['mobility_km']==8
    assert db.query(ExtractedProfileFact).count()==1
    assert not db.query(ExtractedProfileFact).first().verified
    assert client.patch(url+f'/answers/{a["id"]}',headers=h,json={'corrected_text':'9'}).status_code==409


def test_beneficiary_cannot_self_verify_skill(client,db):
    b,h=person(db)
    r=client.post(f'/api/beneficiaries/{b.id}/skills',headers=h,json={'name':'தையல்','sector':'Apparel','experience_years':4,'verified':True,'source':'DOCUMENT'})
    assert r.status_code==201 and r.json()['verified'] is False and r.json()['source']=='SELF_REPORTED'


@pytest.mark.parametrize('start,end,expected',[(-1,1,True),(0,0,True),(-2,-1,False),(1,2,False),(None,None,True)])
def test_date_boundaries(start,end,expected):
    today=date(2026,9,30)
    q={'validity_status':'VALID','valid_from':today+timedelta(days=start) if start is not None else None,'valid_until':today+timedelta(days=end) if end is not None else None}
    assert qualification_is_current(q,today)==expected
    assert not qualification_is_current({'validity_status':'VALID','valid_until':'bad'},today)


def test_ranking_excludes_expired_and_ignores_synthetic_availability():
    q={'id':1,'title':'Tailoring','sector':'Apparel','validity_status':'VALID','valid_from':date.today()-timedelta(days=1),'valid_until':date.today()+timedelta(days=1),'competencies':[]}
    p={'education_level':'10th','profile_completion_percentage':80,'mobility_km':1}
    r=rank_pathways(p,[],[q],{1:{'source_type':'SYNTHETIC','verification_status':'VERIFIED','distance_km':90,'seats_available':100}}, {})[0]
    assert r['score_parts']['opportunity']==.5 and r['score_parts']['mobility']==.5
    assert not r['training_location_known']
    q['valid_until']=date.today()-timedelta(days=1)
    assert rank_pathways(p,[],[q],{}, {})==[]


def test_unicode_aliases_and_unknown_language():
    assert normalize_text('தையல்')=='தையல்' and normalize_text('सिलाई')=='सिलाई'
    assert occupation_match('தையல்','Tailoring')==1 and occupation_match('सिलाई','Tailoring')==1
    assert occupation_match('தெரியாத தொழில்','Tailoring')==0
    assert occupation_match('tail','Tailoring')==0


def test_ambiguous_numeric_values_not_guessed():
    from app.services.interview_preview import parse_value
    for text in ['5 or 10 km','-5','five','ஐந்து','पांच']:
        value,warning=parse_value('mobility_km',text)
        assert value is None and warning
    assert parse_value('mobility_km','७ km')[0]==7


def test_production_guard():
    with pytest.raises(ValueError,match='Production requires'):
        Settings(environment='production',jwt_secret='development-jwt-change-me',secret_key='development-only-change-me')
    assert Settings(environment='production',jwt_secret='x'*40,secret_key='y'*40).environment=='production'


def test_red_gate_and_outcome_provenance(client,db):
    from app.models import LivelihoodPathway, PathwayType, ConfidenceLevel, HumanReview, Provenance
    b,h=person(db)
    pw=LivelihoodPathway(beneficiary_id=b.id,pathway_type=PathwayType.FASTEST,title='Option',description='Evidence',skill_fit_score=.5,aspiration_fit_score=.5,opportunity_score=.5,eligibility_score=.5,mobility_score=.5,training_access_score=.5,training_burden_score=.5,overall_score=50,confidence_level=ConfidenceLevel.RED,recommended_route='FULL_TRAINING')
    db.add(pw);db.flush()
    review=HumanReview(beneficiary_id=b.id,pathway_id=pw.id,reason_code='LOW_CONFIDENCE',reason_description='Needs confirmation')
    db.add(review);db.commit()
    assert client.get(f'/api/pathways/{pw.id}',headers=h).json()['pending_human_review']
    payload={'beneficiary_id':b.id,'pathway_id':pw.id,'followup_day':90,'verification_status':'SYSTEM_VERIFIED','employment_status':'EMPLOYED'}
    assert client.post('/api/outcomes',headers=h,json=payload).status_code==409
    reviewer=make_user(db,UserRole.FACILITATOR,'review@example.com')
    client.post(f'/api/reviews/{review.id}/approve',headers=auth(reviewer),json={'notes':'Checked evidence'})
    assert not client.get(f'/api/pathways/{pw.id}',headers=h).json()['pending_human_review']
    result=client.post('/api/outcomes',headers=h,json=payload)
    assert result.status_code==201 and result.json()['verification_status']=='USER_REPORTED'


def test_unverified_outcomes_do_not_become_ranking_evidence(db):
    from app.models import LivelihoodPathway, PathwayType, ConfidenceLevel, Qualification, ValidityStatus, OutcomeFollowup, EmploymentStatus
    from app.services.outcome_evidence_service import qualification_evidence_scores
    from app.config import get_settings
    b,_=person(db)
    q=Qualification(qualification_code='TEST',qualification_name='Test',sector='Test',occupational_role='Test',validity_status=ValidityStatus.VALID)
    db.add(q);db.flush()
    p=LivelihoodPathway(beneficiary_id=b.id,qualification_id=q.id,pathway_type=PathwayType.FASTEST,title='Test',description='Test',skill_fit_score=1,aspiration_fit_score=1,opportunity_score=1,eligibility_score=1,mobility_score=1,training_access_score=1,training_burden_score=1,overall_score=100,confidence_level=ConfidenceLevel.GREEN,recommended_route='RPL')
    db.add(p);db.flush();db.add(OutcomeFollowup(beneficiary_id=b.id,pathway_id=p.id,followup_day=90,training_completed=True,employment_status=EmploymentStatus.EMPLOYED,reported_by=b.user_id));db.commit()
    settings=get_settings();old=settings.minimum_outcome_samples
    try:
        settings.minimum_outcome_samples=1
        assert qualification_evidence_scores(db)=={}
    finally:settings.minimum_outcome_samples=old


def test_consent_withdrawal_blocks_confirmation(client,db):
    b,h=person(db)
    sid=client.post('/api/interviews',headers=h,json={'beneficiary_id':b.id}).json()['id']
    client.post(f'/api/interviews/{sid}/answers',headers=h,json={'question_key':'current_occupation','question_text':'Work','transcript':'தையல்'})
    token=client.get(f'/api/interviews/{sid}/preview',headers=h).json()['preview_token']
    client.patch(f'/api/beneficiaries/{b.id}',headers=h,json={'consent_given':False})
    assert client.post(f'/api/interviews/{sid}/complete',headers=h,json={'confirmed':True,'preview_token':token}).status_code==422


def test_location_not_inferred_from_language():
    from app.schemas import BeneficiaryCreate
    assert BeneficiaryCreate(name='Test',district='Test',preferred_language='Tamil',consent_given=False).state==''

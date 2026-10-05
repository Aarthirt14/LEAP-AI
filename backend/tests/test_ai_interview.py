import json
import httpx
import pytest
from app.config import Settings
from app.services import ai_interview as ai
from app.models import InterviewAnswer, ExtractedProfileFact, UserRole
from tests.test_credibility import person
from tests.conftest import auth, make_user

@pytest.fixture(autouse=True)
def isolated(monkeypatch):
    monkeypatch.setattr(ai,'get_settings',lambda:Settings(ai_interview_enabled=True,openai_api_key='test-placeholder'))
    ai._attempts.clear()

def provider(monkeypatch,handler):
    original=httpx.Client
    monkeypatch.setattr(ai.httpx,'Client',lambda **kw:original(transport=httpx.MockTransport(handler),**kw))

def envelope(value):
    return {'status':'completed','output':[{'type':'message','content':[{'type':'output_text','text':json.dumps(value)}]}]}

def call(**kw):
    return ai.suggest(**{'user_id':1,'key':'mobility_km','text':'ஐந்து கிமீ','language':'Tamil',**kw})

def test_minimized_payload(monkeypatch):
    def handle(r):
        b=json.loads(r.content)
        assert str(r.url)=='https://api.openai.com/v1/responses'
        assert b['store'] is False and b['model']=='gpt-6-luna'
        assert b['max_output_tokens']==600 and 'tools' not in b
        assert json.loads(b['input'])=={'field':'mobility_km','language':'Tamil','answer':'ஐந்து கிமீ'}
        assert b['text']['format']['strict'] is True
        return httpx.Response(200,json=envelope({'status':'suggestion','normalized_text':'5 km'}))
    provider(monkeypatch,handle)
    assert call()=={'status':'suggestion','normalized_text':'5 km','verification':'SELF_REPORTED'}

@pytest.mark.parametrize('code',[401,403,429,500,503])
def test_provider_failure(monkeypatch,code):
    provider(monkeypatch,lambda r:httpx.Response(code,json={'error':'private-detail'}))
    assert call()['status']=='unavailable'

def test_timeout(monkeypatch):
    def handle(r):raise httpx.ReadTimeout('private-detail',request=r)
    provider(monkeypatch,handle)
    assert call()['status']=='unavailable'

@pytest.mark.parametrize('value',[
 {'status':'suggestion','normalized_text':'5 km','verified':True},
 {'status':'suggestion','normalized_text':'-5 km'},
 {'status':'suggestion','normalized_text':'5 or 10 km'},
 {'status':'suggestion','normalized_text':None},
 {'status':'suggestion','normalized_text':8},
 {'status':'suggestion','normalized_text':'x'*1001},
 {'status':'approved','normalized_text':'5 km'}])
def test_invalid_output(monkeypatch,value):
    provider(monkeypatch,lambda r:httpx.Response(200,json=envelope(value)))
    assert call()['status']=='unavailable'

@pytest.mark.parametrize('result',[{'status':'incomplete','output':[]},{'status':'completed','output':[{'type':'message','content':[{'type':'refusal','refusal':'no'}]}]},[],None])
def test_wrong_envelope(monkeypatch,result):
    provider(monkeypatch,lambda r:httpx.Response(200,json=result))
    assert call()['status']=='unavailable'

def test_abstain(monkeypatch):
    provider(monkeypatch,lambda r:httpx.Response(200,json=envelope({'status':'needs_confirmation','normalized_text':'guess'})))
    assert call()['normalized_text'] is None

def test_disabled_and_unsupported_never_call(monkeypatch):
    def forbidden(**kw):pytest.fail('external call forbidden')
    monkeypatch.setattr(ai.httpx,'Client',forbidden)
    for kw in [{'text':'x'*2001},{'key':'caste'},{'text':''}]:assert call(**kw)['status']=='unavailable'
    monkeypatch.setattr(ai,'get_settings',lambda:Settings(ai_interview_enabled=False,openai_api_key='test'))
    assert call()['status']=='unavailable'
    monkeypatch.setattr(ai,'get_settings',lambda:Settings(ai_interview_enabled=True,openai_api_key=''))
    assert call()['status']=='unavailable'

def test_rate_concurrency_and_size(monkeypatch):
    provider(monkeypatch,lambda r:httpx.Response(200,json=envelope({'status':'suggestion','normalized_text':'5 km'})))
    for _ in range(6):assert call()['status']=='suggestion'
    assert call()['status']=='unavailable'
    assert ai._slots.acquire(False) and ai._slots.acquire(False)
    try:assert call(user_id=2)['status']=='unavailable'
    finally:ai._slots.release();ai._slots.release()

def test_oversized_response(monkeypatch):
    provider(monkeypatch,lambda r:httpx.Response(200,content=b'x'*65537))
    assert call()['status']=='unavailable'

def test_consent_ownership_no_implicit_save(client,db,monkeypatch):
    b,h=person(db)
    assert client.get('/api/interviews/assistance/config',headers=h).json()=={'enabled':True}
    assert client.get('/api/interviews/assistance/config').status_code==401
    sid=client.post('/api/interviews',headers=h,json={'beneficiary_id':b.id,'language':'Tamil'}).json()['id']
    url=f'/api/interviews/{sid}'
    aid=client.post(url+'/answers',headers=h,json={'question_key':'mobility_km','question_text':'Travel','transcript':'ஐந்து கிமீ'}).json()['id']
    endpoint=url+f'/answers/{aid}/suggestion'
    seen=[]
    def fake(**kw):
        seen.append(kw)
        return {'status':'suggestion','normalized_text':'5 km','verification':'SELF_REPORTED'}
    monkeypatch.setattr(ai,'suggest',fake)
    assert client.post(endpoint,headers=h,json={}).status_code==422
    other=make_user(db,UserRole.BENEFICIARY,'other-ai@example.com')
    assert client.post(endpoint,headers=auth(other),json={'consent':True}).status_code==403
    assert not seen
    before=client.get(url+'/preview',headers=h).json()
    assert client.post(endpoint,headers=h,json={'consent':True}).json()['source_text']=='ஐந்து கிமீ'
    assert client.get(url+'/preview',headers=h).json()==before
    assert db.get(InterviewAnswer,aid).corrected_text is None
    assert db.query(ExtractedProfileFact).count()==0
    assert client.get(f'/api/beneficiaries/{b.id}/profile',headers=h).status_code==404
    client.patch(url+f'/answers/{aid}',headers=h,json={'corrected_text':'5 km'})
    assert client.post(url+'/complete',headers=h,json={'confirmed':True,'preview_token':before['preview_token']}).status_code==409
    new=client.get(url+'/preview',headers=h).json()
    assert client.post(url+'/complete',headers=h,json={'confirmed':True,'preview_token':new['preview_token']}).status_code==200
    assert not db.query(ExtractedProfileFact).first().verified
    assert client.post(endpoint,headers=h,json={'consent':True}).status_code==409

def test_secret_redaction():
    assert 'sensitive-test-value' not in repr(Settings(openai_api_key='sensitive-test-value'))

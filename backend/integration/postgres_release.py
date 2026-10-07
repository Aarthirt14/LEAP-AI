"""Release check for the disposable CI PostgreSQL database only; never production."""
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
import json
from pathlib import Path
from sqlalchemy import select, func
from sqlalchemy.engine import make_url
from app.config import get_settings
from app.database import SessionLocal
from app.models import User, UserRole, Beneficiary, InterviewSession, InterviewAnswer, Qualification, TrainingOpportunity
from app.api.routes.interviews import start_interview, add_answer
from app.api.routes.beneficiaries import patch_profile
from app.schemas import InterviewCreate, InterviewAnswerCreate, ProfileData
from seed.load_nqr_database import import_catalogue


def main():
    url = make_url(get_settings().database_url)
    if url.get_backend_name() != 'postgresql' or url.host not in {'localhost', '127.0.0.1'} or url.database != 'leap_release_test':
        raise RuntimeError('Refusing to run outside the disposable local CI PostgreSQL database')
    with SessionLocal.begin() as db:
        user = User(email='concurrency@example.test', hashed_password='not-a-login-password', role=UserRole.BENEFICIARY)
        db.add(user); db.flush()
        beneficiary = Beneficiary(user_id=user.id, created_by=user.id, name='CI test only', district='Test', state='Test', consent_given=True)
        db.add(beneficiary); db.flush()
        user_id, beneficiary_id = user.id, beneficiary.id
    barrier = Barrier(4)
    def start(_):
        with SessionLocal() as db:
            user = db.get(User, user_id)
            barrier.wait(timeout=15)
            return start_interview(InterviewCreate(beneficiary_id=beneficiary_id, language='English', resume_existing=True), db, user).id
    with ThreadPoolExecutor(max_workers=4) as pool:
        ids = list(pool.map(start, range(4)))
    assert len(set(ids)) == 1, ids
    session_id = ids[0]
    barrier = Barrier(4)
    def answer(_):
        with SessionLocal() as db:
            user = db.get(User, user_id)
            barrier.wait(timeout=15)
            payload = InterviewAnswerCreate(question_key='education_level', question_text='Education', transcript='10th', language='English')
            return add_answer(session_id, payload, db, user).id
    with ThreadPoolExecutor(max_workers=4) as pool:
        answer_ids = list(pool.map(answer, range(4)))
    assert len(set(answer_ids)) == 1, answer_ids
    document = json.loads(Path('seed/data/nqr-reference.json').read_text())
    with SessionLocal.begin() as db:
        assert db.scalar(select(func.count()).select_from(InterviewSession)) == 1
        assert db.scalar(select(func.count()).select_from(InterviewAnswer)) == 1
        assert import_catalogue(db, document)['created'] == len(document['records'])
        assert db.scalar(select(func.count()).select_from(Qualification)) == 0
        assert import_catalogue(db, document, apply=True)['created'] == len(document['records'])
    with SessionLocal.begin() as db:
        assert import_catalogue(db, document, apply=True)['unchanged'] == len(document['records'])
        assert db.scalar(select(func.count()).select_from(TrainingOpportunity)) == 0
    facts = {'NQR:11689': {'previous_nsqf_level': None, 'relevant_experience_years': 3, 'certificates': []}}
    with SessionLocal() as db:
        user = db.get(User, user_id)
        profile = patch_profile(beneficiary_id, ProfileData(eligibility_facts=facts), db, user)
        assert profile.eligibility_facts == facts
    print('PostgreSQL: concurrent starts/answer retries deduplicated; profile JSON and idempotent NQR import passed')


if __name__ == '__main__':
    main()

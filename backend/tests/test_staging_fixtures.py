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

import os
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET"] = "test-jwt-secret-with-enough-entropy"
os.environ["SECRET_KEY"] = "test-secret-with-enough-entropy"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.database import Base, get_db
from app.main import app
from app.models import User, UserRole
from app.security.jwt import create_access_token, hash_password

engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@pytest.fixture(autouse=True)
def database():
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture
def db():
    session = TestingSession()
    try: yield session
    finally: session.close()


@pytest.fixture
def client():
    def override():
        session = TestingSession()
        try: yield session
        finally: session.close()
    app.dependency_overrides[get_db] = override
    with TestClient(app) as test_client: yield test_client
    app.dependency_overrides.clear()


def make_user(db, role: UserRole, email: str) -> User:
    user = User(email=email, hashed_password=hash_password("DemoPassword123!"), role=role)
    db.add(user); db.commit(); db.refresh(user); return user


def auth(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user.id, user.role.value)}"}

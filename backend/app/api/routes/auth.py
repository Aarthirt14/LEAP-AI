from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, status
from jwt import InvalidTokenError
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models import RefreshToken, User, UserRole
from app.schemas import RefreshRequest, TokenPair, UserLogin, UserOut, UserRegister
from app.security.jwt import create_access_token, create_refresh_token, decode_token, hash_password, token_digest, verify_password
from app.utils.errors import AppError

router = APIRouter(prefix="/auth", tags=["Authentication"])

DEMO_EMAILS = {
    "BENEFICIARY": "beneficiary.demo@leapai.local",
    "FIELD_WORKER": "fieldworker.demo@leapai.local",
    "FACILITATOR": "facilitator.demo@leapai.local",
    "DISTRICT_OFFICER": "officer.demo@leapai.local",
    "ADMIN": "admin.demo@leapai.local",
}


def issue_pair(db: Session, user: User) -> TokenPair:
    access = create_access_token(user.id, user.role.value)
    refresh = create_refresh_token(user.id, user.role.value)
    db.add(RefreshToken(user_id=user.id, token_hash=token_digest(refresh), expires_at=datetime.now(timezone.utc) + timedelta(days=get_settings().refresh_token_expire_days)))
    db.commit()
    return TokenPair(access_token=access, refresh_token=refresh)


@router.get("/demo-config", description="Return presentation login options only when DEMO_MODE is enabled.")
def demo_config() -> dict:
    settings = get_settings()
    if not settings.demo_mode:
        return {"enabled": False, "roles": {}}
    return {"enabled": True, "roles": DEMO_EMAILS, "password": "LeapDemo@2026"}


@router.post("/register", response_model=TokenPair, status_code=status.HTTP_201_CREATED, description="Register a beneficiary account. Privileged roles cannot self-register.")
def register(payload: UserRegister, db: Session = Depends(get_db)) -> TokenPair:
    if payload.role != UserRole.BENEFICIARY:
        raise AppError("ROLE_NOT_SELF_ASSIGNABLE", "Only beneficiary accounts can self-register.", 403)
    if db.scalar(select(User).where(User.email == payload.email.lower())):
        raise AppError("EMAIL_EXISTS", "An account already uses this email.", 409)
    user = User(email=payload.email.lower(), phone=payload.phone, hashed_password=hash_password(payload.password), role=UserRole.BENEFICIARY)
    db.add(user); db.flush()
    return issue_pair(db, user)


@router.post("/login", response_model=TokenPair, description="Exchange valid credentials for access and refresh tokens.")
def login(payload: UserLogin, db: Session = Depends(get_db)) -> TokenPair:
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if not user or not verify_password(payload.password, user.hashed_password):
        raise AppError("INVALID_CREDENTIALS", "Email or password is incorrect.", 401)
    if not user.is_active:
        raise AppError("INACTIVE_USER", "This account is inactive.", 403)
    return issue_pair(db, user)


@router.post("/refresh", response_model=TokenPair, description="Rotate a valid refresh token and return a new token pair.")
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> TokenPair:
    try:
        claims = decode_token(payload.refresh_token, "refresh")
    except InvalidTokenError:
        raise AppError("INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired.", 401)
    stored = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_digest(payload.refresh_token)))
    if not stored or stored.revoked:
        raise AppError("REFRESH_TOKEN_REVOKED", "Refresh token is unavailable.", 401)
    user = db.get(User, int(claims["sub"]))
    if not user or not user.is_active:
        raise AppError("INACTIVE_USER", "This account is unavailable.", 401)
    stored.revoked = True
    return issue_pair(db, user)


@router.get("/me", response_model=UserOut, description="Return the authenticated account and role.")
def me(user: User = Depends(get_current_user)) -> User:
    return user

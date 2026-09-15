from collections.abc import Callable
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Beneficiary, User, UserRole
from app.security.jwt import decode_token
from app.utils.errors import AppError

bearer = HTTPBearer(auto_error=False)


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> User:
    if not credentials:
        raise AppError("AUTH_REQUIRED", "Authentication is required.", 401)
    try:
        payload = decode_token(credentials.credentials, "access")
        user = db.get(User, int(payload["sub"]))
    except (InvalidTokenError, KeyError, ValueError):
        raise AppError("INVALID_TOKEN", "The access token is invalid or expired.", 401)
    if not user or not user.is_active:
        raise AppError("INACTIVE_USER", "This account is unavailable.", 401)
    return user


def require_roles(*allowed: UserRole) -> Callable:
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed:
            raise AppError("FORBIDDEN", "Your role cannot perform this action.", 403)
        return user
    return dependency


def assert_beneficiary_access(db: Session, user: User, beneficiary_id: int, write: bool = False) -> Beneficiary:
    beneficiary = db.get(Beneficiary, beneficiary_id)
    if not beneficiary:
        raise AppError("BENEFICIARY_NOT_FOUND", "Beneficiary not found.", 404)
    if user.role == UserRole.BENEFICIARY and beneficiary.user_id != user.id:
        raise AppError("FORBIDDEN", "You can access only your own beneficiary record.", 403)
    if user.role == UserRole.DISTRICT_OFFICER:
        raise AppError("AGGREGATE_ONLY", "District officers can access aggregate data only.", 403)
    if write and user.role not in {UserRole.BENEFICIARY, UserRole.FIELD_WORKER, UserRole.FACILITATOR, UserRole.ADMIN}:
        raise AppError("FORBIDDEN", "Your role cannot modify this beneficiary.", 403)
    return beneficiary

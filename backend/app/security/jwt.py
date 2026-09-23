import hashlib
from datetime import datetime, timedelta, timezone
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
from app.config import get_settings

password_hash = PasswordHasher()
settings = get_settings()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    try:
        return password_hash.verify(hashed, password)
    except (VerifyMismatchError, InvalidHashError):
        return False


def create_token(subject: int, role: str, token_type: str, expires_delta: timedelta) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode({"sub": str(subject), "role": role, "type": token_type, "iat": now, "exp": now + expires_delta}, settings.jwt_secret, algorithm="HS256")


def create_access_token(user_id: int, role: str) -> str:
    return create_token(user_id, role, "access", timedelta(minutes=settings.access_token_expire_minutes))


def create_refresh_token(user_id: int, role: str) -> str:
    return create_token(user_id, role, "refresh", timedelta(days=settings.refresh_token_expire_days))


def decode_token(token: str, expected_type: str) -> dict:
    payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    if payload.get("type") != expected_type:
        raise jwt.InvalidTokenError("Wrong token type")
    return payload


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
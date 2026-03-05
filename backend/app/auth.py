from datetime import datetime, timedelta
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.config import get_settings
from app.models.user import TokenData, Role

settings = get_settings()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)


def _to_bcrypt_bytes(password: str) -> bytes:
    """Bcrypt accepts at most 72 bytes. Truncate so any password length works."""
    if not isinstance(password, str):
        password = str(password)
    return password.encode("utf-8")[:72]


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_to_bcrypt_bytes(plain), hashed.encode("ascii"))
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(_to_bcrypt_bytes(password), bcrypt.gensalt()).decode("ascii")


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> TokenData | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        role: Role = payload.get("role", "user")
        if user_id is None:
            return None
        return TokenData(user_id=user_id, email=email, role=role)
    except JWTError:
        return None


async def get_current_user(token: str = Depends(oauth2_scheme)):
    from app.database import get_db
    from bson import ObjectId
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token_data = decode_token(token)
    if token_data is None:
        raise credentials_exception
    db = get_db()
    if db is None:
        raise credentials_exception
    try:
        oid = ObjectId(token_data.user_id)
    except Exception:
        raise credentials_exception
    user = await db.users.find_one({"_id": oid})
    if user is None:
        raise credentials_exception
    user["id"] = str(user["_id"])
    return user


# Guest user for unauthenticated access (login disabled)
GUEST_USER = {"id": "anonymous", "role": "user"}


async def get_current_user_optional(token: str | None = Depends(oauth2_scheme_optional)):
    """Returns current user if token valid, else guest (anonymous). Use when login is disabled."""
    if not token:
        return GUEST_USER
    token_data = decode_token(token)
    if token_data is None:
        return GUEST_USER
    from app.database import get_db
    from bson import ObjectId
    db = get_db()
    if db is None:
        return GUEST_USER
    try:
        oid = ObjectId(token_data.user_id)
    except Exception:
        return GUEST_USER
    user = await db.users.find_one({"_id": oid})
    if user is None:
        return GUEST_USER
    user["id"] = str(user["_id"])
    return user


def require_role(*allowed: Role):
    async def role_checker(current_user: dict = Depends(get_current_user)):
        role = current_user.get("role", "user")
        if role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not allowed for this role",
            )
        return current_user
    return role_checker

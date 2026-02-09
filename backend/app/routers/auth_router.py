from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from app.database import get_db
from app.models.user import UserCreate, UserResponse, Token
from app.auth import get_password_hash, create_access_token, get_current_user, verify_password
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/auth", tags=["auth"])


def user_to_response(doc: dict) -> UserResponse:
    return UserResponse(
        id=str(doc["_id"]),
        email=doc["email"],
        full_name=doc["full_name"],
        role=doc.get("role", "user"),
        company_name=doc.get("company_name"),
        created_at=doc.get("created_at"),
    )


@router.post("/register", response_model=Token)
async def register(data: UserCreate):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    now = datetime.utcnow()
    doc = {
        "email": data.email,
        "hashed_password": get_password_hash(data.password),
        "full_name": data.full_name,
        "role": data.role,
        "company_name": data.company_name if data.role == "company" else None,
        "created_at": now,
        "disabled": False,
    }
    r = await db.users.insert_one(doc)
    doc["_id"] = r.inserted_id
    user_resp = user_to_response(doc)
    token = create_access_token(
        {"sub": str(r.inserted_id), "email": data.email, "role": data.role}
    )
    return Token(access_token=token, token_type="bearer", user=user_resp)


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    email = form_data.username
    password = form_data.password
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if user.get("disabled"):
        raise HTTPException(status_code=400, detail="Account disabled")
    user_resp = user_to_response(user)
    token = create_access_token(
        {"sub": str(user["_id"]), "email": user["email"], "role": user.get("role", "user")}
    )
    return Token(access_token=token, token_type="bearer", user=user_resp)


@router.get("/me", response_model=UserResponse)
async def me(current_user: dict = Depends(get_current_user)):
    return user_to_response(current_user)

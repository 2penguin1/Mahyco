from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_session
from app.models.orm import User
from app.models.user import UserCreate, UserResponse, Token
from app.auth import get_password_hash, create_access_token, verify_password, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


def user_to_response(user: User) -> UserResponse:
    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        role=user.role,  # type: ignore[arg-type]
        company_name=user.company_name,
        created_at=user.created_at,
    )


@router.post("/register", response_model=Token)
async def register(data: UserCreate, session: AsyncSession = Depends(get_session)):
    # Check for existing email
    result = await session.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=data.email,
        hashed_password=get_password_hash(data.password),
        full_name=data.full_name,
        role=data.role,
        company_name=data.company_name if data.role == "company" else None,
        disabled=False,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    token = create_access_token(
        {"sub": str(user.id), "email": user.email, "role": user.role}
    )
    return Token(access_token=token, token_type="bearer", user=user_to_response(user))


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if user.disabled:
        raise HTTPException(status_code=400, detail="Account disabled")

    token = create_access_token(
        {"sub": str(user.id), "email": user.email, "role": user.role}
    )
    return Token(access_token=token, token_type="bearer", user=user_to_response(user))


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return user_to_response(current_user)

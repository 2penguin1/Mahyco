from fastapi import Depends, HTTPException, status
from fastapi_clerk_auth import ClerkConfig, ClerkHTTPBearer

from app.models.user import Role


config = ClerkConfig(
    jwks_url="https://robust-humpback-62.clerk.accounts.dev/.well-known/jwks.json",
)

clerk_auth_guard = ClerkHTTPBearer(config=config)


async def get_clerk_user(credentials=Depends(clerk_auth_guard)):
    """
    Map Clerk JWT -> app user dict.
    Expects role/company_name to be stored in Clerk public_metadata.
    """
    decoded = credentials.decoded or {}
    public_meta = decoded.get("public_metadata", {}) or {}

    return {
        "id": decoded.get("sub"),
        "email": decoded.get("email_address") or decoded.get("email"),
        "full_name": decoded.get("name") or decoded.get("full_name"),
        "role": public_meta.get("role", "user"),
        "company_name": public_meta.get("company_name"),
    }


async def get_clerk_user_optional(credentials=Depends(clerk_auth_guard)):
    """
    Optional version that still requires a valid token but returns a simplified dict.
    For now we treat it the same as required; Clerk handles 401s for missing/invalid tokens.
    """
    return await get_clerk_user(credentials)


def require_role(*allowed: Role):
    async def role_checker(current_user: dict = Depends(get_clerk_user)):
        role = current_user.get("role", "user")
        if role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not allowed for this role",
            )
        return current_user

    return role_checker


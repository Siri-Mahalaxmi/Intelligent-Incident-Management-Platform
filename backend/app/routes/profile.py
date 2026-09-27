"""
Profile routes — returns the current authenticated user's profile and organization.

GET /me — returns auth profile + organization info for the current user
"""

from fastapi import APIRouter, Depends

from app.auth import get_current_user
from app.services.profile_service import UserProfile, get_organization_by_id

router = APIRouter(tags=["Profile"])


@router.get("/me")
def get_my_profile(user: UserProfile = Depends(get_current_user)):
    """
    Return the current user's profile including organization context.
    This is called by the frontend on every page load to determine:
      - which workspace to render (admin vs org)
      - which organization's data to show
      - which role-based UI elements to display
    """
    org = None
    if user.organization_id:
        try:
            org = get_organization_by_id(user.organization_id)
        except Exception:
            org = None

    return {
        "id": user.id,
        "auth_user_id": user.auth_user_id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "status": user.status,
        "organization_id": user.organization_id,
        "organization": org,
    }

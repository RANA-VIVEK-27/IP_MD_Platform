from fastapi import APIRouter, Depends
from app.models.identity import User
from app.api.deps import require_admin_permission

router = APIRouter(prefix="/admin", tags=["Admin System Control"])

@router.get("/gated-feature")
def admin_gated_feature(
    current_user: User = Depends(require_admin_permission("MANAGE_SYSTEM_SETTINGS"))
):
    """Admin endpoint gated by explicit admin permissions check."""
    return {
        "status": "success",
        "message": "Admin feature accessed successfully",
        "user_id": str(current_user.user_id),
        "role": current_user.role
    }

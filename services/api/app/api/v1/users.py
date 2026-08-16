from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.auth import UserResponse, UserStatusChangeRequest
from app.models.identity import User
from app.api.deps import get_current_user, require_roles
from app.services.auth_service import AuthService

router = APIRouter(prefix="/users", tags=["Users & Profiles"])

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Returns profile for currently authenticated user."""
    return current_user

@router.get("/{user_id}", response_model=UserResponse)
def get_user_by_id(
    user_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles('admin', 'user_admin', 'super_admin'))
):
    """Retrieves full profile for a given user ID (Admin/User Admin/Super Admin)."""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="USER_NOT_FOUND"
        )
    return user

@router.post("/{user_id}/status", response_model=UserResponse)
def change_user_status(
    user_id: str,
    req: UserStatusChangeRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles('user_admin', 'super_admin'))
):
    """Suspends, reinstates, or updates status of a user account (User Admin / Super Admin)."""
    updated_user = AuthService.update_user_status(
        db, user_id=user_id, new_status=req.status, changed_by=str(admin_user.user_id), reason_code=req.reason_code
    )
    return updated_user

import uuid
from typing import Callable, List, Optional
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.identity import User, DoctorLicense, Permission, AdminPermission
from app.core.security import decode_access_token

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer(auto_error=False)

def get_token_from_header(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> str:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="UNAUTHORIZED: Missing Authorization header"
        )
    return credentials.credentials

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(get_token_from_header)
) -> User:
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="UNAUTHORIZED: Invalid or expired access token"
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="UNAUTHORIZED: Invalid token payload"
        )

    try:
        user_uuid = uuid.UUID(str(user_id)) if not isinstance(user_id, uuid.UUID) else user_id
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="UNAUTHORIZED: Invalid token payload"
        )

    user = db.query(User).filter(User.user_id == user_uuid).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="USER_NOT_FOUND"
        )

    # LIVE STATUS CHECK ON EVERY REQUEST
    if user.status == 'suspended':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ACCOUNT_SUSPENDED"
        )

    if user.status == 'pending':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ACCOUNT_PENDING_VERIFICATION"
        )

    return user

def require_roles(*allowed_roles: str):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"FORBIDDEN: Role '{current_user.role}' is not permitted to perform this action"
            )
        return current_user
    return role_checker

def require_approved_doctor(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles('doctor'))
) -> User:
    doc_license = db.query(DoctorLicense).filter(DoctorLicense.user_id == current_user.user_id).first()
    if not doc_license or doc_license.verification_status != 'approved':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="DOCTOR_LICENSE_NOT_APPROVED: Medical license must be verified by User Admin before performing clinical actions"
        )
    return current_user

def require_admin_permission(permission_code: str):
    def permission_checker(
        db: Session = Depends(get_db),
        current_user: User = Depends(require_roles('admin', 'user_admin', 'super_admin'))
    ) -> User:
        if current_user.role == 'super_admin':
            return current_user
        
        # Check admin_permissions table for assigned permission
        perm = db.query(Permission).filter(Permission.code == permission_code).first()
        if not perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"PERMISSION_DENIED: Required permission '{permission_code}' not defined"
            )

        admin_perm = db.query(AdminPermission).filter(
            AdminPermission.user_id == current_user.user_id,
            AdminPermission.permission_id == perm.permission_id
        ).first()

        if not admin_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"PERMISSION_DENIED: User lacks permission '{permission_code}'"
            )

        return current_user
    return permission_checker

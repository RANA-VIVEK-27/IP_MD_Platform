from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.doctors import router as doctors_router
from app.api.v1.admin import router as admin_router
from app.api.v1.user_admin import router as user_admin_router
from app.api.v1.super_admin import router as super_admin_router
from app.api.v1.prescriptions import router as prescriptions_router
from app.api.v1.reports import router as reports_router
from app.api.v1.verification import router as verification_router
from app.api.v1.catalog import router as catalog_router
from app.api.v1.orders import router as orders_router
from app.api.v1.payments import router as payments_router
from app.api.v1.notifications import router as notifications_router

api_v1_router = APIRouter()
api_v1_router.include_router(auth_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(doctors_router)
api_v1_router.include_router(admin_router)
api_v1_router.include_router(user_admin_router)
api_v1_router.include_router(super_admin_router)
api_v1_router.include_router(prescriptions_router)
api_v1_router.include_router(reports_router)
api_v1_router.include_router(verification_router)
api_v1_router.include_router(catalog_router)
api_v1_router.include_router(orders_router)
api_v1_router.include_router(payments_router)
api_v1_router.include_router(notifications_router)

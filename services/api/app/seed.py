"""
Seed script for creating demo users in the I.P. & M.D. database.

Usage:
    cd services/api
    python -m app.seed
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.session import get_engine
from app.models.users import User
from app.models.doctor import DoctorLicense
from app.services.auth_service import hash_password
import uuid
from datetime import datetime, timezone

DEMO_USERS = [
    {
        "email": "demo.patient@ipmd.in",
        "password": "DemoPass123!",
        "full_name": "Rahul Sharma",
        "role": "patient",
        "phone": "+919000000001",
    },
    {
        "email": "demo.doctor@ipmd.in",
        "password": "DemoPass123!",
        "full_name": "Dr. Ananya Sen, MD",
        "role": "doctor",
        "phone": "+919000000002",
        "license_number": "MCI-DEMO-001",
    },
    {
        "email": "demo.admin@ipmd.in",
        "password": "DemoPass123!",
        "full_name": "Priya Mehta",
        "role": "admin",
        "phone": "+919000000003",
    },
    {
        "email": "demo.useradmin@ipmd.in",
        "password": "DemoPass123!",
        "full_name": "Sunil Rao",
        "role": "user_admin",
        "phone": "+919000000004",
    },
    {
        "email": "demo.superadmin@ipmd.in",
        "password": "DemoPass123!",
        "full_name": "Platform Super Admin",
        "role": "super_admin",
        "phone": "+919000000005",
    },
    {
        "email": "demo.pharmacy@ipmd.in",
        "password": "DemoPass123!",
        "full_name": "Vikram Joshi",
        "role": "pharmacy_staff_owned",
        "phone": "+919000000006",
    },
    {
        "email": "demo.partner@ipmd.in",
        "password": "DemoPass123!",
        "full_name": "Apollo Pharmacy Manager",
        "role": "partner_pharmacy",
        "phone": "+919000000007",
    },
]


def seed():
    engine = get_engine()
    from sqlalchemy.orm import sessionmaker
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    created = 0
    skipped = 0

    for u in DEMO_USERS:
        existing = db.query(User).filter(User.email == u["email"]).first()
        if existing:
            print(f"  SKIP  {u['email']} (already exists, status={existing.status})")
            skipped += 1
            continue

        user = User(
            user_id=uuid.uuid4(),
            role=u["role"],
            full_name=u["full_name"],
            email=u["email"],
            phone=u["phone"],
            password_hash=hash_password(u["password"]),
            status="active",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.flush()

        if u["role"] == "doctor" and u.get("license_number"):
            license_obj = DoctorLicense(
                user_id=user.user_id,
                license_number=u["license_number"],
                verification_status="approved",
            )
            db.add(license_obj)

        print(f"  OK    {u['email']} role={u['role']} status=active")
        created += 1

    db.commit()
    db.close()
    print(f"\nDone: {created} created, {skipped} skipped")


if __name__ == "__main__":
    seed()

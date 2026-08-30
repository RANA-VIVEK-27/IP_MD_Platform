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
from app.db.session import engine
from app.models.identity import User, DoctorLicense, VerificationRequest, SavedAddress
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
        "role": "pharmacy_admin",
        "phone": "+919000000006",
    },
    {
        "email": "demo.partner@ipmd.in",
        "password": "DemoPass123!",
        "full_name": "Apollo Pharmacy Manager",
        "role": "partner_pharmacy",
        "phone": "+919000000007",
    },
    {
        "email": "demo.pharmacist@ipmd.in",
        "password": "DemoPass123!",
        "full_name": "Dr. Priya Agarwal, D.Pharm",
        "role": "pharmacist",
        "phone": "+919000000008",
    },
]


def seed():
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

        phone = u["phone"]
        if phone and db.query(User).filter(User.phone == phone).first():
            print(f"  INFO  {u['email']} phone {phone} already in use, setting to None")
            phone = None

        user = User(
            user_id=uuid.uuid4(),
            role=u["role"],
            full_name=u["full_name"],
            email=u["email"],
            phone=phone,
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

        if u["role"] == "pharmacist":
            vr = VerificationRequest(
                user_id=user.user_id,
                request_type="pharmacist",
                status="verified",
                application_data={"name": u["full_name"], "email": u["email"]},
            )
            db.add(vr)

        print(f"  OK    {u['email']} role={u['role']} status=active")
        created += 1

    db.commit()

    # Seed default address for patient
    patient = db.query(User).filter(User.email == "demo.patient@ipmd.in").first()
    if patient:
        existing_addr = db.query(SavedAddress).filter(SavedAddress.user_id == patient.user_id).first()
        if not existing_addr:
            addr = SavedAddress(
                user_id=patient.user_id,
                label="Home",
                line1="123 MG Road, Bandra West",
                city="Mumbai",
                state="Maharashtra",
                pincode="400050",
                is_default=True,
            )
            db.add(addr)
            db.commit()
            print("  OK    default address seeded for demo.patient@ipmd.in")
        else:
            print("  SKIP  address already exists for demo.patient@ipmd.in")

    db.close()
    print(f"\nDone: {created} created, {skipped} skipped")


if __name__ == "__main__":
    seed()

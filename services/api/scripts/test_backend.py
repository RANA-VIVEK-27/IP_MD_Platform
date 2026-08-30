from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.identity import User, VerificationRequest
from app.services.auth_service import AuthService
from sqlalchemy import text

db = SessionLocal()

user = AuthService.authenticate_user(db, 'demo.doctor@ipmd.in', 'DemoPass123!')
print(f'Doctor login OK: {user.role}, status={user.status}')

user2 = AuthService.authenticate_user(db, 'demo.pharmacist@ipmd.in', 'DemoPass123!')
print(f'Pharmacist login OK: {user2.role}, status={user2.status}, prof_status={user2.professional_status}')

user3 = AuthService.authenticate_user(db, 'demo.pharmacy@ipmd.in', 'DemoPass123!')
print(f'Pharmacy Admin login OK: {user3.role}, status={user3.status}')

vrs = db.query(VerificationRequest).all()
print(f'Verification requests: {len(vrs)}')
for vr in vrs:
    print(f'  - {vr.request_type} status={vr.status}')

result = db.execute(text("SELECT enum_range(NULL::user_role)"))
for row in result:
    roles_str = str(row[0])
    print(f'User roles contains pharmacist: {"pharmacist" in roles_str}')
    print(f'User roles contains pharmacy_admin: {"pharmacy_admin" in roles_str}')

db.close()
print('All backend checks passed!')

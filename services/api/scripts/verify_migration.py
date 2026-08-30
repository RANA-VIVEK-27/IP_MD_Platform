from sqlalchemy import text
from app.db.session import engine

conn = engine.connect()
r = conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"))
tables = [row[0] for row in r]
new = [t for t in tables if t in ('professional_credentials', 'organizations', 'organization_memberships', 'verification_requests')]
print("New tables:", new)

r2 = conn.execute(text("SELECT enum_range(NULL::user_role)"))
for row in r2:
    print("User roles:", row[0])

r3 = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('professional_status', 'date_of_birth', 'mfa_enabled')"))
new_cols = [row[0] for row in r3]
print("New user columns:", new_cols)

conn.close()

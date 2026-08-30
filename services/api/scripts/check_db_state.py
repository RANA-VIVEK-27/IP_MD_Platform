from sqlalchemy import text
from app.db.session import engine
conn = engine.connect()

r = conn.execute(text("SELECT typname FROM pg_type WHERE typname LIKE '%%enum%%' ORDER BY typname"))
enums = [row[0] for row in r]
print('Enums:', enums)

r2 = conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('professional_credentials','organizations','organization_memberships','verification_requests') ORDER BY tablename"))
tables = [row[0] for row in r2]
print('New tables:', tables)

r3 = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('professional_status', 'date_of_birth', 'address', 'mfa_enabled', 'mfa_secret')"))
cols = [row[0] for row in r3]
print('User columns:', cols)

r4 = conn.execute(text("SELECT version_num FROM alembic_version"))
versions = [row[0] for row in r4]
print('Alembic version:', versions)

conn.close()

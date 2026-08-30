from sqlalchemy import text
from app.db.session import engine

conn = engine.connect()

# Check all enum types
r = conn.execute(text("SELECT t.typname, e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid ORDER BY t.typname, e.enumsortorder"))
from collections import defaultdict
enums = defaultdict(list)
for row in r:
    enums[row[0]].append(row[1])
for name, vals in sorted(enums.items()):
    print(f'{name}: {vals}')

# Drop orphaned enums that might have been created
for ename in ['professional_status_enum', 'credential_status_enum', 'organization_status_enum', 'membership_status_enum', 'verification_request_status_enum']:
    try:
        conn.execute(text(f'DROP TYPE IF EXISTS {ename}'))
        print(f'Dropped {ename}')
    except Exception as e:
        print(f'Error dropping {ename}: {e}')

conn.commit()
conn.close()
print('Done')

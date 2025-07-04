from app.core.config import get_settings
from sqlalchemy import create_engine, text

settings = get_settings()
engine = create_engine(settings.database_url, poolclass=None)

with engine.connect() as conn:
    result = conn.execute(text('''
        SELECT t.typname, e.enumlabel 
        FROM pg_type t 
        JOIN pg_enum e ON e.enumtypid = t.oid 
        WHERE t.typname LIKE '%enum'
        ORDER BY t.typname, e.enumlabel;
    '''))
    
    current_enum = None
    for row in result:
        if row[0] != current_enum:
            print(f'\n{row[0]}:')
            current_enum = row[0]
        print(f'  - {row[1]}')
# Database Migrations

This folder contains SQL migration files for the mindmap-collab database.

## How to Run Migrations

### Option 1: Using Supabase CLI (Recommended)

```bash
cd backend
supabase db push
```

### Option 2: Using psql

```bash
cd backend

# Set DATABASE_URL in .env first
export $(cat .env | xargs)

# Run specific migration
psql $DATABASE_URL -f migrations/002_mvp_features.sql
```

### Option 3: Using Python

```python
import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cursor = conn.cursor()

# Read and execute migration
with open("migrations/002_mvp_features.sql", "r") as f:
    cursor.execute(f.read())

conn.commit()
cursor.close()
conn.close()
```

## Migration Files

- **002_mvp_features.sql**: Adds `settings` JSONB column to `mind_maps` table for MVP features (export/import, auto-layout, node styles)

## Notes

- All migrations should be idempotent (can be run multiple times safely)
- Use `IF NOT EXISTS` and `IF EXISTS` clauses
- Check for NULL values before updating existing data
- Always include success confirmation at the end

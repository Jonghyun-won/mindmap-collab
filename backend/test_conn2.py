#!/usr/bin/env python3
import psycopg2

# Try connecting with individual parameters
print("Testing connection with individual parameters...")

try:
    conn = psycopg2.connect(
        host="aws-1-ap-southeast-1.pooler.supabase.com",
        port=5432,
        database="postgres",
        user="postgres.nynbouxjoxuzfbumklcz",
        password="ehfpalvk1!"
    )
    print("✅ Connection successful!")

    cursor = conn.cursor()
    cursor.execute("SELECT version()")
    version = cursor.fetchone()[0]
    print(f"PostgreSQL version: {version[:80]}")

    cursor.execute("SELECT current_database(), current_user")
    db, user = cursor.fetchone()
    print(f"Database: {db}")
    print(f"User: {user}")

    conn.close()
except Exception as e:
    print(f"❌ Connection failed: {e}")

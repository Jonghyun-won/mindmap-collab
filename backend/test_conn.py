#!/usr/bin/env python3
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

database_url = os.getenv("DATABASE_URL")
print(f"Testing connection...")
print(f"URL (masked): {database_url[:30]}...{database_url[-40:]}")

try:
    conn = psycopg2.connect(database_url)
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
    print(f"\nDebugging info:")
    print(f"Full URL: {database_url}")

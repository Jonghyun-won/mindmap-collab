import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

with open("migrations/003_registration_improvements.sql", "r") as f:
    sql = f.read()
    cursor.execute(sql)
    conn.commit()

print("✅ Migration completed successfully!")
cursor.close()
conn.close()

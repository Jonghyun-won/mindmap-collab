import argparse
import os
import sys
from dotenv import load_dotenv
import psycopg2
from psycopg2 import pool
from psycopg2.extensions import connection

load_dotenv()

# Connection pool (최소 1개, 최대 20개 연결 유지)
_connection_pool = None

def _get_connection_pool():
    global _connection_pool
    if _connection_pool is None:
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            raise ValueError("DATABASE_URL environment variable not set")

        _connection_pool = pool.SimpleConnectionPool(
            minconn=1,
            maxconn=20,
            dsn=database_url
        )
    return _connection_pool

class PooledConnection:
    """Wrapper that returns connection to pool on close()"""
    def __init__(self, conn: connection):
        self._conn = conn
        self._closed = False

    def close(self):
        """Return connection to pool instead of closing"""
        if not self._closed:
            release_db_connection(self._conn)
            self._closed = True

    def __getattr__(self, name):
        """Delegate all other attributes to the real connection"""
        return getattr(self._conn, name)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            self._conn.rollback()
        else:
            self._conn.commit()
        self.close()

def get_db_connection() -> connection:
    """Get a connection from the pool"""
    connection_pool = _get_connection_pool()
    conn = connection_pool.getconn()
    return PooledConnection(conn)

def release_db_connection(conn: connection):
    """Return a connection to the pool"""
    connection_pool = _get_connection_pool()
    connection_pool.putconn(conn)

class DatabaseConnection:
    """Context manager for database connections"""
    def __enter__(self) -> connection:
        self.conn = get_db_connection()
        return self.conn

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.conn:
            if exc_type is not None:
                self.conn.rollback()
            else:
                self.conn.commit()
            release_db_connection(self.conn)

def main(test: bool = True) -> dict:
    result = {
        "status": "unknown",
        "message": "",
        "database_info": {}
    }

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT version();")
        db_version = cursor.fetchone()[0]

        cursor.execute("SELECT current_database();")
        db_name = cursor.fetchone()[0]

        cursor.execute("SELECT current_user;")
        db_user = cursor.fetchone()[0]

        result["status"] = "success"
        result["message"] = "Database connection successful"
        result["database_info"] = {
            "version": db_version,
            "database": db_name,
            "user": db_user
        }

        cursor.close()
        conn.close()

    except ValueError as e:
        result["status"] = "error"
        result["message"] = f"Configuration error: {str(e)}"
        sys.exit(1)

    except psycopg2.OperationalError as e:
        result["status"] = "error"
        result["message"] = f"Connection failed: {str(e)}"
        sys.exit(1)

    except Exception as e:
        result["status"] = "error"
        result["message"] = f"Unexpected error: {str(e)}"
        sys.exit(1)

    return result

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test database connection")
    parser.add_argument("--test", action="store_true", default=True, help="Test database connection")
    args = parser.parse_args()

    result = main(test=args.test)

    print(f"\nDatabase Connection Test")
    print(f"Status: {result['status']}")
    print(f"Message: {result['message']}")

    if result['database_info']:
        print(f"\nDatabase Info:")
        print(f"  Database: {result['database_info']['database']}")
        print(f"  User: {result['database_info']['user']}")
        print(f"  Version: {result['database_info']['version']}")

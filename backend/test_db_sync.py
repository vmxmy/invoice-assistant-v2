#!/usr/bin/env python3
"""
使用同步方式测试数据库连接
"""

from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv
import os

# Load environment variables from .env
load_dotenv()

# Fetch variables
USER = os.getenv("user")
PASSWORD = os.getenv("password")
HOST = os.getenv("host")
PORT = os.getenv("port")
DBNAME = os.getenv("dbname")

print(f"User: {USER}")
print(f"Host: {HOST}")
print(f"Port: {PORT}")
print(f"Database: {DBNAME}")

# Construct the SQLAlchemy connection string
DATABASE_URL = f"postgresql+psycopg2://{USER}:{PASSWORD}@{HOST}:{PORT}/{DBNAME}?sslmode=require"
print(f"Connection URL: {DATABASE_URL[:60]}...")

# Create the SQLAlchemy engine
# Using NullPool for pgbouncer compatibility
engine = create_engine(DATABASE_URL, poolclass=NullPool)

# Test the connection
try:
    with engine.connect() as connection:
        print("✅ Connection successful!")
        
        # Execute a simple query
        result = connection.execute("SELECT version()")
        version = result.scalar()
        print(f"PostgreSQL version: {version}")
        
        # Check if it's Supabase
        result = connection.execute("""
            SELECT EXISTS (
                SELECT 1 FROM pg_extension 
                WHERE extname = 'supabase_vault'
            )
        """)
        is_supabase = result.scalar()
        print(f"Supabase environment: {'Yes' if is_supabase else 'No'}")
        
except Exception as e:
    print(f"❌ Failed to connect: {e}")
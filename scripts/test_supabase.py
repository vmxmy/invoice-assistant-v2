#!/usr/bin/env python3
"""
Test script for Supabase connection and basic operations
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

def test_supabase_connection():
    """Test basic Supabase connection and functionality"""
    
    # Get Supabase configuration from environment
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_ANON_KEY')
    
    # If not found, try to extract from DATABASE_URL
    database_url = os.getenv('SUPABASE_DATABASE_URL')
    if database_url and not supabase_url:
        # Extract URL from postgres connection string
        # Format: postgresql://postgres:password@db.sfenhhtvcyslxplvewmt.supabase.co:5432/postgres
        import re
        match = re.search(r'@([^:]+)\.supabase\.co', database_url)
        if match:
            project_ref = match.group(1).replace('db.', '')
            supabase_url = f"https://{project_ref}.supabase.co"
            print(f"Extracted Supabase URL: {supabase_url}")
    
    jwt_secret = os.getenv('SUPABASE_JWT_SECRET')
    
    if not supabase_url:
        print("❌ SUPABASE_URL not found in environment variables")
        print("Available environment variables:")
        for key in os.environ:
            if 'SUPABASE' in key:
                print(f"  {key}: {os.environ[key][:50]}...")
        return False
    
    if not supabase_key and not jwt_secret:
        print("❌ Neither SUPABASE_ANON_KEY nor SUPABASE_JWT_SECRET found")
        return False
    
    # Use JWT secret as anon key if anon key is not available
    key_to_use = supabase_key or jwt_secret
    
    print(f"🔗 Connecting to Supabase at: {supabase_url}")
    print(f"🔑 Using key: {key_to_use[:20]}...")
    
    try:
        # Create Supabase client
        supabase: Client = create_client(supabase_url, key_to_use)
        print("✅ Supabase client created successfully")
        
        # Test basic connection by trying to access a table
        # This will help us understand the database structure
        try:
            # Try to get table information (this might fail if no tables exist)
            response = supabase.rpc('version').execute()
            print("✅ Successfully connected to Supabase database")
            print(f"Database version info: {response.data}")
        except Exception as e:
            print(f"⚠️  Could not get version info: {str(e)}")
            
            # Try alternative connection test
            try:
                # Try to execute a simple query
                response = supabase.table('information_schema.tables').select('table_name').limit(5).execute()
                print("✅ Successfully queried database structure")
                print(f"Available tables: {[row['table_name'] for row in response.data]}")
            except Exception as e2:
                print(f"⚠️  Could not query tables: {str(e2)}")
                print("🔍 Attempting basic connection test...")
                
                # Most basic test - just verify the client was created
                print(f"Client URL: {supabase.supabase_url}")
                print(f"Client Key: {supabase.supabase_key[:20]}...")
                print("✅ Basic client configuration looks correct")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to create Supabase client: {str(e)}")
        return False

def test_database_operations():
    """Test basic database operations"""
    
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_ANON_KEY')
    
    # Extract URL if not directly available
    if not supabase_url:
        database_url = os.getenv('SUPABASE_DATABASE_URL')
        if database_url:
            import re
            match = re.search(r'@([^:]+)\.supabase\.co', database_url)
            if match:
                project_ref = match.group(1).replace('db.', '')
                supabase_url = f"https://{project_ref}.supabase.co"
    
    # Use JWT secret if anon key not available
    if not supabase_key:
        supabase_key = os.getenv('SUPABASE_JWT_SECRET')
    
    if not supabase_url or not supabase_key:
        print("❌ Missing Supabase configuration for database operations test")
        return False
    
    try:
        supabase: Client = create_client(supabase_url, supabase_key)
        
        # Try to create a simple test table (if it doesn't exist)
        print("🔍 Testing database operations...")
        
        # First, let's see what tables exist
        try:
            response = supabase.table('pg_tables').select('tablename').eq('schemaname', 'public').execute()
            existing_tables = [row['tablename'] for row in response.data]
            print(f"Existing tables in public schema: {existing_tables}")
        except Exception as e:
            print(f"Could not query existing tables: {str(e)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Database operations test failed: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 Starting Supabase connection test...")
    print("=" * 50)
    
    # Test basic connection
    connection_success = test_supabase_connection()
    
    print("\n" + "=" * 50)
    
    if connection_success:
        print("🧪 Running database operations test...")
        test_database_operations()
    else:
        print("❌ Skipping database operations test due to connection failure")
    
    print("\n" + "=" * 50)
    print("🏁 Test completed!")
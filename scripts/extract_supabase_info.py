#!/usr/bin/env python3
"""
Extract Supabase project information from environment variables
"""

import os
import re
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def extract_supabase_info():
    """Extract Supabase project reference and other info"""
    
    supabase_url = os.getenv('SUPABASE_URL')
    database_url = os.getenv('SUPABASE_DATABASE_URL')
    anon_key = os.getenv('SUPABASE_ANON_KEY')
    
    print("🔍 Supabase Configuration Analysis")
    print("=" * 50)
    
    # Extract project reference from URL
    project_ref = None
    if supabase_url:
        match = re.search(r'https://([^.]+)\.supabase\.co', supabase_url)
        if match:
            project_ref = match.group(1)
            print(f"✅ Project Reference: {project_ref}")
            print(f"✅ Supabase URL: {supabase_url}")
        else:
            print(f"❌ Could not extract project reference from URL: {supabase_url}")
    
    # Extract from database URL if needed
    if not project_ref and database_url:
        match = re.search(r'@([^:]+)\.supabase\.co', database_url)
        if match:
            db_host = match.group(1)
            if db_host.startswith('db.'):
                project_ref = db_host[3:]  # Remove 'db.' prefix
                print(f"✅ Project Reference (from DB URL): {project_ref}")
                print(f"✅ Database URL: {database_url}")
    
    if anon_key:
        print(f"✅ Anonymous Key: {anon_key[:20]}...")
    else:
        print("❌ No anonymous key found")
    
    print("\n" + "=" * 50)
    print("🔧 MCP Configuration Requirements")
    print("=" * 50)
    
    if project_ref:
        print(f"Project Reference: {project_ref}")
        print(f"Supabase URL: https://{project_ref}.supabase.co")
        
        print("\n📋 Next Steps:")
        print("1. 创建 Supabase 个人访问令牌 (Personal Access Token)")
        print("2. 在 Supabase Dashboard > Settings > Access Tokens 中创建")
        print("3. 给令牌起个名字，比如 'MCP Server Token'")
        print("4. 复制生成的令牌")
        
        return {
            'project_ref': project_ref,
            'supabase_url': supabase_url or f"https://{project_ref}.supabase.co",
            'anon_key': anon_key
        }
    else:
        print("❌ Could not extract project reference")
        return None

if __name__ == "__main__":
    result = extract_supabase_info()
    
    if result:
        print(f"\n🎯 MCP Server Command Preview:")
        print(f"npx -y @supabase/mcp-server-supabase@latest --read-only --project-ref={result['project_ref']}")
        
        print(f"\n🔐 Environment Variable Needed:")
        print(f"SUPABASE_ACCESS_TOKEN=<your-personal-access-token>")
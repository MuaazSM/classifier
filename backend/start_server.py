# backend/start_server.py - Simple startup script with better error handling
#!/usr/bin/env python3
"""
Enhanced startup script for Taqneeq Department Classifier Backend
"""

import sys
import os
import subprocess
from pathlib import Path

def check_requirements():
    """Check if all required files exist"""
    required_files = [
        'app/data/departments.json',
        'app/data/question_bank.json',
        'requirements.txt'
    ]
    
    missing_files = []
    for file in required_files:
        if not os.path.exists(file):
            missing_files.append(file)
    
    if missing_files:
        print("❌ Missing required files:")
        for file in missing_files:
            print(f"   - {file}")
        return False
    
    print("✅ All required files found")
    return True

def install_dependencies():
    """Install Python dependencies"""
    try:
        print("📦 Installing dependencies...")
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], 
                      check=True, capture_output=True, text=True)
        print("✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        print("Error output:", e.stderr)
        return False

def start_server():
    """Start the FastAPI server"""
    try:
        print("\n🚀 Starting Taqneeq Backend Server...")
        print("📍 Server will be available at: http://localhost:8000")
        print("📊 API Documentation: http://localhost:8000/docs")
        print("🔍 Health Check: http://localhost:8000/api/v1/health")
        print("\n" + "="*50)
        
        # Start the server
        from app.main import app
        import uvicorn
        
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=8000,
            reload=False,
            log_level="info"
        )
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("💡 Try installing dependencies: pip install -r requirements.txt")
        return False
    except Exception as e:
        print(f"❌ Server startup failed: {e}")
        return False

def main():
    print("🎯 Taqneeq Department Classifier Backend")
    print("="*40)
    
    # Check if we're in the right directory
    if not os.path.exists('app/main.py'):
        print("❌ Please run this script from the backend/ directory")
        print("💡 Usage: cd backend && python start_server.py")
        sys.exit(1)
    
    # Check requirements
    if not check_requirements():
        print("\n💡 Make sure you have:")
        print("   1. app/data/departments.json")
        print("   2. app/data/question_bank.json") 
        print("   3. requirements.txt")
        sys.exit(1)
    
    # Try to start server directly first
    try:
        start_server()
    except Exception as e:
        print(f"❌ Direct startup failed: {e}")
        print("\n🔄 Trying to install dependencies first...")
        
        if install_dependencies():
            print("\n🔄 Retrying server startup...")
            start_server()
        else:
            print("❌ Could not resolve dependencies")
            sys.exit(1)

if __name__ == "__main__":
    main()
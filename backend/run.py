#!/usr/bin/env python3
"""
DataGenesis AI Backend - Run Script
Start the DataGenesis AI FastAPI backend server.
"""

import os
import sys
import subprocess
import json
import time
import platform
import signal
from pathlib import Path

class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_banner():
    banner = f"""
{Colors.HEADER}
╔══════════════════════════════════════════════════════════════╗
║                 DataGenesis AI Backend Starting              ║
║                                                              ║
║             FastAPI + Multi-Agent AI Platform               ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
{Colors.ENDC}
"""
    print(banner)

def check_environment():
    """Check if environment is properly configured."""
    print(f"{Colors.BOLD}Checking environment...{Colors.ENDC}")
    
    # Check if .env file exists
    if not os.path.exists('.env'):
        print(f"{Colors.FAIL}✗ .env file not found{Colors.ENDC}")
        print(f"{Colors.WARNING}Please run 'python setup.py' first{Colors.ENDC}")
        return False
    
    # Check if we're in conda environment
    conda_env = os.environ.get('CONDA_DEFAULT_ENV')
    if conda_env:
        print(f"{Colors.OKGREEN}✓ Running in conda environment: {conda_env}{Colors.ENDC}")
    else:
        print(f"{Colors.WARNING}⚠ Not in conda environment. Consider activating: conda activate datagenesis-ai{Colors.ENDC}")
    
    # Check required environment variables
    required_vars = ['SUPABASE_URL', 'SUPABASE_KEY', 'GEMINI_API_KEY']
    missing_vars = []
    
    # Load .env file
    try:
        with open('.env', 'r') as f:
            env_content = f.read()
            for var in required_vars:
                if f"{var}=" not in env_content or f"{var}=your_" in env_content:
                    missing_vars.append(var)
    except Exception as e:
        print(f"{Colors.FAIL}✗ Error reading .env file: {e}{Colors.ENDC}")
        return False
    
    if missing_vars:
        print(f"{Colors.WARNING}⚠ Missing or unconfigured environment variables:{Colors.ENDC}")
        for var in missing_vars:
            print(f"  - {var}")
        print(f"{Colors.WARNING}The server will start but some features may not work properly{Colors.ENDC}")
    
    return True

def check_dependencies():
    """Check if required packages are installed."""
    print(f"{Colors.BOLD}Checking dependencies...{Colors.ENDC}")
    
    required_packages = ['fastapi', 'uvicorn', 'supabase', 'redis']
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print(f"{Colors.FAIL}✗ Missing packages: {', '.join(missing_packages)}{Colors.ENDC}")
        print(f"{Colors.WARNING}Please run 'python setup.py' or install manually{Colors.ENDC}")
        return False
    
    print(f"{Colors.OKGREEN}✓ All required packages available{Colors.ENDC}")
    return True

def start_redis_server():
    """Try to start Redis server if not running."""
    print(f"{Colors.OKCYAN}► Checking Redis server...{Colors.ENDC}")
    
    try:
        # Try to connect to Redis
        import redis
        r = redis.Redis(host='localhost', port=6379, decode_responses=True)
        r.ping()
        print(f"{Colors.OKGREEN}✓ Redis server is running{Colors.ENDC}")
        return True
    except:
        print(f"{Colors.WARNING}⚠ Redis server not running{Colors.ENDC}")
        print(f"{Colors.WARNING}Some features (caching, WebSockets) may not work{Colors.ENDC}")
        print(f"{Colors.WARNING}To install Redis: https://redis.io/download{Colors.ENDC}")
        return False

def start_fastapi_server():
    """Start the FastAPI server."""
    print(f"{Colors.OKCYAN}► Starting FastAPI server...{Colors.ENDC}")
    
    try:
        # Use uvicorn to run the FastAPI app
        cmd = [
            'uvicorn',
            'app.main:app',
            '--reload',
            '--host', '127.0.0.1',
            '--port', '8000',
            '--log-level', 'info'
        ]
        
        print(f"{Colors.OKBLUE}Command: {' '.join(cmd)}{Colors.ENDC}")
        
        # Start the server
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1
        )
        
        # Monitor the output
        print(f"{Colors.OKCYAN}► FastAPI server starting...{Colors.ENDC}")
        
        for line in iter(process.stdout.readline, ''):
            if line:
                print(f"{Colors.OKBLUE}[FastAPI]{Colors.ENDC} {line.strip()}")
                
                # Check for server ready signals
                if "Uvicorn running on" in line:
                    print(f"{Colors.OKGREEN}✓ FastAPI server is ready!{Colors.ENDC}")
                    break
                elif "Application startup complete" in line:
                    print(f"{Colors.OKGREEN}✓ Application startup complete!{Colors.ENDC}")
                elif "Error" in line or "Failed" in line:
                    print(f"{Colors.FAIL}✗ Server startup error detected{Colors.ENDC}")
        
        # Keep the process running
        try:
            process.wait()
        except KeyboardInterrupt:
            print(f"\n{Colors.WARNING}Shutting down FastAPI server...{Colors.ENDC}")
            process.terminate()
            process.wait()
        
        return process.returncode == 0
        
    except FileNotFoundError:
        print(f"{Colors.FAIL}✗ uvicorn command not found{Colors.ENDC}")
        print(f"{Colors.WARNING}Try: pip install uvicorn{Colors.ENDC}")
        return False
    except Exception as e:
        print(f"{Colors.FAIL}✗ Failed to start FastAPI server: {e}{Colors.ENDC}")
        return False

def print_server_info():
    """Print server information."""
    print(f"""
{Colors.HEADER}
╔══════════════════════════════════════════════════════════════╗
║                🚀 DataGenesis AI Backend Ready!              ║
╚══════════════════════════════════════════════════════════════╝
{Colors.ENDC}

{Colors.BOLD}Server URLs:{Colors.ENDC}
{Colors.OKGREEN}Backend API:{Colors.ENDC}      http://localhost:8000/api
{Colors.OKGREEN}API Documentation:{Colors.ENDC} http://localhost:8000/api/docs
{Colors.OKGREEN}Health Check:{Colors.ENDC}     http://localhost:8000/api/health
{Colors.OKGREEN}WebSocket:{Colors.ENDC}        ws://localhost:8000/ws/{{client_id}}

{Colors.BOLD}Frontend Communication:{Colors.ENDC}
{Colors.OKGREEN}Frontend URL:{Colors.ENDC}     http://localhost:5173
{Colors.OKGREEN}CORS Enabled:{Colors.ENDC}     ✓ Ready for frontend requests

{Colors.BOLD}Available Features:{Colors.ENDC}
{Colors.OKGREEN}✓{Colors.ENDC} Multi-Agent AI Generation
{Colors.OKGREEN}✓{Colors.ENDC} Real-time WebSocket Updates  
{Colors.OKGREEN}✓{Colors.ENDC} Advanced Analytics & Monitoring
{Colors.OKGREEN}✓{Colors.ENDC} Privacy & Bias Detection
{Colors.OKGREEN}✓{Colors.ENDC} Cross-Domain Knowledge Transfer

{Colors.WARNING}Note:{Colors.ENDC}
- Make sure your frontend is running on http://localhost:5173
- Configure Supabase and Gemini API keys in .env
- Use Ctrl+C to stop the server

{Colors.OKGREEN}Ready to generate synthetic data! ✨{Colors.ENDC}
""")

def signal_handler(sig, frame):
    """Handle Ctrl+C gracefully."""
    print(f"\n{Colors.WARNING}Shutting down DataGenesis AI Backend...{Colors.ENDC}")
    sys.exit(0)

def main():
    """Main run function."""
    # Set up signal handler
    signal.signal(signal.SIGINT, signal_handler)
    
    print_banner()
    
    # Check environment
    if not check_environment():
        sys.exit(1)
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Check Redis (optional)
    start_redis_server()
    
    # Print server info
    print_server_info()
    
    # Start FastAPI server
    success = start_fastapi_server()
    
    if not success:
        print(f"{Colors.FAIL}✗ Failed to start FastAPI server{Colors.ENDC}")
        sys.exit(1)

if __name__ == "__main__":
    main()
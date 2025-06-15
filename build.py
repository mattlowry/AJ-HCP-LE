#!/usr/bin/env python3
"""
Build script for AJ Long Electric FSM deployment
This script handles the Python-specific build steps
"""

import os
import subprocess
import sys

def run_command(command, description):
    """Run a shell command and handle errors"""
    print(f"Running: {description}")
    print(f"Command: {command}")
    
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"Error during {description}:")
        print(f"STDOUT: {result.stdout}")
        print(f"STDERR: {result.stderr}")
        sys.exit(1)
    else:
        print(f"✓ {description} completed successfully")
        if result.stdout:
            print(f"Output: {result.stdout}")

def main():
    """Main build process"""
    print("🚀 Starting AJ Long Electric FSM build process...")
    
    # Change to backend directory
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    os.chdir(backend_dir)
    print(f"Changed to directory: {os.getcwd()}")
    
    # Install Python dependencies
    run_command("pip install -r requirements.txt", "Installing Python dependencies")
    
    # Run Django migrations
    run_command("python manage.py migrate", "Running Django migrations")
    
    # Collect static files
    run_command("python manage.py collectstatic --noinput", "Collecting static files")
    
    print("🎉 Build process completed successfully!")

if __name__ == "__main__":
    main()
#!/bin/bash

# Build script for deployment
echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

echo "Installing backend dependencies..."
cd backend
pip install -r requirements.txt

echo "Setting up database and superuser..."
python manage.py migrate
python create_superuser.py

cd ..

echo "Build complete!"
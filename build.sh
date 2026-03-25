#!/usr/bin/env bash
# exit on error
set -o errexit

echo ">>> Building Frontend..."
cd frontend
npm install --include=dev
npm run build
cd ..

echo ">>> Building Backend..."
cd backend
npm install --include=dev
npx prisma generate
cd ..

echo ">>> Deployment Ready!"


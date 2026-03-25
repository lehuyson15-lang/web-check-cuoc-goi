#!/usr/bin/env bash
# exit on error
set -o errexit

echo ">>> Building Frontend..."
cd frontend
npm install
npm run build
cd ..

echo ">>> Building Backend..."
cd backend
npm install
npx prisma generate
# Optional: npx prisma migrate deploy # Un-comment if using Render database migrations
cd ..

echo ">>> Deployment Ready!"

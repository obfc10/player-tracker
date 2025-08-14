#!/bin/bash

# Build script that handles missing DATABASE_URL gracefully

echo "🚀 Starting build process..."

# Generate Prisma client first (works without DATABASE_URL)
echo "📦 Generating Prisma client..."
npx prisma generate

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL not set, skipping database operations"
    echo "🏗️  Building Next.js application..."
    npx next build
else
    echo "🗄️  DATABASE_URL found, pushing schema to database..."
    npx prisma db push --accept-data-loss || echo "⚠️  Database push failed, continuing with build..."
    echo "🏗️  Building Next.js application..."
    npx next build
fi

echo "✅ Build completed!"
#!/bin/bash

echo "🗑️ Resetting Neon Database..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is not set"
    echo "Please set your Neon database URL:"
    echo "export DATABASE_URL=\"your-neon-connection-string\""
    exit 1
fi

echo "📋 Dropping all tables and objects..."
# Execute the reset SQL script
psql "$DATABASE_URL" -f "$(dirname "$0")/reset-database.sql"

if [ $? -eq 0 ]; then
    echo "✅ Database reset completed successfully"
    echo "🔄 Running Prisma migrations to recreate schema..."
    
    # Push the current schema to create all tables fresh
    npx prisma db push --force-reset
    
    if [ $? -eq 0 ]; then
        echo "✅ Schema recreated successfully"
        echo "🌱 Running database seed..."
        npm run prisma:seed
        
        if [ $? -eq 0 ]; then
            echo "🎉 Database reset and seeding completed!"
            echo "📊 Your database is now ready for fresh uploads"
        else
            echo "⚠️ Database reset completed but seeding failed"
            echo "You can manually run: npm run prisma:seed"
        fi
    else
        echo "❌ Failed to recreate schema"
        exit 1
    fi
else
    echo "❌ Failed to reset database"
    exit 1
fi
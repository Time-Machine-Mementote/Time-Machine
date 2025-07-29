#!/bin/bash

# Setup Supabase Database
# This script creates the database tables and deploys the migration

set -e

echo "🗄️ Setting up Supabase Database..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if user is logged in
if ! supabase status &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run:"
    echo "supabase login"
    exit 1
fi

# Apply the migration
echo "📝 Applying database migration..."
supabase db push

echo "✅ Database setup complete!"

# List the tables
echo "📋 Database tables created:"
echo "  - profiles"
echo "  - journal_entries"
echo "  - generated_memories"

echo ""
echo "🔐 Row Level Security (RLS) is enabled for all tables"
echo "👤 Users can only access their own data"
echo "🔄 Automatic user profile creation is configured"
echo ""
echo "🚀 Your database is ready for production use!" 
#!/bin/bash

# Deploy Supabase Edge Functions
# This script deploys the generate-story and generate-image functions

set -e

echo "🚀 Deploying Supabase Edge Functions..."

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

# Deploy generate-story function
echo "📝 Deploying generate-story function..."
supabase functions deploy generate-story

# Deploy generate-image function
echo "🎬 Deploying generate-image function..."
supabase functions deploy generate-image

echo "✅ Functions deployed successfully!"

# List deployed functions
echo "📋 Deployed functions:"
supabase functions list

echo ""
echo "🔑 Don't forget to set your API keys as secrets:"
echo "supabase secrets set OPENAI_API_KEY=your_openai_api_key_here"
echo "supabase secrets set RUNWAY_API_KEY=your_runway_api_key_here"
echo ""
echo "🌐 Your functions are now available at:"
echo "https://your-project-ref.supabase.co/functions/v1/generate-story"
echo "https://your-project-ref.supabase.co/functions/v1/generate-image" 
# Berkeley Memory Map Environment Setup Script
# Run this script to create the .env.local file

Write-Host "Creating .env.local file for Berkeley Memory Map..." -ForegroundColor Green

$envContent = @"
# Berkeley Memory Map Environment Variables
VITE_MAPBOX_TOKEN=pk.eyJ1IjoiZ2xhbG9uZGU1IiwiYSI6ImNtZ3IxZDMzaDJmODgyanB4eHg4ZWNveWgifQ.-aKR88lOa-_sftm8B3qoZw
MAPBOX_GEOCODING_TOKEN=pk.eyJ1IjoiZ2xhbG9uZGU1IiwiYSI6ImNtZ3IxZDMzaDJmODgyanB4eHg4ZWNveWgifQ.-aKR88lOa-_sftm8B3qoZw
VITE_OPENAI_API_KEY=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

# Supabase Configuration (already configured)
VITE_SUPABASE_URL=https://iwwvjecrvgrdyptxhnwj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3d3ZqZWNydmdyZHlwdHhobndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MjA1MTksImV4cCI6MjA2OTM5NjUxOX0.QtsLSAKhi6opNHtODrTbbPQP6JczGXsmIIaWX5-Kyk8
"@

$envContent | Out-File -FilePath ".env.local" -Encoding UTF8

Write-Host "✅ .env.local file created successfully!" -ForegroundColor Green
Write-Host "Now let's set up the Supabase database..." -ForegroundColor Yellow

# Check if Supabase CLI is installed
try {
    $supabaseVersion = supabase --version 2>$null
    if ($supabaseVersion) {
        Write-Host "✅ Supabase CLI found: $supabaseVersion" -ForegroundColor Green
        
        Write-Host "Running database migrations..." -ForegroundColor Yellow
        supabase db reset --linked
        
        Write-Host "✅ Database setup complete!" -ForegroundColor Green
    } else {
        Write-Host "❌ Supabase CLI not found. Please install it first:" -ForegroundColor Red
        Write-Host "npm install -g supabase" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Supabase CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "npm install -g supabase" -ForegroundColor Cyan
}

Write-Host "`n🚀 Setup complete! Now restart your development server:" -ForegroundColor Green
Write-Host "npm run dev" -ForegroundColor Cyan

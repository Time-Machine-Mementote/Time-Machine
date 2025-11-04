$envFile = ".env.local"
$supabaseUrl = "https://qhbrnotooiutpwwtadlx.supabase.co"
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYnJub3Rvb2l1dHB3d3RhZGx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDU0NDYsImV4cCI6MjA3NjA4MTQ0Nn0.1Aj-VLd_2skyTAvIC6Hy9A2avh4D6gnucgmQlbAeXbw"

Write-Host "Updating .env.local file..." -ForegroundColor Cyan

$lines = @(
    "# Supabase Configuration",
    "VITE_SUPABASE_URL=$supabaseUrl",
    "VITE_SUPABASE_ANON_KEY=$anonKey",
    "",
    "# Mapbox",
    "VITE_MAPBOX_TOKEN=pk.eyJ1IjoiZ2xhbG9uZGU1IiwiYSI6ImNtZ3IxZDMzaDJmODgyanB4eHg4ZWNveWgifQ.-aKR88lOa-_sftm8B3qoZw",
    "MAPBOX_GEOCODING_TOKEN=pk.eyJ1IjoiZ2xhbG9uZGU1IiwiYSI6ImNtZ3IxZDMzaDJmODgyanB4eHg4ZWNveWgifQ.-aKR88lOa-_sftm8B3qoZw",
    "",
    "# OpenAI",
    "VITE_OPENAI_API_KEY=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"
)

$lines | Out-File -FilePath $envFile -Encoding UTF8

Write-Host "✓ .env.local file updated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT: Restart dev server now!" -ForegroundColor Yellow
Write-Host "1. Stop server (Ctrl+C)" -ForegroundColor White
Write-Host "2. Run: npm run dev" -ForegroundColor White
Write-Host "3. Hard refresh browser" -ForegroundColor White

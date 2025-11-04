# Update Supabase Configuration Script
Write-Host "🔧 Updating Supabase Configuration..." -ForegroundColor Green
Write-Host ""

$projectId = "qhbrnotooiutpwwtadlx"
$supabaseUrl = "https://$projectId.supabase.co"

Write-Host "Supabase Project ID: $projectId" -ForegroundColor Cyan
Write-Host "Supabase URL: $supabaseUrl" -ForegroundColor Cyan
Write-Host ""

if (Test-Path ".env.local") {
    Write-Host "✓ Found .env.local file" -ForegroundColor Green
    $content = Get-Content ".env.local" -Raw
    
    if ($content -match "VITE_SUPABASE_URL=") {
        $content = $content -replace "VITE_SUPABASE_URL=.*", "VITE_SUPABASE_URL=$supabaseUrl"
        Write-Host "✓ Updated VITE_SUPABASE_URL" -ForegroundColor Green
    } else {
        $content += "`nVITE_SUPABASE_URL=$supabaseUrl`n"
        Write-Host "✓ Added VITE_SUPABASE_URL" -ForegroundColor Green
    }
    
    $content | Set-Content ".env.local" -NoNewline
    
    Write-Host ""
    Write-Host "✅ Updated .env.local with Supabase URL!" -ForegroundColor Green
} else {
    Write-Host "❌ .env.local file not found!" -ForegroundColor Red
    Write-Host "Please create it manually with your Supabase credentials" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "⚠️  IMPORTANT: Update VITE_SUPABASE_ANON_KEY in .env.local!" -ForegroundColor Yellow
Write-Host ""
Write-Host "To get your anon key:" -ForegroundColor Cyan
Write-Host "1. Go to: https://supabase.com/dashboard/project/$projectId" -ForegroundColor White
Write-Host "2. Click 'Settings' → 'API'" -ForegroundColor White
Write-Host "3. Copy the 'anon public' key" -ForegroundColor White
Write-Host "4. Update VITE_SUPABASE_ANON_KEY in .env.local" -ForegroundColor White
Write-Host ""

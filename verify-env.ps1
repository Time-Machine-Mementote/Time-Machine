# Quick verification script for .env.local
Write-Host "Checking .env.local configuration..." -ForegroundColor Cyan
Write-Host ""

if (Test-Path ".env.local") {
    Write-Host "✓ .env.local file exists" -ForegroundColor Green
    
    $content = Get-Content ".env.local" -Raw
    
    # Check for Supabase URL
    if ($content -match "VITE_SUPABASE_URL=(.+)") {
        $url = $matches[1] -replace "`r|`n", ""
        Write-Host "✓ Found VITE_SUPABASE_URL" -ForegroundColor Green
        
        if ($url -match "qhbrnotooiutpwwtadlx") {
            Write-Host "  URL is correct: $url" -ForegroundColor Green
        } else {
            Write-Host "  ⚠ URL doesn't match expected project" -ForegroundColor Yellow
            Write-Host "    Found: $url" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ VITE_SUPABASE_URL not found" -ForegroundColor Red
    }
    
    # Check for anon key
    if ($content -match "VITE_SUPABASE_ANON_KEY=(.+)") {
        $key = $matches[1] -replace "`r|`n", ""
        Write-Host "✓ Found VITE_SUPABASE_ANON_KEY" -ForegroundColor Green
        
        if ($key -match "^eyJ") {
            Write-Host "  Key format looks correct (starts with eyJ)" -ForegroundColor Green
            Write-Host "  Key length: $($key.Length) characters" -ForegroundColor Gray
        } else {
            Write-Host "  ⚠ Key doesn't look like a JWT token" -ForegroundColor Yellow
        }
        
        if ($key -eq "YOUR_ANON_KEY_HERE" -or $key.Length -lt 50) {
            Write-Host "  ❌ Key appears to be placeholder!" -ForegroundColor Red
            Write-Host "     Get it from Supabase dashboard: Settings → API" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ VITE_SUPABASE_ANON_KEY not found" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Stop dev server (Ctrl+C in terminal where npm run dev is running)" -ForegroundColor White
    Write-Host "2. Start fresh: npm run dev" -ForegroundColor White
    Write-Host "3. Hard refresh browser: Ctrl+Shift+R" -ForegroundColor White
    
} else {
    Write-Host "❌ .env.local file NOT FOUND!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Create .env.local in project root with:" -ForegroundColor Yellow
    Write-Host "VITE_SUPABASE_URL=https://qhbrnotooiutpwwtadlx.supabase.co" -ForegroundColor White
    Write-Host "VITE_SUPABASE_ANON_KEY=your-key-from-dashboard" -ForegroundColor White
}

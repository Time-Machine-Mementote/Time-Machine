# 🔄 How to Properly Restart Dev Server

## Why Restart is Needed

`.env.local` file is **only read when the dev server starts**. If you update `.env.local` while the server is running, those changes won't be loaded until you restart.

## Step-by-Step: Proper Restart

### Step 1: Stop the Server Completely

**Option A: If server is running in terminal window**
1. Go to the terminal/command prompt where `npm run dev` is running
2. Press `Ctrl + C` 
3. Wait until you see the cursor return (means server stopped)
4. If it asks "Terminate batch job (Y/N)?", type `Y` and press Enter

**Option B: If you're not sure where it's running**
```powershell
# Find and stop all Node processes (this stops the dev server)
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Step 2: Verify .env.local is Updated

Before starting, double-check `.env.local`:
1. Open file: `C:\Users\glalo\Time-Machine\.env.local`
2. Verify it has:
   ```env
   VITE_SUPABASE_URL=https://qhbrnotooiutpwwtadlx.supabase.co
   VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
   ```
3. Make sure no typos, no extra spaces around `=`

### Step 3: Start Fresh

Open a **new terminal window** (to avoid any cached state):
```powershell
# Navigate to project
cd C:\Users\glalo\Time-Machine

# Start dev server
npm run dev
```

You should see output like:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 4: Hard Refresh Browser

**Important:** After restarting, clear browser cache:
1. Open your app in browser
2. Press `Ctrl + Shift + R` (or `Ctrl + F5`)
   - This forces browser to reload everything
   - Ensures old cached config isn't used

### Step 5: Verify It Worked

1. Open browser console (F12)
2. Look for `Supabase client config:` message
3. Check:
   - `url: https://qhbrnotooiutpwwtadlx.supabase.co` ✅
   - `envUrl: "https://qhbrnotooiutpwwtadlx.supabase.co"` ✅ (should show actual URL, not `undefined`)
   - `envKey: "Present"` ✅ (should say "Present", not "Missing")

## Quick Verification Script

Run this to check if .env.local values are being read:

```powershell
# Check if .env.local exists and has the right URL
if (Test-Path ".env.local") {
    $content = Get-Content ".env.local"
    Write-Host "✓ .env.local exists" -ForegroundColor Green
    
    if ($content -match "VITE_SUPABASE_URL=.*qhbrnotooiutpwwtadlx") {
        Write-Host "✓ URL looks correct" -ForegroundColor Green
    } else {
        Write-Host "⚠ URL may be wrong" -ForegroundColor Yellow
    }
    
    if ($content -match "VITE_SUPABASE_ANON_KEY=.*eyJ") {
        Write-Host "✓ Anon key present (starts with eyJ)" -ForegroundColor Green
    } else {
        Write-Host "⚠ Anon key may be missing or wrong" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ .env.local not found!" -ForegroundColor Red
}
```

## Troubleshooting

**"Server won't stop"**
- Close the terminal window completely
- Or use: `Get-Process node | Stop-Process -Force`

**"Still showing old URL in console"**
- Make sure you hard refreshed browser (`Ctrl+Shift+R`)
- Try incognito/private window to bypass cache
- Check `.env.local` file is in project root, not subdirectory

**"envUrl still undefined"**
- `.env.local` file location: Must be in `C:\Users\glalo\Time-Machine\.env.local`
- File name: Must be exactly `.env.local` (with the dot!)
- Restart dev server after creating/updating file

## Checklist

- [ ] Stopped dev server completely (Ctrl+C, wait for cursor)
- [ ] Verified `.env.local` has correct values
- [ ] Started dev server fresh (`npm run dev`)
- [ ] Hard refreshed browser (`Ctrl+Shift+R`)
- [ ] Checked browser console shows correct URL
- [ ] Connection status shows "CONNECTED"


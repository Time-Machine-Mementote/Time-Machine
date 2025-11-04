# Check Edge Function Status

## Quick Check

1. **Open browser console** (F12)
2. Look for this log: `📡 Using Supabase URL for Edge Functions:`
3. Note the URL it shows

## Test Edge Function Directly

### Option 1: Browser Console Test

Open browser console (F12) and run:

```javascript
// Test if Edge Function endpoint exists
fetch('https://qhbrnotooiutpwwtadlx.supabase.co/functions/v1/generate-audio', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'test' })
})
.then(r => {
  console.log('Status:', r.status);
  return r.text();
})
.then(text => console.log('Response:', text))
.catch(err => console.error('Error:', err));
```

**Expected results:**
- **Status 401**: Function exists but needs auth (good!)
- **Status 404**: Function not deployed
- **Status 500**: Function exists but has errors
- **Network error**: CORS or DNS issue

### Option 2: Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/qhbrnotooiutpwwtadlx/functions
2. Look for `generate-audio` in the list
3. If missing → **Deploy it** (see below)
4. If present → Click it → Check **Logs** tab for errors

## Deploy Edge Function

### Using Supabase CLI:

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref qhbrnotooiutpwwtadlx

# Deploy the function
supabase functions deploy generate-audio
```

### Using Supabase Dashboard:

1. Go to: https://supabase.com/dashboard/project/qhbrnotooiutpwwtadlx/functions
2. Click **"Create a new function"**
3. Name it: `generate-audio`
4. Copy the code from `supabase/functions/generate-audio/index.ts`
5. Paste and save
6. Set environment variables:
   - `OPENAI_API_KEY` = your OpenAI key

## Verify Environment Variables

In Supabase Dashboard → Edge Functions → `generate-audio` → Settings:

**Required:**
- `OPENAI_API_KEY` = `sk-proj-...` (your OpenAI API key)

## Common Issues

### Issue: "404 Not Found"
**Solution**: Edge Function not deployed. Deploy it using CLI or Dashboard.

### Issue: "CORS error" or "Network error"
**Solution**: 
- Check Supabase project is active (not paused)
- Verify URL is correct: `https://qhbrnotooiutpwwtadlx.supabase.co`
- Check browser console for detailed error

### Issue: "500 Internal Server Error"
**Solution**: 
- Check Edge Function logs in Dashboard
- Verify `OPENAI_API_KEY` is set
- Check function code for errors


# Troubleshooting Audio Generation

## Quick Diagnostics

### 1. Check Browser Console (F12)
Look for these log messages:
- `Calling generate-audio Edge Function:`
- `Edge Function response:`
- `Edge Function error response:`

### 2. Common Issues & Fixes

#### Issue: "404 Not Found" or "Edge Function not found"
**Solution**: Deploy the Edge Function
```bash
supabase functions deploy generate-audio
```

#### Issue: "500 Internal Server Error" or "502 Bad Gateway"
**Check**:
1. Go to Supabase Dashboard → Edge Functions → `generate-audio`
2. Check the **Logs** tab for error messages
3. Verify **Environment Variables** are set:
   - `OPENAI_API_KEY` (required)
   - `SUPABASE_URL` (optional - auto-set)
   - `SUPABASE_SERVICE_ROLE_KEY` (optional - auto-set)

#### Issue: "401 Unauthorized"
**Solution**: 
- The function requires authentication but you're not logged in
- Try refreshing the page
- Or make the function work without auth (update the function code)

#### Issue: "Network error" or "Failed to fetch"
**Check**:
1. Is your Supabase project active? (not paused)
2. Is the Edge Function deployed?
3. Check internet connection

### 3. Verify Edge Function is Deployed

1. Go to: https://supabase.com/dashboard/project/qhbrnotooiutpwwtadlx/functions
2. Look for `generate-audio` in the list
3. If missing, deploy it:
   ```bash
   supabase functions deploy generate-audio
   ```

### 4. Check Environment Variables

In Supabase Dashboard → Edge Functions → `generate-audio` → Settings:

**Required:**
- `OPENAI_API_KEY` - Your OpenAI API key

**Optional (auto-set):**
- `SUPABASE_URL` - https://qhbrnotooiutpwwtadlx.supabase.co
- `SUPABASE_SERVICE_ROLE_KEY` - Your service role key

### 5. Test Edge Function Directly

You can test the function directly in the Supabase Dashboard:
1. Go to Edge Functions → `generate-audio`
2. Click "Invoke" or "Test"
3. Use this test payload:
   ```json
   {
     "text": "This is a test memory",
     "memory_id": null
   }
   ```

### 6. Check Function Logs

1. Go to Edge Functions → `generate-audio` → Logs
2. Look for errors when you try to generate audio
3. Common errors:
   - "OpenAI API key not configured" → Set OPENAI_API_KEY
   - "Storage upload failed" → Check memory_audio bucket exists and is public
   - "Rate limit exceeded" → Wait a moment and try again

## Quick Fixes

### If Edge Function is not deployed:
```bash
# Install Supabase CLI if needed
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref qhbrnotooiutpwwtadlx

# Deploy
supabase functions deploy generate-audio
```

### If OPENAI_API_KEY is missing:
1. Get your OpenAI API key from: https://platform.openai.com/api-keys
2. Go to Supabase Dashboard → Edge Functions → `generate-audio` → Settings
3. Add environment variable: `OPENAI_API_KEY` = `your-key-here`

### If you want to skip Edge Function for testing:
The current `generate-audio` function returns base64 audio data URLs, which should work without storage. Check the browser console to see what format is being returned.


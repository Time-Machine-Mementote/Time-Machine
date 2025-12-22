# Troubleshooting "Failed to Fetch" on Vercel

## Step 1: Verify Environment Variables in Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Make sure these are set for **ALL environments** (Production, Preview, Development):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_MAPBOX_TOKEN`

3. **Important**: After adding/updating environment variables, you MUST redeploy:
   - Go to Deployments tab
   - Click the three dots (⋯) on latest deployment
   - Click "Redeploy"

## Step 2: Check Browser Console

1. Open your Vercel app: `https://time-machine-delta.vercel.app`
2. Open browser DevTools (F12)
3. Go to Console tab
4. Look for:
   - "Supabase client config:" - Should show URL and key
   - Any red error messages
   - Network errors

## Step 3: Check Network Tab

1. In DevTools, go to Network tab
2. Try to sign in
3. Look for failed requests (red)
4. Check:
   - Request URL (should be to `iwwvjecrvgrdyptxhnwj.supabase.co`)
   - Status code (404, 403, CORS error?)
   - Response body

## Step 4: Verify Supabase CORS Settings

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to Settings → API
4. Check "Allowed Origins" or "CORS Settings"
5. Add your Vercel domain:
   - `https://time-machine-delta.vercel.app`
   - `https://*.vercel.app` (for preview deployments)

## Step 5: Check Supabase Project Status

1. Go to Supabase Dashboard
2. Check if project is active (not paused)
3. Check API status

## Common Issues:

### Issue: Environment variables not loading
**Solution**: 
- Make sure variable names start with `VITE_`
- Redeploy after adding variables
- Check Vercel build logs

### Issue: CORS error
**Solution**:
- Add Vercel domain to Supabase allowed origins
- Check Supabase project settings

### Issue: Network error / Failed to fetch
**Solution**:
- Check if Supabase project is active
- Verify URL is correct: `https://iwwvjecrvgrdyptxhnwj.supabase.co`
- Check browser console for specific error

### Issue: 401 Unauthorized
**Solution**:
- Verify `VITE_SUPABASE_ANON_KEY` is correct
- Check if key has expired (unlikely but possible)

## Debug Steps:

1. **Check console logs**: The app now logs Supabase config on load
2. **Check network requests**: See what's actually failing
3. **Test Supabase directly**: Try accessing Supabase API directly
4. **Compare localhost vs Vercel**: See what's different

## Quick Test:

Open browser console on Vercel and run:
```javascript
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Present' : 'Missing')
```

If these show `undefined` or `Missing`, environment variables are not set correctly in Vercel.







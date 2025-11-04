# Deployment Guide - Berkeley Memory Map

## ✅ Pre-Deployment Checklist

- [x] Database migration ready
- [x] `memory_audio` storage bucket created
- [x] API keys added to Supabase Dashboard (Edge Functions)
- [ ] Environment variables configured
- [ ] Database migration applied
- [ ] Edge Function deployed
- [ ] Frontend built and deployed

---

## Step 1: Run Database Migration

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/qhbrnotooiutpwwtadlx
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `supabase/migrations/20250121000000_output_branch_schema.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press `Ctrl+Enter`)

This will:
- Add `emotion` column to `memories` table
- Create `nearby_memories` RPC function
- Add spatial indexes for performance

**Verify**: Check that the migration ran successfully (you should see "Success" message)

---

## Step 2: Deploy Edge Function

### Option A: Using Supabase CLI (Recommended)

```bash
# Make sure you're logged in
supabase login

# Link to your project
supabase link --project-ref qhbrnotooiutpwwtadlx

# Deploy the function
supabase functions deploy generate-audio-firefly
```

### Option B: Using Supabase Dashboard

1. Go to **Edge Functions** in the left sidebar
2. Click **Deploy a new function**
3. Choose **Upload from file** or **Deploy from GitHub**
4. Upload the `supabase/functions/generate-audio-firefly` folder

**Verify Edge Function Environment Variables** (in Dashboard):
- Go to Edge Functions → `generate-audio-firefly` → Settings
- Ensure these are set:
  - `OPENAI_API_KEY` ✅
  - `SUPABASE_URL` ✅
  - `SUPABASE_SERVICE_ROLE_KEY` ✅

---

## Step 3: Build Frontend

Test the build locally first:

```bash
npm run build
```

This will create a `dist/` folder with the production build.

**Test locally**:
```bash
npm run preview
```

Visit `http://localhost:4173` to verify everything works.

---

## Step 4: Deploy Frontend

### Option A: Deploy to Vercel (Recommended)

1. **Install Vercel CLI** (if not installed):
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Link to existing project or create new
   - Set environment variables when prompted

3. **Set Environment Variables in Vercel Dashboard**:
   - Go to your project → Settings → Environment Variables
   - Add:
     ```
     VITE_MAPBOX_TOKEN=your_mapbox_token
     VITE_SUPABASE_URL=https://qhbrnotooiutpwwtadlx.supabase.co
     VITE_SUPABASE_ANON_KEY=your_anon_key
     ```
   - Redeploy after adding variables

### Option B: Deploy to Netlify

1. **Install Netlify CLI**:
   ```bash
   npm i -g netlify-cli
   ```

2. **Deploy**:
   ```bash
   netlify deploy --prod
   ```

3. **Set Environment Variables**:
   - Go to Site Settings → Environment Variables
   - Add the same variables as above

### Option C: Deploy to GitHub Pages

1. Install `gh-pages`:
   ```bash
   npm install --save-dev gh-pages
   ```

2. Add to `package.json`:
   ```json
   "scripts": {
     "deploy": "npm run build && gh-pages -d dist"
   }
   ```

3. Deploy:
   ```bash
   npm run deploy
   ```

---

## Step 5: Verify Deployment

### Test Database Connection
1. Open your deployed app
2. Check browser console (F12) for connection status
3. Should see "✓ Supabase connection successful"

### Test Edge Function
1. Try creating a memory with audio
2. Check Edge Function logs in Supabase Dashboard
3. Verify audio file is uploaded to `memory_audio` bucket

### Test Geo-Fencing
1. Enable location permissions
2. Walk around campus (or simulate location)
3. Verify memories within 20m trigger audio playback

---

## Troubleshooting

### Edge Function Not Working?
- Check function logs in Supabase Dashboard
- Verify environment variables are set correctly
- Check that `OPENAI_API_KEY` is valid

### Build Fails?
- Check for TypeScript errors: `npm run type-check`
- Check for linting errors: `npm run lint`
- Ensure all dependencies are installed: `npm install`

### Frontend Not Loading?
- Check environment variables are set in deployment platform
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- Check browser console for errors

### Database Connection Issues?
- Verify migration ran successfully
- Check RLS policies allow public reads
- Verify `nearby_memories` function exists

---

## Production Checklist

- [ ] HTTPS enabled (required for Geolocation API)
- [ ] Environment variables set in deployment platform
- [ ] Database migration applied
- [ ] Edge Function deployed and tested
- [ ] Storage bucket policies configured
- [ ] Error tracking configured (optional: Sentry)
- [ ] Analytics configured (optional: Google Analytics)

---

## Quick Deploy Commands

```bash
# 1. Run database migration (in Supabase SQL Editor)
# Copy/paste: supabase/migrations/20250121000000_output_branch_schema.sql

# 2. Deploy Edge Function
supabase functions deploy generate-audio-firefly

# 3. Build frontend
npm run build

# 4. Deploy to Vercel
vercel --prod

# Or deploy to Netlify
netlify deploy --prod
```

---

**Ready to deploy?** Start with Step 1 (Database Migration)!


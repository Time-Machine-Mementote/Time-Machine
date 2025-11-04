# How to Find Your Supabase Service Role Key

## Quick Steps

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project (or use direct link: https://supabase.com/dashboard/project/qhbrnotooiutpwwtadlx)

2. **Go to Project Settings**
   - Click on the gear icon (⚙️) in the left sidebar
   - Or go to: `Project Settings` → `API`

3. **Find the Service Role Key**
   - Scroll down to the **"Project API keys"** section
   - You'll see two keys:
     - **`anon` `public`** - This is your `VITE_SUPABASE_ANON_KEY` (already in use)
     - **`service_role` `secret`** - This is your `SUPABASE_SERVICE_ROLE_KEY` ⚠️

4. **Copy the Service Role Key**
   - Click the **"Reveal"** or eye icon next to the `service_role` key
   - Click **"Copy"** to copy the key
   - ⚠️ **WARNING**: This key has full admin access - never expose it in client-side code!

## Direct URL
If you're logged in, you can go directly to:
```
https://supabase.com/dashboard/project/qhbrnotooiutpwwtadlx/settings/api
```

## Where to Use It

### For Edge Functions (Supabase Dashboard)
1. Go to **Edge Functions** → Your function (`generate-audio-firefly`)
2. Click **Settings** or **Configure**
3. Add environment variable:
   - Key: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: (paste the key you copied)

### For Local Development (Optional)
If you're testing Edge Functions locally, you can add it to your `.env.local`:
```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```
⚠️ **Never commit this to git!** Make sure `.env.local` is in your `.gitignore`.

## Security Notes

- **Service Role Key** = Full database access, bypasses RLS
- **Anon Key** = Public access (what you use in client code)
- The Service Role Key is needed for Edge Functions because they need to:
  - Upload files to Storage (bypassing RLS)
  - Access all tables regardless of RLS policies
  - Perform admin operations

## Visual Guide

```
Supabase Dashboard
├── Project Settings (⚙️ icon)
    ├── API
        ├── Project API keys
            ├── anon public (for client code)
            └── service_role secret ← THIS ONE!
```

## Alternative: Using Supabase CLI

If you have Supabase CLI installed and linked:
```bash
supabase secrets list
```

But you'll still need to set it in the Dashboard for Edge Functions.


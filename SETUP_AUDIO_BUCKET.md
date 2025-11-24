# 🎵 Setup Audio Storage Bucket

## Quick Setup

The app needs a Supabase Storage bucket named `audio-memories` to store user-recorded audio files.

### Step 1: Create the Bucket

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Click **Storage** in the left sidebar
4. Click **New Bucket** button
5. Configure:
   - **Name**: `audio-memories` (must be exactly this)
   - **Public bucket**: ✅ **Enable this** (check the box)
   - Click **Create bucket**

### Step 2: Set Up Storage Policies (Required for Uploads)

After creating the bucket, you need to allow users to upload files:

1. Go to **Storage** → **Policies** → Click on `audio-memories` bucket
2. Click **New Policy** → **For full customization**
3. Create an **INSERT** policy:
   - **Policy name**: `Allow authenticated users to upload audio`
   - **Allowed operation**: `INSERT`
   - **Policy definition**: 
     ```sql
     (bucket_id = 'audio-memories'::text)
     ```
   - **Target roles**: `authenticated` (or `anon` if you want anonymous uploads)
   - Click **Review** → **Save policy**

4. Create a **SELECT** policy (for public read access):
   - **Policy name**: `Allow public read access`
   - **Allowed operation**: `SELECT`
   - **Policy definition**: 
     ```sql
     (bucket_id = 'audio-memories'::text)
     ```
   - **Target roles**: `public`
   - Click **Review** → **Save policy**

### Step 3: Verify

After setup, try recording and uploading an audio memory again. The error should be gone!

## Alternative: Using SQL Editor

If you prefer SQL, you can also create the bucket via SQL Editor:

```sql
-- Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-memories', 'audio-memories', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio-memories');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'audio-memories' 
  AND auth.role() = 'authenticated'
);
```

## Troubleshooting

### "Bucket not found" error
- Make sure the bucket name is exactly `audio-memories` (with hyphen, lowercase)
- Check that the bucket exists in Storage → Buckets

### "Permission denied" error
- Make sure you've created the INSERT policy
- Check that the bucket is set to Public
- Verify your user is authenticated (if using authenticated policy)

### Still having issues?
- Check browser console (F12) for detailed error messages
- Verify your Supabase project URL and keys in `.env.local`
- Make sure you've restarted the dev server after any changes


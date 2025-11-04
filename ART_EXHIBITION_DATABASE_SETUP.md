# Art Exhibition Database Setup

This guide sets up the database for the art exhibition, allowing anonymous visitors to create memories without authentication.

## Quick Setup

### Option 1: Run Migration via Supabase Dashboard (Recommended)

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: `iwwvjecrvgrdyptxhnwj`
3. Navigate to **SQL Editor**
4. Copy and paste the contents of `supabase/migrations/20250120000000_artshow_anonymous_inserts.sql`
5. Click **Run**

### Option 2: Using Supabase CLI

```bash
# Make sure you're on the artshow branch
git checkout artshow

# Link to your Supabase project (if not already linked)
supabase link --project-ref iwwvjecrvgrdyptxhnwj

# Run the migration
supabase db push
```

## What This Migration Does

1. **Allows NULL author_id**: Ensures the `memories` table accepts memories without a user ID
2. **Creates anonymous insert policy**: Allows inserts with:
   - Authenticated users (normal operation)
   - NULL author_id (anonymous exhibition entries)
   - Source = 'art_exhibition' (exhibition-specific entries)
3. **Ensures public read access**: Makes sure all public memories are readable

## Verify Setup

After running the migration, test in your browser console:

```javascript
// Test anonymous insert
const { data, error } = await supabase
  .from('memories')
  .insert({
    text: 'Test memory',
    lat: 37.8721,
    lng: -122.2585,
    place_name: 'Test Location',
    privacy: 'public',
    source: 'art_exhibition',
    author_id: null
  })
  .select()
  .single();

console.log('Insert result:', { data, error });
```

If this works without errors, your database is ready for the exhibition!

## Troubleshooting

### Error: "permission denied for table memories"
- Make sure you ran the migration
- Check that RLS policies exist: `SELECT * FROM pg_policies WHERE tablename = 'memories';`

### Error: "null value in column 'author_id' violates not-null constraint"
- Make sure `author_id` column allows NULL: `ALTER TABLE memories ALTER COLUMN author_id DROP NOT NULL;`

### Error: "policy already exists"
- This is OK - the migration drops and recreates policies
- You can ignore duplicate policy warnings


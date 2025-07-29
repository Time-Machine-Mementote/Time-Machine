# Database Setup Guide

Your app now uses Supabase for secure, persistent data storage instead of localStorage!

## 🗄️ **What's Been Created**

### **Database Tables**
- **`profiles`** - User profiles (extends Supabase auth)
- **`journal_entries`** - All journal entries with metadata
- **`generated_memories`** - AI-generated stories, videos, and images

### **Security Features**
- ✅ **Row Level Security (RLS)** - Users can only access their own data
- ✅ **Automatic user creation** - Profiles created when users sign up
- ✅ **Type-safe operations** - Full TypeScript support
- ✅ **Real-time subscriptions** - Live updates (optional)

## 🚀 **Setup Steps**

### **Step 1: Set Up Database Tables**

```bash
# Run the database setup script
./scripts/setup-database.sh
```

This will:
- Create all database tables
- Set up Row Level Security policies
- Create indexes for performance
- Set up automatic user profile creation

### **Step 2: Set Your API Keys**

```bash
# Set OpenAI API key
supabase secrets set OPENAI_API_KEY=sk-your-actual-openai-key-here

# Set Runway API key
supabase secrets set RUNWAY_API_KEY=your-actual-runway-key-here
```

### **Step 3: Deploy Edge Functions**

```bash
# Deploy the AI generation functions
supabase functions deploy generate-story
supabase functions deploy generate-image
```

### **Step 4: Deploy Your App**

```bash
# Commit and push your changes
git add .
git commit -m "Add database integration and secure API functions"
git push
```

## 📊 **Database Schema**

### **profiles Table**
```sql
- id (UUID, references auth.users)
- email (TEXT)
- full_name (TEXT)
- avatar_url (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### **journal_entries Table**
```sql
- id (UUID, primary key)
- user_id (UUID, references profiles)
- title (TEXT, required)
- content (TEXT, required)
- entry_type (ENUM: 'text', 'voice', 'media')
- mood (TEXT)
- tags (TEXT[])
- media_files (JSONB)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### **generated_memories Table**
```sql
- id (UUID, primary key)
- entry_id (UUID, references journal_entries)
- user_id (UUID, references profiles)
- story (TEXT)
- audio_url (TEXT)
- video_url (TEXT)
- image_url (TEXT)
- status (ENUM: 'pending', 'generated', 'failed')
- generation_prompt (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## 🔐 **Security Features**

### **Row Level Security (RLS)**
- Users can only view/edit their own data
- Automatic user isolation
- No data leakage between users

### **Automatic Profile Creation**
- User profiles created automatically on signup
- No manual profile setup required

### **Type Safety**
- Full TypeScript support
- Compile-time error checking
- IntelliSense support

## 🧪 **Testing the Setup**

### **1. Test Database Connection**
Add this to your app temporarily:

```tsx
import { databaseService } from './services/databaseService'

// Test database connection
const testConnection = async () => {
  const isAuth = await databaseService.isAuthenticated()
  console.log('Authenticated:', isAuth)
  
  if (isAuth) {
    const profile = await databaseService.getProfile()
    console.log('Profile:', profile)
  }
}
```

### **2. Test Journal Entry Creation**
```tsx
const testEntry = async () => {
  const entry = await databaseService.createJournalEntry({
    title: 'Test Entry',
    content: 'This is a test journal entry',
    entry_type: 'text'
  })
  console.log('Created entry:', entry)
}
```

## 🔄 **Migration from localStorage**

The app now automatically uses the database instead of localStorage. All existing functionality will work the same, but data will be:

- ✅ **Persistent** - Stored in Supabase database
- ✅ **Secure** - Protected by RLS policies
- ✅ **Scalable** - Can handle thousands of users
- ✅ **Backed up** - Automatic Supabase backups

## 🚨 **Troubleshooting**

### **"Table doesn't exist" Error**
```bash
# Re-run the database setup
./scripts/setup-database.sh
```

### **"RLS policy violation" Error**
- Make sure user is authenticated
- Check that the user owns the data they're trying to access

### **"Function not found" Error**
```bash
# Re-deploy the functions
supabase functions deploy generate-story
supabase functions deploy generate-image
```

## 🎉 **What's Next**

1. **Add Authentication UI** - Sign up/login forms
2. **Add Real-time Features** - Live updates across devices
3. **Add File Upload** - Store media files in Supabase Storage
4. **Add Search** - Full-text search across journal entries
5. **Add Analytics** - Track usage and engagement

Your app is now production-ready with enterprise-level data storage! 
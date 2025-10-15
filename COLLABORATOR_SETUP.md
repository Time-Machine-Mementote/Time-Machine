# 🚀 Berkeley Memory Map - Collaborator Setup Guide

This guide will help Luke and other collaborators get the Berkeley Memory Map project running on their machines.

## 📋 Prerequisites

Before starting, make sure you have:
- **Node.js 18+** installed ([Download here](https://nodejs.org/))
- **Git** installed ([Download here](https://git-scm.com/))
- **A code editor** (VS Code recommended)

## 🔑 Required API Keys

Each collaborator will need their own API keys:

### 1. Mapbox Token (Free)
1. Go to [mapbox.com](https://mapbox.com)
2. Sign up for a free account
3. Go to Account → Access Tokens
4. Copy your default public token

### 2. OpenAI API Key (Paid)
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up and add payment method
3. Go to API Keys → Create new secret key
4. Copy the key (starts with `sk-`)

### 3. Supabase Project (Free)
**Option A: Use the shared project**
- Ask the project owner for the Supabase URL and anon key

**Option B: Create your own project**
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Get your project URL and anon key from Settings → API

## 🏗️ Project Setup

### Step 1: Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/berkeley-memory-map.git
cd berkeley-memory-map
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Create Environment File
Create a file named `.env.local` in the project root:

```bash
# Berkeley Memory Map Environment Variables
VITE_MAPBOX_TOKEN=pk.your_mapbox_token_here
MAPBOX_GEOCODING_TOKEN=pk.your_mapbox_token_here
VITE_OPENAI_API_KEY=sk-your_openai_key_here

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### Step 4: Set Up Database
1. Go to your Supabase dashboard
2. Click "SQL Editor"
3. Run the migration files in this order:
   - `supabase/migrations/20250115000002_clean_migration.sql`
   - `supabase/migrations/20250115000005_complete_fix.sql`

### Step 5: Start Development Server
```bash
npm run dev
```

### Step 6: Test the App
1. Open `http://localhost:8080` in your browser
2. Check the "Supabase Integration Test" widget (should show "Connected")
3. Try adding a memory using the "+" button

## 🐛 Troubleshooting

### "npm is not recognized"
- Make sure Node.js is installed and added to PATH
- Restart your terminal/command prompt

### "Mapbox token not configured"
- Check that `.env.local` file exists and has correct token
- Restart the development server after creating `.env.local`

### "Supabase connection error"
- Verify your Supabase URL and anon key are correct
- Make sure you ran the database migrations

### "Location error: Timeout expired"
- Allow location access in your browser
- Make sure you're using HTTPS or localhost

## 🎯 Development Workflow

### Making Changes
1. Create a new branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Test locally: `npm run dev`
4. Commit changes: `git commit -m "Add your feature"`
5. Push to GitHub: `git push origin feature/your-feature-name`
6. Create a Pull Request

### Code Style
- Use TypeScript for all new files
- Follow existing component patterns
- Use Tailwind CSS for styling
- Add comments for complex logic

## 📁 Key Files to Know

- `src/components/MapScreen.tsx` - Main map interface
- `src/components/AddMemorySheet.tsx` - Memory creation form
- `src/services/memoryApi.ts` - Supabase integration
- `src/hooks/useGeofencing.ts` - Location tracking
- `supabase/migrations/` - Database schema files

## 🆘 Getting Help

If you run into issues:
1. Check this guide first
2. Look at existing issues in the GitHub repository
3. Ask in the project chat/discussion
4. Create a new issue with details about your problem

## 🎉 You're Ready!

Once you can see the Berkeley campus map and the Supabase test shows "Connected", you're ready to start contributing to the project!

Happy coding! 🚀

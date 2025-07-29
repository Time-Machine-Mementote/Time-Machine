# API Setup Guide

Your app is now configured to use secure Supabase Edge Functions! No more frontend API key management needed.

## 🔑 **Add Your API Keys to Supabase**

### **Step 1: Get Your API Keys**

**OpenAI API Key:**
- Go to [OpenAI Platform](https://platform.openai.com/api-keys)
- Click "Create new secret key"
- Copy the key (starts with `sk-`)

**Runway API Key:**
- Go to [Runway Dashboard](https://app.runwayml.com/account/api-keys)
- Copy your API key

### **Step 2: Set Keys in Supabase**

Run these commands in your terminal:

```bash
# Set OpenAI API key
supabase secrets set OPENAI_API_KEY=sk-your-actual-openai-key-here

# Set Runway API key
supabase secrets set RUNWAY_API_KEY=your-actual-runway-key-here
```

### **Step 3: Deploy Functions**

```bash
# Deploy the Edge Functions
supabase functions deploy generate-story
supabase functions deploy generate-image
```

## ✅ **That's It!**

- ✅ No more settings page
- ✅ No more localStorage API keys
- ✅ No more frontend API key management
- ✅ Users don't need to enter API keys
- ✅ Everything is secure and server-side

## 🚀 **Test Your Setup**

Add the demo component to test:

```tsx
import { AIGenerationDemo } from './components/AIGenerationDemo'

// Add to your app
<AIGenerationDemo />
```

## 🔒 **Security Benefits**

- API keys are encrypted in Supabase secrets
- Never exposed to frontend code
- Never stored in localStorage
- Rate limiting included
- Input validation included

Your app is now production-ready with secure API integration! 
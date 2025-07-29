# Secure API Integration Setup Guide

This guide will help you set up secure API connections for OpenAI and Runway using Supabase Edge Functions.

## 🎯 What We've Built

1. **Two Supabase Edge Functions:**
   - `generate-story`: Securely calls OpenAI API for story generation
   - `generate-image`: Securely calls Runway API for video generation

2. **Frontend Integration:**
   - `EdgeFunctionService`: Service class for API calls
   - `useEdgeFunctions`: React hooks for easy integration
   - `AIGenerationDemo`: Example component showing usage

3. **Security Features:**
   - API keys stored in Supabase secrets (not in code or localStorage)
   - Input validation with Zod schemas
   - Rate limiting per user
   - Error handling and sanitization
   - CORS handling

## 🚀 Quick Start

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link Your Project

```bash
# Replace with your actual project ID from supabase/config.toml
supabase link --project-ref iwwvjecrvgrdyptxhnwj
```

### 4. Set API Keys as Secrets

```bash
# Set your OpenAI API key
supabase secrets set OPENAI_API_KEY=sk-your-openai-api-key-here

# Set your Runway API key
supabase secrets set RUNWAY_API_KEY=your-runway-api-key-here
```

### 5. Deploy the Functions

```bash
# Use the deployment script
./scripts/deploy-functions.sh

# Or deploy manually
supabase functions deploy generate-story
supabase functions deploy generate-image
```

### 6. Test the Integration

Add the demo component to your app:

```tsx
import { AIGenerationDemo } from './components/AIGenerationDemo'

// In your main App or a route
<AIGenerationDemo />
```

## 📁 File Structure

```
supabase/
├── functions/
│   ├── generate-story/
│   │   └── index.ts          # OpenAI story generation
│   ├── generate-image/
│   │   └── index.ts          # Runway video generation
│   └── README.md             # Function documentation
├── config.toml               # Supabase project config
└── scripts/
    └── deploy-functions.sh   # Deployment script

src/
├── services/
│   └── edgeFunctionService.ts # Frontend service
├── hooks/
│   └── useEdgeFunctions.ts   # React hooks
└── components/
    └── AIGenerationDemo.tsx  # Example component
```

## 🔧 API Usage

### Story Generation

```typescript
import { useEdgeFunctions } from '../hooks/useEdgeFunctions'

function MyComponent() {
  const { story } = useEdgeFunctions()
  
  const handleGenerate = async () => {
    const result = await story.generateStory({
      journalEntry: "Today I went for a walk in the park...",
      model: 'gpt-4',
      maxTokens: 300,
      temperature: 0.8
    })
    
    if (result.success) {
      console.log(result.story)
    }
  }
}
```

### Video Generation

```typescript
import { useEdgeFunctions } from '../hooks/useEdgeFunctions'

function MyComponent() {
  const { video } = useEdgeFunctions()
  
  const handleGenerateVideo = async () => {
    const result = await video.generateFromJournal("My journal entry...")
    
    if (result.success && result.videoId) {
      // Poll for completion
      const status = await video.pollStatus(result.videoId)
      
      if (status.success && status.videoUrl) {
        console.log('Video ready:', status.videoUrl)
      }
    }
  }
}
```

## 🔒 Security Features

### API Key Security
- ✅ Keys stored in Supabase secrets (encrypted)
- ✅ Never exposed in frontend code
- ✅ Never stored in localStorage
- ✅ Accessible only to Edge Functions

### Input Validation
- ✅ Zod schemas for all inputs
- ✅ Length limits and type checking
- ✅ Sanitized error messages

### Rate Limiting
- ✅ 10 story requests per minute per user
- ✅ 5 video requests per 5 minutes per user
- ✅ In-memory tracking (consider Redis for production)

### Error Handling
- ✅ Consistent error response format
- ✅ Proper HTTP status codes
- ✅ Sanitized error messages
- ✅ CORS handling

## 🧪 Testing

### Local Development

```bash
# Start local Supabase
supabase start

# Test story generation
curl -X POST http://localhost:54321/functions/v1/generate-story \
  -H "Content-Type: application/json" \
  -d '{"journalEntry": "Test entry"}'

# Test video generation
curl -X POST http://localhost:54321/functions/v1/generate-image \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A beautiful sunset"}'
```

### Production Testing

Use the `AIGenerationDemo` component to test both functions with a UI.

## 🔄 Migration from Direct API Calls

If you're currently using direct API calls, here's how to migrate:

### Before (Direct API)
```typescript
// Old way - direct API calls
const openaiService = new OpenAIService({ apiKey: 'sk-...' })
const result = await openaiService.generateStory(params)
```

### After (Edge Functions)
```typescript
// New way - secure Edge Functions
import { useEdgeFunctions } from '../hooks/useEdgeFunctions'

const { story } = useEdgeFunctions()
const result = await story.generateStory({ journalEntry: '...' })
```

## 🚨 Troubleshooting

### Common Issues

1. **"API key not configured"**
   - Make sure you've set the secrets: `supabase secrets set OPENAI_API_KEY=...`
   - Verify the function is deployed: `supabase functions list`

2. **"Rate limit exceeded"**
   - Wait for the rate limit window to reset
   - Consider implementing user authentication for better rate limiting

3. **"Function not found"**
   - Deploy the functions: `supabase functions deploy`
   - Check the function URL in your Supabase dashboard

4. **CORS errors**
   - The functions include CORS headers
   - Make sure you're calling from the correct origin

### Debug Commands

```bash
# Check function status
supabase functions list

# View function logs
supabase functions logs generate-story
supabase functions logs generate-image

# Test function locally
supabase functions serve
```

## 📈 Production Considerations

1. **Rate Limiting**: Consider using Redis or database for persistent rate limiting
2. **Authentication**: Implement proper user authentication for better security
3. **Monitoring**: Add logging and monitoring for production use
4. **Caching**: Consider caching responses for better performance
5. **Error Tracking**: Implement proper error tracking and alerting

## 🎉 Next Steps

1. Deploy the functions using the setup guide above
2. Test with the demo component
3. Integrate into your existing components
4. Add proper error handling and loading states
5. Consider adding user authentication for better rate limiting

## 📞 Support

If you encounter issues:
1. Check the function logs: `supabase functions logs`
2. Verify your API keys are set correctly
3. Test with the demo component
4. Check the Supabase dashboard for function status

The Edge Functions are now ready to provide secure, scalable API access to OpenAI and Runway! 
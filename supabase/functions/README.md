# Supabase Edge Functions

This directory contains Edge Functions for secure API integration with OpenAI and Runway.

## Functions

### `generate-story`
Generates creative stories from journal entries using OpenAI's GPT models.

**Endpoint:** `POST /functions/v1/generate-story`

**Request Body:**
```json
{
  "journalEntry": "Your journal entry text here",
  "model": "gpt-4", // optional, defaults to "gpt-4"
  "maxTokens": 500, // optional, defaults to 500
  "temperature": 0.7 // optional, defaults to 0.7
}
```

**Response:**
```json
{
  "success": true,
  "story": "Generated story text...",
  "model": "gpt-4",
  "usage": {
    "maxTokens": 500,
    "temperature": 0.7
  }
}
```

### `generate-image`
Generates videos from prompts using Runway's Gen-2 model.

**Endpoint:** `POST /functions/v1/generate-image`

**Request Body:**
```json
{
  "prompt": "Your video prompt here",
  "negativePrompt": "blurry, low quality", // optional
  "width": 1024, // optional, defaults to 1024
  "height": 1024, // optional, defaults to 1024
  "numFrames": 24, // optional, defaults to 24
  "fps": 8, // optional, defaults to 8
  "guidanceScale": 7.5, // optional, defaults to 7.5
  "seed": 12345 // optional
}
```

**Response:**
```json
{
  "success": true,
  "videoId": "video_12345",
  "status": "processing",
  "message": "Video generation started. Use GET /functions/v1/generate-image?id={videoId} to check status."
}
```

**Status Check:** `GET /functions/v1/generate-image?id={videoId}`

**Status Response:**
```json
{
  "success": true,
  "status": "completed",
  "videoUrl": "https://example.com/video.mp4"
}
```

## Setup Instructions

### 1. Install Supabase CLI
```bash
npm install -g supabase
```

### 2. Login to Supabase
```bash
supabase login
```

### 3. Link your project
```bash
supabase link --project-ref YOUR_PROJECT_ID
```

### 4. Set API Keys as Secrets
```bash
# Set OpenAI API key
supabase secrets set OPENAI_API_KEY=your_openai_api_key_here

# Set Runway API key
supabase secrets set RUNWAY_API_KEY=your_runway_api_key_here
```

### 5. Deploy Functions
```bash
# Deploy all functions
supabase functions deploy

# Or deploy specific functions
supabase functions deploy generate-story
supabase functions deploy generate-image
```

### 6. Verify Deployment
```bash
# List deployed functions
supabase functions list
```

## Environment Variables

The functions expect these environment variables to be set as Supabase secrets:

- `OPENAI_API_KEY`: Your OpenAI API key
- `RUNWAY_API_KEY`: Your Runway API key

## Rate Limiting

Both functions include rate limiting:
- **generate-story**: 10 requests per minute per user
- **generate-image**: 5 requests per 5 minutes per user

## Error Handling

Functions return consistent error responses:
```json
{
  "success": false,
  "error": "Error message here"
}
```

Common error codes:
- `400`: Validation error
- `429`: Rate limit exceeded
- `500`: Internal server error
- `502`: API service error

## Security Features

- API keys stored securely in Supabase secrets
- Input validation with Zod schemas
- Rate limiting per user
- CORS handling
- Error sanitization

## Local Development

To test functions locally:

```bash
# Start local development
supabase start

# Test a function
curl -X POST http://localhost:54321/functions/v1/generate-story \
  -H "Content-Type: application/json" \
  -d '{"journalEntry": "Test entry"}'
```

## Frontend Integration

Use the provided `EdgeFunctionService` and React hooks in your frontend:

```typescript
import { useEdgeFunctions } from '../hooks/useEdgeFunctions'

function MyComponent() {
  const { story, video } = useEdgeFunctions()
  
  const handleGenerateStory = async () => {
    const result = await story.generateStory({
      journalEntry: "My journal entry..."
    })
    
    if (result.success) {
      console.log(result.story)
    }
  }
  
  // ... rest of component
}
``` 
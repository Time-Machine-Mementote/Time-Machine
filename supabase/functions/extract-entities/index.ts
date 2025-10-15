import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schema
const ExtractEntitiesRequestSchema = z.object({
  text: z.string().min(1, "Text cannot be empty").max(4000, "Text too long"),
})

type ExtractEntitiesRequest = z.infer<typeof ExtractEntitiesRequestSchema>

interface ExtractedEntities {
  summary: string;
  places: Array<{
    name: string;
    hint: string;
  }>;
  times: Array<{
    start: string;
    end?: string;
  }>;
  people: string[];
}

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(userId: string, limit: number = 20, windowMs: number = 60000): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(userId)
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (userLimit.count >= limit) {
    return false
  }
  
  userLimit.count++
  return true
}

async function extractEntitiesWithOpenAI(request: ExtractEntitiesRequest): Promise<ExtractedEntities> {
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY")
  
  if (!openaiApiKey) {
    throw new Error("OpenAI API key not configured")
  }

  const systemPrompt = `You are an expert at extracting structured information from personal memory text. Extract the following information and return it as valid JSON:

1. summary: A concise title/summary (max 12 words)
2. places: Array of places mentioned with hints about their type (e.g., "campus landmark", "city", "country", "neighborhood")
3. times: Array of time expressions found (both absolute dates and relative times)
4. people: Array of people mentioned by name

Focus on:
- UC Berkeley campus landmarks (Campanile, Memorial Glade, Doe Library, Sproul Plaza, etc.)
- Other locations mentioned in the text
- Any dates, times, or temporal references
- Names of people mentioned

Return ONLY valid JSON in this exact format:
{
  "summary": "Brief title here",
  "places": [{"name": "Place Name", "hint": "type hint"}],
  "times": [{"start": "time expression", "end": "optional end time"}],
  "people": ["Person Name"]
}`

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Extract entities from this memory text: ${request.text}` }
  ]

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages,
      max_tokens: 500,
      temperature: 0.1,
      response_format: { type: "json_object" }
    }),
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${errorData}`)
  }

  const data = await response.json()
  
  if (!data.choices || data.choices.length === 0) {
    throw new Error("No response generated from OpenAI")
  }

  const extractedText = data.choices[0].message.content.trim()
  
  try {
    return JSON.parse(extractedText) as ExtractedEntities
  } catch (error) {
    console.error("Failed to parse OpenAI response:", extractedText)
    throw new Error("Invalid JSON response from OpenAI")
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    })
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    })
  }

  try {
    // Check if OpenAI API key is available
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY")
    if (!openaiApiKey) {
      console.error("OpenAI API key not found in environment")
      return new Response(JSON.stringify({ 
        error: "OpenAI API key not configured",
        success: false 
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      })
    }

    // Simple authorization check
    const authHeader = req.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ 
        error: "Missing authorization header",
        success: false 
      }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      })
    }

    const userId = "test-user" // Simplified for now
    
    // Check rate limit
    if (!checkRateLimit(userId)) {
      return new Response(JSON.stringify({ 
        error: "Rate limit exceeded. Please try again later." 
      }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      })
    }

    // Parse and validate request body
    const body = await req.json()
    const validatedRequest = ExtractEntitiesRequestSchema.parse(body)

    // Extract entities
    const entities = await extractEntitiesWithOpenAI(validatedRequest)

    return new Response(JSON.stringify({
      success: true,
      entities,
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    })

  } catch (error) {
    console.error("Error in extract-entities function:", error)
    
    let status = 500
    let message = "Internal server error"
    
    if (error instanceof z.ZodError) {
      status = 400
      message = `Validation error: ${error.errors.map(e => e.message).join(", ")}`
    } else if (error.message.includes("OpenAI API error")) {
      status = 502
      message = error.message
    } else if (error.message.includes("Rate limit")) {
      status = 429
      message = error.message
    }

    return new Response(JSON.stringify({ 
      error: message,
      success: false 
    }), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    })
  }
})

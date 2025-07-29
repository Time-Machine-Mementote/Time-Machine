import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"

// Disable JWT verification for this function
// deno-lint-ignore-file
// @ts-ignore
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schema
const StoryRequestSchema = z.object({
  journalEntry: z.string().min(1, "Journal entry cannot be empty").max(2000, "Journal entry too long"),
  model: z.enum(["gpt-4", "gpt-3.5-turbo", "text-davinci-003"]).optional().default("gpt-4"),
  maxTokens: z.number().min(50).max(2000).optional().default(500),
  temperature: z.number().min(0).max(2).optional().default(0.7),
})

type StoryRequest = z.infer<typeof StoryRequestSchema>

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
  usage: {
    total_tokens: number
    prompt_tokens: number
    completion_tokens: number
  }
}

// Rate limiting in memory (in production, use Redis or database)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(userId: string, limit: number = 10, windowMs: number = 60000): boolean {
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

async function generateStoryWithOpenAI(request: StoryRequest): Promise<string> {
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY")
  
  if (!openaiApiKey) {
    throw new Error("OpenAI API key not configured")
  }

  const systemPrompt = `You are a creative storyteller who transforms personal journal entries into engaging, imaginative stories. 
  
  Guidelines:
  - Keep the story under ${request.maxTokens} words
  - Maintain the emotional essence of the journal entry
  - Add creative elements while preserving the core message
  - Write in a warm, engaging tone
  - Focus on the positive aspects and growth opportunities
  - Make it feel personal and meaningful`

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Please create a story based on this journal entry: ${request.journalEntry}` }
  ]

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: request.model,
      messages,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
    }),
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${errorData}`)
  }

  const data: OpenAIResponse = await response.json()
  
  if (!data.choices || data.choices.length === 0) {
    throw new Error("No response generated from OpenAI")
  }

  return data.choices[0].message.content.trim()
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

    // Temporarily disable authorization for testing
    const authHeader = req.headers.get("Authorization")
    console.log("Auth header:", authHeader ? "Present" : "Missing")
    
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
    const validatedRequest = StoryRequestSchema.parse(body)

    // Generate story
    const story = await generateStoryWithOpenAI(validatedRequest)

    return new Response(JSON.stringify({
      success: true,
      story,
      model: validatedRequest.model,
      usage: {
        maxTokens: validatedRequest.maxTokens,
        temperature: validatedRequest.temperature,
      }
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    })

  } catch (error) {
    console.error("Error in generate-story function:", error)
    
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
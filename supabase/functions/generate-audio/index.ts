import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"

// Input validation schema
const AudioRequestSchema = z.object({
  text: z.string().min(1, "Text cannot be empty").max(4000, "Text too long"),
  voice: z.enum(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]).optional().default("alloy"),
  model: z.enum(["tts-1", "tts-1-hd"]).optional().default("tts-1"),
  response_format: z.enum(["mp3", "opus", "aac", "flac"]).optional().default("mp3"),
  speed: z.number().min(0.25).max(4.0).optional().default(1.0),
  memory_id: z.string().uuid().optional(),
})

type AudioRequest = z.infer<typeof AudioRequestSchema>

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

async function generateAudioWithOpenAI(request: AudioRequest): Promise<ArrayBuffer> {
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY")
  
  if (!openaiApiKey) {
    throw new Error("OpenAI API key not configured")
  }

  console.log("Generating audio with OpenAI TTS...")
  console.log("Request:", { 
    text: request.text.substring(0, 100) + "...", 
    voice: request.voice, 
    model: request.model 
  })

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: request.model,
      input: request.text,
      voice: request.voice,
      response_format: request.response_format,
      speed: request.speed,
    }),
  })

  console.log("OpenAI TTS response status:", response.status)

  if (!response.ok) {
    const errorData = await response.text()
    console.error("OpenAI TTS error:", errorData)
    throw new Error(`OpenAI TTS error: ${response.status} - ${errorData}`)
  }

  return await response.arrayBuffer()
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

    // Optional authorization check (allow anonymous for art exhibition)
    const authHeader = req.headers.get("Authorization")
    let userId = "anonymous-user"
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      // Try to extract user ID from token if available
      try {
        const token = authHeader.replace("Bearer ", "")
        // Simple check - in production, decode JWT to get user ID
        userId = "authenticated-user"
      } catch {
        userId = "anonymous-user"
      }
    }
    // Allow anonymous requests for art exhibition
    
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
    const validatedRequest = AudioRequestSchema.parse(body)

    // Generate audio
    const audioBuffer = await generateAudioWithOpenAI(validatedRequest)

    // Convert to base64 for JSON response
    const base64Audio = btoa(
      String.fromCharCode(...new Uint8Array(audioBuffer))
    )

    return new Response(JSON.stringify({
      success: true,
      audioContent: base64Audio,
      audioUrl: `data:audio/${validatedRequest.response_format};base64,${base64Audio}`,
      format: validatedRequest.response_format,
      voice: validatedRequest.voice,
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    })

  } catch (error) {
    console.error("Error in generate-audio function:", error)
    
    let status = 500
    let message = "Internal server error"
    
    if (error instanceof z.ZodError) {
      status = 400
      message = `Validation error: ${error.errors.map(e => e.message).join(", ")}`
    } else if (error.message.includes("OpenAI TTS error")) {
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
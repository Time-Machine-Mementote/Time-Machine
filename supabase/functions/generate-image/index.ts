import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"

// Input validation schema
const ImageRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt cannot be empty").max(1000, "Prompt too long"),
  negativePrompt: z.string().max(1000, "Negative prompt too long").optional(),
  width: z.number().min(512).max(1920).optional().default(1024),
  height: z.number().min(512).max(1920).optional().default(1024),
  numFrames: z.number().min(16).max(128).optional().default(24),
  fps: z.number().min(1).max(30).optional().default(8),
  guidanceScale: z.number().min(1).max(20).optional().default(7.5),
  seed: z.number().optional(),
})

type ImageRequest = z.infer<typeof ImageRequestSchema>

interface RunwayResponse {
  id: string
  status: string
  output?: {
    video: string
  }
  error?: string
}

// Rate limiting in memory (in production, use Redis or database)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(userId: string, limit: number = 5, windowMs: number = 300000): boolean {
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

async function generateVideoWithRunway(request: ImageRequest): Promise<{ id: string; status: string }> {
  const runwayApiKey = Deno.env.get("RUNWAY_API_KEY")
  
  if (!runwayApiKey) {
    throw new Error("Runway API key not configured")
  }

  const payload = {
    prompt: request.prompt,
    negative_prompt: request.negativePrompt || "",
    width: request.width,
    height: request.height,
    num_frames: request.numFrames,
    fps: request.fps,
    guidance_scale: request.guidanceScale,
    seed: request.seed,
  }

  const response = await fetch("https://api.runwayml.com/v1/inference", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${runwayApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`Runway API error: ${response.status} - ${errorData}`)
  }

  const data: RunwayResponse = await response.json()
  
  if (data.error) {
    throw new Error(`Runway generation error: ${data.error}`)
  }

  return { id: data.id, status: data.status }
}

async function checkVideoStatus(videoId: string): Promise<{ status: string; videoUrl?: string }> {
  const runwayApiKey = Deno.env.get("RUNWAY_API_KEY")
  
  if (!runwayApiKey) {
    throw new Error("Runway API key not configured")
  }

  const response = await fetch(`https://api.runwayml.com/v1/inference/${videoId}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${runwayApiKey}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`Runway status check error: ${response.status} - ${errorData}`)
  }

  const data: RunwayResponse = await response.json()
  
  return {
    status: data.status,
    videoUrl: data.output?.video,
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    })
  }

  // Only allow POST and GET requests
  if (!["POST", "GET"].includes(req.method)) {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    })
  }

  try {
    // Get user ID from request (you can modify this based on your auth setup)
    const authHeader = req.headers.get("Authorization")
    const userId = authHeader ? authHeader.replace("Bearer ", "") : "anonymous"
    
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

    // Handle GET request for status check
    if (req.method === "GET") {
      const url = new URL(req.url)
      const videoId = url.searchParams.get("id")
      
      if (!videoId) {
        return new Response(JSON.stringify({ error: "Video ID is required" }), {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        })
      }

      const status = await checkVideoStatus(videoId)
      
      return new Response(JSON.stringify({
        success: true,
        ...status,
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      })
    }

    // Handle POST request for video generation
    const body = await req.json()
    const validatedRequest = ImageRequestSchema.parse(body)

    // Generate video
    const result = await generateVideoWithRunway(validatedRequest)

    return new Response(JSON.stringify({
      success: true,
      videoId: result.id,
      status: result.status,
      message: "Video generation started. Use GET /functions/v1/generate-image?id={videoId} to check status.",
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    })

  } catch (error) {
    console.error("Error in generate-image function:", error)
    
    let status = 500
    let message = "Internal server error"
    
    if (error instanceof z.ZodError) {
      status = 400
      message = `Validation error: ${error.errors.map(e => e.message).join(", ")}`
    } else if (error.message.includes("Runway API error")) {
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
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"

// Input validation schema
const VideoRequestSchema = z.object({
  imageUrl: z.string().url("Invalid image URL"),
  prompt: z.string().min(1, "Prompt cannot be empty").max(1000, "Prompt too long").optional(),
  duration: z.number().min(5).max(10).optional().default(5),
  seed: z.number().optional(),
})

type VideoRequest = z.infer<typeof VideoRequestSchema>

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

function checkRateLimit(userId: string, limit: number = 3, windowMs: number = 300000): boolean {
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

async function generateVideoWithRunway(request: VideoRequest): Promise<{ id: string; status: string }> {
  const runwayApiKey = Deno.env.get("RUNWAY_API_KEY")
  
  if (!runwayApiKey) {
    throw new Error("Runway API key not configured")
  }

  console.log("Runway API key found, generating video from image...")
  console.log("Request payload:", JSON.stringify(request, null, 2))

  const payload = {
    model: "gen3a_turbo",
    promptImage: request.imageUrl,
    promptText: request.prompt || "Gentle, dreamy movement bringing this memory to life",
    duration: request.duration,
    ratio: "16:9",
    seed: request.seed,
  }

  console.log("Making request to Runway API...")
  const response = await fetch("https://api.dev.runwayml.com/v1/image_to_video", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${runwayApiKey}`,
      "Content-Type": "application/json",
      "X-Runway-Version": "2024-11-06",
    },
    body: JSON.stringify(payload),
  })

  console.log("Runway API response status:", response.status)
  
  if (!response.ok) {
    const errorData = await response.text()
    console.error("Runway API error:", errorData)
    throw new Error(`Runway API error: ${response.status} - ${errorData}`)
  }

  const data: RunwayResponse = await response.json()
  console.log("Runway API response data:", data)
  
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

  const response = await fetch(`https://api.dev.runwayml.com/v1/tasks/${videoId}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${runwayApiKey}`,
      "X-Runway-Version": "2024-11-06",
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
    // Check if Runway API key is available
    const runwayApiKey = Deno.env.get("RUNWAY_API_KEY")
    if (!runwayApiKey) {
      console.error("Runway API key not found in environment")
      return new Response(JSON.stringify({ 
        error: "Runway API key not configured",
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
    const validatedRequest = VideoRequestSchema.parse(body)

    // Generate video from image
    const result = await generateVideoWithRunway(validatedRequest)

    return new Response(JSON.stringify({
      success: true,
      videoId: result.id,
      status: result.status,
      message: "Video generation started. Polling for completion...",
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    })

  } catch (error) {
    console.error("Error in generate-video-from-image function:", error)
    
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
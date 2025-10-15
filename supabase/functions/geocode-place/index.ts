import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schema
const GeocodeRequestSchema = z.object({
  name: z.string().min(1, "Place name cannot be empty").max(200, "Place name too long"),
  hint: z.string().optional(),
})

type GeocodeRequest = z.infer<typeof GeocodeRequestSchema>

interface GeocodeResult {
  lat: number;
  lng: number;
  confidence: number;
  place_name: string;
  place_type?: string;
}

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(userId: string, limit: number = 50, windowMs: number = 60000): boolean {
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

async function geocodeWithMapbox(request: GeocodeRequest): Promise<GeocodeResult> {
  const mapboxToken = Deno.env.get("MAPBOX_GEOCODING_TOKEN")
  
  if (!mapboxToken) {
    throw new Error("Mapbox geocoding token not configured")
  }

  // Build search query with hint for better results
  let query = request.name
  if (request.hint) {
    if (request.hint.includes("campus landmark") || request.hint.includes("UC Berkeley")) {
      query = `${request.name}, Berkeley, CA`
    } else if (request.hint.includes("city")) {
      query = `${request.name}, city`
    } else if (request.hint.includes("country")) {
      query = `${request.name}, country`
    }
  }

  const encodedQuery = encodeURIComponent(query)
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${mapboxToken}&limit=1&types=poi,place,locality,neighborhood`

  console.log("Geocoding query:", query)

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`Mapbox API error: ${response.status} - ${errorData}`)
  }

  const data = await response.json()
  
  if (!data.features || data.features.length === 0) {
    throw new Error(`No results found for: ${request.name}`)
  }

  const feature = data.features[0]
  const [lng, lat] = feature.center
  const placeName = feature.place_name
  const placeType = feature.place_type?.[0] || "unknown"
  
  // Calculate confidence based on relevance score and place type
  const relevance = feature.relevance || 0.5
  const confidence = Math.min(relevance * 1.2, 1.0)

  return {
    lat,
    lng,
    confidence,
    place_name: placeName,
    place_type: placeType
  }
}

async function geocodeWithNominatim(request: GeocodeRequest): Promise<GeocodeResult> {
  // Fallback to Nominatim if Mapbox fails
  const encodedQuery = encodeURIComponent(request.name)
  const url = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1&addressdetails=1`

  console.log("Fallback geocoding with Nominatim:", request.name)

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": "Berkeley-Memory-Map/1.0",
    },
  })

  if (!response.ok) {
    throw new Error(`Nominatim API error: ${response.status}`)
  }

  const data = await response.json()
  
  if (!data || data.length === 0) {
    throw new Error(`No results found for: ${request.name}`)
  }

  const result = data[0]
  const lat = parseFloat(result.lat)
  const lng = parseFloat(result.lon)
  const placeName = result.display_name
  const placeType = result.type || "unknown"
  
  // Lower confidence for Nominatim results
  const confidence = 0.7

  return {
    lat,
    lng,
    confidence,
    place_name: placeName,
    place_type: placeType
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
    const validatedRequest = GeocodeRequestSchema.parse(body)

    // Try Mapbox first, fallback to Nominatim
    let result: GeocodeResult
    try {
      result = await geocodeWithMapbox(validatedRequest)
    } catch (error) {
      console.log("Mapbox geocoding failed, trying Nominatim:", error.message)
      result = await geocodeWithNominatim(validatedRequest)
    }

    return new Response(JSON.stringify({
      success: true,
      result,
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    })

  } catch (error) {
    console.error("Error in geocode-place function:", error)
    
    let status = 500
    let message = "Internal server error"
    
    if (error instanceof z.ZodError) {
      status = 400
      message = `Validation error: ${error.errors.map(e => e.message).join(", ")}`
    } else if (error.message.includes("API error")) {
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

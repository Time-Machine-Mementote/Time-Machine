import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    })
  }

  try {
    // Check if OpenAI API key is available
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY")
    
    return new Response(JSON.stringify({
      success: true,
      message: "Test function working",
      hasOpenAIKey: !!openaiApiKey,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    })

  } catch (error) {
    console.error("Error in test function:", error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    })
  }
}) 
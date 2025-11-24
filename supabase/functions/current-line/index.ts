import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Input validation schema
const LineRequestSchema = z.object({
  userId: z.string().uuid().nullable(),
  nodeSlug: z.string().min(1),
  voiceSlug: z.string().min(1),
  recentLineIds: z.array(z.string().uuid()).optional().default([]),
})

type LineRequest = z.infer<typeof LineRequestSchema>

// Node definitions (mirror of frontend nodes.ts)
const NODES = [
  { slug: 'node-wurster-center', segmentId: 'seg-wurster', name: 'Wurster Center', description: 'You stand in the middle of Wurster Courtyard. Concrete slabs rise around you, studio windows watching.' },
  { slug: 'node-morrison-eave', segmentId: 'seg-wurster', name: 'Morrison Eave', description: 'You stand under the Morrison eave, where the concrete overhang creates an echo chamber. The sound of your footsteps folds back on itself.' },
  { slug: 'node-wurster-exit', segmentId: 'seg-wurster', name: 'Wurster Exit', description: 'You reach the edge of Wurster Courtyard, facing toward 4.0 Hill. The concrete gives way to grass and sky.' },
  { slug: 'node-hill-base', segmentId: 'seg-hill', name: '4.0 Hill Base', description: 'You stand at the base of 4.0 Hill, where the path begins to slope upward. The grass stretches ahead of you.' },
  { slug: 'node-hill-mid', segmentId: 'seg-hill', name: '4.0 Hill Mid', description: 'You are mid-slope on 4.0 Hill, where people usually sit on the grass. The amphitheater of west-facing grass opens around you.' },
  { slug: 'node-hill-lip', segmentId: 'seg-hill', name: '4.0 Hill Lip', description: 'You reach the western lip of 4.0 Hill, the top of the slope. The view opens toward Strawberry Creek.' },
  { slug: 'node-hill-exit', segmentId: 'seg-hill', name: '4.0 Hill Exit', description: 'You transition from grass back to paved path, heading toward the bridge over Strawberry Creek.' },
  { slug: 'node-creek-approach', segmentId: 'seg-creek', name: 'Creek Approach', description: 'You approach the bridge over Strawberry Creek. The sound of water begins to reach you.' },
  { slug: 'node-creek-center', segmentId: 'seg-creek', name: 'Creek Center', description: 'You stand in the middle of the small bridge over Strawberry Creek, water folding under you and trees overhead.' },
  { slug: 'node-creek-exit', segmentId: 'seg-creek', name: 'Creek Exit', description: 'You step off the bridge, heading toward the Campanile. The water sound fades behind you.' },
  { slug: 'node-camp-approach', segmentId: 'seg-campanile', name: 'Campanile Approach', description: 'You enter the Campanile plaza from the west. The stone tower rises ahead of you.' },
  { slug: 'node-camp-base', segmentId: 'seg-campanile', name: 'Campanile Base', description: 'You stand at the base of the Campanile, at the west face. The stone tower looms above, and bells may ring.' },
  { slug: 'node-camp-overlook', segmentId: 'seg-campanile', name: 'Campanile Overlook', description: 'You stand at the west edge of the Campanile plaza, where on clear days the Golden Gate hangs low in the distance.' },
  { slug: 'node-camp-linger', segmentId: 'seg-campanile', name: 'Campanile Linger', description: 'You linger slightly off to the side, taking in the full view. The Campanile, the sky, the memory of the walk.' },
]

const SEGMENTS = [
  { id: 'seg-wurster', name: 'Wurster / Concrete Current', theme: 'Concrete canopy, drafting tables, echo under the Morrison eave.' },
  { id: 'seg-hill', name: '4.0 Hill / Sloping Current', theme: 'Grass slope, warm afternoons, bodies lying in the amphitheater of west-facing grass.' },
  { id: 'seg-creek', name: 'Strawberry Creek / Crossing Current', theme: 'Water folding through campus time beneath the small bridge.' },
  { id: 'seg-campanile', name: 'Campanile / Vertical Current', theme: 'Stone, bells, and the western slit of sky framing the Golden Gate.' },
]

function getNodeBySlug(slug: string) {
  return NODES.find(n => n.slug === slug)
}

function getSegmentById(id: string) {
  return SEGMENTS.find(s => s.id === id)
}

async function generateLineWithOpenAI(
  prompt: string,
  temperature: number = 0.8
): Promise<string> {
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY")
  
  if (!openaiApiKey) {
    throw new Error("OpenAI API key not configured")
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a poetic voice generating short, evocative lines. Respond ONLY with the poetic lines, no explanations, no meta commentary." },
        { role: "user", content: prompt }
      ],
      max_tokens: 100,
      temperature,
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

  return data.choices[0].message.content.trim()
}

function checkStringSimilarity(text1: string, text2: string): number {
  // Simple substring overlap check
  const words1 = text1.toLowerCase().split(/\s+/)
  const words2 = text2.toLowerCase().split(/\s+/)
  
  const set1 = new Set(words1)
  const set2 = new Set(words2)
  
  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])
  
  return intersection.size / union.size
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // Parse and validate request
    const body = await req.json()
    const validatedRequest = LineRequestSchema.parse(body)

    // 1. Look up node and segment
    const node = getNodeBySlug(validatedRequest.nodeSlug)
    if (!node) {
      return new Response(JSON.stringify({ error: "Node not found" }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      })
    }

    const segment = getSegmentById(node.segmentId)
    if (!segment) {
      return new Response(JSON.stringify({ error: "Segment not found" }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      })
    }

    // 2. Look up poetic voice
    let voice
    const { data: voiceData, error: voiceError } = await supabase
      .from("poetic_voices")
      .select("*")
      .eq("slug", validatedRequest.voiceSlug)
      .single()

    if (voiceError || !voiceData) {
      // Fallback to default "greg" voice
      const { data: defaultVoice } = await supabase
        .from("poetic_voices")
        .select("*")
        .eq("slug", "greg")
        .single()

      if (!defaultVoice) {
        return new Response(JSON.stringify({ error: "Voice not found" }), {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        })
      }
      voice = defaultVoice
    } else {
      voice = voiceData
    }

    // 3. Load recent generated lines
    const { data: recentLines } = await supabase
      .from("generated_lines")
      .select("text")
      .eq("node_id", validatedRequest.nodeSlug)
      .eq("voice_slug", validatedRequest.voiceSlug)
      .order("created_at", { ascending: false })
      .limit(100)

    // Build avoid list
    const avoidList = (recentLines || [])
      .map(line => line.text)
      .slice(0, 20) // Last 20 lines
      .map(text => `"${text.substring(0, 100)}"`) // Truncate for prompt
      .join("\n")

    // 4. Load nearby time entries (memories)
    // For now, we'll use the memories table if it exists
    // In a real implementation, you'd query by node_id or proximity
    const { data: nearbyMemories } = await supabase
      .from("memories")
      .select("text, tags")
      .eq("privacy", "public")
      .limit(10)

    const memoryContext = (nearbyMemories || [])
      .slice(0, 5)
      .map(mem => `"${mem.text.substring(0, 150)}"`)
      .join("\n")

    // 5. Build LLM prompt
    const prompt = `You are ${voice.name}, a poetic voice.

STYLE INSTRUCTIONS:
${voice.style_instructions}

LANGUAGE: ${voice.language_code}

CURRENT LOCATION:
${node.description}

SEGMENT THEME:
${segment.theme}

${voice.sample_corpus ? `SAMPLE CORPUS:\n${voice.sample_corpus}\n` : ''}

AVOID REPEATING THESE RECENT LINES:
${avoidList || "(none)"}

${memoryContext ? `NEARBY MEMORIES (for context):\n${memoryContext}\n` : ''}

INSTRUCTIONS:
- Write in ${voice.language_code}
- Present tense, second person
- 1-2 short poetic lines maximum
- No explanations, no meta commentary
- Only the lines themselves
- Do not reuse phrases from the avoid list

Generate a new poetic line:`

    // 6. Generate line with anti-repeat
    let candidateLine = ""
    let attempts = 0
    const maxAttempts = 4

    while (attempts < maxAttempts) {
      candidateLine = await generateLineWithOpenAI(prompt, 0.7 + (attempts * 0.05)) // Slightly increase temperature on retries

      // Check for similarity with recent lines
      let tooSimilar = false
      if (recentLines && recentLines.length > 0) {
        for (const recentLine of recentLines.slice(0, 10)) {
          const similarity = checkStringSimilarity(candidateLine, recentLine.text)
          if (similarity > 0.85) {
            tooSimilar = true
            break
          }
        }
      }

      // Check for substring overlap
      const candidateLower = candidateLine.toLowerCase()
      for (const avoidText of avoidList.split("\n").slice(0, 10)) {
        const avoidLower = avoidText.toLowerCase().replace(/"/g, "")
        if (candidateLower.includes(avoidLower) || avoidLower.includes(candidateLower)) {
          tooSimilar = true
          break
        }
      }

      if (!tooSimilar) {
        break
      }

      attempts++
    }

    // 7. Insert into generated_lines
    const { data: insertedLine, error: insertError } = await supabase
      .from("generated_lines")
      .insert({
        user_id: validatedRequest.userId,
        node_id: validatedRequest.nodeSlug,
        voice_slug: validatedRequest.voiceSlug,
        text: candidateLine,
      })
      .select("id")
      .single()

    if (insertError) {
      console.error("Error inserting generated line:", insertError)
      // Continue anyway, return the line
    }

    return new Response(JSON.stringify({
      success: true,
      line: candidateLine,
      lineId: insertedLine?.id || crypto.randomUUID(),
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    })

  } catch (error) {
    console.error("Error in current-line function:", error)
    
    let status = 500
    let message = "Internal server error"
    
    if (error instanceof z.ZodError) {
      status = 400
      message = `Validation error: ${error.errors.map(e => e.message).join(", ")}`
    } else if (error.message) {
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


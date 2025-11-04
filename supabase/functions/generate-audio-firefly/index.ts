// Generate audio narration for memory text using Adobe Firefly
// Alternative to OpenAI TTS for more ambient/reflective narration
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  try {
    const { text, lat, lng, emotion } = await req.json();

    if (!text) {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Get Adobe Firefly API key (note: typo in prompt preserved as ADOBE_FIRELLY_KEY)
    const fireflyKey = Deno.env.get("ADOBE_FIRELLY_KEY") || Deno.env.get("ADOBE_FIREFLY_KEY");
    
    if (!fireflyKey) {
      // Fallback to OpenAI if Firefly not configured
      console.log("Firefly key not found, falling back to OpenAI TTS");
      return await generateWithOpenAI(text, req);
    }

    // Generate audio with Adobe Firefly
    const fireflyRes = await fetch("https://firefly.adobe.io/v1/audio", {
      method: "POST",
      headers: {
        "x-api-key": fireflyKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        style: "reflective ambient narration",
        format: "mp3",
      }),
    });

    if (!fireflyRes.ok) {
      console.error("Firefly API error:", fireflyRes.status, await fireflyRes.text());
      // Fallback to OpenAI
      return await generateWithOpenAI(text, req);
    }

    const arrayBuffer = await fireflyRes.arrayBuffer();

    // Upload to Supabase Storage
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const fileName = `memory_${crypto.randomUUID()}.mp3`;
    const { error: uploadError } = await supabase.storage
      .from("memory_audio")
      .upload(fileName, arrayBuffer, {
        contentType: "audio/mpeg",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from("memory_audio")
      .getPublicUrl(fileName);

    // Update memory record if lat/lng provided
    if (lat && lng) {
      const { error: updateError } = await supabase
        .from("memories")
        .update({ audio_url: urlData.publicUrl, emotion: emotion || 0.5 })
        .eq("lat", lat)
        .eq("lng", lng)
        .order("created_at", { ascending: false })
        .limit(1);

      if (updateError) {
        console.warn("Failed to update memory:", updateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        audio_url: urlData.publicUrl,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err: any) {
    console.error("Error in generate-audio-firefly:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});

// Fallback to OpenAI TTS
async function generateWithOpenAI(text: string, req: Request) {
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
  
  if (!openaiApiKey) {
    throw new Error("Neither Firefly nor OpenAI API key configured");
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      input: text,
      voice: "alloy",
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI TTS error: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  
  // Upload to Supabase Storage
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const fileName = `memory_${crypto.randomUUID()}.mp3`;
  await supabase.storage
    .from("memory_audio")
    .upload(fileName, arrayBuffer, {
      contentType: "audio/mpeg",
    });

  const { data: urlData } = supabase.storage
    .from("memory_audio")
    .getPublicUrl(fileName);

  return new Response(
    JSON.stringify({
      success: true,
      audio_url: urlData.publicUrl,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}


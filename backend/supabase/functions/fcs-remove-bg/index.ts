import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const authHeader = req.headers.get("Authorization");

  if (authHeader?.startsWith("Bearer ") && supabaseUrl && supabaseAnonKey) {
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { error } = await userClient.auth.getUser();
    if (error) {
      return Response.json({ error: "Invalid session" }, { status: 401, headers: corsHeaders });
    }
  }

  const removeBgApiKey = Deno.env.get("REMOVE_BG_API_KEY") ?? "";
  const customBgEndpoint = Deno.env.get("BG_REMOVAL_ENDPOINT") ?? "";

  if (!removeBgApiKey && !customBgEndpoint) {
    return Response.json(
      {
        mode: "client_onnx",
        configuredExternalService: false,
        message: "External server background-removal API not configured; client ONNX segmentation should be used.",
      },
      { status: 200, headers: corsHeaders }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("image_file");
    if (!(file instanceof File)) {
      return Response.json({ error: "image_file is required" }, { status: 400, headers: corsHeaders });
    }

    if (file.size > 10 * 1024 * 1024) {
      return Response.json({ error: "File exceeds 10MB limit" }, { status: 413, headers: corsHeaders });
    }

    const forwardData = new FormData();
    forwardData.append("image_file", file);
    if (removeBgApiKey) {
      forwardData.append("size", "auto");
    }

    const targetUrl = customBgEndpoint || "https://api.remove.bg/v1.0/removebg";
    const headers: Record<string, string> = {};
    if (removeBgApiKey) headers["X-Api-Key"] = removeBgApiKey;

    const resp = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: forwardData,
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return Response.json(
        { error: "UPSTREAM_BG_REMOVAL_ERROR", detail: errText.slice(0, 200) },
        { status: 502, headers: corsHeaders }
      );
    }

    const bytes = await resp.arrayBuffer();
    return new Response(bytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "image/png",
      },
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to process image" },
      { status: 500, headers: corsHeaders }
    );
  }
});

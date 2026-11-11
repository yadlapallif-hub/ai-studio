import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !supabaseAnonKey) {
    return Response.json({ error: "Backend not configured" }, { status: 500, headers: corsHeaders });
  }

  let code = "";
  if (req.method === "GET") {
    const url = new URL(req.url);
    code = url.searchParams.get("code") ?? "";
  } else if (req.method === "POST") {
    try {
      const body = await req.json();
      code = String(body?.code ?? "");
    } catch {
      return Response.json({ error: "Invalid request JSON" }, { status: 400, headers: corsHeaders });
    }
  } else {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  const cleanCode = code.trim();
  if (!cleanCode) {
    return Response.json({ error: "Certificate code is required" }, { status: 400, headers: corsHeaders });
  }

  const client = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await client.rpc("fcs_lookup_certificate_verification", { p_code: cleanCode });

  if (error) {
    return Response.json({ error: "Verification lookup failed" }, { status: 500, headers: corsHeaders });
  }

  return Response.json(data ?? { found: false }, { status: 200, headers: corsHeaders });
});

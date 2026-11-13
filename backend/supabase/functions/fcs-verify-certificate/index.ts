const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function supabaseHeaders(key: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "apikey": key,
  };
  if (key.startsWith("eyJ")) {
    headers["Authorization"] = `Bearer ${key}`;
  }
  return headers;
}

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

  const rpcResp = await fetch(`${supabaseUrl}/rest/v1/rpc/fcs_lookup_certificate_verification`, {
    method: "POST",
    headers: supabaseHeaders(supabaseAnonKey),
    body: JSON.stringify({ p_code: cleanCode }),
  });

  if (!rpcResp.ok) {
    return Response.json({ error: "Verification lookup failed" }, { status: 500, headers: corsHeaders });
  }

  const data = await rpcResp.json().catch(() => null);
  return Response.json(data ?? { found: false }, { status: 200, headers: corsHeaders });
});

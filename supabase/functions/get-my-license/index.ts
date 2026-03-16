import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Supabase env not configured" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  const jwt = authHeader?.replace(/^Bearer\s+/i, "");
  if (!jwt) {
    return json({ error: "Missing auth token" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData.user) {
    return json({ error: "Invalid user token" }, 401);
  }

  const email = userData.user.email?.trim();
  if (!email) {
    return json({ error: "User email is missing" }, 400);
  }

  let requestedPlan: "monthly" | "yearly" | null = null;
  try {
    const payload = await req.json();
    if (payload?.plan === "monthly" || payload?.plan === "yearly") {
      requestedPlan = payload.plan;
    }
  } catch {
    requestedPlan = null;
  }

  const baseQuery = () =>
    admin
      .from("licenses")
      .select("license_key,plan,status,created_at")
      .eq("email", email)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1);

  let licenseQuery = baseQuery();
  if (requestedPlan) {
    licenseQuery = licenseQuery.eq("plan", requestedPlan);
  }

  let { data: rows, error } = await licenseQuery;

  if ((!rows || rows.length === 0) && requestedPlan) {
    const fallback = await baseQuery();
    rows = fallback.data;
    error = fallback.error;
  }

  if (error) {
    return json({ error: "Failed to query license", details: error.message }, 500);
  }

  const latest = rows?.[0];
  if (!latest?.license_key) {
    return json({ error: "License not ready" }, 404);
  }

  return json({
    licenseKey: latest.license_key,
    plan: latest.plan,
    status: latest.status,
    createdAt: latest.created_at,
  });
});

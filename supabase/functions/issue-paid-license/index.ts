import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

type PlanType = "monthly" | "yearly";

type PaymentEntity = {
  id?: string;
  status?: string;
  order_id?: string;
  subscription_id?: string;
};

type SubscriptionEntity = {
  id?: string;
  status?: string;
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

const createLicenseKey = () => {
  const a = crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  const b = crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  const c = crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  return `HINT-${a}-${b}-${c}`;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
  const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

  if (!supabaseUrl || !serviceRoleKey || !razorpayKeyId || !razorpayKeySecret) {
    return json({ error: "Server config missing" }, 500);
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
    return json({ error: "User email missing" }, 400);
  }

  let payload: {
    plan?: PlanType;
    paymentId?: string | null;
    orderId?: string | null;
    subscriptionId?: string | null;
    signature?: string | null;
  };

  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON payload" }, 400);
  }

  const plan = payload.plan;
  if (plan !== "monthly" && plan !== "yearly") {
    return json({ error: "Invalid plan" }, 400);
  }

  const paymentId = payload.paymentId?.trim() || "";
  const orderId = payload.orderId?.trim() || "";
  const subscriptionId = payload.subscriptionId?.trim() || "";

  const basicAuth = `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`;

  if (paymentId) {
    const paymentRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      method: "GET",
      headers: {
        Authorization: basicAuth,
      },
    });

    const paymentBody = await paymentRes.json() as PaymentEntity;
    if (!paymentRes.ok) {
      return json({ error: "Payment verification failed", details: paymentBody }, 400);
    }

    if (paymentBody.status !== "captured" && paymentBody.status !== "authorized") {
      return json({ error: "Payment not captured", details: paymentBody.status ?? null }, 400);
    }

    if (orderId && paymentBody.order_id && paymentBody.order_id !== orderId) {
      return json({ error: "Order mismatch" }, 400);
    }

    if (subscriptionId && paymentBody.subscription_id && paymentBody.subscription_id !== subscriptionId) {
      return json({ error: "Subscription mismatch" }, 400);
    }
  } else if (subscriptionId) {
    const subscriptionRes = await fetch(`https://api.razorpay.com/v1/subscriptions/${subscriptionId}`, {
      method: "GET",
      headers: {
        Authorization: basicAuth,
      },
    });

    const subscriptionBody = await subscriptionRes.json() as SubscriptionEntity;
    if (!subscriptionRes.ok) {
      return json({ error: "Subscription verification failed", details: subscriptionBody }, 400);
    }

    const validStatuses = new Set(["active", "authenticated", "created"]);
    if (!subscriptionBody.status || !validStatuses.has(subscriptionBody.status)) {
      return json({ error: "Subscription is not active", details: subscriptionBody.status ?? null }, 400);
    }
  } else {
    return json({ error: "Missing payment verification fields" }, 400);
  }

  const { data: existingRows, error: existingError } = await admin
    .from("licenses")
    .select("license_key,created_at")
    .eq("email", email)
    .eq("plan", plan)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  if (existingError) {
    return json({ error: "Failed to check existing license", details: existingError.message }, 500);
  }

  const existingLicense = existingRows?.[0]?.license_key;
  if (existingLicense) {
    return json({
      licenseKey: existingLicense,
      plan,
      reused: true,
    });
  }

  const licenseKey = createLicenseKey();

  const { error: insertError } = await admin.from("licenses").insert({
    email,
    license_key: licenseKey,
    plan,
    status: "active",
    created_at: new Date().toISOString(),
  });

  if (insertError) {
    return json({ error: "Failed to create license", details: insertError.message }, 500);
  }

  return json({
    licenseKey,
    plan,
    reused: false,
  });
});

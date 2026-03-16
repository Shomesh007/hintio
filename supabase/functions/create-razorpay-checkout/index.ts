import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

type PlanType = "monthly" | "yearly";

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

  let plan: PlanType;
  try {
    const payload = await req.json();
    plan = payload?.plan;
  } catch {
    return json({ error: "Invalid JSON payload" }, 400);
  }

  if (plan !== "monthly" && plan !== "yearly") {
    return json({ error: "Invalid plan" }, 400);
  }

  const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
  const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  const monthlyPlanId = Deno.env.get("RAZORPAY_MONTHLY_PLAN_ID");
  const monthlyAmount = Number(Deno.env.get("RAZORPAY_MONTHLY_AMOUNT_PAISE") ?? "205000");
  const yearlyAmount = Number(
    Deno.env.get("RAZORPAY_YEARLY_AMOUNT_PAISE")
    ?? Deno.env.get("RAZORPAY_LIFETIME_AMOUNT_PAISE")
    ?? "9900",
  );
  const currency = Deno.env.get("RAZORPAY_CURRENCY") ?? "INR";

  if (!razorpayKeyId || !razorpayKeySecret) {
    return json({ error: "Razorpay credentials not configured" }, 500);
  }

  const basicAuth = `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`;
  const email = userData.user.email ?? "";
  const userId = userData.user.id;
  const userNameFromMetadata =
    (userData.user.user_metadata?.full_name as string | undefined)
    ?? (userData.user.user_metadata?.name as string | undefined)
    ?? "";
  const fallbackName = email ? email.split("@")[0] : "";
  const prefillName = (userNameFromMetadata || fallbackName || "").trim();
  const prefillContact = userData.user.phone?.trim() || undefined;

  const checkoutPrefill = {
    email,
    ...(prefillName ? { name: prefillName } : {}),
    ...(prefillContact ? { contact: prefillContact } : {}),
  };

  try {
    if (plan === "monthly" && monthlyPlanId) {
      const subscriptionRes = await fetch("https://api.razorpay.com/v1/subscriptions", {
        method: "POST",
        headers: {
          Authorization: basicAuth,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan_id: monthlyPlanId,
          customer_notify: 1,
          total_count: 120,
          quantity: 1,
          notes: {
            email,
            user_id: userId,
            plan_type: "monthly",
            source: "hintio_website",
          },
        }),
      });

      const subscriptionBody = await subscriptionRes.json();
      if (!subscriptionRes.ok || !subscriptionBody?.id) {
        return json({ error: "Failed to create subscription", details: subscriptionBody }, 500);
      }

      return json({
        mode: "subscription",
        keyId: razorpayKeyId,
        subscriptionId: subscriptionBody.id,
        name: "hintio",
        description: "hintio Pro Monthly",
        prefill: checkoutPrefill,
      });
    }

    const amount = plan === "monthly" ? monthlyAmount : yearlyAmount;

    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: basicAuth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency,
        receipt: `hintio_${plan}_${Date.now()}`,
        notes: {
          email,
          user_id: userId,
          plan_type: plan,
          source: "hintio_website",
        },
      }),
    });

    const orderBody = await orderRes.json();
    if (!orderRes.ok || !orderBody?.id) {
      return json({ error: "Failed to create order", details: orderBody }, 500);
    }

    return json({
      mode: "order",
      keyId: razorpayKeyId,
      orderId: orderBody.id,
      amount,
      currency,
      name: "hintio",
      description: plan === "monthly" ? "hintio Pro Monthly" : "hintio Pro Yearly",
      prefill: checkoutPrefill,
    });
  } catch (error) {
    return json({ error: "Unexpected checkout error", details: String(error) }, 500);
  }
});

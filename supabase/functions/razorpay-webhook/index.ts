import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

type RazorpayWebhookEvent = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        email?: string;
      };
    };
    subscription?: {
      entity?: {
        notes?: {
          email?: string;
        };
      };
    };
  };
};

const hex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const timingSafeEqual = (left: string, right: string): boolean => {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i++) {
    mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return mismatch === 0;
};

const createLicenseKey = () => {
  const a = crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  const b = crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  const c = crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  return `HINT-${a}-${b}-${c}`;
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const signature = req.headers.get("x-razorpay-signature");
  const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");

  if (!signature || !secret) {
    return new Response("Missing signature or webhook secret", { status: 400 });
  }

  const body = await req.text();

  const hmacKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signed = await crypto.subtle.sign("HMAC", hmacKey, new TextEncoder().encode(body));
  const expectedSignature = hex(new Uint8Array(signed));

  if (!timingSafeEqual(expectedSignature, signature)) {
    return new Response("Invalid signature", { status: 400 });
  }

  let event: RazorpayWebhookEvent;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }

  const allowedEvents = new Set(["subscription.activated", "payment.captured"]);
  if (!event.event || !allowedEvents.has(event.event)) {
    return new Response("Ignored", { status: 200 });
  }

  const email = event.payload?.payment?.entity?.email
    ?? event.payload?.subscription?.entity?.notes?.email;

  if (!email) {
    return new Response("Missing customer email", { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response("Supabase env is not configured", { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const licenseKey = createLicenseKey();

  const { error } = await supabase.from("licenses").insert({
    email,
    license_key: licenseKey,
    plan: "pro",
    status: "active",
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Failed to save license", error);
    return new Response("Failed to save license", { status: 500 });
  }

  return new Response("OK", { status: 200 });
});

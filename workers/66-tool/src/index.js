import { sendFulfillmentEmail } from "./email.js";
import { getReleaseObject } from "./r2.js";
import {
  buyerEmail,
  isCheckoutSessionId,
  retrieveCheckoutSession,
  sessionIsPaid,
  verifyStripeWebhook,
} from "./stripe.js";

function htmlPage(title, body) {
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center;
        background: #07090d; color: #e6edf3; font: 16px/1.5 "IBM Plex Mono", monospace; }
      p { max-width: 42ch; }
      a { color: #4ade97; }
    </style>
  </head>
  <body><p>${body}</p></body>
</html>`,
    {
      status: title === "Payment not found" ? 404 : 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    },
  );
}

function paymentNotFound() {
  return htmlPage("Payment not found", "Payment not found");
}

async function handleDownload(request, env) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id") || "";
  if (!isCheckoutSessionId(sessionId) || !env.STRIPE_SECRET_KEY) {
    return paymentNotFound();
  }

  let session;
  try {
    session = await retrieveCheckoutSession(sessionId, env.STRIPE_SECRET_KEY);
  } catch {
    return htmlPage("Payment not found", "Payment not found");
  }
  if (!sessionIsPaid(session)) {
    return paymentNotFound();
  }

  const objectKey = env.R2_OBJECT || env.DOWNLOAD_OBJECT || "66-Tool-v1.0.0.zip";
  let object;
  try {
    object = await getReleaseObject(env, objectKey);
  } catch {
    return htmlPage("File not available", "Paid, but the file is not in storage yet.");
  }
  if (!object) {
    return htmlPage("File not available", "Paid, but the file is not in storage yet.");
  }

  const filename = env.DOWNLOAD_FILENAME || objectKey || "66-Tool-v1.0.0.zip";
  const headers = new Headers();
  headers.set("Content-Type", "application/zip");
  headers.set("Content-Disposition", `attachment; filename="${filename}"`);
  headers.set("Cache-Control", "no-store");
  if (object.size != null) headers.set("Content-Length", String(object.size));
  return new Response(object.body, { status: 200, headers });
}

async function handleWebhook(request, env) {
  if (!env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_SECRET_KEY) {
    return new Response("webhook unconfigured", { status: 500 });
  }
  const rawBody = await request.text();
  const ok = await verifyStripeWebhook(
    rawBody,
    request.headers.get("Stripe-Signature") || "",
    env.STRIPE_WEBHOOK_SECRET,
  );
  if (!ok) {
    return new Response("invalid signature", { status: 400 });
  }

  const event = JSON.parse(rawBody);
  if (event.type !== "checkout.session.completed") {
    return new Response("ignored", { status: 200 });
  }

  const session = event.data?.object;
  const sessionId = session?.id || "";
  if (!isCheckoutSessionId(sessionId)) {
    return new Response("bad session", { status: 400 });
  }

  const live = await retrieveCheckoutSession(sessionId, env.STRIPE_SECRET_KEY);
  if (!sessionIsPaid(live)) {
    return new Response("not paid", { status: 400 });
  }

  await sendFulfillmentEmail(env, buyerEmail(live), sessionId);
  return new Response("ok", { status: 200 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "GET" && path === "/66-tool/success") {
      return handleDownload(request, env);
    }
    if (request.method === "POST" && path === "/api/stripe/webhook") {
      return handleWebhook(request, env);
    }
    return new Response("not found", { status: 404 });
  },
};

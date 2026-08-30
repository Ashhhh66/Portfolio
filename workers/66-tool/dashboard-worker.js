// Paste this over the Hello World script on Worker 66-tool-download.
// Secrets stay in Settings → Variables and secrets. Do not hardcode keys.

function timingSafeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

function parseStripeSignature(header) {
  const timestamp = [];
  const signatures = [];
  for (const part of String(header || "").split(",")) {
    const [key, ...rest] = part.trim().split("=");
    const value = rest.join("=");
    if (key === "t") timestamp.push(value);
    if (key === "v1") signatures.push(value);
  }
  return { timestamp: timestamp[0] || "", signatures };
}

async function verifyStripeWebhook(rawBody, signatureHeader, secret, nowMs = Date.now()) {
  if (!rawBody || !signatureHeader || !secret) return false;
  const { timestamp, signatures } = parseStripeSignature(signatureHeader);
  if (!timestamp || !signatures.length) return false;
  const age = Math.abs(nowMs / 1000 - Number(timestamp));
  if (!Number.isFinite(Number(timestamp)) || age > 300) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`),
  );
  const expected = [...new Uint8Array(signed)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return signatures.some((signature) => timingSafeEqual(signature, expected));
}

function isCheckoutSessionId(value) {
  return /^cs_(live|test)_[A-Za-z0-9]+$/.test(String(value || ""));
}

async function retrieveCheckoutSession(sessionId, secretKey) {
  const response = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    { headers: { Authorization: `Bearer ${secretKey}` } },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`stripe_session_${response.status}`);
  return response.json();
}

function sessionIsPaid(session) {
  return Boolean(session && session.payment_status === "paid");
}

function buyerEmail(session) {
  return session?.customer_details?.email || session?.customer_email || "";
}

function encodeRfc3986(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => {
    return `%${char.charCodeAt(0).toString(16).toUpperCase()}`;
  });
}

async function sha256Hex(data) {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmac(key, data) {
  const rawKey = typeof key === "string" ? new TextEncoder().encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

function resolveS3Endpoint(env) {
  const explicit = String(env.R2_S3_ENDPOINT || "").replace(/\/$/, "");
  if (explicit) return explicit;
  const accountId = env.R2_ACCOUNT_ID || "";
  if (accountId) return `https://${accountId}.r2.cloudflarestorage.com`;
  return "";
}

async function getObjectViaS3(env, objectKey) {
  const accessKey = env.R2_ACCESS_KEY_ID;
  const secretKey = env.R2_SECRET_ACCESS_KEY;
  const bucket = env.R2_BUCKET || "66-tool-releases";
  const endpoint = resolveS3Endpoint(env);
  const region = env.R2_REGION || "auto";
  const host = new URL(endpoint).host;
  const canonicalUri = `/${encodeRfc3986(bucket)}/${objectKey.split("/").map(encodeRfc3986).join("/")}`;
  const amzDate = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = await sha256Hex("");
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const canonicalRequest = ["GET", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, await sha256Hex(canonicalRequest)].join("\n");
  const dateKey = await hmac(`AWS4${secretKey}`, dateStamp);
  const regionKey = await hmac(dateKey, region);
  const serviceKey = await hmac(regionKey, "s3");
  const signingKey = await hmac(serviceKey, "aws4_request");
  const signatureBuf = await hmac(signingKey, stringToSign);
  const signature = [...new Uint8Array(signatureBuf)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const response = await fetch(`${endpoint}${canonicalUri}`, {
    method: "GET",
    headers: {
      host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`r2_get_${response.status}`);
  return { body: response.body, size: Number(response.headers.get("content-length") || "") || null };
}

function downloadLink(origin, sessionId) {
  return `${origin}/66-tool/success?session_id=${encodeURIComponent(sessionId)}`;
}

function fulfillmentText(link) {
  return [
    "Ashh66 // 66-Tool",
    "",
    "Payment received. Download the latest 66-Tool here:",
    link,
    "",
    "This link always gets the latest 66-Tool (free updates).",
    "Personal license: one person, your machines.",
    "SmartScreen: More info → Run anyway.",
    "",
    "If the checkout tab closed, use the link above.",
  ].join("\n");
}

async function sendFulfillmentEmail(env, to, sessionId) {
  if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");
  if (!to) throw new Error("buyer email missing");
  const link = downloadLink(env.SITE_ORIGIN || "https://ashh66.dev", sessionId);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL || "Ashh66 <66-tool@ashh66.dev>",
      to: [to],
      reply_to: env.REPLY_TO || "Ashh66.dev@gmail.com",
      subject: "66-Tool download",
      text: fulfillmentText(link),
    }),
  });
  if (!response.ok) throw new Error(`resend_${response.status}`);
}

function htmlPage(title, body) {
  return new Response(
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${title}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#07090d;color:#e6edf3;font:16px/1.5 monospace}p{max-width:42ch}a{color:#4ade97}</style></head><body><p>${body}</p></body></html>`,
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
  const sessionId = new URL(request.url).searchParams.get("session_id") || "";
  if (!isCheckoutSessionId(sessionId) || !env.STRIPE_SECRET_KEY) return paymentNotFound();
  let session;
  try {
    session = await retrieveCheckoutSession(sessionId, env.STRIPE_SECRET_KEY);
  } catch {
    return paymentNotFound();
  }
  if (!sessionIsPaid(session)) return paymentNotFound();
  const objectKey = env.R2_OBJECT || "66-Tool-v1.0.0.zip";
  let object;
  try {
    object = await getObjectViaS3(env, objectKey);
  } catch {
    return htmlPage("File not available", "Paid, but the file is not in storage yet.");
  }
  if (!object) return htmlPage("File not available", "Paid, but the file is not in storage yet.");
  const filename = env.DOWNLOAD_FILENAME || objectKey;
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
  if (!ok) return new Response("invalid signature", { status: 400 });
  const event = JSON.parse(rawBody);
  if (event.type !== "checkout.session.completed") return new Response("ignored", { status: 200 });
  const sessionId = event.data?.object?.id || "";
  if (!isCheckoutSessionId(sessionId)) return new Response("bad session", { status: 400 });
  const live = await retrieveCheckoutSession(sessionId, env.STRIPE_SECRET_KEY);
  if (!sessionIsPaid(live)) return new Response("not paid", { status: 400 });
  await sendFulfillmentEmail(env, buyerEmail(live), sessionId);
  return new Response("ok", { status: 200 });
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
    if (request.method === "GET" && path === "/66-tool/success") return handleDownload(request, env);
    if (request.method === "POST" && path === "/api/stripe/webhook") return handleWebhook(request, env);
    return new Response("not found", { status: 404 });
  },
};

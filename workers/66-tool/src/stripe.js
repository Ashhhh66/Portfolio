export function timingSafeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export function parseStripeSignature(header) {
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

export async function verifyStripeWebhook(rawBody, signatureHeader, secret, nowMs = Date.now()) {
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

export function isCheckoutSessionId(value) {
  return /^cs_(live|test)_[A-Za-z0-9]+$/.test(String(value || ""));
}

export async function retrieveCheckoutSession(sessionId, secretKey) {
  const response = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    { headers: { Authorization: `Bearer ${secretKey}` } },
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`stripe_session_${response.status}`);
  }
  return response.json();
}

export function sessionIsPaid(session) {
  return Boolean(session && session.payment_status === "paid");
}

export function buyerEmail(session) {
  return session?.customer_details?.email || session?.customer_email || "";
}

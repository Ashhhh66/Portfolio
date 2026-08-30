export function downloadLink(origin, sessionId) {
  return `${origin}/66-tool/success?session_id=${encodeURIComponent(sessionId)}`;
}

export function fulfillmentText(link) {
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

export async function sendFulfillmentEmail(env, to, sessionId) {
  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY missing");
  }
  if (!to) {
    throw new Error("buyer email missing");
  }
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
      subject: "66-Tool download",
      text: fulfillmentText(link),
    }),
  });
  if (!response.ok) {
    throw new Error(`resend_${response.status}`);
  }
}

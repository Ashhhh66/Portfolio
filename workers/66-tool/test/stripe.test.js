import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import {
  isCheckoutSessionId,
  parseStripeSignature,
  sessionIsPaid,
  timingSafeEqual,
  verifyStripeWebhook,
} from "../src/stripe.js";

test("accepts checkout session ids", () => {
  assert.equal(isCheckoutSessionId("cs_live_abc123"), true);
  assert.equal(isCheckoutSessionId("cs_test_abc123"), true);
  assert.equal(isCheckoutSessionId("not-a-session"), false);
});

test("paid only when Stripe says paid", () => {
  assert.equal(sessionIsPaid({ payment_status: "paid" }), true);
  assert.equal(sessionIsPaid({ payment_status: "unpaid" }), false);
  assert.equal(sessionIsPaid(null), false);
});

test("timing-safe compare", () => {
  assert.equal(timingSafeEqual("abc", "abc"), true);
  assert.equal(timingSafeEqual("abc", "abd"), false);
});

test("parses Stripe-Signature", () => {
  const parsed = parseStripeSignature("t=1710000000,v1=dead,v1=beef");
  assert.equal(parsed.timestamp, "1710000000");
  assert.deepEqual(parsed.signatures, ["dead", "beef"]);
});

test("verifies a valid webhook signature", async () => {
  const secret = "whsec_test";
  const body = '{"type":"checkout.session.completed"}';
  const timestamp = "1710000000";
  const digest = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  const ok = await verifyStripeWebhook(
    body,
    `t=${timestamp},v1=${digest}`,
    secret,
    Number(timestamp) * 1000,
  );
  assert.equal(ok, true);
});

test("rejects a bad webhook signature", async () => {
  const ok = await verifyStripeWebhook(
    "{}",
    "t=1710000000,v1=nope",
    "whsec_test",
    1710000000 * 1000,
  );
  assert.equal(ok, false);
});

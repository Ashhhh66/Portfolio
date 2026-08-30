# 66-Tool fulfillment worker

Server routes for paid 66-Tool downloads. This is not public static HTML and is not shipped with GitHub Pages.

## Live URLs (after deploy + DNS routes)

- Download: `https://ashh66.dev/66-tool/success?session_id={CHECKOUT_SESSION_ID}`
- **Stripe webhook (paste this into Stripe):** `https://ashh66.dev/api/stripe/webhook`

## Stripe Dashboard

1. Payment Link → After payment → redirect to  
   `https://ashh66.dev/66-tool/success?session_id={CHECKOUT_SESSION_ID}`
2. Developers → Webhooks → Add endpoint  
   URL: `https://ashh66.dev/api/stripe/webhook`  
   Event: `checkout.session.completed`  
   Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

## Cloudflare

1. Private R2 bucket `66-tool-releases`, object `66-Tool-v1.0.0.zip`, public access off.
   For 1.0.1 overwrite that object or change `R2_OBJECT`.
2. In the host env UI only (never git / never frontend):

```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
RESEND_API_KEY
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_ACCOUNT_ID
R2_S3_ENDPOINT
```

3. From this folder:

```bash
npm install
npx wrangler login
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
npx wrangler secret put R2_ACCOUNT_ID
npx wrangler secret put R2_S3_ENDPOINT
npx wrangler deploy
```

4. Confirm Worker routes on `ashh66.dev` for `/66-tool/success*` and `/api/stripe/webhook*`.
5. If the apex is still grey-cloud to GitHub Pages only, those paths 404 until the Worker route is attached to the zone.

Resend: verify a from-address. Gmail-as-from often fails; a Resend domain on ashh66.dev is more reliable. Override with wrangler var `FROM_EMAIL` if needed.

Never put Stripe, Resend, or R2 keys in git or frontend JS. Rotate any key that appeared in chat.

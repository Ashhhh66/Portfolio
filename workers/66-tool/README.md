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

1. Create R2 bucket `ashh66-66-tool`.
2. Upload the private object `66-Tool-win.zip` (not a public bucket).
3. From this folder:

```bash
npm install
npx wrangler login
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put RESEND_API_KEY
npx wrangler deploy
```

4. Confirm Worker routes on `ashh66.dev` for `/66-tool/success*` and `/api/stripe/webhook*`.
5. If the apex is still grey-cloud to GitHub Pages only, those paths 404 until the Worker route is attached to the zone.

Resend: verify a from-address. Gmail-as-from often fails; a Resend domain on ashh66.dev is more reliable. Override with wrangler var `FROM_EMAIL` if needed.

Never put `sk_live_`, `whsec_`, or Resend keys in git or frontend JS.

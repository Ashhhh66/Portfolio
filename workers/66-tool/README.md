# 66-Tool fulfillment worker

Worker name on Cloudflare: **66-tool-download**

This session cannot log into your Cloudflare account, so Hello World must be replaced in the dashboard (or `wrangler deploy` on a machine already logged into that account).

## Overlay Hello World

1. Cloudflare → Workers & Pages → **66-tool-download** → **Edit code**
2. Delete the Hello World file
3. Paste `dashboard-worker.js` from this folder
4. **Save and deploy**

Secrets stay in **Settings → Variables and secrets**. Do not put keys in the script.

## Routes (only after ashh66.dev is on THIS Cloudflare account)

1. Workers & Pages → **66-tool-download** → **Settings** → **Domains & Routes** → **Add** → **Route**
2. Add exactly:
   - `ashh66.dev/66-tool/success*`
   - `ashh66.dev/api/stripe/webhook*`
3. Zone: `ashh66.dev`

If **ashh66.dev is not a zone on this account**:

1. Cloudflare home → **Add a domain** → `ashh66.dev`  
   or **Workers & Pages → 66-tool-download → Settings → Domains & Routes → Custom domain** and add `ashh66.dev` if offered.
2. If you add the zone, point nameservers as Cloudflare shows, then in **DNS**:
   - Keep the four GitHub Pages **A** records for `@` (`185.199.108.153`–`185.199.111.153`)
   - Turn **Proxy status** to **Proxied** (orange cloud) for `@`
   - `www` CNAME to `ashhhh66.github.io` — also **Proxied**
3. Then add the two Worker routes above.

Grey cloud (DNS only) sends browsers straight to GitHub. The Worker never sees `/66-tool/success` until orange cloud is on.

## Stripe (do this after routes exist and a test hits the Worker)

**Webhook**

- URL: `https://ashh66.dev/api/stripe/webhook`
- Event: `checkout.session.completed`
- Then paste the signing secret into Worker secret `STRIPE_WEBHOOK_SECRET`

**Payment Link after-payment redirect**

`https://ashh66.dev/66-tool/success?session_id={CHECKOUT_SESSION_ID}`

Live Buy button stays:

`https://buy.stripe.com/fZu3cw2eh6CVgtu74scAo00`

A **test** `STRIPE_SECRET_KEY` cannot retrieve a **live** Checkout Session. Live buys will show Payment not found until you switch that secret to live.

## Resend

`ashh66.dev` must be **Verified**, not Pending, before `66-tool@ashh66.dev` will send. From: `Ashh66 <66-tool@ashh66.dev>`. Reply-To: `Ashh66.dev@gmail.com`.

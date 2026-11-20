# DOORA — Cloudflare Workers deployment

This repository is configured for the OpenNext Cloudflare adapter.

## Cloudflare setup

1. Sign in to https://dash.cloudflare.com/ and open **Workers & Pages**.
2. Open the existing production Worker named **doora** and connect it to GitHub repository `arminemaritasyon-sys/Doora` using **Connect to Git**. Do not create a second Worker with a different name.
3. Select branch `main`.
4. Set the build/deploy command to `npm install && npm run deploy` and the root directory to `/`.
5. Add the environment variables below in the Worker settings. Add secrets as encrypted secrets, not plain text.
6. Deploy. Keep the existing `doora.arminemaritasyon.workers.dev` route and confirm the deployment updates the `doora` script.

## Required environment variables

Copy the values from the existing production environment; do not generate replacements unless the relevant service is also reconfigured.

- `DATABASE_URL` — Neon pooled connection string.
- `NEON_AUTH_BASE_URL` — Neon Auth base URL.
- `NEON_AUTH_COOKIE_SECRET` — existing cookie signing secret.
- `RESEND_API_KEY` — Resend API key (encrypted secret).
- `RESEND_FROM_EMAIL` — verified sender, e.g. `DOORA <bildirim@your-domain.com>`.
- `DOORA_ADMIN_EMAIL` — administrator email.

Set variables needed at build time in the build environment too, if Cloudflare prompts for separate build variables and runtime variables.

## After first deployment

1. Add the new `workers.dev` origin to Neon Auth's trusted/allowed origins.
2. Test sign-in, sign-out, protected routes, listing creation, offers, wallet test top-up, escrow acceptance/completion, and email delivery.
3. Only after these pass, point the custom domain to Cloudflare. Keep the Vercel deployment available as rollback until then.

## Notes

- The existing Neon database is unchanged; no schema migration is performed by this hosting setup. Apply reviewed SQL migrations separately after testing them on a Neon branch.
- The wallet remains in test mode. This deployment does not enable real-money payments or bank payouts.
- This repository currently has no package lockfile, so the build command uses `npm install`, not `npm ci`.

# DOORA

DOORA is a mobile-first local task marketplace: people publish small everyday jobs with a clear budget and schedule, nearby people discover them and send offers, and the task owner chooses who to work with.

## Stack
- Next.js App Router + React + TypeScript
- Supabase Auth, Postgres, Storage and Row Level Security (optional until project credentials are configured)
- Zod for client-side input validation
- Lucide icons and Sonner notifications

## Local development
```bash
npm install
cp .env.example .env.local
npm run dev
```

## Supabase setup
1. Create a Supabase project.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and server-only `SUPABASE_SERVICE_ROLE_KEY` in Vercel and `.env.local`.
3. Apply `supabase/migrations/202611200001_doora_core.sql` using the Supabase SQL editor or Supabase CLI.
4. Apply the email event migration `supabase/migrations/202611200002_email_events.sql`. Configure email OTP templates and allowed redirect URLs for the deployed DOORA domain.
5. Verify a sending domain in Resend, then set `RESEND_API_KEY` and `EMAIL_FROM` in Vercel. Keep all private keys server-only.
6. Redeploy after adding environment variables.

Never put a Supabase service-role key in client code or any `NEXT_PUBLIC_*` variable.

## Current product behavior
- When Supabase credentials are present, the app can send email OTP sign-in requests, load the public task feed, create tasks, upload task images, save favorites, and submit offers under database RLS policies. Transactional email events cover welcome, task-created confirmation, and new offers; acceptance/rejection templates are prepared for the offer decision flow.
- Without Supabase credentials, the app runs in a clearly identified local demo mode. Demo tasks and interactions are stored in the current browser's local storage; they are not shared with other users and are not a real marketplace.
- Real-time chat delivery, identity/KYC checks, payment collection, escrow, refunds, dispute operations, automated moderation, and admin operations are not live integrations yet.

## Product and safety boundaries
DOORA must not describe payments as protected or escrowed until a licensed payment provider, compliant fund-flow design, webhook verification, refund/dispute operations, and legal review are implemented. Do not ask users to transfer money to another user's personal IBAN. Add rate limits, abuse reporting workflows, moderation review, age restrictions, privacy/terms pages, and incident response before public launch.

## Useful open-source references
- Supabase Next.js starter: https://github.com/supabase/supabase/tree/master/examples/auth/nextjs-full
- Supabase SSR: https://github.com/supabase/ssr
- shadcn/ui: https://github.com/shadcn-ui/ui
- Vercel React best practices: https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices
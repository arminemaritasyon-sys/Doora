# DOORA

Mobile-first local task marketplace built with Next.js 15, React 19 and Neon Postgres.

## Infrastructure
- Neon Postgres via Vercel integration (`DATABASE_URL`)
- Neon Managed Auth / Better Auth (`NEON_AUTH_BASE_URL`)
- Resend transactional email (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`)
- Motion animations, Lucide icons and Sonner notifications

## Required environment
Vercel Neon integration supplies the database and auth URLs. Add `RESEND_API_KEY` and a verified sender address as encrypted Vercel environment variables for production, preview and development.

## Database
Apply `db/migrations/0001_doora_core.sql` to the production Neon main branch after reviewing the migration preview.

## Local development
```bash
npm install
npm run dev
```

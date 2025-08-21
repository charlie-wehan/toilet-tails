# Toilet Tails — Build Log & Runbook
_Last updated: 2025-08-21_

## Stack (current)
- Next.js (App Router) + TypeScript + Tailwind
- Supabase Storage (private `uploads` bucket) via server SDK + **signed URLs**
- Prisma + SQLite (dev) — will swap to Supabase Postgres in prod
- Render pipeline: **stub** (job creation + status polling)
- Hosting: Vercel (planned)

## Key paths
- `src/app/api/storage/sign/route.ts` — mints signed upload URL (key + token)
- `src/app/api/upload/commit/route.ts` — commits metadata to DB; returns signed previews
- `src/app/api/render/route.ts` — POST create job (stub marks complete)
- `src/app/api/render/[uploadId]/route.ts` — GET latest job (for polling)
- `src/app/api/upload/route.ts` — legacy server-upload (kept for reference)
- `src/components/HomeClient.tsx` — scene → (optional) bathroom → pet upload (direct-to-Supabase) → Generate + polling
- `src/components/UploadBox.tsx`, `src/components/ScenePicker.tsx`
- `src/lib/supabaseServer.ts` (server-only), `src/lib/supabaseClient.ts` (browser)
- `src/lib/storage.ts` — storage adapter (now uses Supabase)
- `prisma/schema.prisma` — `Upload`, `RenderJob`

## Env vars (web/.env.local)
DATABASE_URL="file:./prisma/dev.db"
SUPABASE_URL="https://eqbvbysrnabsnrflxjis.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxYnZieXNybmFic25yZmx4amlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTc0NTcyMiwiZXhwIjoyMDcxMzIxNzIyfQ.f31il5NO_ljBVsrXFHAIJfy9EEF35MLvOthM8X-gsWI" # server-only
SUPABASE_BUCKET="uploads"
NEXT_PUBLIC_SUPABASE_URL="https://eqbvbysrnabsnrflxjis.supabase.co "
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxYnZieXNybmFic25yZmx4amlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3NDU3MjIsImV4cCI6MjA3MTMyMTcyMn0.SjENSpaW8RGg6bnCxXhE8GHu6zKAJJ951BnlqW25agU"

## API contracts
**POST `/api/storage/sign`** → `{ bucket, key, token }` for one-time direct upload.  
**POST `/api/upload/commit`** body: `{ pet:{key,name,type,size}, bg?:{...}, scene }` → creates `Upload`, returns signed URLs + `uploadId`.  
**POST `/api/render`** body: `{ uploadId }` → creates job (stub completes).  
**GET  `/api/render/:uploadId`** → latest job for polling.

## Prisma models (dev)
Upload(id, key, url, name, type, size, scene?, bgKey?, bgUrl?, createdAt)
RenderJob(id, uploadId, status, resultUrl?, error?, createdAt, updatedAt)

## Current user flow
1) Choose scene (required)
2) (Optional) upload bathroom background (direct to Supabase)
3) Upload pet (direct to Supabase)
4) Commit metadata → get `uploadId`
5) Click Generate → job created; UI polls status → shows result (stub)

## Dev commands
cd web
npm run dev
npm run lint
npx prisma migrate dev
npx prisma studio

## Decisions & Next
- ✅ Direct-to-Supabase uploads (scalable); server only commits metadata
- 🔜 Auth.js; link uploads to users
- 🔜 Swap Prisma to Supabase Postgres in Vercel envs
- 🔜 Real render queue (Inngest / Vercel Queues / Upstash) + AI pipeline (mask → IP-Adapter → ControlNet → FLUX inpaint → ESRGAN)
- 🔜 Admin pages, Stripe checkout, moderation & rate limiting

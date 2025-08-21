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
SUPABASE_URL="your-supabase-url"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" # server-only
SUPABASE_BUCKET="uploads"
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

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

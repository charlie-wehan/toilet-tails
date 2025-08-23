# Toilet Tails — Build Log & Runbook
_Last updated: 2025-08-23_

## Stack (current)
- Next.js (App Router) + TypeScript + Tailwind
- Supabase Storage (private `uploads` bucket) via server SDK + **signed URLs**
- Prisma + SQLite (dev) — will swap to Supabase Postgres in prod
- Inngest queue for async render jobs
- AI pipeline: fal.ai (FLUX Pro Kontext image-to-image) primary, Replicate SD img2img fallback; REMBG disabled
- Hosting: Vercel (planned)

## Key paths
- `src/app/api/storage/sign/route.ts` — mints signed upload URL (key + token)
- `src/app/api/upload/commit/route.ts` — commits metadata to DB; returns signed previews
- `src/app/api/render/route.ts` — POST create job, passes user options, enqueues Inngest event
- `src/app/api/render/[uploadId]/route.ts` — GET latest job (for polling)
- `src/app/api/upload/route.ts` — legacy server-upload (kept for reference)
- `src/components/HomeClient.tsx` — scene → (optional) bathroom → pet upload (direct-to-Supabase) → Generate + polling
- `src/components/UploadBox.tsx`, `src/components/ScenePicker.tsx`
- `src/lib/supabaseServer.ts` (server-only), `src/lib/supabaseClient.ts` (browser)
- `src/lib/storage.ts` — storage adapter (now uses Supabase)
- `prisma/schema.prisma` — `Upload`, `RenderJob`
- `src/lib/functions/renderJob.ts` — Inngest function driver
- `src/lib/functions/aiPipeline.ts` — compose via fal.ai/flux-pro/kontext, save to Supabase
- `src/lib/fal.ts` — fal.ai client config (`@fal-ai/client`)
- `src/lib/replicateHttp.ts` — non-streaming Replicate Predictions helper

## Env vars (web/.env)
- DATABASE_URL="file:./prisma/dev.db"
- SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BUCKET="uploads"
- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
- REPLICATE_API_TOKEN
- FAL_KEY
- REMBG_API_KEY (currently unused)

## API contracts
**POST `/api/storage/sign`** → `{ bucket, key, token }` for one-time direct upload.  
**POST `/api/upload/commit`** body: `{ pet:{key,name,type,size}, bg?:{...}, scene }` → creates `Upload`, returns signed URLs + `uploadId`.  
**POST `/api/render`** body: `{ uploadId, options?: { identityStrength?: number, aspectRatio?: string, upscale?: boolean } }` → enqueues job.  
**GET  `/api/render/:uploadId`** → latest job for polling.

## Prisma models (dev)
Upload(id, key, url, name, type, size, scene?, bgKey?, bgUrl?, createdAt)
RenderJob(id, uploadId, status, resultUrl?, error?, aiSteps?, finalKey?, createdAt, updatedAt)

## Current user flow
1) Choose scene (required)
2) (Optional) upload bathroom background (direct to Supabase)
3) Adjust controls: identity strength, aspect ratio, upscale
4) Upload pet (direct to Supabase)
5) Commit metadata → get `uploadId`
6) Click Generate → job created; UI polls status → shows result

## Dev commands
cd web
npm run dev
npm run lint
npx prisma migrate dev
npx prisma studio

## Decisions & Next
- ✅ Direct-to-Supabase uploads; server only commits metadata
- ✅ Inngest queue + fal.ai Kontext img2img primary, Replicate fallback
- ✅ Identity/AR controls
- 🔜 Optional background compositing + inpaint
- 🔜 Swap to Supabase Postgres in Vercel
- 🔜 Auth + rate limits; Stripe checkout
- 🔜 Moderation, admin views, observability

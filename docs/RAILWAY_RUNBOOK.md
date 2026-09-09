# Railway Staging Runbook

## Services

Create one Railway project/environment for staging with these services:

- `web`: this repo, public HTTP domain enabled.
- `worker`: this repo, no public domain.
- `Postgres`: Railway PostgreSQL.
- `Redis`: Railway Redis.
- `uploads`: Railway Storage Bucket.

Use the same branch/source for `web` and `worker`. Keep per-service start commands in Railway service settings because `railway.json` is shared by both services.

Current staging:

- Project: `legal-citer`
- Environment: `staging`
- Web URL: `https://web-staging-66b8.up.railway.app`

## Build, Predeploy, And Start

`railway.json` sets the shared build and migration command:

- Build command: `npm run build`
- Pre-deploy command: `npm run db:deploy`

Set service-specific start commands:

- `web` start command: `npm run start`
- `worker` start command: `npm run worker`

`npm run build` runs `prisma generate && next build`. `npm run db:deploy` loads the app env and invokes `npx prisma migrate deploy`. Do not run `prisma db push` for staging or production.

## Variables

Set these on both `web` and `worker` unless noted otherwise:

```dotenv
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

UPLOAD_STORAGE_BACKEND=s3
S3_BUCKET_NAME=<bucketName from `railway bucket credentials --bucket uploads --json`>
S3_ENDPOINT=<endpoint from `railway bucket credentials --bucket uploads --json`>
S3_REGION=<region from `railway bucket credentials --bucket uploads --json`>
S3_ACCESS_KEY_ID=<accessKeyId from `railway bucket credentials --bucket uploads --json`>
S3_SECRET_ACCESS_KEY=<secretAccessKey from `railway bucket credentials --bucket uploads --json`>
S3_FORCE_PATH_STYLE=0

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

MANIFEST_SIGNING_KEY=<generate-a-strong-random-value>
COURTLISTENER_API_KEY=<set-if-available>
OPENROUTER_API_KEY=
PACER_USERNAME=
PACER_PASSWORD=
PACER_OTP_SECRET=
PACER_QA_MODE=true
```

For `web` only, generate a public Railway domain and configure that URL in Clerk allowed origins/redirects. Configure the Clerk webhook endpoint as:

```text
https://<web-domain>/api/webhooks/clerk
```

## Upload Storage Choice

Staging uses a Railway Storage Bucket, not a Railway Volume, because `web` writes uploads and `worker` reads them from separate services. A volume mounted at `/app/uploads` is acceptable only if the writing and reading processes share the same mounted filesystem, such as a single combined service. Buckets are the better production path for this architecture.

The filesystem fallback still exists for local development and volume experiments:

```dotenv
UPLOAD_STORAGE_BACKEND=filesystem
UPLOADS_DIR=/app/uploads
```

If using the fallback on Railway, mount the volume at `/app/uploads`. Railway volumes are runtime-only, not available during build or predeploy.

## Local Verification Before Deploy

```bash
npm ci
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

Local E2E starts local Postgres/Redis with Docker when they are not already reachable.

## Deployed E2E

Create a Clerk test user and add it to a Clerk organization. Use the organization id as `E2E_CLERK_ORG_ID`. The deployed setup signs in with Clerk testing tokens and sets that organization active; it does not use `E2E_AUTH_BYPASS`.

From your machine or CI, set:

```dotenv
DEPLOYED_BASE_URL=https://<web-domain>
DATABASE_URL=<Railway Postgres DATABASE_PUBLIC_URL for staging tests>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_TESTING_TOKEN=<optional; clerkSetup can create one from CLERK_SECRET_KEY>
E2E_CLERK_USER_EMAIL=<test-user-email>
E2E_CLERK_ORG_ID=org_...
E2E_CLERK_ORG_NAME=Legal Citer E2E
UPLOAD_STORAGE_BACKEND=s3
S3_BUCKET_NAME=<bucket BUCKET value>
S3_ENDPOINT=<bucket ENDPOINT value>
S3_REGION=<bucket REGION value>
S3_ACCESS_KEY_ID=<bucket ACCESS_KEY_ID value>
S3_SECRET_ACCESS_KEY=<bucket SECRET_ACCESS_KEY value>
```

Then run:

```bash
npm run test:e2e:deployed
```

The deployed test performs: Clerk login -> upload real DOCX fixture -> create verification run -> wait for worker completion -> open report -> assert report status/content. Cleanup deletes the dedicated test org's runs, reports, documents, audit rows, and uploaded S3 objects.

## Known Limitations

- This is staging-ready, not a full production hardening pass.
- Clerk organization rows are still synced by webhook in normal operation; deployed E2E also upserts the dedicated test org row to make setup deterministic.
- Current staging uses a Clerk keyless test instance with organizations enabled for E2E. To rotate to production Clerk keys, run `node scripts/rotate-clerk-keys.mjs` — it validates the live keys (`sk_live_*`/`pk_live_*`), sets them on both Railway services, waits for redeploy, and smoke-tests auth. The script deliberately does NOT set `CLERK_WEBHOOK_SECRET` automatically (a wrong value would silently break webhook signature verification); set that manually after creating the production webhook endpoint in the Clerk dashboard.
- Railway Bucket traffic is public S3-compatible traffic; service-to-bucket egress is counted as service egress by Railway.
- PACER and OpenRouter remain off unless explicitly configured.
- If deployed E2E is run without a public/test-accessible staging database URL, setup and cleanup cannot seed or remove test data.

## Sidelining (Power Down / Stand Up)

Two scripts let you sideline the **production** environment (project `baddie-legal`) now and bring it back later, without deleting anything. They scale services to zero (hibernate), so compute billing stops while volumes, variables, services, and the custom domain stay attached.

- `npm run powerdown` → `scripts/powerdown.mjs` — hibernate production.
- `npm run standup` → `scripts/standup.mjs` — restore production from hibernate.

Both target `baddie-legal` / `production` by name (hard-coded identifiers inside the scripts), so they can't accidentally act on another project or environment even if `railway link` is pointed elsewhere.

### Prerequisite: ship a green deploy before powering down

`powerdown.mjs` **refuses to run** unless the latest deploy of every production service is `SUCCESS`. This is deliberate: if you hibernate while the latest deploy is `FAILED`, the project will stand back up with broken code that doesn't match the latest commit.

The most common blocker is the deploy-time guard (`scripts/guard-production-secrets.mjs`, wired into `npm run build`), which blocks production builds that still use `sk_test_*` Clerk keys or a placeholder `MANIFEST_SIGNING_KEY`. To get a green deploy before sidelining:

1. In dashboard.clerk.com, create/select the **production** instance, add `baddielegal.com` to allowed origins, and create the webhook endpoint (URL `https://baddielegal.com/api/webhooks/clerk`).
2. `node scripts/rotate-clerk-keys.mjs` — validates and sets `sk_live_*` / `pk_live_*` on both `legal-citer` and `worker-prod`, waits for redeploy, smoke-tests auth.
3. Generate a strong manifest key and set it on both app services:
   ```bash
   openssl rand -hex 32
   railway variables set --service legal-citer MANIFEST_SIGNING_KEY=<value>
   railway variables set --service worker-prod MANIFEST_SIGNING_KEY=<value>
   ```
4. Set `CLERK_WEBHOOK_SECRET` on `legal-citer` to the production webhook's `whsec_*` (manual — see the note in the rotation script).
5. Confirm both app services show `SUCCESS` and `baddielegal.com/sign-in` returns 200, then run `npm run powerdown`.

### Powering down

```bash
npm run powerdown        # interactive — prompts for "yes"
npm run powerdown -- --check   # pre-flight + plan only, no changes (safe to run any time)
```

What it does:

1. **Pre-flight guards** — verifies Railway linkage (`baddie-legal` / `production`), that all four services exist, that the latest deploy of each is `SUCCESS`, and smoke-tests `/api/health` + `/sign-in`.
2. **Safety backup → `./backups/`** (timestamped; gitignored):
   - `postgres-production-<ts>.sql.gz` — `pg_dump` of production Postgres via `DATABASE_PUBLIC_URL` (needs `pg_dump` on PATH or Homebrew libpq at `/opt/homebrew/opt/libpq/bin/pg_dump`).
   - `vars-production-<ts>.json` — every variable on all four services (contains live secrets — never commit).
   - `powerdown-state-production-<ts>.json` (+ a `-latest` pointer) — service IDs, replica counts, deploy IDs, domain, timestamp. This is what `standup` reads.
3. **Hibernate** — scales services to 0 in dependency-safe order: `legal-citer` → `worker-prod` → `Redis-3L9x` → `Postgres-gFXS`. The app drains before its database stops.

Nothing is deleted. Volumes (Postgres ~160 MB, Redis ~170 MB), variables, the custom domain `baddielegal.com`, and the services themselves remain. Compute billing drops to zero; volume storage still bills.

> Redis is not dumped — its queue/cache state is reprovisionable, and its URL is captured in the variable manifest. The S3 uploads bucket is external to Railway and is unaffected by power down.

### Standing back up

```bash
npm run standup          # interactive — prompts for "yes"
npm run standup -- --check    # show plan + current replica state, no changes
```

What it does:

1. Loads `backups/powerdown-state-production-latest.json`.
2. Scales services back to 1 replica in dependency order: `Postgres-gFXS` → `Redis-3L9x` (wait healthy) → `worker-prod` → `legal-citer`. **No redeploy** — hibernate preserves the last-successful image, so the running code after standup is the same `SUCCESS` deploy that was live before power down.
3. Polls until all services are `Online`, then smoke-tests `/api/health` + `/sign-in`.

If a service is missing at stand-up time, the script aborts with guidance — hibernate restore assumes the services still exist. To ship **new** code after standing up, push to `main` or run `railway up` (the normal deploy path); the standup script intentionally only restores replicas, it does not deploy.

### What persists vs. what the backup protects

| Resource | Persists across hibernate? | Backed up by powerdown? |
| --- | --- | --- |
| Production services + IDs | Yes | n/a |
| Custom domain `baddielegal.com` | Yes | recorded in state.json |
| Environment variables (live secrets) | Yes | `vars-production-*.json` |
| Postgres volume (~160 MB) | Yes | `postgres-production-*.sql.gz` (safety snapshot) |
| Redis volume (~170 MB) | Yes | not dumped (reprovisionable) |
| S3 uploads bucket | Yes (external to Railway) | n/a |
| Last-successful deploy image | Yes (basis of standup) | deploy IDs in state.json |

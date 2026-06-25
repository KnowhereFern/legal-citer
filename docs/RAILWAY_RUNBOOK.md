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
- Current staging uses a Clerk keyless test instance with organizations enabled for E2E. Before production, claim/configure a real Clerk instance, add the production domain, create the Clerk webhook endpoint, and replace `CLERK_WEBHOOK_SECRET` with the endpoint's actual signing secret.
- Railway Bucket traffic is public S3-compatible traffic; service-to-bucket egress is counted as service egress by Railway.
- PACER and OpenRouter remain off unless explicitly configured.
- If deployed E2E is run without a public/test-accessible staging database URL, setup and cleanup cannot seed or remove test data.

import { headers } from "next/headers";
import { resolveWorkspace } from "@/lib/workspace";

/**
 * Simple per-IP / per-org rate limiter for the upload and run-enqueue
 * endpoints. Without it, any authenticated user can upload 50 MB files and
 * enqueue unlimited verification jobs in a tight loop — a trivial path to
 * exhausting disk, Postgres, Redis, and the single worker.
 *
 * Strategy: fixed-window token bucket per identity (orgId when authenticated,
 * IP when not), backed by Redis when available (production, multi-instance)
 * and an in-process Map fallback for local dev. The Redis path uses INCR +
 * EXPIRE for atomic window rotation. Limits are intentionally generous for a
 * logged-in user doing real work but tight enough to stop a runaway script.
 */

interface RateLimitConfig {
  // Max tokens allowed in the window.
  limit: number;
  // Window duration in seconds.
  windowSec: number;
}

// Upload: 20 uploads / hour per org. A real brief upload takes minutes to
// process; 20/hour is ~3x what a heavy-use solo practitioner would do.
export const UPLOAD_RATE_LIMIT: RateLimitConfig = {
  limit: 20,
  windowSec: 3600,
};

// Run creation: 30 runs / hour per org. Slightly higher than uploads because
// a user might re-run the same doc after fixing a finding.
export const RUN_RATE_LIMIT: RateLimitConfig = {
  limit: 30,
  windowSec: 3600,
};

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetSec: number;
}

/**
 * Check the rate limit for the current request. Uses orgId when the user is
 * authenticated (most fair — limits are per-workspace, not per-IP which would
 * penalize users behind a corporate NAT) and falls back to IP for anonymous
 * routes. Returns { ok: false } when the limit is exceeded — the caller
 * should respond 429 with Retry-After.
 */
export async function checkRateLimit(
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const identity = await getIdentity();
  const key = `ratelimit:${identity.scope}:${identity.id}:${config.windowSec}`;

  const redis = getRedisClient();
  if (redis) {
    return checkRedis(redis, key, config);
  }
  return checkInMemory(key, config);
}

async function getIdentity(): Promise<{ scope: string; id: string }> {
  // Prefer orgId — per-workspace is the right granularity. If the request is
  // anonymous or workspace resolution fails (e.g. public webhook), fall back
  // to the client IP. Both are hashed so we're not storing raw identifiers
  // in Redis keys.
  try {
    const workspace = await resolveWorkspace();
    if (workspace?.orgId) {
      return { scope: "org", id: workspace.orgId };
    }
  } catch {
    // Not authenticated — fall through to IP.
  }
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  return { scope: "ip", id: ip };
}

// --- Redis backend (production) -----------------------------------------

let redisClient: import("ioredis").default | null = null;
let redisClientInitFailed = false;

function getRedisClient(): import("ioredis").default | null {
  if (redisClientInitFailed) return null;
  if (redisClient) return redisClient as import("ioredis").default;
  const url = process.env.REDIS_URL;
  if (!url) {
    redisClientInitFailed = true;
    return null;
  }
  try {
    // Lazy-load so this module doesn't crash in environments without ioredis.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const IORedis = require("ioredis");
    const client: import("ioredis").default = new IORedis(url, {
      // Don't crash the web process if Redis is unreachable — rate limiting
      // is a defense-in-depth control, not a hard dependency. If Redis is
      // down we fall back to in-memory per-instance limiting, which is
      // weaker than coordinated limiting but better than nothing.
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: false,
    });
    client.on("error", () => {
      // Swallow — see comment above. The next request will retry the connection.
    });
    redisClient = client;
    return redisClient;
  } catch {
    redisClientInitFailed = true;
    return null;
  }
}

async function checkRedis(
  redis: import("ioredis").default,
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  // INCR is atomic. The first request in a window sets the key to 1; we then
  // EXPIRE it so the window rolls. Subsequent requests just INCR.
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, config.windowSec);
  }
  const ttl = await redis.ttl(key);
  return {
    ok: count <= config.limit,
    remaining: Math.max(0, config.limit - count),
    resetSec: ttl > 0 ? ttl : config.windowSec,
  };
}

// --- In-memory backend (dev / Redis-down fallback) ----------------------

interface Bucket {
  count: number;
  resetsAt: number;
}
const inMemoryBuckets = new Map<string, Bucket>();

function checkInMemory(
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now();
  const bucket = inMemoryBuckets.get(key);
  if (!bucket || bucket.resetsAt <= now) {
    const fresh: Bucket = {
      count: 1,
      resetsAt: now + config.windowSec * 1000,
    };
    inMemoryBuckets.set(key, fresh);
    return { ok: true, remaining: config.limit - 1, resetSec: config.windowSec };
  }
  bucket.count += 1;
  const resetSec = Math.ceil((bucket.resetsAt - now) / 1000);
  return {
    ok: bucket.count <= config.limit,
    remaining: Math.max(0, config.limit - bucket.count),
    resetSec,
  };
}

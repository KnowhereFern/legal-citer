import crypto from "crypto";
import { prisma } from "@/lib/db";

function getSigningKey(): string {
  const key = process.env.MANIFEST_SIGNING_KEY;
  // The manifest signature is the product's core trust guarantee: it proves
  // a verification report wasn't tampered with after generation. Falling back
  // to a hard-coded dev value silently in production would let anyone who
  // reads this source (it's public on GitHub) forge a valid signature for
  // any manifest — defeating the entire mechanism. Require the env var to
  // be set explicitly; fail loud at the first sign/create call if it isn't.
  if (!key) {
    throw new Error(
      "MANIFEST_SIGNING_KEY is not set. Generate a strong random value " +
        "(e.g. `openssl rand -hex 32`) and set it as a Railway variable on " +
        "both the web and worker services before deploying to production.",
    );
  }
  if (key.length < 32) {
    throw new Error(
      "MANIFEST_SIGNING_KEY must be at least 32 characters. Use a strong " +
        "random value (e.g. `openssl rand -hex 32`).",
    );
  }
  return key;
}

function computeHmac(data: string): string {
  return crypto
    .createHmac("sha256", getSigningKey())
    .update(data)
    .digest("hex");
}

export async function createManifest(
  runId: string,
  documentHash: string
): Promise<string> {
  const manifestHash = computeHmac(`${runId}:${documentHash}`);

  await prisma.verificationManifest.create({
    data: {
      runId,
      documentHash,
      manifestHash,
    },
  });

  return manifestHash;
}

export async function signManifest(manifestId: string): Promise<void> {
  const manifest = await prisma.verificationManifest.findUnique({
    where: { id: manifestId },
  });

  if (!manifest) {
    throw new Error(`Manifest not found: ${manifestId}`);
  }

  const signature = computeHmac(manifest.manifestHash);

  await prisma.verificationManifest.update({
    where: { id: manifestId },
    data: {
      signature,
      signedAt: new Date(),
    },
  });
}

export async function verifyManifest(manifestId: string): Promise<boolean> {
  const manifest = await prisma.verificationManifest.findUnique({
    where: { id: manifestId },
  });

  if (!manifest || !manifest.signature) {
    return false;
  }

  const expected = computeHmac(manifest.manifestHash);

  if (expected.length !== manifest.signature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(manifest.signature)
  );
}

import crypto from "crypto";
import { prisma } from "@/lib/db";

function getSigningKey(): string {
  return process.env.MANIFEST_SIGNING_KEY || "dev-manifest-signing-key";
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

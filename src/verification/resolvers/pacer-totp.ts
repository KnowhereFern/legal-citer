import crypto from "crypto";

function decodeBase32(secret: string): Buffer {
  const normalized = secret.toUpperCase().replace(/[\s=-]+/g, "");
  const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const lookup = new Map<string, number>();
  for (let i = 0; i < base32Chars.length; i++) {
    lookup.set(base32Chars[i], i);
  }

  const bytes: number[] = [];
  let buffer = 0;
  let bitsLeft = 0;

  for (const char of normalized) {
    const val = lookup.get(char);
    if (val === undefined) {
      throw new Error(`Invalid base32 character: ${char}`);
    }
    buffer = (buffer << 5) | val;
    bitsLeft += 5;

    if (bitsLeft >= 8) {
      bitsLeft -= 8;
      bytes.push((buffer >> bitsLeft) & 0xff);
    }
  }

  return Buffer.from(bytes);
}

export function generateTOTP(secret: string): string {
  const key = decodeBase32(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / 30);

  const counterBuf = Buffer.alloc(8);
  counterBuf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuf.writeUInt32BE(counter & 0xffffffff, 4);

  const hmac = crypto.createHmac("sha1", key).update(counterBuf).digest();

  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, "0");
}

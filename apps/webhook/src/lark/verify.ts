/**
 * Lark event payload verification and decryption.
 *
 * Two verification schemes coexist in Lark Open Platform events:
 *
 * 1. Verification Token (legacy / url_verification challenge):
 *    The payload includes `token` field which must match `LARK_VERIFICATION_TOKEN`.
 *
 * 2. Encrypted events (modern):
 *    Body is `{ encrypt: "base64..." }`. We must AES-256-CBC decrypt with
 *    key = SHA256(LARK_ENCRYPT_KEY), IV = first 16 bytes of ciphertext.
 *
 * 3. Header signature (2.0 spec):
 *    `X-Lark-Signature` = SHA256(timestamp + nonce + encryptKey + body)
 *    (not all tenants enable this; optional).
 */

export interface VerificationInput {
  rawBody: string;
  headers: Headers;
  verificationToken: string;
  encryptKey?: string;
}

export interface VerificationResult {
  ok: boolean;
  reason?: string;
  decryptedBody?: unknown;
}

/**
 * Decrypt an encrypted event payload.
 * Lark uses AES-256-CBC with a key derived from SHA256(encryptKey).
 */
async function decryptLarkPayload(encrypted: string, encryptKey: string): Promise<unknown> {
  const keyBytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(encryptKey));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-CBC' },
    false,
    ['decrypt'],
  );

  // Decode base64 ciphertext
  const binary = atob(encrypted);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);

  // First 16 bytes = IV, rest = ciphertext
  const iv = buf.slice(0, 16);
  const ct = buf.slice(16);

  const plain = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, cryptoKey, ct);
  const text = new TextDecoder().decode(plain);
  return JSON.parse(text);
}

/**
 * Verify a Lark event payload. If encrypted, returns the decrypted body.
 */
export async function verifyLarkEvent(input: VerificationInput): Promise<VerificationResult> {
  const { rawBody, verificationToken, encryptKey } = input;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return { ok: false, reason: 'invalid_json' };
  }

  // Encrypted payload: decrypt first, then re-verify as plain
  if (typeof parsed.encrypt === 'string') {
    if (!encryptKey) {
      return { ok: false, reason: 'encrypted_payload_but_no_encrypt_key_configured' };
    }
    try {
      const decrypted = (await decryptLarkPayload(parsed.encrypt, encryptKey)) as Record<
        string,
        unknown
      >;
      const tokenOk = checkToken(decrypted, verificationToken);
      if (!tokenOk) return { ok: false, reason: 'token_mismatch_after_decrypt' };
      return { ok: true, decryptedBody: decrypted };
    } catch (err) {
      return { ok: false, reason: `decrypt_failed: ${(err as Error).message}` };
    }
  }

  // Plain payload: just check token
  const tokenOk = checkToken(parsed, verificationToken);
  if (!tokenOk) return { ok: false, reason: 'token_mismatch' };
  return { ok: true, decryptedBody: parsed };
}

function checkToken(body: Record<string, unknown>, expected: string): boolean {
  // New schema: header.token, Old schema: top-level token
  const header = body.header as Record<string, unknown> | undefined;
  const token =
    (typeof header?.token === 'string' && header.token) ||
    (typeof body.token === 'string' && body.token) ||
    null;
  return token === expected;
}

/**
 * Extract the challenge value from a url_verification handshake payload.
 * Returns null if not a handshake.
 */
export function extractChallenge(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const obj = body as Record<string, unknown>;
  if (obj.type === 'url_verification' && typeof obj.challenge === 'string') {
    return obj.challenge;
  }
  return null;
}

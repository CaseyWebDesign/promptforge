// Stripe webhook signature verification for Cloudflare Workers
// No SDK needed — pure crypto verification

const encoder = new TextEncoder();

export async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const elements = signature.split(',');
  const timestamps: string[] = [];
  const signatures: string[] = [];

  for (const element of elements) {
    const [prefix, value] = element.split('=');
    if (prefix === 't') timestamps.push(value);
    if (prefix === 'v1') signatures.push(value);
  }

  if (timestamps.length === 0 || signatures.length === 0) {
    return false;
  }

  const timestamp = timestamps[0];

  // Reject events older than 5 minutes (replay protection)
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
  if (age > 300) {
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const expectedSig = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison
  return timingSafeEqual(expectedSig, signatures[0]);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

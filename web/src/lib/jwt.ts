import crypto from 'crypto';

function base64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function getSecret() {
  const s = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'dev-secret';
  return s;
}

export function signLegacyToken(payload: Record<string, unknown>, options?: { expiresIn?: number }) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const iat = Math.floor(Date.now() / 1000);
  const exp = options?.expiresIn ? iat + options.expiresIn : iat + 60 * 60 * 24 * 7; // 7 days default
  const body = { ...payload, iat, exp, iss: 'topcare', aud: 'mobile' };

  const secret = getSecret();
  const h = base64url(JSON.stringify(header));
  const b = base64url(JSON.stringify(body));
  const data = `${h}.${b}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest();
  const s = base64url(sig);
  return `${data}.${s}`;
}

export function verifyLegacyToken(token: string): { valid: boolean; payload?: any } {
  try {
    const [h, b, s] = token.split('.');
    if (!h || !b || !s) return { valid: false };
    const data = `${h}.${b}`;
    const secret = getSecret();
    const expected = base64url(crypto.createHmac('sha256', secret).update(data).digest());
    if (expected !== s) return { valid: false };
    const payload = JSON.parse(Buffer.from(b, 'base64').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) return { valid: false };
    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}


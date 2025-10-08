/*
  Short link utilities
  - Encodes the verbose shareId (e.g., "project_<uuid>_YYYYMMDD_HHMMSS_<uuid>" or "proposal_<uuid>_YYYYMMDD_HHMMSS_<uuid>") into a compact, URL-safe code without any backend mapping.
  - Decodes the compact code back into the original shareId.

  Implementation avoids BigInt to support lower TS targets by using base64url for UUIDs
  and base36 for the timestamp.
  
  Supports:
  - Project codes: p-<A>-<B>-<C>
  - Proposal codes: pr-<A>-<B>-<C>
*/

function assert(condition: any, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function uuidToHex(uuid: string): string {
  return uuid.replace(/-/g, '').toLowerCase();
}

function hexToUuid(hex32: string): string {
  const h = hex32.toLowerCase();
  assert(/^[0-9a-f]{32}$/.test(h), 'hex must be 32-length lowercase hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.toLowerCase();
  assert(clean.length % 2 === 0, 'hex length must be even');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  const hex: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    const v = bytes[i].toString(16).padStart(2, '0');
    hex.push(v);
  }
  return hex.join('');
}

function base64UrlEncode(bytes: Uint8Array): string {
  let b64 = '';
  if (typeof btoa !== 'undefined') {
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    b64 = btoa(bin);
  } else if (typeof Buffer !== 'undefined') {
    // Node fallback (tests)
    // @ts-ignore
    b64 = Buffer.from(bytes).toString('base64');
  } else {
    throw new Error('No base64 encoder available');
  }
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(s: string): Uint8Array {
  let b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  if (typeof atob !== 'undefined') {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } else if (typeof Buffer !== 'undefined') {
    // @ts-ignore
    const buf = Buffer.from(b64, 'base64');
    return new Uint8Array(buf);
  }
  throw new Error('No base64 decoder available');
}

function parseShareId(shareId: string): { entityType: string; uuid1: string; ts14: string; uuid2: string } | null {
  const parts = shareId.split('_');
  if (parts.length < 5) return null;
  const entityType = parts[0];
  if (entityType !== 'project' && entityType !== 'proposal') return null;
  const uuid1 = parts[1];
  const ymd = parts[2];
  const hms = parts[3];
  const uuid2 = parts[4];
  if (!/^\d{8}$/.test(ymd) || !/^\d{6}$/.test(hms)) return null;
  if (!/^[0-9a-fA-F-]{36}$/.test(uuid1) || !/^[0-9a-fA-F-]{36}$/.test(uuid2)) return null;
  return { entityType, uuid1, ts14: `${ymd}${hms}`, uuid2 };
}

export function encodeShareIdCompact(shareId: string): string | null {
  try {
    const parsed = parseShareId(shareId);
    if (!parsed) return null;
    const uuid1hex = uuidToHex(parsed.uuid1);
    const uuid2hex = uuidToHex(parsed.uuid2);

    const A = base64UrlEncode(hexToBytes(uuid1hex));
    const B = parseInt(parsed.ts14, 10).toString(36); // base36 timestamp
    const C = base64UrlEncode(hexToBytes(uuid2hex));

    // Use 'p' for project, 'pr' for proposal
    const prefix = parsed.entityType === 'proposal' ? 'pr' : 'p';
    return `${prefix}-${A}-${B}-${C}`;
  } catch {
    return null;
  }
}

export function decodeShareCodeToShareId(code: string): string | null {
  try {
    if (!code) return null;
    const segments = code.split('-');
    if (segments.length !== 4) return null;
    
    const prefix = segments[0].toLowerCase();
    const A = segments[1];
    const B = segments[2];
    const C = segments[3];

    // Determine entity type from prefix
    let entityType: string;
    if (prefix === 'p') {
      entityType = 'project';
    } else if (prefix === 'pr') {
      entityType = 'proposal';
    } else {
      return null;
    }

    const uuid1hex = bytesToHex(base64UrlDecode(A)).padStart(32, '0');
    const ts14 = parseInt(B, 36).toString(10).padStart(14, '0');
    const uuid2hex = bytesToHex(base64UrlDecode(C)).padStart(32, '0');

    const uuid1 = hexToUuid(uuid1hex);
    const uuid2 = hexToUuid(uuid2hex);
    const ymd = ts14.slice(0, 8);
    const hms = ts14.slice(8);
    return `${entityType}_${uuid1}_${ymd}_${hms}_${uuid2}`;
  } catch {
    return null;
  }
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

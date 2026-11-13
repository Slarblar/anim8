import { BlockList, isIP } from 'net';

/** Hosts that never return a readable article. Checked before any fetch. */
export const SOCIAL_HOSTS = ['x.com', 'twitter.com', 'instagram.com', 'facebook.com', 'tiktok.com', 'threads.net'];

const BLOCKED = new BlockList();
BLOCKED.addSubnet('0.0.0.0', 8, 'ipv4');
BLOCKED.addSubnet('10.0.0.0', 8, 'ipv4');
BLOCKED.addSubnet('127.0.0.0', 8, 'ipv4');
BLOCKED.addSubnet('169.254.0.0', 16, 'ipv4');
BLOCKED.addSubnet('172.16.0.0', 12, 'ipv4');
BLOCKED.addSubnet('192.168.0.0', 16, 'ipv4');
BLOCKED.addAddress('::1', 'ipv6');
BLOCKED.addSubnet('fc00::', 7, 'ipv6');
BLOCKED.addSubnet('fe80::', 10, 'ipv6');

const PAYWALL = [
  /subscribe to (continue|read|unlock|view)/i,
  /sign in to (continue|read|view|access)/i,
  /log in to (continue|read|view|access)/i,
  /already a subscriber/i,
  /for subscribers only/i,
  /subscribers only/i,
  /create (?:a |an )?(?:free )?account to (?:continue|read|view)/i,
  /you(?:'|’)ve reached your (?:free |article )?limit/i,
  /register to (?:read|continue|view)/i,
  /this (?:article|story|content) is available to subscribers/i,
  /to continue reading,? (?:please )?subscribe/i,
];

export function looksLikePaywall(text: string): boolean {
  return PAYWALL.some((re) => re.test(text));
}

/** Turn integer, hex, and octal spellings of an address into a dotted quad. */
export function canonicalIp(hostname: string): string | null {
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (/^\d+$/.test(host)) {
    const n = Number(host);
    if (!Number.isInteger(n) || n < 0 || n > 0xffffffff) return null;
    return `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;
  }
  if (/^0x[0-9a-f]+$/i.test(host)) {
    const n = Number(BigInt(host));
    if (!Number.isInteger(n) || n < 0 || n > 0xffffffff) return null;
    return `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;
  }
  const mapped = host.startsWith('::ffff:') ? host.slice(7) : host;
  if (mapped.includes('.') && isIP(mapped) === 4) return mapped;
  const parts = host.split('.');
  if (parts.length === 4 && parts.every((part) => /^\d+$/.test(part))) {
    const nums = parts.map((part) => (part.length > 1 && part.startsWith('0') ? parseInt(part, 8) : Number(part)));
    if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
    return nums.join('.');
  }
  return isIP(host) ? host : null;
}

export function isBlockedIp(address: string): boolean {
  const ip = canonicalIp(address) || address.trim().toLowerCase().replace(/^\[|\]$/g, '');
  const kind = isIP(ip);
  if (kind === 4) return BLOCKED.check(ip, 'ipv4');
  if (kind === 6) return BLOCKED.check(ip, 'ipv6');
  return true;
}

export function isSocialHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '').replace(/^www\./, '');
  return SOCIAL_HOSTS.some((domain) => host === domain || host.endsWith('.' + domain));
}

export function hostIsOutlet(hostname: string, outlets: string[]): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return outlets.some((domain) => host === domain || host.endsWith('.' + domain));
}

export type LinkUrl =
  | { ok: true; url: URL }
  | { ok: false; error: 'invalid' | 'social' | 'blocked' };

/** http(s) only, no credentials, at most 2048 characters. Social hosts stop here. */
export function parsePublicUrl(input: string): LinkUrl {
  const raw = String(input ?? '').trim();
  if (!raw || raw.length > 2048 || /\s/.test(raw)) return { ok: false, error: 'invalid' };
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: 'invalid' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { ok: false, error: 'invalid' };
  if (url.username || url.password) return { ok: false, error: 'invalid' };
  if (!url.hostname || url.hostname === 'localhost') return { ok: false, error: 'invalid' };
  const literal = canonicalIp(url.hostname);
  if (literal && isBlockedIp(literal)) return { ok: false, error: 'blocked' };
  if (isSocialHost(url.hostname)) return { ok: false, error: 'social' };
  return { ok: true, url };
}

export function cleanArticleText(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
    .slice(0, 15000);
}

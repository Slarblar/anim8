import { describe, expect, it } from 'vitest';
import { driveErrorReason, driveFolderPath, driveMime, driveQuote, safeDriveName, serviceAccountFromEnv } from './scoop-drive';

describe('driveFolderPath', () => {
  it('matches 00_POSTS / 2026 / 11-November / 2026-11-20_<post>, in Utah time', () => {
    const ts = Date.UTC(2026, 10, 21, 6, 30); // 11:30 p.m. Nov 20 in Salt Lake City
    expect(driveFolderPath(ts, 'America/Denver', 'great-salt-lake-low')).toEqual(['2026', '11-November', '2026-11-20_great-salt-lake-low']);
    expect(driveFolderPath(ts, 'UTC', 'x')[2]).toBe('2026-11-21_x');
  });
  it('pads months, cleans the post name', () => {
    expect(driveFolderPath(Date.UTC(2027, 0, 5, 18), 'America/Denver', 'New Dino Drop!')).toEqual(['2027', '01-January', '2027-01-05_new-dino-drop']);
    expect(driveFolderPath(Date.UTC(2026, 10, 20, 18), 'America/Denver')[2]).toBe('2026-11-20');
  });
});

describe('safeDriveName', () => {
  it('accepts the export files', () => {
    expect(safeDriveName('great-salt-lake-low.png')).toBe('great-salt-lake-low.png');
    expect(safeDriveName('post-2.webp')).toBe('post-2.webp');
    expect(safeDriveName('post.txt')).toBe('post.txt');
  });
  it('rejects paths and other types', () => {
    expect(safeDriveName('../x.png')).toBeNull();
    expect(safeDriveName('a/b.png')).toBeNull();
    expect(safeDriveName('run.exe')).toBeNull();
    expect(safeDriveName('')).toBeNull();
    expect(safeDriveName(5)).toBeNull();
  });
});

describe('drive helpers', () => {
  it('escapes quotes for queries', () => {
    expect(driveQuote("O'Brien\\x")).toBe("O\\'Brien\\\\x");
  });
  it('maps mime types', () => {
    expect(driveMime('a.png')).toBe('image/png');
    expect(driveMime('a.webp')).toBe('image/webp');
    expect(driveMime('a.txt')).toBe('text/plain');
  });
  it('explains common failures', () => {
    expect(driveErrorReason({ code: 404 })).toBe('no_access');
    expect(driveErrorReason({ code: 403, message: 'Service Accounts do not have storage quota.' })).toBe('needs_shared_drive');
    expect(driveErrorReason({ code: 429 })).toBe('rate_limited');
    expect(driveErrorReason(new Error('socket hang up'))).toBe('failed');
  });
});

describe('serviceAccountFromEnv', () => {
  const json = JSON.stringify({ type: 'service_account', client_email: 'post-studio@slcscoop.iam.gserviceaccount.com', private_key: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n' });
  it('reads the pasted JSON key file', () => {
    const sa = serviceAccountFromEnv({ SCOOP_DRIVE_SA_JSON: json });
    expect(sa.email).toBe('post-studio@slcscoop.iam.gserviceaccount.com');
    expect(sa.key).toContain('-----BEGIN PRIVATE KEY-----\nabc');
  });
  it('reads a base64-encoded key file', () => {
    expect(serviceAccountFromEnv({ SCOOP_DRIVE_SA_JSON: Buffer.from(json).toString('base64') }).email).toBe('post-studio@slcscoop.iam.gserviceaccount.com');
  });
  it('reads separate email and key, unescaping \\n', () => {
    const sa = serviceAccountFromEnv({ SCOOP_DRIVE_SA_EMAIL: 'a@b.iam.gserviceaccount.com', SCOOP_DRIVE_SA_PRIVATE_KEY: 'line1\\nline2' });
    expect(sa).toEqual({ email: 'a@b.iam.gserviceaccount.com', key: 'line1\nline2' });
  });
  it('never borrows another Google account on the site', () => {
    expect(serviceAccountFromEnv({ GOOGLE_CALENDAR_SA_EMAIL: 'anim8@x.iam.gserviceaccount.com', GOOGLE_CALENDAR_SA_PRIVATE_KEY: 'k' })).toEqual({ email: '', key: '' });
  });
});

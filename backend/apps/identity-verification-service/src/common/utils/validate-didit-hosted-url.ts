import { isIP } from 'net';

// Only a plain https URL on a Didit hostname may be handed to the browser
// for the redirect. Anything else (other scheme, other host, look-alike
// suffix, IP literal, embedded credentials, odd port) is rejected, which is
// what prevents an open redirect if a vendor response were ever wrong or
// tampered with.
const ALLOWED_HOST_SUFFIXES = ['didit.me'];

export class InvalidHostedUrlError extends Error {
  constructor() {
    super('Hosted verification URL rejected');
    this.name = 'InvalidHostedUrlError';
  }
}

/** Returns the normalized URL, or throws InvalidHostedUrlError (never echoing the input). */
export function assertDiditHostedUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) throw new InvalidHostedUrlError();
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new InvalidHostedUrlError();
  }
  const host = url.hostname.toLowerCase();
  const hostAllowed = ALLOWED_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    (url.port && url.port !== '443') ||
    isIP(host) !== 0 ||
    !hostAllowed
  ) {
    throw new InvalidHostedUrlError();
  }
  return url.toString();
}

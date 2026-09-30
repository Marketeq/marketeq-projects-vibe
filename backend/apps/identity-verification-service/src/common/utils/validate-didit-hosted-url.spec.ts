import { assertDiditHostedUrl, InvalidHostedUrlError } from './validate-didit-hosted-url';

describe('assertDiditHostedUrl', () => {
  it.each(['https://verify.didit.me/session/abc', 'https://didit.me/x', 'https://a.b.didit.me:443/y?z=1'])('accepts %s', (u) => {
    expect(assertDiditHostedUrl(u)).toContain('didit.me');
  });

  it.each([
    'http://verify.didit.me/s',
    'https://evil.example.com/s',
    'https://notdidit.me/s',
    'https://verify.didit.me.evil.com/s',
    'https://127.0.0.1/s',
    'https://[::1]/s',
    'https://user:pw@verify.didit.me/s',
    'https://verify.didit.me:8443/s',
    'javascript:alert(1)',
    '//verify.didit.me/s',
    '',
    'not a url',
  ])('rejects %s', (u) => {
    expect(() => assertDiditHostedUrl(u)).toThrow(InvalidHostedUrlError);
  });

  it.each([null, undefined, 42, {}])('rejects non-string %p', (u) => {
    expect(() => assertDiditHostedUrl(u)).toThrow(InvalidHostedUrlError);
  });

  it('never echoes the rejected URL in the error message', () => {
    try {
      assertDiditHostedUrl('https://evil.example.com/secret-token');
    } catch (e) {
      expect((e as Error).message).not.toContain('secret-token');
    }
  });
});

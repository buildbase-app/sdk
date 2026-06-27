# Security Policy

## Reporting a Vulnerability

**Do not report security vulnerabilities through public GitHub issues.**

Email **security@buildbase.app** with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix (optional)

You will receive an acknowledgement within **48 hours** and a status update within **7 days**.

## Supported Versions

| Version | Supported |
| ------- | --------- |
| latest  | ✅        |

## Security Best Practices for SDK Users

1. **Never expose `clientSecret` in client-side code** — it must only be used server-side.
2. **Use environment variables** for all credentials — never hardcode them.
3. **Keep the SDK updated** — run `npm outdated @buildbase/sdk` regularly.
4. **Enable debug mode only in development** — `debug: process.env.NODE_ENV === 'development'`.
